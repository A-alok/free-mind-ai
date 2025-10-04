from flask import Flask, request, jsonify, send_file
import pandas as pd
import os
import io
import zipfile
import shutil
import uuid
import json
import logging
import time
import threading
from concurrent.futures import ThreadPoolExecutor
from copy import deepcopy
from data_handling import download_kaggle_dataset, generate_dataset_from_text, process_dataset_folder, auto_detect_task_type
from preprocessing import preprocess_dataset, preprocess_image_dataset
from model_training import train_models, train_image_classification_model, train_yolo_model, save_best_model
from visualization import create_visualization, fig_to_base64
from visualization_cnn import create_cnn_visualization  # Import the CNN visualization module
from visualization_object import create_object_detection_visualization  # Import the object detection visualization module
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

# Check if TensorFlow is available
try:
    import tensorflow as tf
    TENSORFLOW_AVAILABLE = True
except ImportError:
    TENSORFLOW_AVAILABLE = False

# Check if YOLO is available
try:
    from ultralytics import YOLO
    import torch
    YOLO_AVAILABLE = True
except ImportError:
    YOLO_AVAILABLE = False

# ===== ASYNC JOB SYSTEM =====

# Global job storage and thread pool
jobs = {}  # {job_id: {"status": str, "progress": str, "result": dict, "error": str, "created_at": float}}
jobs_lock = threading.Lock()
executor = ThreadPoolExecutor(max_workers=int(os.getenv('MAX_WORKERS', '2')))

def create_job():
    """Create a new job with unique ID"""
    job_id = str(uuid.uuid4())
    with jobs_lock:
        jobs[job_id] = {
            "status": "queued",
            "progress": "Job queued for processing",
            "result": None,
            "error": None,
            "created_at": time.time()
        }
    return job_id

def update_job_status(job_id, status, progress=None, result=None, error=None):
    """Update job status and details"""
    with jobs_lock:
        if job_id in jobs:
            jobs[job_id]["status"] = status
            if progress is not None:
                jobs[job_id]["progress"] = progress
            if result is not None:
                jobs[job_id]["result"] = result
            if error is not None:
                jobs[job_id]["error"] = error

def get_job_status(job_id):
    """Get job status and details"""
    with jobs_lock:
        return jobs.get(job_id, {"status": "not_found"})

def cleanup_old_jobs():
    """Clean up jobs older than 1 hour"""
    current_time = time.time()
    with jobs_lock:
        expired_jobs = [job_id for job_id, job in jobs.items() 
                       if current_time - job["created_at"] > 3600]  # 1 hour
        for job_id in expired_jobs:
            del jobs[job_id]
    return len(expired_jobs)

# ===== FLASK ROUTES =====

def process_ml_job(job_id, task_type, text_prompt, file_info=None, folder_info=None):
    """Background worker function to process ML training job"""
    try:
        update_job_status(job_id, "running", "Starting ML pipeline...")
        
        logger.info(f"Processing job {job_id} - Task Type: {task_type}")
        
        # Initialize variables
        df = None
        dataset_folder = None
        dataset_info = None
        detected_task_type = None
        
        # Process uploaded file
        if file_info:
            update_job_status(job_id, "running", "Processing uploaded file...")
            
            # Clear old files
            for existing_file in os.listdir(DATASETS_DIR):
                os.remove(os.path.join(DATASETS_DIR, existing_file))
            
            # Save the file
            file_path = os.path.join(DATASETS_DIR, file_info['filename'])
            with open(file_path, 'wb') as f:
                f.write(file_info['content'])
            
            # Auto-detect task type
            detected_task_type, df_loaded = auto_detect_task_type(file_path)
            df = df_loaded
            
            logger.info(f"Auto-detected task type for uploaded file: {detected_task_type}")
            
            # Use detected type if different
            if detected_task_type and detected_task_type != task_type:
                logger.info(f"Changing task type from {task_type} to {detected_task_type} based on file analysis")
                task_type = detected_task_type
                update_job_status(job_id, "running", f"Detected task type: {task_type}")
        
        # Process uploaded folder
        elif folder_info:
            update_job_status(job_id, "running", "Processing uploaded folder...")
            
            # Save temp file and process
            temp_file_path = os.path.join(DATASETS_DIR, 'temp_folder.zip')
            with open(temp_file_path, 'wb') as f:
                f.write(folder_info['content'])
            
            # Create a mock file object for processing
            class MockFile:
                def __init__(self, path):
                    self.path = path
                def save(self, dest_path):
                    shutil.copy2(self.path, dest_path)
            
            mock_file = MockFile(temp_file_path)
            dataset_info = process_dataset_folder(mock_file, task_type, DATASETS_DIR)
            dataset_folder = DATASETS_DIR
            os.remove(temp_file_path)  # Clean up temp file
        
        # Process text prompt (Kaggle or synthetic)
        elif text_prompt:
            update_job_status(job_id, "running", "Processing text prompt...")
            
            # First try Kaggle
            kaggle_result = download_kaggle_dataset(text_prompt, DATASETS_DIR)
            
            if isinstance(kaggle_result, tuple) and len(kaggle_result) == 2:
                kaggle_file, detected_task_type = kaggle_result
            else:
                kaggle_file = kaggle_result
                detected_task_type = None
            
            if kaggle_file:
                df = pd.read_csv(kaggle_file)
                logger.info(f"Dataset downloaded from Kaggle: {kaggle_file}")
                
                if detected_task_type:
                    logger.info(f"Auto-detected task type for Kaggle dataset: {detected_task_type}")
                    if detected_task_type != task_type:
                        logger.info(f"Changing task type from {task_type} to {detected_task_type} based on dataset analysis")
                        task_type = detected_task_type
                        update_job_status(job_id, "running", f"Detected task type: {task_type}")
            else:
                # Generate synthetic data
                update_job_status(job_id, "running", "Generating synthetic dataset...")
                generation_result = generate_dataset_from_text(text_prompt)
                
                if isinstance(generation_result, tuple) and len(generation_result) == 2:
                    df, detected_task_type = generation_result
                else:
                    df = generation_result
                    detected_task_type = None
                
                logger.info("Generated synthetic dataset from text prompt")
                
                if detected_task_type:
                    logger.info(f"Auto-detected task type for generated dataset: {detected_task_type}")
                    if detected_task_type != task_type:
                        logger.info(f"Changing task type from {task_type} to {detected_task_type} based on generated data analysis")
                        task_type = detected_task_type
                        update_job_status(job_id, "running", f"Detected task type: {task_type}")
        else:
            raise ValueError('No data provided. Please upload a file, folder, or provide a text prompt.')
        
        # Apply dataset size limit for faster processing
        max_rows = int(os.getenv('MAX_ROWS', '10000'))
        if df is not None and len(df) > max_rows:
            update_job_status(job_id, "running", f"Sampling {max_rows} rows from {len(df)} total rows...")
            df = df.sample(n=max_rows, random_state=42).reset_index(drop=True)
        
        # Continue with ML processing
        update_job_status(job_id, "running", "Starting ML training...")
        
        # Regular tabular data processing
        if df is not None:
        
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
            zip_path = create_project_zip(model_file, MODELS_DIR, DOWNLOADS_DIR)
            
            # Return results
            return jsonify({
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
            })
        
        elif dataset_folder is not None:
            # Check for image classification task
            if task_type == 'image_classification':
                # Check if TensorFlow is available
                if not TENSORFLOW_AVAILABLE:
                    return jsonify({
                        'error': 'TensorFlow is required for image classification but not available. Please install TensorFlow.'
                    }), 400
                
                try:
                    # Process image classification dataset
                    X_train, X_test, y_train, y_test, preprocessor, feature_names = preprocess_image_dataset(dataset_folder)
                    
                    # Access the training and test generators from the preprocessor
                    training_generator = preprocessor.get('training_generator') or X_train
                    validation_generator = preprocessor.get('validation_generator')
                    testing_generator = preprocessor.get('testing_generator') or X_test
                    
                    # Train CNN model
                    best_model, best_model_name, best_score, y_pred, history = train_image_classification_model(
                        training_generator=training_generator,
                        validation_generator=validation_generator,
                        test_generator=testing_generator,
                        dataset_folder=dataset_folder,
                        models_dir=MODELS_DIR,
                        epochs=10,
                        learning_rate=0.001,
                        batch_size=32,
                        early_stopping_patience=3,
                        return_history=True
                    )
                    
                    # Create CNN visualizations using the specialized module
                    visualizations = create_cnn_visualization(
                        best_model,
                        training_generator,
                        testing_generator,
                        history=history,
                        user_prompt=text_prompt
                    )
                    
                    # Model is automatically saved to MODELS_DIR/best_model.keras by the updated function
                    model_file = "best_model.keras"
                    
                    # Generate loading code
                    generate_loading_code(model_file, feature_names, DOWNLOADS_DIR, is_image_model=True)
                    
                    # Write requirements file
                    write_requirements_file(DOWNLOADS_DIR, is_tensorflow=True)
                    
                    # Create project ZIP
                    zip_path = create_project_zip(model_file, MODELS_DIR, DOWNLOADS_DIR, is_image_model=True)
                    
                    # Return results with visualizations
                    return jsonify({
                        'success': True,
                        'detected_task_type': task_type,  # Add detected task type
                        'model_info': {
                            'model_name': best_model_name,
                            'score': best_score,
                            'task_type': task_type  # Add task type to model_info
                        },
                        'dataset_info': dataset_info,  # Use dataset_info instead of data_preview
                        'visualizations': {
                            'plots': visualizations
                        },
                        'download_url': f'/api/download/{os.path.basename(zip_path)}'
                    })
                except Exception as e:
                    import traceback
                    traceback.print_exc()
                    return jsonify({
                        'error': f'Error processing image classification dataset: {str(e)}'
                    }), 500
            
            # Check for object detection task
            elif task_type == "object_detection":
                # Check if YOLO is available
                if not YOLO_AVAILABLE:
                    return jsonify({
                        'error': 'YOLO is required for object detection but not available. Please install ultralytics and torch.'
                    }), 400
                
                try:
                    # Train YOLO model
                    best_model, best_model_name, best_score, metrics_info = train_yolo_model(
                        dataset_folder, MODELS_DIR
                    )
                    
                    # Create visualizations using the specialized object detection module
                    visualizations = create_object_detection_visualization(
                        MODELS_DIR,
                        dataset_folder,
                        metrics_info,
                        text_prompt
                    )
                    
                    # Save model
                    model_file = "best_model.pt"
                    
                    # Generate loading code
                    generate_loading_code(model_file, None, DOWNLOADS_DIR, is_object_detection=True)
                    
                    # Write requirements file
                    write_requirements_file(DOWNLOADS_DIR, is_yolo=True)
                    
                    # Create project ZIP
                    zip_path = create_project_zip(model_file, MODELS_DIR, DOWNLOADS_DIR, is_object_detection=True)
                    
                    # Return results with enhanced model info
                    return jsonify({
                        'success': True,
                        'detected_task_type': task_type,  # Add detected task type
                        'model_info': {
                            'model_name': best_model_name,
                            'score': best_score,
                            'task_type': task_type,  # Add task type to model_info
                            'mAP': metrics_info.get('mAP50-95', metrics_info.get('mAP', 0.0)),
                            'precision': metrics_info.get('precision', 0.0),
                            'recall': metrics_info.get('recall', 0.0)
                        },
                        'dataset_info': dataset_info,
                        'visualizations': {
                            'plots': visualizations
                        },
                        'download_url': f'/api/download/{os.path.basename(zip_path)}'
                    })
                except Exception as e:
                    import traceback
                    traceback.print_exc()
                    return jsonify({
                        'error': f'Error processing object detection dataset: {str(e)}'
                    }), 500
            
            else:
                return jsonify({
                    'error': f'Task type {task_type} not supported for the uploaded dataset.'
                }), 400
        
        else:
            return jsonify({'error': 'Failed to process data.'}), 500
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

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
    app.run(debug=False, host='0.0.0.0', port=5000)