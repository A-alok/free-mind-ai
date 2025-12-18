import os
import io
import zipfile
import shutil
import pandas as pd
import numpy as np
import random
import yaml
# from kaggle.api.kaggle_api_extended import KaggleApi # Lazy import to avoid startup crash
import logging
from scipy import stats
import tempfile
import csv
from db_file_system import DBFileSystem

# Initialize the database file system
db_fs = DBFileSystem()

try:
    import google.generativeai as genai
    import os
    from dotenv import load_dotenv
    
    GEMINI_AVAILABLE = True
    
    # Load environment variables from .env and .env.local
    load_dotenv('.env')
    load_dotenv('.env.local', override=True)
    
    # Configure Gemini API with key from environment variables
    api_key = os.getenv('GOOGLE_API_KEY')
    if not api_key:
        print("WARNING: GOOGLE_API_KEY not found. Gemini features will be disabled.")
        GEMINI_AVAILABLE = False
    else:
        genai.configure(api_key=api_key)
    
except ImportError:
    GEMINI_AVAILABLE = False

def download_kaggle_dataset(query, datasets_dir):
    """Download a dataset from Kaggle based on a query, then auto-detect task type"""
    try:
        # Initialize the Kaggle API (Lazy import)
        try:
            from kaggle.api.kaggle_api_extended import KaggleApi
        except ImportError:
            print("Error: kaggle package not installed.")
            return "Error: kaggle package not installed."

        api = KaggleApi()
        api.authenticate()
        
        # Clear the dataset folder before downloading the new dataset
        # In database approach, we simply clear the 'datasets' directory in the database
        db_fs.clear_directory('datasets')
        
        # Search for datasets matching the query
        datasets = api.dataset_list(search=query)
        if datasets:
            dataset = datasets[0]  # Get the first result
            dataset_name = dataset.ref  # Dataset reference
            
            # Create temporary directory for download
            temp_dir = tempfile.mkdtemp()
            
            # Download the dataset files to the temporary folder
            api.dataset_download_files(dataset_name, path=temp_dir, unzip=True)
            
            # List the files in the download folder
            downloaded_files = os.listdir(temp_dir)
            
            # Find the first CSV file
            csv_file_path = None
            for file in downloaded_files:
                if file.endswith('.csv'):
                    local_csv_path = os.path.join(temp_dir, file)
                    
                    # Save to database
                    db_fs.save_file(local_csv_path, 'datasets')
                    
                    # Use database path for further operations
                    csv_file_path = os.path.join(datasets_dir, file)
                    break
            
            # Clean up temporary directory
            shutil.rmtree(temp_dir)
            
            if csv_file_path:
                # Auto-detect task type based on the dataset
                detected_task_type, df = auto_detect_task_type(csv_file_path)
                
                # Use Gemini as second opinion if available
                gemini_task_type = None
                if GEMINI_AVAILABLE:
                    gemini_task_type = get_gemini_task_type_opinion(df, query)
                
                # Determine final task type based on both analyses
                final_task_type = determine_final_task_type(detected_task_type, gemini_task_type)
                
                logging.info(f"Dataset downloaded from Kaggle: {csv_file_path}")
                logging.info(f"Auto-detected task type: {final_task_type}")
                
                return csv_file_path, final_task_type
            
            return None, None
    except Exception as e:
        print(f"Error searching for Kaggle datasets: {e}")
        return None, None

def auto_detect_task_type(csv_path):
    """
    Analyze the CSV to detect if it's more suitable for regression or classification
    Returns the detected task type and the loaded dataframe
    """
    def try_read_csv_with_encoding(content_or_path, is_content=False):
        """
        Try to read CSV robustly with multiple encodings, delimiters, and fallbacks.
        Also supports Excel files if detected.
        """
        def make_buffer():
            return io.BytesIO(content_or_path) if is_content else content_or_path
        
        def attempt_read(**kwargs):
            if is_content:
                return pd.read_csv(io.BytesIO(content_or_path), **kwargs)
            else:
                return pd.read_csv(content_or_path, **kwargs)
        
        # First, if it's clearly an Excel file, try that
        try:
            if is_content and isinstance(content_or_path, (bytes, bytearray)) and content_or_path[:2] == b'PK':
                # Likely an .xlsx (zip-based)
                try:
                    import openpyxl  # noqa: F401
                    return pd.read_excel(io.BytesIO(content_or_path), engine='openpyxl')
                except Exception:
                    pass
            if not is_content and isinstance(content_or_path, str) and content_or_path.lower().endswith(('.xlsx', '.xls')):
                try:
                    return pd.read_excel(content_or_path)
                except Exception:
                    pass
        except Exception:
            # Ignore and continue with CSV attempts
            pass
        
        encodings = ['utf-8', 'cp1252', 'latin-1', 'iso-8859-1', 'utf-16', 'ascii']
        delims = [',', ';', '\t', '|']
        
        # 1) Straightforward attempts with default comma
        for encoding in encodings:
            try:
                return attempt_read(encoding=encoding)
            except (UnicodeDecodeError, UnicodeError, pd.errors.ParserError):
                continue
            except Exception as e:
                if 'codec' not in str(e).lower() and 'decode' not in str(e).lower():
                    # Could be structural, try other strategies
                    pass
        
        # 2) Use Python engine with delimiter inference
        for encoding in encodings:
            try:
                return attempt_read(encoding=encoding, sep=None, engine='python')
            except (UnicodeDecodeError, UnicodeError, pd.errors.ParserError):
                continue
            except Exception:
                continue
        
        # 3) Try common delimiters explicitly
        for encoding in encodings:
            for sep in delims:
                try:
                    return attempt_read(encoding=encoding, sep=sep, engine='python')
                except (UnicodeDecodeError, UnicodeError, pd.errors.ParserError):
                    continue
                except Exception:
                    continue
        
        # 4) Try regex separator over common delimiters
        for encoding in encodings:
            try:
                return attempt_read(encoding=encoding, sep=r'[\,\;\t\|]+', engine='python')
            except (UnicodeDecodeError, UnicodeError, pd.errors.ParserError):
                continue
            except Exception:
                continue
        
        # 5) Skip bad lines to salvage data
        for encoding in encodings:
            try:
                return attempt_read(encoding=encoding, sep=None, engine='python', on_bad_lines='skip')
            except Exception:
                continue
        
        # 6) Try chardet detection
        try:
            import chardet
            if is_content:
                detected_encoding = chardet.detect(content_or_path)['encoding']
                if detected_encoding:
                    try:
                        return attempt_read(encoding=detected_encoding, sep=None, engine='python', on_bad_lines='skip')
                    except Exception:
                        return attempt_read(encoding=detected_encoding)
            else:
                with open(content_or_path, 'rb') as f:
                    raw_data = f.read()
                    detected_encoding = chardet.detect(raw_data)['encoding']
                    if detected_encoding:
                        try:
                            return attempt_read(encoding=detected_encoding, sep=None, engine='python', on_bad_lines='skip')
                        except Exception:
                            return attempt_read(encoding=detected_encoding)
        except ImportError:
            print("chardet not available for encoding detection")
        except Exception as e:
            print(f"Chardet encoding detection failed: {e}")
        
        # 7) Final fallback: errors='ignore' to force read
        try:
            if is_content:
                return pd.read_csv(io.BytesIO(content_or_path), encoding='utf-8', errors='ignore', sep=None, engine='python', on_bad_lines='skip')
            else:
                return pd.read_csv(content_or_path, encoding='utf-8', errors='ignore', sep=None, engine='python', on_bad_lines='skip')
        except Exception as e:
            raise ValueError(f"Failed to read file as CSV/Excel with any strategy: {e}")
    
    try:
        # Check if the path is in the database
        if 'ml_system' in csv_path:
            # Get the directory and filename
            parts = csv_path.replace('\\', '/').strip('/').split('/')
            idx = parts.index('ml_system')
            if idx + 1 < len(parts) and idx + 2 < len(parts):
                dir_name = parts[idx + 1]
                filename = parts[idx + 2]
                
                # Get the file from database and load as DataFrame
                content = db_fs.get_file(filename, dir_name)
                df = try_read_csv_with_encoding(content, is_content=True)
            else:
                raise ValueError(f"Invalid database path: {csv_path}")
        else:
            # Load directly from file path
            df = try_read_csv_with_encoding(csv_path, is_content=False)
        
        # Get the target column (last column)
        target_col = df.columns[-1]
        target_values = df[target_col].dropna()
        
        # If target is empty, get second-to-last column in case of ordering issues
        if len(target_values) == 0 and len(df.columns) > 1:
            target_col = df.columns[-2]
            target_values = df[target_col].dropna()
        
        # Get unique values in target
        unique_values = target_values.unique()
        num_unique = len(unique_values)
        
        # Check if the target has numerical values
        is_numeric = pd.api.types.is_numeric_dtype(target_values)
        
        if is_numeric:
            # If numeric, check various indicators
            value_range = target_values.max() - target_values.min()
            fraction_unique = num_unique / len(target_values)
            
            # Check if values are mostly integers
            is_mostly_integer = np.mean([float(x).is_integer() for x in target_values if not pd.isna(x)]) > 0.9
            
            # Check if distribution is continuous (using KDE)
            try:
                kde = stats.gaussian_kde(target_values)
                x = np.linspace(target_values.min(), target_values.max(), 1000)
                y = kde(x)
                continuity_score = np.std(y) / np.mean(y) if np.mean(y) > 0 else 0
            except:
                continuity_score = 0
            
            # Check correlation with other numerical features
            numerical_cols = df.select_dtypes(include=['float64', 'int64']).columns
            avg_correlation = 0
            if len(numerical_cols) > 1:
                correlations = []
                for col in numerical_cols:
                    if col != target_col:
                        corr = abs(df[col].corr(df[target_col]))
                        if not pd.isna(corr):
                            correlations.append(corr)
                if correlations:
                    avg_correlation = sum(correlations) / len(correlations)
            
            # Determine if regression or classification based on multiple factors
            regression_score = 0
            regression_score += 1 if fraction_unique > 0.4 else 0
            regression_score += 1 if not is_mostly_integer else 0
            regression_score += 1 if value_range > 10 else 0
            regression_score += 1 if continuity_score < 2 else 0
            regression_score += 1 if avg_correlation > 0.3 else 0
            
            if regression_score >= 3:
                return "regression", df
            else:
                return "classification", df
        else:
            # If target is not numeric, it's likely classification
            # Check for NLP task - if there are text columns with more than a few words
            text_features = False
            for col in df.columns:
                if df[col].dtype == 'object':
                    # Check if column contains longer text (average > 15 chars)
                    sample = df[col].dropna().astype(str).sample(min(100, len(df)))
                    if sample.str.len().mean() > 15:
                        text_features = True
                        break
            
            if text_features:
                return "nlp", df
            else:
                return "classification", df
    except Exception as e:
        print(f"Error in auto_detect_task_type: {e}")
        # Default to classification if detection fails
        
        # Try to load from database with encoding fallback
        if 'ml_system' in csv_path:
            parts = csv_path.replace('\\', '/').strip('/').split('/')
            idx = parts.index('ml_system')
            if idx + 1 < len(parts) and idx + 2 < len(parts):
                dir_name = parts[idx + 1]
                filename = parts[idx + 2]
                content = db_fs.get_file(filename, dir_name)
                try:
                    df = try_read_csv_with_encoding(content, is_content=True)
                    return "classification", df
                except Exception as fallback_e:
                    print(f"Fallback CSV reading also failed: {fallback_e}")
                    raise ValueError(f"Cannot read CSV file: {e}")
        
        # Fall back to direct file reading with encoding fallback
        try:
            df = try_read_csv_with_encoding(csv_path, is_content=False)
            return "classification", df
        except Exception as fallback_e:
            print(f"Fallback CSV reading also failed: {fallback_e}")
            raise ValueError(f"Cannot read CSV file: {e}")

def get_gemini_task_type_opinion(df, query):
    """
    Use Gemini to analyze the dataset and determine the most appropriate task type
    """
    if not GEMINI_AVAILABLE:
        return None
    
    try:
        # Prepare the dataset sample for Gemini
        df_sample = df.head(5).to_string()
        
        # Prepare the column information
        column_info = {}
        for col in df.columns:
            unique_count = df[col].nunique()
            is_numeric = pd.api.types.is_numeric_dtype(df[col])
            column_info[col] = {
                "type": "numeric" if is_numeric else "categorical",
                "unique_values": unique_count,
                "sample_values": df[col].dropna().sample(min(5, df[col].count())).tolist()
            }
        
        # Create prompt for Gemini
        prompt = f"""
        Analyze this dataset sample for "{query}" and determine if it's best suited for regression, classification, or NLP task.
        
        Dataset sample:
        {df_sample}
        
        Column information:
        {column_info}
        
        Consider:
        1. For regression: target column should be continuous numeric (like prices, temperatures, etc.)
        2. For classification: target column should have discrete categories/classes (like yes/no, categories)
        3. For NLP: should have significant text content for analysis
        
        Only respond with one of these exact words: "regression", "classification", or "nlp".
        """
        
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(prompt)
        response_text = response.text.strip().lower()
        
        # Map to valid task types
        if "regression" in response_text:
            return "regression"
        elif "classification" in response_text:
            return "classification" 
        elif "nlp" in response_text:
            return "nlp"
        else:
            return None
    except Exception as e:
        print(f"Error getting Gemini's opinion: {e}")
        return None

def determine_final_task_type(detected_type, gemini_type):
    """
    Determine the final task type based on statistical detection and Gemini's opinion
    """
    if gemini_type is None:
        # If Gemini couldn't analyze, trust the statistical detection
        return detected_type
    
    if detected_type == gemini_type:
        # If both agree, we're confident in the task type
        return detected_type
    
    # If they disagree, give precedence to Gemini's analysis
    # as it might catch contextual clues the statistical analysis missed
    return gemini_type

def generate_dataset_from_text(text):
    """Generate a synthetic dataset based on text description"""
    if GEMINI_AVAILABLE:
        try:
            model = genai.GenerativeModel(model_name="gemini-2.5-flash")
            response = model.generate_content([
                f"Generate a dataset in CSV format based on the following text without explanation, "
                f"just data and I want 200 rows and 5 columns, avoid repeating data both numeric as well as "
                f"categorical also strictly don't give ''' csv ''' or '''  ''' with dataset : {text}."
            ])
            csv_data = response.text
            df = pd.read_csv(io.StringIO(csv_data))
            
            # Auto-detect task type for the generated dataset
            detected_task_type, _ = auto_detect_task_type(io.StringIO(csv_data))
            
            # Save to database
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.csv')
            try:
                df.to_csv(temp_file.name, index=False)
                temp_file.close()
                db_fs.save_file(temp_file.name, 'datasets')
            finally:
                # Clean up temporary file
                if os.path.exists(temp_file.name):
                    os.remove(temp_file.name)
            
            return df, detected_task_type
        except Exception as e:
            print(f"Error generating dataset with Gemini: {e}")
            # Fall back to random data generation
    
    # Create a simple dataset with 5 columns and 200 rows
    columns = ['feature1', 'feature2', 'feature3', 'feature4', 'target']
    data = []
    
    for _ in range(200):
        row = [
            random.uniform(0, 100),  # feature1 (numeric)
            random.uniform(0, 50),   # feature2 (numeric)
            random.choice(['A', 'B', 'C']),  # feature3 (categorical)
            random.choice(['X', 'Y', 'Z']),  # feature4 (categorical)
            random.choice([0, 1])    # target (binary classification)
        ]
        data.append(row)
    
    df = pd.DataFrame(data, columns=columns)
    
    # Save to database
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.csv')
    try:
        df.to_csv(temp_file.name, index=False)
        temp_file.close()
        db_fs.save_file(temp_file.name, 'datasets')
    finally:
        # Clean up temporary file
        if os.path.exists(temp_file.name):
            os.remove(temp_file.name)
    
    return df, "classification"  # Default task type for randomly generated data

def safe_copy(src, dst):
    """
    Safely copy a file, handling same file errors
    Modified to work with database when path contains ml_system
    """
    try:
        # Check if destination is in database
        if 'ml_system' in dst:
            parts = dst.replace('\\', '/').strip('/').split('/')
            idx = parts.index('ml_system')
            if idx + 1 < len(parts):
                dir_name = parts[idx + 1]
                # Save to database
                db_fs.save_file(src, dir_name)
                return
        
        # Check if source is in database
        if 'ml_system' in src:
            parts = src.replace('\\', '/').strip('/').split('/')
            idx = parts.index('ml_system')
            if idx + 1 < len(parts) and idx + 2 < len(parts):
                dir_name = parts[idx + 1]
                filename = parts[idx + 2]
                
                # Get from database and save to destination
                content = db_fs.get_file(filename, dir_name)
                
                # Create destination directory if it doesn't exist
                os.makedirs(os.path.dirname(dst), exist_ok=True)
                
                # Write to destination
                with open(dst, 'wb') as f:
                    f.write(content)
                return
                
        # For regular files, use normal copy logic
        # Create destination directory if it doesn't exist
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        
        # Try to check if they're the same file first
        if os.path.exists(dst) and os.path.samefile(src, dst):
            print(f"Skipping copy as {src} and {dst} are the same file")
            return
        
        # Ensure we have read permissions
        os.chmod(src, 0o644)
        
        # Copy the file
        shutil.copy2(src, dst)
    except shutil.SameFileError:
        print(f"Skipping copy as {src} and {dst} are the same file")
    except PermissionError:
        print(f"Permission denied when copying {src} to {dst}")
    except Exception as e:
        print(f"Error copying {src} to {dst}: {e}")

def process_dataset_folder(uploaded_zip, task_type="image_classification", datasets_dir=None):
    """
    Process uploaded dataset folder zip file
    Modified to work with database storage
    """
    # Ensure datasets_dir exists
    if datasets_dir is None:
        raise ValueError("Datasets directory must be specified")
    
    # Clear old files in database 'datasets' directory
    db_fs.clear_directory('datasets')
    
    # Create temporary directory for processing
    temp_dir = tempfile.mkdtemp()
    
    try:
        # Save the uploaded zip to temp directory
        temp_zip_path = os.path.join(temp_dir, "temp_dataset.zip")
        uploaded_zip.save(temp_zip_path)
        
        # Extract the zip file to temp directory
        with zipfile.ZipFile(temp_zip_path, 'r') as zip_ref:
            zip_ref.extractall(temp_dir)
        
        # Remove the temporary zip file
        os.remove(temp_zip_path)
        
        # Process differently based on task type
        if task_type == "object_detection":
            dataset_info = process_yolo_dataset_with_db(temp_dir, datasets_dir)
        else:
            dataset_info = process_classification_dataset_with_db(temp_dir, datasets_dir)
        
        return dataset_info
    finally:
        # Clean up the temporary directory
        shutil.rmtree(temp_dir)
def process_classification_dataset_with_db(temp_dir, datasets_dir):
    """
    Process image classification dataset and store in database
    """
    import os
    import shutil
    import random

    # Find the main dataset folder
    dataset_folder = None
    for item in os.listdir(temp_dir):
        item_path = os.path.join(temp_dir, item)
        if os.path.isdir(item_path):
            dataset_folder = item_path
            break
    
    if not dataset_folder:
        raise ValueError("No dataset folder found in the uploaded zip")

    # Create temporary training and testing directories
    train_dir = os.path.join(temp_dir, "training")
    test_dir = os.path.join(temp_dir, "testing")
    os.makedirs(train_dir, exist_ok=True)
    os.makedirs(test_dir, exist_ok=True)

    # Find class folders
    class_folders = []
    for class_name in os.listdir(dataset_folder):
        class_path = os.path.join(dataset_folder, class_name)
        
        # Verify it's a directory and contains images
        if os.path.isdir(class_path):
            images = [f for f in os.listdir(class_path) 
                      if os.path.isfile(os.path.join(class_path, f)) and 
                      f.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp', '.gif'))]
            
            if images:
                class_folders.append((class_name, class_path, images))

    # Validate class folders
    if not class_folders:
        raise ValueError(f"No valid image class folders found in {dataset_folder}.")

    # Process each class folder
    for class_name, class_path, images in class_folders:
        # Create corresponding train and test class directories
        train_class_dir = os.path.join(train_dir, class_name)
        test_class_dir = os.path.join(test_dir, class_name)
        os.makedirs(train_class_dir, exist_ok=True)
        os.makedirs(test_class_dir, exist_ok=True)

        # Shuffle images for random split
        random.shuffle(images)

        # Split images (80% train, 20% test)
        split_idx = int(len(images) * 0.8)
        train_images = images[:split_idx]
        test_images = images[split_idx:]

        # Copy train images
        for img in train_images:
            src_path = os.path.join(class_path, img)
            dst_path = os.path.join(train_class_dir, img)
            shutil.copy2(src_path, dst_path)

        # Copy test images
        for img in test_images:
            src_path = os.path.join(class_path, img)
            dst_path = os.path.join(test_class_dir, img)
            shutil.copy2(src_path, dst_path)

    # Now we need to save the processed structure to the database
    # Create a zip file of the processed structure
    result_zip_path = os.path.join(temp_dir, "processed_dataset.zip")
    with zipfile.ZipFile(result_zip_path, 'w') as zipf:
        # Add training directory
        for root, _, files in os.walk(train_dir):
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, temp_dir)
                zipf.write(file_path, arcname)
        
        # Add testing directory
        for root, _, files in os.walk(test_dir):
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, temp_dir)
                zipf.write(file_path, arcname)
    
    # Save the zip to database
    db_fs.save_file(result_zip_path, 'datasets')
    
    # Prepare dataset information
    folder_structure = ["Dataset structure:"]
    
    # Count and log training images
    folder_structure.append("├── training/")
    total_train_images = 0
    for class_name in os.listdir(train_dir):
        class_path = os.path.join(train_dir, class_name)
        if os.path.isdir(class_path):
            file_count = len([f for f in os.listdir(class_path) if os.path.isfile(os.path.join(class_path, f))])
            folder_structure.append(f"│   ├── {class_name}/ ({file_count} images)")
            total_train_images += file_count
    
    # Count and log testing images
    folder_structure.append("└── testing/")
    total_test_images = 0
    for class_name in os.listdir(test_dir):
        class_path = os.path.join(test_dir, class_name)
        if os.path.isdir(class_path):
            file_count = len([f for f in os.listdir(class_path) if os.path.isfile(os.path.join(class_path, f))])
            folder_structure.append(f"    ├── {class_name}/ ({file_count} images)")
            total_test_images += file_count

    # Prepare return dictionary
    dataset_info = {
        'structure': "\n".join(folder_structure),
        'total_train_images': total_train_images,
        'total_test_images': total_test_images,
        'classes': [class_name for class_name in os.listdir(train_dir) if os.path.isdir(os.path.join(train_dir, class_name))]
    }

    return dataset_info

def process_yolo_dataset_with_db(temp_dir, datasets_dir):
    """
    Process YOLO dataset and store in database
    Modified to fix path issues with YOLO training
    """
    folder_structure = []
    folder_structure.append("YOLO Dataset structure:")
    
    # Check for common directory names in YOLO datasets
    possible_dirs = {
        'train': ['train', 'training'],
        'val': ['val', 'valid', 'validation'],
        'test': ['test', 'testing']
    }
    
    # Find which directories actually exist
    found_dirs = {}
    for key, variations in possible_dirs.items():
        for dir_name in variations:
            dir_path = os.path.join(temp_dir, dir_name)
            if os.path.exists(dir_path) and os.path.isdir(dir_path):
                found_dirs[key] = dir_path
                break
    
    # Initialize stats collection
    dataset_stats = {}
    class_counts = {}
    
    # Find data.yaml file in the dataset folder
    yaml_files = [f for f in os.listdir(temp_dir) if f.endswith('.yaml')]
    yaml_path = None
    class_names = None
    
    if yaml_files:
        yaml_path = os.path.join(temp_dir, yaml_files[0])
        try:
            with open(yaml_path, 'r') as f:
                yaml_data = yaml.safe_load(f)
                if 'names' in yaml_data:
                    class_names = yaml_data['names']
                    folder_structure.append(f"├── {yaml_files[0]} (Found {len(class_names)} classes)")
                    for idx, name in (enumerate(class_names) if isinstance(class_names, list) 
                                     else class_names.items()):
                        if isinstance(class_names, list):
                            folder_structure.append(f"│   ├── Class {idx}: {name}")
                        else:
                            folder_structure.append(f"│   ├── Class {idx}: {name}")
        except Exception as e:
            folder_structure.append(f"│   ├── Error reading YAML: {str(e)}")
    
    # Check each directory
    for dir_type, dir_path in found_dirs.items():
        folder_structure.append(f"├── {os.path.basename(dir_path)}/")
        dataset_stats[dir_type] = {'images': 0, 'labels': 0}
        
        # Check for images and labels subdirectories
        images_dir = os.path.join(dir_path, 'images')
        labels_dir = os.path.join(dir_path, 'labels')
        
        # Create them if they don't exist
        os.makedirs(images_dir, exist_ok=True)
        os.makedirs(labels_dir, exist_ok=True)
        
        # If the "images" directory doesn't have images but the parent does,
        # move the images to the images directory
        if os.path.exists(dir_path) and len(os.listdir(images_dir)) == 0:
            image_files = [f for f in os.listdir(dir_path) 
                         if os.path.isfile(os.path.join(dir_path, f)) 
                         and f.lower().endswith(('.jpg', '.jpeg', '.png', '.bmp'))]
            
            if image_files:
                print(f"Moving {len(image_files)} images to {images_dir}")
                for f in image_files:
                    shutil.copy2(os.path.join(dir_path, f), os.path.join(images_dir, f))
        
        # Process images directory
        if os.path.exists(images_dir):
            image_files = [f for f in os.listdir(images_dir) 
                          if os.path.isfile(os.path.join(images_dir, f)) 
                          and f.lower().endswith(('.jpg', '.jpeg', '.png', '.bmp'))]
            dataset_stats[dir_type]['images'] = len(image_files)
            folder_structure.append(f"│   ├── images/ ({len(image_files)} files)")
        
        # Process labels directory
        if os.path.exists(labels_dir):
            label_files = [f for f in os.listdir(labels_dir) 
                          if os.path.isfile(os.path.join(labels_dir, f)) 
                          and f.lower().endswith('.txt')]
            dataset_stats[dir_type]['labels'] = len(label_files)
            folder_structure.append(f"│   ├── labels/ ({len(label_files)} files)")
            
            # Analyze labels to find classes if not already known
            if class_names is None:
                class_counts[dir_type] = set()
                for label_file in label_files:
                    try:
                        with open(os.path.join(labels_dir, label_file), 'r') as f:
                            for line in f:
                                parts = line.strip().split()
                                if parts and len(parts) >= 5:  # YOLO format needs at least 5 values
                                    try:
                                        class_id = int(parts[0])
                                        class_counts[dir_type].add(class_id)
                                    except ValueError:
                                        pass
                    except Exception as e:
                        print(f"Error reading label file {label_file}: {e}")
    
    # If validation directory is missing, create it from training
    if 'train' in found_dirs and 'val' not in found_dirs:
        print("Creating validation directory from training data")
        train_path = found_dirs['train']
        val_path = os.path.join(temp_dir, 'val')
        os.makedirs(val_path, exist_ok=True)
        
        # Create images and labels directories
        val_images_dir = os.path.join(val_path, 'images')
        val_labels_dir = os.path.join(val_path, 'labels')
        os.makedirs(val_images_dir, exist_ok=True)
        os.makedirs(val_labels_dir, exist_ok=True)
        
        # Get training images and labels
        train_images_dir = os.path.join(train_path, 'images')
        train_labels_dir = os.path.join(train_path, 'labels')
        
        if os.path.exists(train_images_dir):
            # Get all images
            image_files = [f for f in os.listdir(train_images_dir) 
                          if os.path.isfile(os.path.join(train_images_dir, f)) 
                          and f.lower().endswith(('.jpg', '.jpeg', '.png', '.bmp'))]
            
            # Take 20% for validation
            import random
            random.shuffle(image_files)
            split_idx = int(len(image_files) * 0.8)
            val_images = image_files[split_idx:]
            
            # Copy images to validation
            for img in val_images:
                src_img = os.path.join(train_images_dir, img)
                dst_img = os.path.join(val_images_dir, img)
                shutil.copy2(src_img, dst_img)
                
                # Copy corresponding label if it exists
                base_name = os.path.splitext(img)[0]
                label_file = f"{base_name}.txt"
                src_label = os.path.join(train_labels_dir, label_file)
                if os.path.exists(src_label):
                    dst_label = os.path.join(val_labels_dir, label_file)
                    shutil.copy2(src_label, dst_label)
            
            # Add to found_dirs
            found_dirs['val'] = val_path
            
            # Update stats
            dataset_stats['val'] = {
                'images': len(val_images),
                'labels': sum(1 for img in val_images 
                          if os.path.exists(os.path.join(train_labels_dir, 
                                                      os.path.splitext(img)[0] + '.txt')))
            }
            
            print(f"Created validation set with {len(val_images)} images")
            
            # Add to folder structure
            folder_structure.append(f"├── val/ (created from training data)")
            folder_structure.append(f"│   ├── images/ ({len(val_images)} files)")
            folder_structure.append(f"│   ├── labels/ ({dataset_stats['val']['labels']} files)")
    
    # Create or update data.yaml
    # Combine all found class IDs from all directories
    all_classes = set()
    for classes in class_counts.values():
        all_classes.update(classes)
    
    # If no classes found but we have directories, try harder to find them
    if not all_classes and found_dirs:
        print("No classes detected automatically, checking all label files...")
        for dir_path in found_dirs.values():
            labels_dir = os.path.join(dir_path, 'labels')
            if os.path.exists(labels_dir):
                for label_file in os.listdir(labels_dir):
                    if label_file.endswith('.txt'):
                        try:
                            with open(os.path.join(labels_dir, label_file), 'r') as f:
                                for line in f:
                                    parts = line.strip().split()
                                    if parts and len(parts) >= 5:
                                        try:
                                            class_id = int(parts[0])
                                            all_classes.add(class_id)
                                        except ValueError:
                                            pass
                        except Exception as e:
                            print(f"Error scanning label file {label_file}: {e}")
    
    # If we still can't find classes, assume at least one class
    if not all_classes:
        all_classes = {0}
        print("No classes detected, assuming one class (id=0)")
    
    # Create class names
    class_names = {i: f"class_{i}" for i in sorted(all_classes)}
    
    # Setup the data.yaml content
    yaml_data = {
        'nc': len(class_names),
        'names': class_names
    }
    
    # Add dataset paths using temp_dir (FIX: use temp_dir not datasets_dir)
    for dir_type, dir_path in found_dirs.items():
        base_name = os.path.basename(dir_path)
        # Use paths in the format needed for YOLO training - local file paths in temp_dir
        yaml_data[dir_type] = os.path.join(temp_dir, base_name, 'images')
        
        # Verify the path exists
        if not os.path.exists(yaml_data[dir_type]):
            print(f"Warning: Path {yaml_data[dir_type]} does not exist!")
            # Try to create it
            os.makedirs(yaml_data[dir_type], exist_ok=True)
    
    # Write the data.yaml file
    yaml_path = os.path.join(temp_dir, 'data.yaml')
    with open(yaml_path, 'w') as f:
        yaml.dump(yaml_data, f, default_flow_style=False)
    
    print(f"Created data.yaml at {yaml_path} with these paths:")
    for key, path in yaml_data.items():
        if key in ['train', 'val', 'test']:
            print(f"  {key}: {path} (exists: {os.path.exists(path)})")
    
    folder_structure.append(f"├── data.yaml (Created with {len(class_names)} classes)")
    
    # Now save the entire processed directory to the database as a zip file
    result_zip_path = os.path.join(temp_dir, "yolo_dataset.zip")
    with zipfile.ZipFile(result_zip_path, 'w') as zipf:
        # Add YAML file
        zipf.write(yaml_path, os.path.basename(yaml_path))
        
        # Add all directories
        for dir_type, dir_path in found_dirs.items():
            for root, dirs, files in os.walk(dir_path):
                for file in files:
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, temp_dir)
                    zipf.write(file_path, arcname)
    
    # Save the zip to database
    db_fs.save_file(result_zip_path, 'datasets')
    
    # Also save the data.yaml file separately for easy access
    db_fs.save_file(yaml_path, 'datasets')
    
    # Add dataset statistics
    folder_structure.append("└── Dataset Statistics:")
    total_images = 0
    total_labels = 0
    for dir_type, stats in dataset_stats.items():
        base_name = os.path.basename(found_dirs[dir_type])
        folder_structure.append(f"    ├── {base_name}: {stats['images']} images, {stats['labels']} labels")
        total_images += stats['images']
        total_labels += stats['labels']
    
    # Prepare comprehensive result
    result = {
        'structure': "\n".join(folder_structure),
        'stats': {
            'total_images': total_images,
            'total_labels': total_labels,
            'directory_stats': dataset_stats
        },
        'yaml_path': yaml_path,  # Return the local path to the YAML file
        'class_count': len(class_names) if class_names else 0,
        'classes': list(class_names.values()) if class_names and isinstance(class_names, dict) else class_names if class_names else []
    }
    
    return result
# Logging configuration
def setup_logging():
    """Setup logging configuration"""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(),
            logging.FileHandler('data_processing.log')
        ]
    )
    return logging.getLogger(__name__)

# Create a logger instance
logger = setup_logging()