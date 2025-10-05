from flask import Flask, request, jsonify, send_file
import pandas as pd
import os
import io
import zipfile
import shutil
import uuid
import json
import logging
from data_handling import download_kaggle_dataset, generate_dataset_from_text, auto_detect_task_type
from preprocessing import preprocess_dataset
from model_training import train_models, save_best_model
from visualization import create_visualization
from utils import generate_loading_code, write_requirements_file, create_project_zip
from db_system_integration import apply_patches

# Initialize Flask app
app = Flask(__name__)

db_fs = apply_patches()

# Create directories in the specified path
BASE_DIR = "ml_system"
os.makedirs(BASE_DIR, exist_ok=True)

# Create a directory for storing datasets
DATASETS_DIR = os.path.join(BASE_DIR, 'datasets')
os.makedirs(DATASETS_DIR, exist_ok=True)

# Create a directory for storing models
MODELS_DIR = os.path.join(BASE_DIR, 'models')
os.makedirs(MODELS_DIR, exist_ok=True)

# Create a directory for storing downloads
DOWNLOADS_DIR = os.path.join(BASE_DIR, 'downloads')
os.makedirs(DOWNLOADS_DIR, exist_ok=True)

# Set up logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
handler = logging.FileHandler('data_processing.log')
handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
logger.addHandler(handler)
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.INFO)
logger.addHandler(console_handler)

@app.route('/process', methods=['POST'])
def process():
    """Process the uploaded data and train a model (basic ML only)"""
    try:
        # Get form data
        task_type = request.form.get('task_type', 'classification')
        text_prompt = request.form.get('text_prompt', '')
        
        # Extract project and user context from request headers or form
        project_id = request.form.get('project_id') or request.headers.get('X-Project-Id')
        user_id = request.form.get('user_id') or request.headers.get('X-User-Id')
        project_name = request.form.get('project_name') or request.headers.get('X-Project-Name')
        
        # Log project context for debugging  
        logger.info(f"Processing request - Project Context: ID={project_id}, User={user_id}, Name={project_name}")
        
        logger.info(f"Processing request - Task Type: {task_type}")
        
        # Initialize variables
        df = None
        detected_task_type = None
        
        # Only handle basic ML tasks (no image processing for now)
        if task_type in ['image_classification', 'object_detection']:
            return jsonify({
                'error': 'Image processing and object detection are temporarily disabled. Please use classification or regression tasks.'
            })
        
        # Check if a file was uploaded
        if 'file' in request.files and request.files['file'].filename != '':
            file = request.files['file']

            for existing_file in os.listdir(DATASETS_DIR):
                os.remove(os.path.join(DATASETS_DIR, existing_file))
    
            # Save the file directly to DATASETS_DIR
            file_path = os.path.join(DATASETS_DIR, file.filename)
            file.save(file_path)
    
            # Auto-detect task type from the file
            detected_task_type, df_loaded = auto_detect_task_type(file_path)
            df = df_loaded  # Use the loaded dataframe from auto-detection
            
            logger.info(f"Auto-detected task type for uploaded file: {detected_task_type}")
            
            # If detected type differs from user selection, use the detected type
            if detected_task_type and detected_task_type != task_type:
                logger.info(f"Changing task type from {task_type} to {detected_task_type} based on file analysis")
                task_type = detected_task_type
        
        # Try to download from Kaggle if text prompt is provided
        elif text_prompt:
            # First try Kaggle
            kaggle_result = download_kaggle_dataset(text_prompt, DATASETS_DIR)
            
            if isinstance(kaggle_result, tuple) and len(kaggle_result) == 2:
                # Unpack the result containing file path and detected task type
                kaggle_file, detected_task_type = kaggle_result
            else:
                # For backward compatibility if the function wasn't updated
                kaggle_file = kaggle_result
                detected_task_type = None
                
            if kaggle_file:
                df = pd.read_csv(kaggle_file)
                logger.info(f"Dataset downloaded from Kaggle: {kaggle_file}")
                
                # Use detected task type if available
                if detected_task_type:
                    logger.info(f"Auto-detected task type for Kaggle dataset: {detected_task_type}")
                    if detected_task_type != task_type:
                        logger.info(f"Changing task type from {task_type} to {detected_task_type} based on dataset analysis")
                        task_type = detected_task_type
            else:
                # If Kaggle fails, generate synthetic data
                generation_result = generate_dataset_from_text(text_prompt)
                
                if isinstance(generation_result, tuple) and len(generation_result) == 2:
                    # Unpack the result containing dataframe and detected task type
                    df, detected_task_type = generation_result
                else:
                    # For backward compatibility if the function wasn't updated
                    df = generation_result
                    detected_task_type = None
                
                logger.info("Generated synthetic dataset from text prompt")
                
                # Use detected task type for generated data if available
                if detected_task_type:
                    logger.info(f"Auto-detected task type for generated dataset: {detected_task_type}")
                    if detected_task_type != task_type:
                        logger.info(f"Changing task type from {task_type} to {detected_task_type} based on generated data analysis")
                        task_type = detected_task_type
        
        # Return error if no data was provided
        else:
            return jsonify({'error': 'No data provided. Please upload a file or provide a text prompt.'})
        
        # Process data and train model
        if df is not None:
            # Preprocess data
            X_train, X_test, y_train, y_test, preprocessor, feature_names = preprocess_dataset(df, task_type)
            
            # Train model
            best_model, best_model_name, best_score, y_pred = train_models(
                X_train, y_train, X_test, y_test, task_type, MODELS_DIR
            )
            
            # Create visualizations
            visualizations = create_visualization(task_type, y_test, y_pred, best_model, X_test, feature_names, text_prompt)
            
            # Create data preview
            data_preview = {
                'columns': df.columns.tolist(),
                'data': df.head(10).values.tolist()
            }
            
            # Save model
            model_file = "best_model.pkl"
            save_best_model(best_model, MODELS_DIR)
            
            # Generate loading code
            generate_loading_code(model_file, feature_names, DOWNLOADS_DIR)
            
            # Write requirements file
            write_requirements_file(DOWNLOADS_DIR)
            
            # Create project ZIP
            zip_result = create_project_zip(model_file, MODELS_DIR, DOWNLOADS_DIR, 
                                            project_id=project_id, user_id=user_id, project_name=project_name, task_type=task_type)
            
            # Handle both old format (string) and new format (dict)
            if isinstance(zip_result, dict):
                zip_path = zip_result['local_path']
                cloudinary_info = zip_result.get('cloudinary')
            else:
                zip_path = zip_result
                cloudinary_info = None
            
            # Prepare response
            response_data = {
                'success': True,
                'detected_task_type': task_type,  # Add detected task type
                'model_info': {
                    'model_name': best_model_name,
                    'score': best_score,
                    'task_type': task_type  # Add task type to model_info
                },
                'data_preview': data_preview,
                'visualizations': {
                    'plots': visualizations
                },
                'download_url': f'/api/download/{os.path.basename(zip_path)}'
            }
            
            # Add Cloudinary info if available
            if cloudinary_info:
                response_data['cloudinary'] = cloudinary_info
            
            # Return results
            return jsonify(response_data)
        
        else:
            return jsonify({'error': 'Failed to process data.'})
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)})

@app.route('/api/download/<filename>', methods=['GET'])
def download(filename):
    """Download a file from database or filesystem"""
    try:
        import tempfile
        
        # Check if we're using database storage
        if db_fs is not None:
            try:
                # Get the file from database
                temp_dir = tempfile.gettempdir()
                temp_path = os.path.join(temp_dir, filename)
                
                # Save to a temporary file
                content = db_fs.get_file(filename, 'downloads')  # Always use 'downloads' directory name
                
                if not content:
                    logger.error(f"File not found in database: {filename}")
                    return jsonify({'error': f'File not found in database: {filename}'}), 404
                
                with open(temp_path, 'wb') as f:
                    f.write(content)
                
                # Return the file and remove it after sending
                return send_file(temp_path, as_attachment=True, download_name=filename)
            except Exception as db_error:
                logger.error(f"Database file retrieval error: {str(db_error)}")
                
                # Fallback to filesystem approach if database fails
                if os.path.exists(os.path.join(DOWNLOADS_DIR, filename)):
                    logger.info(f"Falling back to filesystem for file: {filename}")
                    return send_file(os.path.join(DOWNLOADS_DIR, filename), as_attachment=True)
                return jsonify({'error': f'Error retrieving file from database: {str(db_error)}'}), 404
        else:
            # Standard filesystem approach
            file_path = os.path.join(DOWNLOADS_DIR, filename)
            if not os.path.exists(file_path):
                logger.error(f"File not found in filesystem: {file_path}")
                return jsonify({'error': f'File not found: {filename}'}), 404
                
            return send_file(file_path, as_attachment=True)
    except Exception as e:
        logger.error(f"Download error: {str(e)}")
        return jsonify({'error': f'Error downloading file: {str(e)}'}), 500

if __name__ == '__main__':
    print("🚀 Starting FreeMindAI Flask Server (Basic ML only)")
    print("📊 Supports: Classification, Regression")
    print("⚠️  Image tasks temporarily disabled")
    print("🌐 Server will be available at http://127.0.0.1:5000")
    app.run(debug=False, host='0.0.0.0', port=5000)