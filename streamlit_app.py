import streamlit as st
import pandas as pd
import numpy as np
import tempfile
import os
import io
import zipfile
import uuid
import json
from PIL import Image
from pathlib import Path

# Import your existing modules
from data_handling import download_kaggle_dataset, generate_dataset_from_text, process_dataset_folder, auto_detect_task_type
from preprocessing import preprocess_dataset, preprocess_image_dataset
from model_training import train_models, train_image_classification_model, train_yolo_model, save_best_model
from visualization import create_visualization
from visualization_cnn import create_cnn_visualization
from visualization_object_detection import create_object_detection_visualization
from utils import generate_loading_code, write_requirements_file, create_project_zip
from db_system_integration import apply_patches

# Initialize database file system
db_fs = apply_patches()

# Page configuration
st.set_page_config(
    page_title="FreeMindAI - ML Platform",
    page_icon="🤖",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# Load custom CSS
def load_css():
    """Load custom CSS styling"""
    css_file = Path("style.css")
    if css_file.exists():
        with open(css_file) as f:
            st.markdown(f"<style>{f.read()}</style>", unsafe_allow_html=True)
    else:
        # Fallback inline CSS
        st.markdown("""
        <style>
        :root {
            --primary-violet: rgba(79, 70, 229, 0.9);
            --violet-light: rgba(79, 70, 229, 0.1);
            --violet-medium: rgba(79, 70, 229, 0.3);
        }
        
        .hero-section {
            text-align: center;
            padding: 4rem 2rem;
            background: linear-gradient(135deg, var(--violet-light), #f9fafb);
            border-radius: 1rem;
            margin: 2rem 0;
        }
        
        .hero-title {
            font-size: 3.5rem;
            font-weight: 700;
            background: linear-gradient(135deg, var(--primary-violet), #6366f1);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 1rem;
        }
        
        .feature-card {
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(16px);
            border: 1px solid rgba(79, 70, 229, 0.2);
            box-shadow: 0 4px 24px rgba(79, 70, 229, 0.08);
            border-radius: 1rem;
            padding: 2rem;
            margin: 1rem 0;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .feature-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 32px rgba(79, 70, 229, 0.12);
        }
        </style>
        """, unsafe_allow_html=True)

def render_hero_section():
    """Render the hero section of the landing page"""
    st.markdown("""
    <div class="hero-section">
        <h1 class="hero-title">FreeMindAI</h1>
        <p class="hero-subtitle">
            Build, train, and deploy machine learning models with ease. 
            From data preprocessing to model deployment, we've got you covered.
        </p>
    </div>
    """, unsafe_allow_html=True)

def render_features():
    """Render feature cards"""
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.markdown("""
        <div class="feature-card">
            <div class="feature-icon">🤖</div>
            <h3 class="feature-title">Auto ML</h3>
            <p class="feature-description">
                Automatically detect task types and train the best models 
                for your data with minimal configuration.
            </p>
        </div>
        """, unsafe_allow_html=True)
    
    with col2:
        st.markdown("""
        <div class="feature-card">
            <div class="feature-icon">📊</div>
            <h3 class="feature-title">Smart Analytics</h3>
            <p class="feature-description">
                Get comprehensive visualizations and insights about your 
                model's performance and data patterns.
            </p>
        </div>
        """, unsafe_allow_html=True)
    
    with col3:
        st.markdown("""
        <div class="feature-card">
            <div class="feature-icon">🚀</div>
            <h3 class="feature-title">One-Click Deploy</h3>
            <p class="feature-description">
                Export your trained models as ready-to-use Streamlit apps 
                with all dependencies included.
            </p>
        </div>
        """, unsafe_allow_html=True)

def render_task_selector():
    """Render task type selector with enhanced UI"""
    st.markdown("### 🎯 Choose Your ML Task")
    
    task_options = {
        "classification": "📊 Classification - Predict categories or classes",
        "regression": "📈 Regression - Predict numerical values", 
        "image_classification": "🖼️ Image Classification - Classify images",
        "object_detection": "🎯 Object Detection - Detect objects in images"
    }
    
    task_type = st.selectbox(
        "Select the type of machine learning task:",
        options=list(task_options.keys()),
        format_func=lambda x: task_options[x],
        key="task_type"
    )
    
    return task_type

def render_data_input():
    """Render data input section with multiple options"""
    st.markdown("### 📂 Provide Your Data")
    
    input_method = st.radio(
        "How would you like to provide your data?",
        ["Upload File", "Upload Folder (ZIP)", "Text Description"],
        horizontal=True
    )
    
    uploaded_file = None
    uploaded_folder = None
    text_prompt = None
    
    if input_method == "Upload File":
        uploaded_file = st.file_uploader(
            "Upload your dataset (CSV, Excel, etc.)",
            type=['csv', 'xlsx', 'xls', 'json'],
            help="Upload a structured dataset file"
        )
    
    elif input_method == "Upload Folder (ZIP)":
        uploaded_folder = st.file_uploader(
            "Upload a ZIP file containing your dataset",
            type=['zip'],
            help="For image datasets, upload a ZIP with organized folders"
        )
    
    else:  # Text Description
        text_prompt = st.text_area(
            "Describe your dataset or use case:",
            placeholder="e.g., 'Boston housing prices dataset' or 'Customer churn prediction with demographics'",
            help="We'll try to find a suitable dataset or generate synthetic data"
        )
    
    return uploaded_file, uploaded_folder, text_prompt

def process_ml_task(task_type, uploaded_file, uploaded_folder, text_prompt):
    """Process the ML task with progress tracking"""
    
    # Create directories
    BASE_DIR = "ml_system"
    DATASETS_DIR = os.path.join(BASE_DIR, 'datasets')
    MODELS_DIR = os.path.join(BASE_DIR, 'models')
    DOWNLOADS_DIR = os.path.join(BASE_DIR, 'downloads')
    
    for dir_path in [BASE_DIR, DATASETS_DIR, MODELS_DIR, DOWNLOADS_DIR]:
        os.makedirs(dir_path, exist_ok=True)
    
    progress_bar = st.progress(0)
    status_text = st.empty()
    
    try:
        # Initialize variables
        df = None
        dataset_folder = None
        dataset_info = None
        detected_task_type = None
        
        # Step 1: Data Loading
        status_text.text("🔄 Loading and processing data...")
        progress_bar.progress(20)
        
        if uploaded_file is not None:
            # Save uploaded file
            file_path = os.path.join(DATASETS_DIR, uploaded_file.name)
            with open(file_path, "wb") as f:
                f.write(uploaded_file.getbuffer())
            
            # Auto-detect task type
            detected_task_type, df_loaded = auto_detect_task_type(file_path)
            df = df_loaded
            
            if detected_task_type and detected_task_type != task_type:
                st.info(f"🔍 Auto-detected task type: {detected_task_type}")
                task_type = detected_task_type
        
        elif uploaded_folder is not None:
            # Process folder ZIP
            temp_zip_path = os.path.join(DATASETS_DIR, uploaded_folder.name)
            with open(temp_zip_path, "wb") as f:
                f.write(uploaded_folder.getbuffer())
            
            with zipfile.ZipFile(temp_zip_path, 'r') as zip_ref:
                zip_ref.extractall(DATASETS_DIR)
            
            dataset_info = {"folders": os.listdir(DATASETS_DIR)}
            dataset_folder = DATASETS_DIR
        
        elif text_prompt:
            # Try Kaggle first, then generate synthetic data
            kaggle_result = download_kaggle_dataset(text_prompt, DATASETS_DIR)
            
            if isinstance(kaggle_result, tuple):
                kaggle_file, detected_task_type = kaggle_result
            else:
                kaggle_file = kaggle_result
                detected_task_type = None
            
            if kaggle_file:
                df = pd.read_csv(kaggle_file)
                if detected_task_type:
                    task_type = detected_task_type
            else:
                # Generate synthetic data
                generation_result = generate_dataset_from_text(text_prompt)
                if isinstance(generation_result, tuple):
                    df, detected_task_type = generation_result
                else:
                    df = generation_result
                
                if detected_task_type:
                    task_type = detected_task_type
        
        progress_bar.progress(40)
        
        # Step 2: Model Training
        status_text.text("🤖 Training machine learning models...")
        
        if df is not None:
            # Preprocess and train regular ML model
            X_train, X_test, y_train, y_test, preprocessor, feature_names = preprocess_dataset(df, task_type)
            
            progress_bar.progress(60)
            
            best_model, best_model_name, best_score, y_pred = train_models(
                X_train, y_train, X_test, y_test, task_type, MODELS_DIR
            )
            
            progress_bar.progress(80)
            
            # Create visualizations
            visualizations = create_visualization(task_type, y_test, y_pred, best_model, X_test, feature_names, text_prompt)
            
            # Save model and create project files
            save_best_model(best_model, MODELS_DIR)
            generate_loading_code("best_model.pkl", feature_names, DOWNLOADS_DIR)
            write_requirements_file(DOWNLOADS_DIR)
            
            progress_bar.progress(90)
            
            # Create project ZIP
            zip_result = create_project_zip("best_model.pkl", MODELS_DIR, DOWNLOADS_DIR, task_type=task_type)
            
            progress_bar.progress(100)
            status_text.text("✅ Model training completed!")
            
            return {
                'success': True,
                'model_info': {
                    'model_name': best_model_name,
                    'score': best_score,
                    'task_type': task_type
                },
                'data_preview': {
                    'columns': df.columns.tolist(),
                    'data': df.head().values.tolist()
                },
                'visualizations': visualizations,
                'zip_result': zip_result
            }
        
        elif dataset_folder is not None and task_type in ['image_classification', 'object_detection']:
            # Handle image tasks
            if task_type == 'image_classification':
                # Image classification
                X_train, X_test, y_train, y_test, preprocessor, feature_names = preprocess_image_dataset(dataset_folder)
                
                progress_bar.progress(60)
                
                training_generator = preprocessor.get('training_generator') or X_train
                validation_generator = preprocessor.get('validation_generator')
                testing_generator = preprocessor.get('testing_generator') or X_test
                
                best_model, best_model_name, best_score, y_pred, history = train_image_classification_model(
                    training_generator=training_generator,
                    validation_generator=validation_generator,
                    test_generator=testing_generator,
                    dataset_folder=dataset_folder,
                    models_dir=MODELS_DIR,
                    epochs=10,
                    return_history=True
                )
                
                progress_bar.progress(80)
                
                visualizations = create_cnn_visualization(
                    best_model, training_generator, testing_generator,
                    history=history, user_prompt=text_prompt
                )
                
                generate_loading_code("best_model.keras", feature_names, DOWNLOADS_DIR, is_image_model=True)
                write_requirements_file(DOWNLOADS_DIR, is_tensorflow=True)
                
                progress_bar.progress(90)
                
                zip_result = create_project_zip("best_model.keras", MODELS_DIR, DOWNLOADS_DIR, 
                                              is_image_model=True, task_type=task_type)
                
            elif task_type == 'object_detection':
                # Object detection
                best_model, best_model_name, best_score, metrics_info = train_yolo_model(dataset_folder, MODELS_DIR)
                
                progress_bar.progress(80)
                
                visualizations = create_object_detection_visualization(
                    MODELS_DIR, dataset_folder, metrics_info, text_prompt
                )
                
                generate_loading_code("best_model.pt", None, DOWNLOADS_DIR, is_object_detection=True)
                write_requirements_file(DOWNLOADS_DIR, is_yolo=True)
                
                progress_bar.progress(90)
                
                zip_result = create_project_zip("best_model.pt", MODELS_DIR, DOWNLOADS_DIR,
                                              is_object_detection=True, task_type=task_type)
            
            progress_bar.progress(100)
            status_text.text("✅ Model training completed!")
            
            return {
                'success': True,
                'model_info': {
                    'model_name': best_model_name,
                    'score': best_score,
                    'task_type': task_type
                },
                'dataset_info': dataset_info,
                'visualizations': visualizations,
                'zip_result': zip_result
            }
        
        else:
            return {'success': False, 'error': 'No valid data provided'}
    
    except Exception as e:
        status_text.text(f"❌ Error: {str(e)}")
        return {'success': False, 'error': str(e)}

def display_results(results):
    """Display the results of ML training"""
    if not results['success']:
        st.error(f"❌ Training failed: {results.get('error', 'Unknown error')}")
        return
    
    st.success("🎉 Model training completed successfully!")
    
    # Model information
    model_info = results['model_info']
    
    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("Best Model", model_info['model_name'])
    with col2:
        st.metric("Model Score", f"{model_info['score']:.4f}")
    with col3:
        st.metric("Task Type", model_info['task_type'].title())
    
    # Visualizations
    if 'visualizations' in results:
        st.markdown("### 📊 Model Performance")
        
        visualizations = results['visualizations']
        if isinstance(visualizations, dict) and 'plots' in visualizations:
            plots = visualizations['plots']
            
            for plot_name, plot_data in plots.items():
                if isinstance(plot_data, dict) and 'image' in plot_data:
                    st.markdown(f"#### {plot_name}")
                    # Decode base64 image
                    import base64
                    img_bytes = base64.b64decode(plot_data['image'])
                    img = Image.open(io.BytesIO(img_bytes))
                    st.image(img, use_column_width=True)
    
    # Data preview (if available)
    if 'data_preview' in results:
        with st.expander("🔍 Data Preview"):
            data_preview = results['data_preview']
            preview_df = pd.DataFrame(data_preview['data'], columns=data_preview['columns'])
            st.dataframe(preview_df, use_container_width=True)
    
    # Download section
    zip_result = results.get('zip_result')
    if zip_result:
        st.markdown("### 📦 Download Your Project")
        
        if isinstance(zip_result, dict):
            if zip_result.get('cloudinary'):
                cloudinary_info = zip_result['cloudinary']
                if cloudinary_info.get('success'):
                    st.markdown(f"""
                    🌟 **Your project is ready for download!**
                    
                    **Project Details:**
                    - File size: {cloudinary_info.get('size', 0)} bytes
                    - Includes: Model, Streamlit app, requirements.txt, setup scripts
                    """)
                    
                    # Create download button
                    if st.button("📥 Download Project ZIP", type="primary"):
                        # You can implement direct download or redirect to Cloudinary URL
                        st.balloons()
                        st.success("Download started! Check your downloads folder.")
                        st.markdown(f"Direct link: [Download ZIP]({cloudinary_info.get('url', '#')})")
                else:
                    st.warning("Upload to cloud storage failed, but project files are available locally.")
            
            # Show what's included
            st.info("""
            📋 **Your project includes:**
            - ✅ Trained model file
            - ✅ Streamlit app for predictions  
            - ✅ Requirements.txt with dependencies
            - ✅ Setup script for easy deployment
            - ✅ README with instructions
            """)

def main():
    """Main application function"""
    load_css()
    
    # Landing page header
    render_hero_section()
    
    # Features section
    st.markdown("### ✨ Why Choose FreeMindAI?")
    render_features()
    
    st.markdown("---")
    
    # Main workflow
    st.markdown("## 🚀 Get Started")
    
    # Task selection
    task_type = render_task_selector()
    
    # Data input
    uploaded_file, uploaded_folder, text_prompt = render_data_input()
    
    # Process button
    if st.button("🎯 Train Model", type="primary", use_container_width=True):
        if not any([uploaded_file, uploaded_folder, text_prompt]):
            st.error("❌ Please provide data through one of the methods above.")
            return
        
        # Process the ML task
        with st.container():
            results = process_ml_task(task_type, uploaded_file, uploaded_folder, text_prompt)
            display_results(results)
    
    # Footer
    st.markdown("---")
    st.markdown("""
    <div style="text-align: center; color: #6b7280; margin-top: 2rem;">
        <p>Made with ❤️ by FreeMindAI | Powered by Streamlit</p>
    </div>
    """, unsafe_allow_html=True)

if __name__ == "__main__":
    main()