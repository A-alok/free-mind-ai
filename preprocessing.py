import pandas as pd
import numpy as np
import re
import nltk
import os
import tempfile
import shutil
import zipfile
from nltk.corpus import stopwords
from nltk.stem import PorterStemmer, WordNetLemmatizer
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder, OneHotEncoder
from sklearn.impute import SimpleImputer
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from db_file_system import DBFileSystem

# Initialize database file system
db_fs = DBFileSystem()

# Check if TensorFlow is available
try:
    import tensorflow as tf
    from tensorflow.keras.preprocessing.image import ImageDataGenerator
    TENSORFLOW_AVAILABLE = True
except ImportError:
    TENSORFLOW_AVAILABLE = False

# Download necessary NLTK resources
nltk.download('stopwords', quiet=True)
nltk.download('wordnet', quiet=True)

def preprocess_dataset(df, task_type, dataset_folder=None):
    """Preprocess dataset based on task type"""
    # Add image classification handling while preserving original logic
    if task_type == 'image_classification' and dataset_folder is not None:
        return preprocess_image_dataset(dataset_folder)
        
    # Original preprocessing for non-image data (previously implemented logic)
    if df is None or df.empty:
        raise ValueError("The DataFrame is empty after reading the CSV.")

    df.replace("None", pd.NA, inplace=True)

    # Separate features and target variable
    X = df.iloc[:, :-1]
    y = df.iloc[:, -1]

    numeric_cols = X.select_dtypes(include=['float64', 'int64']).columns
    categorical_cols = X.select_dtypes(include=['object']).columns

    # Preprocessing for numeric features
    numeric_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='mean')),
        ('scaler', StandardScaler())
    ])

    # Preprocessing for categorical features
    categorical_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='most_frequent')),
        ('onehot', OneHotEncoder(handle_unknown='ignore'))
    ])

    # Preprocessing for NLP task
    if task_type == 'nlp':
        corpus = []
        ps = PorterStemmer()
        lemmatizer = WordNetLemmatizer()
        all_stopwords = set(stopwords.words('english'))

        # Process text from the first column
        for i in range(len(X)):
            text = re.sub('[^a-zA-Z]', ' ', str(X.iloc[i, 0]))  # Extract text from the first column
            text = text.lower()  # Convert to lowercase
            text = text.split()  # Split into words
            # Stem and lemmatize, while removing stopwords
            text = [lemmatizer.lemmatize(ps.stem(word)) for word in text if word not in all_stopwords]
            text = ' '.join(text)  # Join words back to a single string
            corpus.append(text)

        # Use TF-IDF Vectorization instead of Count Vectorization
        vectorizer = TfidfVectorizer(max_features=1500, ngram_range=(1, 2))  # Unigrams and bigrams
        X_transformed = vectorizer.fit_transform(corpus).toarray()

        # Perform label encoding for the target variable
        le = LabelEncoder()
        y = le.fit_transform(y)

    else:
        # Combine numerical and categorical preprocessing
        preprocessor = ColumnTransformer(
            transformers=[
                ('num', numeric_transformer, numeric_cols),
                ('cat', categorical_transformer, categorical_cols)
            ]
        )
        X_transformed = preprocessor.fit_transform(X)

        # Perform label encoding for the target variable for classification tasks
        if task_type == 'classification':
            le = LabelEncoder()
            y = le.fit_transform(y)

    X_train, X_test, y_train, y_test = train_test_split(X_transformed, y, test_size=0.2, random_state=42)

    return X_train, X_test, y_train, y_test, None, X.columns.tolist()

def preprocess_image_dataset(dataset_folder):
    """
    Preprocess an image classification dataset.
    Modified to work with database storage.
    
    Parameters:
    dataset_folder: Path to the dataset folder
    
    Returns:
    X_train: Training data or generator
    X_test: Testing data or generator
    y_train: Training labels (None for generators)
    y_test: Testing labels (None for generators)
    preprocessor: Dictionary with preprocessing info and generators
    feature_names: List of class names
    """
    if not TENSORFLOW_AVAILABLE:
        raise ImportError("TensorFlow is required for image classification but not available")
    
    print("Preprocessing image classification dataset...")
    
    # Check if this is a database path
    is_database = 'ml_system' in dataset_folder
    
    if is_database:
        # Create a temporary directory for processing
        temp_dir = tempfile.mkdtemp()
        
        try:
            # Set up folders structure
            train_folder = os.path.join(temp_dir, 'training')
            test_folder = os.path.join(temp_dir, 'testing')
            os.makedirs(train_folder, exist_ok=True)
            os.makedirs(test_folder, exist_ok=True)
            
            # Extract database directory
            parts = dataset_folder.replace('\\', '/').strip('/').split('/')
            idx = parts.index('ml_system')
            db_dir = parts[idx + 1] if idx + 1 < len(parts) else 'datasets'
            
            # List database files
            files = db_fs.list_files(db_dir)
            print(f"Files in database: {files}")
            
            # Check for zip file first - this is the key fix
            if 'processed_dataset.zip' in files:
                print("Found processed dataset zip file in database. Extracting...")
                # Get the zip file from database
                zip_content = db_fs.get_file('processed_dataset.zip', db_dir)
                temp_zip_path = os.path.join(temp_dir, 'processed_dataset.zip')
                
                # Save zip content to temporary file
                with open(temp_zip_path, 'wb') as f:
                    f.write(zip_content)
                
                # Extract the zip to the temp directory
                with zipfile.ZipFile(temp_zip_path, 'r') as zipf:
                    print(f"Zip file contents: {zipf.namelist()}")
                    zipf.extractall(temp_dir)
                
                # Check if extraction created the expected folder structure
                if os.path.exists(train_folder) and os.path.isdir(train_folder):
                    print(f"Extracted training folder: {train_folder}")
                    # Get class folders inside training folder
                    class_folders = [d for d in os.listdir(train_folder) 
                                    if os.path.isdir(os.path.join(train_folder, d))]
                    print(f"Found classes: {class_folders}")
                    
                    if not class_folders:
                        print("No class folders found in extracted training directory")
                        # The zip might have a different structure, search for any directories with images
                        for root, dirs, files in os.walk(temp_dir):
                            for d in dirs:
                                dir_path = os.path.join(root, d)
                                if any(f.lower().endswith(('.jpg', '.jpeg', '.png')) 
                                      for f in os.listdir(dir_path) if os.path.isfile(os.path.join(dir_path, f))):
                                    # Found a directory with images, try to use it as a class
                                    class_name = d
                                    new_class_folder = os.path.join(train_folder, class_name)
                                    os.makedirs(new_class_folder, exist_ok=True)
                                    # Copy images to the new class folder
                                    for f in os.listdir(dir_path):
                                        if f.lower().endswith(('.jpg', '.jpeg', '.png')):
                                            src = os.path.join(dir_path, f)
                                            dst = os.path.join(new_class_folder, f)
                                            shutil.copy2(src, dst)
                                    print(f"Created class folder: {class_name}")
                else:
                    # The zip might have used different folder names
                    # Try to find any folders with image class subfolders
                    print("Training folder not found in expected location. Searching...")
                    potential_train_folders = []
                    
                    for root, dirs, _ in os.walk(temp_dir):
                        class_dirs = []
                        for d in dirs:
                            dir_path = os.path.join(root, d)
                            # Check if folder contains images
                            if any(f.lower().endswith(('.jpg', '.jpeg', '.png')) 
                                  for f in os.listdir(dir_path) if os.path.isfile(os.path.join(dir_path, f))):
                                class_dirs.append(d)
                        
                        if class_dirs:
                            print(f"Found potential training folder at {root} with classes: {class_dirs}")
                            potential_train_folders.append((root, class_dirs))
                    
                    if potential_train_folders:
                        # Use the first potential folder with the most classes
                        potential_train_folders.sort(key=lambda x: len(x[1]), reverse=True)
                        found_folder, found_classes = potential_train_folders[0]
                        print(f"Using {found_folder} as training folder with classes: {found_classes}")
                        
                        # If the found folder is not named 'training', rename or copy it
                        if os.path.basename(found_folder) != 'training':
                            # For each class, create in train_folder and copy images
                            for class_name in found_classes:
                                src_class_dir = os.path.join(found_folder, class_name)
                                dst_class_dir = os.path.join(train_folder, class_name)
                                os.makedirs(dst_class_dir, exist_ok=True)
                                
                                # Copy all images
                                for f in os.listdir(src_class_dir):
                                    if f.lower().endswith(('.jpg', '.jpeg', '.png')):
                                        src = os.path.join(src_class_dir, f)
                                        dst = os.path.join(dst_class_dir, f)
                                        shutil.copy2(src, dst)
                                print(f"Copied class {class_name} to training folder")
                
                # If test folder doesn't exist or is empty, create it from training data
                if not os.path.exists(test_folder) or not os.listdir(test_folder):
                    print("Creating test folder from training data")
                    if os.path.exists(train_folder) and os.listdir(train_folder):
                        # For each class in training, move 20% to test
                        import random
                        for class_name in os.listdir(train_folder):
                            train_class_dir = os.path.join(train_folder, class_name)
                            test_class_dir = os.path.join(test_folder, class_name)
                            
                            if os.path.isdir(train_class_dir):
                                os.makedirs(test_class_dir, exist_ok=True)
                                
                                # Get all image files
                                image_files = [f for f in os.listdir(train_class_dir) 
                                             if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
                                
                                # Shuffle and take 20% for test
                                random.shuffle(image_files)
                                split_idx = int(len(image_files) * 0.8)
                                test_files = image_files[split_idx:]
                                
                                # Move files to test folder
                                for f in test_files:
                                    src = os.path.join(train_class_dir, f)
                                    dst = os.path.join(test_class_dir, f)
                                    shutil.copy2(src, dst)  # Copy instead of move to preserve training
                                    
                                print(f"Created test set for class {class_name} with {len(test_files)} images")
            # If no zip file, try the original approach with individual files
            else:
                print("No processed dataset zip found. Looking for individual files...")
                train_classes = {}
                test_classes = {}
                
                for filename in files:
                    # Check if the file has a pathname structure
                    if '/' in filename:
                        parts = filename.split('/')
                        if len(parts) >= 3:  # structure like 'training/class_name/image.jpg'
                            if parts[0] == 'training':
                                class_name = parts[1]
                                image_name = parts[2]
                                
                                # Create class folder if needed
                                if class_name not in train_classes:
                                    train_classes[class_name] = []
                                    # Create folder
                                    class_folder = os.path.join(train_folder, class_name)
                                    os.makedirs(class_folder, exist_ok=True)
                                
                                # Add image to list
                                train_classes[class_name].append((image_name, filename))
                                
                            elif parts[0] == 'testing':
                                class_name = parts[1]
                                image_name = parts[2]
                                
                                # Create class folder if needed
                                if class_name not in test_classes:
                                    test_classes[class_name] = []
                                    # Create folder
                                    class_folder = os.path.join(test_folder, class_name)
                                    os.makedirs(class_folder, exist_ok=True)
                                
                                # Add image to list
                                test_classes[class_name].append((image_name, filename))
                
                # If no classes were found, look for other patterns
                if not train_classes and not test_classes:
                    # Try alternative format (only class folders without train/test)
                    for filename in files:
                        if '/' in filename:
                            parts = filename.split('/')
                            if len(parts) >= 2:  # structure like 'class_name/image.jpg'
                                class_name = parts[0]
                                image_name = parts[1]
                                
                                # 80% to training, 20% to testing
                                # Use hash of filename to determine split to ensure consistency
                                import hashlib
                                hash_val = int(hashlib.md5(image_name.encode()).hexdigest(), 16)
                                is_training = (hash_val % 10) < 8  # 80% to training
                                
                                if is_training:
                                    # Create class folder if needed
                                    if class_name not in train_classes:
                                        train_classes[class_name] = []
                                        # Create folder
                                        class_folder = os.path.join(train_folder, class_name)
                                        os.makedirs(class_folder, exist_ok=True)
                                    
                                    # Add image to list
                                    train_classes[class_name].append((image_name, filename))
                                else:
                                    # Create class folder if needed
                                    if class_name not in test_classes:
                                        test_classes[class_name] = []
                                        # Create folder
                                        class_folder = os.path.join(test_folder, class_name)
                                        os.makedirs(class_folder, exist_ok=True)
                                    
                                    # Add image to list
                                    test_classes[class_name].append((image_name, filename))
                
                # Check if we found any classes
                if not train_classes:
                    # Last resort: check if any files in the database are images directly
                    image_extensions = ('.jpg', '.jpeg', '.png', '.bmp', '.gif')
                    image_files = [f for f in files if any(f.lower().endswith(ext) for ext in image_extensions)]
                    
                    if image_files:
                        print(f"Found {len(image_files)} image files directly in database. Creating default class.")
                        # Create a default class
                        default_class = "default_class"
                        class_folder = os.path.join(train_folder, default_class)
                        os.makedirs(class_folder, exist_ok=True)
                        
                        # Split into train and test
                        import random
                        random.shuffle(image_files)
                        split_idx = int(len(image_files) * 0.8)
                        train_images = image_files[:split_idx]
                        test_images = image_files[split_idx:]
                        
                        # Create train class
                        train_classes[default_class] = [(f, f) for f in train_images]
                        
                        # Create test class
                        test_class_folder = os.path.join(test_folder, default_class)
                        os.makedirs(test_class_folder, exist_ok=True)
                        test_classes[default_class] = [(f, f) for f in test_images]
                    else:
                        raise ValueError("Could not find any training classes in the database")
                
                # Download and save images to temporary directory
                for class_name, images in train_classes.items():
                    class_folder = os.path.join(train_folder, class_name)
                    for image_name, db_path in images:
                        try:
                            # Get image content
                            image_content = db_fs.get_file(db_path, db_dir)
                            # Save to temp directory
                            image_path = os.path.join(class_folder, image_name)
                            with open(image_path, 'wb') as f:
                                f.write(image_content)
                        except Exception as e:
                            print(f"Error retrieving image {db_path}: {e}")
                
                for class_name, images in test_classes.items():
                    class_folder = os.path.join(test_folder, class_name)
                    for image_name, db_path in images:
                        try:
                            # Get image content
                            image_content = db_fs.get_file(db_path, db_dir)
                            # Save to temp directory
                            image_path = os.path.join(class_folder, image_name)
                            with open(image_path, 'wb') as f:
                                f.write(image_content)
                        except Exception as e:
                            print(f"Error retrieving image {db_path}: {e}")
            
            # Now use the temporary directory for processing
            dataset_folder = temp_dir
            
        except Exception as e:
            print(f"Error setting up image dataset from database: {e}")
            # Clean up temp directory
            shutil.rmtree(temp_dir)
            raise
    
    # From here, we use a regular filesystem approach with dataset_folder
    # (which might be a temporary directory for database storage)
    
    # Check if the dataset folder exists
    if not os.path.exists(dataset_folder):
        raise ValueError(f"Dataset folder does not exist: {dataset_folder}")
    
    # Look for train and test folders with different possible names
    possible_train_folders = ['train', 'training', 'Train', 'Training']
    possible_test_folders = ['test', 'testing', 'Test', 'Testing']
    possible_val_folders = ['val', 'validation', 'Val', 'Validation']
    
    train_folder = None
    test_folder = None
    validation_folder = None
    
    # Look for train folder
    for folder_name in possible_train_folders:
        potential_path = os.path.join(dataset_folder, folder_name)
        if os.path.exists(potential_path) and os.path.isdir(potential_path):
            train_folder = potential_path
            break
    
    # Look for test folder
    for folder_name in possible_test_folders:
        potential_path = os.path.join(dataset_folder, folder_name)
        if os.path.exists(potential_path) and os.path.isdir(potential_path):
            test_folder = potential_path
            break
            
    # Look for validation folder
    for folder_name in possible_val_folders:
        potential_path = os.path.join(dataset_folder, folder_name)
        if os.path.exists(potential_path) and os.path.isdir(potential_path):
            validation_folder = potential_path
            break
    
    # If standard folders don't exist, try to find folders with image class subfolders
    if not train_folder:
        # Look for folders that contain class subfolders
        potential_train_folders = []
        for root, dirs, _ in os.walk(dataset_folder):
            if any(os.path.isdir(os.path.join(root, d)) and 
                  any(f.lower().endswith(('.jpg', '.jpeg', '.png')) 
                      for f in os.listdir(os.path.join(root, d)) if os.path.isfile(os.path.join(root, d, f))) 
                  for d in dirs):
                potential_train_folders.append(root)
        
        if potential_train_folders:
            train_folder = potential_train_folders[0]
            print(f"Using {train_folder} as training data folder")
    
    # Check if any training data was found
    if not train_folder:
        raise ValueError("Could not find a valid training data folder with class subfolders")
    
    # List the contents of the training folder for debugging
    print(f"Train folder path: {train_folder}")
    print(f"Train folder contents: {os.listdir(train_folder)}")
    
    # Create data generators with augmentation for training
    train_datagen = ImageDataGenerator(
        rescale=1./255,
        shear_range=0.2,
        zoom_range=0.2,
        horizontal_flip=True,
        validation_split=0.2 if not validation_folder else 0  # Use validation split only if no explicit validation folder
    )
    
    test_datagen = ImageDataGenerator(rescale=1./255)
    
    # Create training generator
    try:
        if not validation_folder:
            # If no validation folder, use validation_split
            training_generator = train_datagen.flow_from_directory(
                train_folder,
                target_size=(64, 64),
                batch_size=32,
                class_mode='categorical',
                subset='training'  # Use 80% for training
            )
            
            # Create validation generator from training data
            validation_generator = train_datagen.flow_from_directory(
                train_folder,
                target_size=(64, 64),
                batch_size=32,
                class_mode='categorical',
                subset='validation'  # Use 20% for validation
            )
        else:
            # If validation folder exists, use it directly
            training_generator = train_datagen.flow_from_directory(
                train_folder,
                target_size=(64, 64),
                batch_size=32,
                class_mode='categorical'
            )
            
            validation_generator = test_datagen.flow_from_directory(
                validation_folder,
                target_size=(64, 64),
                batch_size=32,
                class_mode='categorical'
            )
        
        # Create test generator if test folder exists
        if test_folder:
            testing_generator = test_datagen.flow_from_directory(
                test_folder,
                target_size=(64, 64),
                batch_size=32,
                class_mode='categorical'
            )
        else:
            # Use validation set as test set if no separate test folder
            testing_generator = validation_generator
    except Exception as e:
        print(f"Error creating data generators: {e}")
        # Check if train_folder contains any class folders
        class_folders = [d for d in os.listdir(train_folder) if os.path.isdir(os.path.join(train_folder, d))]
        if not class_folders:
            # If no class folders, create one from all images
            print("No class folders found, creating a default class")
            default_class = "default_class"
            default_class_dir = os.path.join(train_folder, default_class)
            os.makedirs(default_class_dir, exist_ok=True)
            
            # Move all images to the default class
            for f in os.listdir(train_folder):
                if f.lower().endswith(('.jpg', '.jpeg', '.png')) and os.path.isfile(os.path.join(train_folder, f)):
                    src = os.path.join(train_folder, f)
                    dst = os.path.join(default_class_dir, f)
                    shutil.move(src, dst)
            
            # Try again
            training_generator = train_datagen.flow_from_directory(
                train_folder,
                target_size=(64, 64),
                batch_size=32,
                class_mode='categorical',
                subset='training'
            )
            
            validation_generator = train_datagen.flow_from_directory(
                train_folder,
                target_size=(64, 64),
                batch_size=32,
                class_mode='categorical',
                subset='validation'
            )
            
            testing_generator = validation_generator
        else:
            raise
    
    # Get class names and number of classes
    class_names = list(training_generator.class_indices.keys())
    num_classes = len(class_names)
    
    print(f"Found {num_classes} classes: {class_names}")
    print(f"Training samples: {training_generator.samples}")
    print(f"Validation samples: {validation_generator.samples}")
    print(f"Testing samples: {testing_generator.samples}")
    
    # Create preprocessor dictionary with all necessary information
    preprocessor = {
        'training_generator': training_generator,
        'validation_generator': validation_generator,
        'testing_generator': testing_generator,
        'num_classes': num_classes,
        'class_names': class_names,
        'image_shape': (64, 64, 3)
    }
    
    # Clean up temp directory if we're using database storage
    if is_database:
        try:
            # Don't delete yet as the generators are still using the files
            # Instead, register a cleanup function to run when the Python process exits
            import atexit
            atexit.register(lambda: shutil.rmtree(temp_dir, ignore_errors=True))
        except Exception as e:
            print(f"Error registering cleanup for temp directory: {e}")
    
    # Return both individual components and the preprocessor dictionary
    # This maintains compatibility with both the old and new interfaces
    return training_generator, testing_generator, None, None, preprocessor, class_names