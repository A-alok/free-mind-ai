import os
import zipfile
import uuid
import zipfile
import tempfile
from db_file_system import DBFileSystem
from cloudinary_utils import upload_zip_to_cloudinary, get_cloudinary_download_url
from mongodb_utils import update_project_with_cloudinary

# Initialize database file system
db_fs = DBFileSystem()

def generate_loading_code(filename, feature_names, downloads_dir, is_image_model=False, dataset_folder=None, is_object_detection=False):
    """Generate Python code for loading a model and creating predictions"""
    code_template = ""
    
    if is_object_detection:
        code_template = """
import streamlit as st
from ultralytics import YOLO
import cv2
from PIL import Image
import numpy as np
import os
from pathlib import Path

# Load custom CSS
def load_css():
    # Load custom CSS styling
    css_file = Path("style.css")
    if css_file.exists():
        with open(css_file) as f:
            st.markdown(f"<style>{f.read()}</style>", unsafe_allow_html=True)

def main():
  st.set_page_config(
      page_title="Object Detection - FreeMindAI",
      page_icon="⚡",
      layout="wide"
  )
  
  load_css()
  
  st.title('Object Detection with YOLOv8')
  st.write('Upload an image to detect objects')
  
  # File uploader
  uploaded_file = st.file_uploader("Choose an image...", type=["jpg", "jpeg", "png"])
  
  if uploaded_file is not None:
      # Read the image
      image = Image.open(uploaded_file)
      st.image(image, caption='Uploaded Image', use_container_width=True)
      
      # Save the uploaded image temporarily
      with open("temp_image.jpg", "wb") as f:
          f.write(uploaded_file.getbuffer())
      
      # Perform object detection
      if st.button('Detect Objects'):
          with st.spinner('Detecting...'):
              # Load the model
              model = YOLO("best_model.pt")
              
              # Run inference
              results = model.predict(source="temp_image.jpg", conf=0.25)
              
              # Get the first result (we only have one image)
              result = results[0]
              
              # Display result
              result_img = result.plot()
              result_img_rgb = cv2.cvtColor(result_img, cv2.COLOR_BGR2RGB)
              st.image(result_img_rgb, caption='Detection Result', use_container_width=True)
              
              # Display detection details
              st.subheader('Detection Results:')
              
              # Get class names dictionary
              names = model.names
              
              # Display each detection
              for box in result.boxes:
                  cls_id = int(box.cls[0].item())
                  class_name = names[cls_id]
                  confidence = box.conf[0].item()
                  coordinates = box.xyxy[0].tolist()  # get box coordinates in (top, left, bottom, right) format
                  
                  st.write(f"**Class:** {class_name}, **Confidence:** {confidence:.2f}")
                  st.write(f"**Coordinates:** [x1={coordinates[0]:.1f}, y1={coordinates[1]:.1f}, x2={coordinates[2]:.1f}, y2={coordinates[3]:.1f}]")
                  st.write("---")
              
              # Clean up
              try:
                  os.remove("temp_image.jpg")
              except:
                  pass

if __name__ == "__main__":
  main()
"""
    elif is_image_model:
        code_template = """
import streamlit as st
import tensorflow as tf
from tensorflow.keras.preprocessing import image
import numpy as np
from PIL import Image
import os
from pathlib import Path

# Load custom CSS
def load_css():
    # Load custom CSS styling
    css_file = Path("style.css")
    if css_file.exists():
        with open(css_file) as f:
            st.markdown(f"<style>{f.read()}</style>", unsafe_allow_html=True)

# Page configuration
st.set_page_config(
    page_title="Image Classification - FreeMindAI",
    page_icon="📷",
    layout="wide"
)

load_css()

# Load the model
model_path = 'best_model.keras'
try:
  model = tf.keras.models.load_model(model_path)
  print(f"Model loaded successfully from {model_path}")
  print(f"Model output shape: {model.output_shape}")
  num_classes = model.output_shape[1]
except Exception as e:
  st.error(f"Error loading model: {e}")
  st.stop()

# Define class labels based on the class indices
# You may need to update these class labels based on your specific dataset
class_labels = {i: f'Class {i}' for i in range(num_classes)}

def predict_image(img_path):
  # Load and preprocess the image
  img = Image.open(img_path).convert('RGB')  # Ensure the image is in RGB format
  img = img.resize((64, 64))  # Resize to match training images
  img_array = image.img_to_array(img)
  img_array = np.expand_dims(img_array, axis=0)
  img_array /= 255.0  # Ensure scaling matches training preprocessing
  
  # Predict the class
  result = model.predict(img_array)
  predicted_class_index = np.argmax(result[0])
  
  # Get the class name
  if predicted_class_index in class_labels:
      prediction = class_labels[predicted_class_index]
  else:
      prediction = f"Unknown class {predicted_class_index}"
  
  return prediction, result[0]

st.title("Image Classification")
st.write("Upload an image to classify.")

uploaded_file = st.file_uploader("Choose an image...", type=["jpg", "jpeg", "png"])

if uploaded_file is not None:
  st.image(uploaded_file, caption='Uploaded Image', use_container_width=True)
  st.write("")
  st.write("Classifying...")
  
  try:
      prediction, probabilities = predict_image(uploaded_file)
      
      st.write(f"Prediction: {prediction}")
      
      # Display probabilities
      st.write("Prediction probabilities:")
      for i, prob in enumerate(probabilities):
          class_name = class_labels.get(i, f"Class {i}")
          st.write(f"{class_name}: {prob:.4f}")
  except Exception as e:
      st.error(f"Error during prediction: {e}")
"""
    else:
        # Code for regular ML models (regression/classification)
        feature_list = ""
        if feature_names:
            for feature in feature_names:
                feature_list += f"    '{feature}': st.number_input('Enter {feature}', value=0.0),\n"
        
        code_template = f"""
import pickle
import streamlit as st
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import plotly.express as px
import plotly.graph_objects as go
from sklearn.metrics import confusion_matrix
from pathlib import Path
import os
from dotenv import load_dotenv
import google.generativeai as genai
import json

# Load environment variables
load_dotenv()

class GeminiExplainer:
    def __init__(self):
        self.api_key = os.getenv('GEMINI_API_KEY')
        if self.api_key:
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel('gemini-pro')
        else:
            self.model = None
            st.warning(\"⚠️ GEMINI_API_KEY not found. AI explanations will use fallback mode.\")
    
    def explain_prediction(self, features, prediction, model_name, task_type):
        if not self.model:
            return self._fallback_explanation(prediction, task_type)
        
        try:
            prompt = f\"\"\"Explain this machine learning prediction in simple terms:
            
            Model: {{model_name}}
            Task: {{task_type}}
            Input Features: {{features}}
            Prediction: {{prediction}}
            
            Provide a clear, practical explanation of:
            1. What this prediction means
            2. Key factors that influenced it
            3. How confident we should be
            4. Practical implications
            
            Use emojis and be conversational but informative.
            \"\"\"
            
            response = self.model.generate_content(prompt)
            return response.text
        except Exception as e:
            return self._fallback_explanation(prediction, task_type)
    
    def explain_class_probabilities(self, features, class_probs, model_name):
        if not self.model:
            return self._fallback_class_explanation(class_probs)
        
        try:
            # Sort classes by probability
            sorted_probs = sorted(class_probs.items(), key=lambda x: x[1], reverse=True)
            top_class, top_prob = sorted_probs[0]
            
            prompt = f\"\"\"As a machine learning expert, provide a detailed analysis of these class probabilities:
            
            Model: {{model_name}}
            Input Features: {{features}}
            
            Class Probabilities:
            {{chr(10).join([f'- {{cls}}: {{prob:.4f}} ({{prob*100:.2f}}%)' for cls, prob in sorted_probs])}}
            
            Please provide:
            1. **Overall Assessment**: Why the model chose {{top_class}} as the most likely class
            2. **Probability Analysis**: Explain what each probability means and why some are higher
            3. **Feature Impact**: How the input features influenced these specific probabilities
            4. **Confidence Evaluation**: How confident should we be in this prediction distribution
            5. **Alternative Scenarios**: What would need to change for other classes to be more likely
            6. **Practical Insights**: What these probabilities mean for decision-making
            
            Be detailed and specific about the probability values. Use emojis and clear formatting.
            \"\"\"
            
            response = self.model.generate_content(prompt)
            return response.text
        except Exception as e:
            return self._fallback_class_explanation(class_probs)
    
    def _fallback_class_explanation(self, class_probs):
        sorted_probs = sorted(class_probs.items(), key=lambda x: x[1], reverse=True)
        top_class, top_prob = sorted_probs[0]
        
        explanation = f\"🎯 **Primary Prediction**: {{top_class}} ({{top_prob*100:.2f}}% confidence)\\n\\n\"
        
        explanation += \"📊 **Probability Breakdown**:\\n\"
        for cls, prob in sorted_probs:
            if prob > 0.01:  # Only show probabilities > 1%
                explanation += f\"- {{cls}}: {{prob*100:.2f}}%\\n\"
        
        explanation += f\"\\n💡 **Interpretation**: The model is most confident about {{top_class}} class based on the input features provided.\"
        
        return explanation
    
    def _fallback_explanation(self, prediction, task_type):
        if task_type == 'classification':
            return f\"🎯 **Prediction Result**: The model classified this input as **{{prediction}}** based on the learned patterns from training data.\"
        else:
            return f\"📊 **Prediction Result**: The model predicted a value of **{{prediction:.4f}}** based on the input features and learned relationships.\"

# Load custom CSS
def load_css():
    css_file = Path(\"style.css\")
    if css_file.exists():
        with open(css_file) as f:
            st.markdown(\"<style>\" + f.read() + \"</style>\", unsafe_allow_html=True)

# Advanced visualization functions
def create_feature_importance_plot(model, feature_names):
    try:
        if hasattr(model, 'feature_importances_'):
            importance = model.feature_importances_
        elif hasattr(model, 'coef_'):
            importance = np.abs(model.coef_).flatten()
        else:
            return None
        
        fig = px.bar(
            x=importance,
            y=feature_names,
            orientation='h',
            title='Feature Importance',
            color=importance,
            color_continuous_scale='Viridis'
        )
        fig.update_layout(height=400)
        return fig
    except:
        return None

def create_prediction_confidence_chart(probabilities, classes):
    try:
        fig = px.bar(
            x=classes,
            y=probabilities,
            title='Prediction Confidence by Class',
            color=probabilities,
            color_continuous_scale='RdYlGn'
        )
        fig.update_layout(height=400)
        return fig
    except:
        return None

def create_input_analysis_plot(user_inputs):
    try:
        # Create a radar chart for input features
        categories = list(user_inputs.keys())
        values = list(user_inputs.values())
        
        fig = go.Figure()
        fig.add_trace(go.Scatterpolar(
            r=values,
            theta=categories,
            fill='toself',
            name='Input Values'
        ))
        
        fig.update_layout(
            polar=dict(
                radialaxis=dict(
                    visible=True,
                    range=[min(values), max(values)]
                )),
            showlegend=False,
            title=\"Input Feature Analysis\",
            height=400
        )
        return fig
    except:
        return None

# Load the model from file
def load_model():
    try:
        with open('best_model.pkl', 'rb') as f:
            model = pickle.load(f)
        return model
    except Exception as e:
        st.error(f\"Error loading model: {{e}}\")
        return None

def main():
    st.set_page_config(
        page_title=\"ML Prediction - FreeMindAI\",
        page_icon=\"⚡\", 
        layout=\"wide\"
    )
    
    load_css()
    
    # Initialize Gemini explainer
    explainer = GeminiExplainer()
    
    st.title(\"🤖 Intelligent ML Prediction App\")
    st.markdown(\"*Powered by AI explanations and advanced visualizations*\")
    
    model = load_model()
    if not model:
        st.stop()
    
    # Sidebar with model information
    with st.sidebar:
        st.header(\"📊 Model Information\")
        model_type = type(model).__name__
        st.write(f\"**Model Type**: {{model_type}}\")
        
        # Feature importance plot
        feature_names = {repr(feature_names)}
        importance_fig = create_feature_importance_plot(model, feature_names)
        if importance_fig:
            st.plotly_chart(importance_fig, use_container_width=True)
    
    # Main content
    col1, col2 = st.columns([1, 1])
    
    with col1:
        st.header(\"🎯 Make Predictions\")
        
        # Create input fields for each feature
        user_inputs = {{
{feature_list}        }}
        
        # Predict button
        if st.button(\"🔮 Generate Prediction\", type=\"primary\"):
            try:
                input_df = pd.DataFrame([user_inputs])
                
                # Make prediction
                prediction = model.predict(input_df)
                task_type = 'classification' if hasattr(model, 'classes_') else 'regression'
                
                # Store results in session state
                st.session_state.prediction = prediction
                st.session_state.user_inputs = user_inputs
                st.session_state.task_type = task_type
                st.session_state.model_type = type(model).__name__
                
            except Exception as e:
                st.error(f\"Error making prediction: {{e}}\")
    
    with col2:
        st.header(\"📈 Results & Analysis\")
        
        if 'prediction' in st.session_state:
            prediction = st.session_state.prediction
            task_type = st.session_state.task_type
            
            # Display prediction result
            if task_type == 'classification':
                st.success(f\"🎯 **Predicted Class**: {{prediction[0]}}\")
                
                # Show probabilities if available
                if hasattr(model, 'predict_proba'):
                    try:
                        proba = model.predict_proba(pd.DataFrame([st.session_state.user_inputs]))
                        
                        st.subheader(\"📊 Class Probabilities\")
                        
                        # Enhanced probability table with Label column showing actual class values
                        prob_df = pd.DataFrame({{
                            'Class': model.classes_,
                            'Probability': proba[0],
                            'Label': model.classes_  # Show actual class names as labels
                        }})
                        st.dataframe(prob_df, use_container_width=True)
                        
                        # Confidence chart
                        conf_fig = create_prediction_confidence_chart(proba[0], model.classes_)
                        if conf_fig:
                            st.plotly_chart(conf_fig, use_container_width=True)
                        
                        # Detailed AI explanation for class probabilities
                        st.subheader(\"🧠 AI Analysis of Class Probabilities\")
                        with st.spinner(\"Generating detailed explanation...\"):
                            class_probs = dict(zip(model.classes_, proba[0]))
                            detailed_explanation = explainer.explain_class_probabilities(
                                st.session_state.user_inputs,
                                class_probs,
                                st.session_state.model_type
                            )
                            st.markdown(detailed_explanation)
                    except:
                        pass
            else:
                st.success(f\"📊 **Predicted Value**: {{prediction[0]:.4f}}\")
            
            # Input analysis visualization
            input_fig = create_input_analysis_plot(st.session_state.user_inputs)
            if input_fig:
                st.plotly_chart(input_fig, use_container_width=True)
            
            # AI-powered explanation
            st.subheader(\"🧠 AI Explanation\")
            with st.spinner(\"Generating intelligent explanation...\"):
                explanation = explainer.explain_prediction(
                    st.session_state.user_inputs,
                    prediction[0],
                    st.session_state.model_type,
                    task_type
                )
                st.markdown(explanation)
    
    # Additional insights section
    if 'prediction' in st.session_state:
        st.header(\"🔍 Additional Insights\")
        
        col3, col4 = st.columns([1, 1])
        
        with col3:
            st.subheader(\"📋 Input Summary\")
            input_df = pd.DataFrame([st.session_state.user_inputs])
            st.dataframe(input_df.T.rename(columns={{0: 'Value'}}), use_container_width=True)
        
        with col4:
            st.subheader(\"🎯 Prediction Details\")
            details = {{
                'Model Type': st.session_state.model_type,
                'Task Type': st.session_state.task_type.title(),
                'Prediction': str(st.session_state.prediction[0]),
                'Input Features': len(st.session_state.user_inputs)
            }}
            
            for key, value in details.items():
                st.write(f\"**{{key}}**: {{value}}\")
    
    # Footer
    st.markdown(\"---\")
    st.markdown(
        \"<div style='text-align: center; color: #666; padding: 1rem;'>\" +
        \"🤖 Powered by FreeMindAI | Enhanced with Gemini AI\" +
        \"</div>\",
        unsafe_allow_html=True
    )

if __name__ == \"__main__\":
  main()
"""
    
    # For database storage, save to a temporary file first
    temp_dir = tempfile.gettempdir()
    temp_path = os.path.join(temp_dir, "load_model.py")
    
    # Write the code to the temporary file
    with open(temp_path, "w", encoding='utf-8') as f:
        f.write(code_template.strip())
    
    # Determine if we need to save to database
    if 'ml_system' in downloads_dir:
        # Extract directory name for database storage
        parts = downloads_dir.replace('\\', '/').strip('/').split('/')
        idx = parts.index('ml_system')
        if idx + 1 < len(parts):
            dir_name = parts[idx + 1]
        else:
            dir_name = 'downloads'  # Default to downloads directory
        
        # Save to database
        db_fs.save_file(temp_path, dir_name)
        print(f"Loading code saved to database in {dir_name} directory")
        
        # Return the logical path that would be used in the app
        load_model_path = os.path.join(downloads_dir, "load_model.py")
    else:
        # For filesystem storage, use the direct path
        load_model_path = os.path.join(downloads_dir, "load_model.py")
        # Copy from temp to actual location
        os.makedirs(os.path.dirname(load_model_path), exist_ok=True)
        import shutil
        shutil.copy2(temp_path, load_model_path)
    
    # Clean up temporary file
    os.remove(temp_path)
    
    return load_model_path

def write_requirements_file(downloads_dir, is_tensorflow=False, is_yolo=False):
    """Write the requirements.txt file with the necessary dependencies"""
    base_requirements = """
streamlit
pandas
matplotlib
seaborn
scikit-learn
numpy
plotly
scipy
python-dotenv
google-generativeai
"""
    
    # Add TensorFlow dependencies if needed
    if is_tensorflow:
        tensorflow_requirements = """
tensorflow
pillow
"""
        requirements = base_requirements + tensorflow_requirements
    elif is_yolo:
        # Add YOLO dependencies if needed
        yolo_requirements = """
ultralytics>=8.0.0
torch>=1.10.0
torchvision>=0.11.0
opencv-python>=4.5.0
pillow
"""
        requirements = base_requirements + yolo_requirements
    else:
        requirements = base_requirements
    
    # Create a temporary file
    temp_dir = tempfile.gettempdir()
    temp_path = os.path.join(temp_dir, "requirements.txt")
    
    # Write to the temporary file
    with open(temp_path, "w", encoding='utf-8') as f:
        f.write(requirements.strip())
    
    # Determine if we need to save to database
    if 'ml_system' in downloads_dir:
        # Extract directory name for database storage
        parts = downloads_dir.replace('\\', '/').strip('/').split('/')
        idx = parts.index('ml_system')
        if idx + 1 < len(parts):
            dir_name = parts[idx + 1]
        else:
            dir_name = 'downloads'  # Default to downloads directory
        
        # Save to database
        db_fs.save_file(temp_path, dir_name)
        print(f"Requirements file saved to database in {dir_name} directory")
        
        # Return the logical path that would be used in the app
        requirements_path = os.path.join(downloads_dir, "requirements.txt")
    else:
        # For filesystem storage, use the direct path
        requirements_path = os.path.join(downloads_dir, "requirements.txt")
        # Copy from temp to actual location
        os.makedirs(os.path.dirname(requirements_path), exist_ok=True)
        import shutil
        shutil.copy2(temp_path, requirements_path)
    
    # Clean up temporary file
    os.remove(temp_path)
    
    return requirements_path

def create_project_zip(model_file, models_dir, downloads_dir, is_image_model=False, is_object_detection=False, 
                       project_id=None, project_name=None, user_id=None, task_type=None):
    """Create a ZIP file with the model and necessary files, replacing any existing ones, and upload to Cloudinary"""
    # Create a temporary directory for building the zip
    temp_dir = tempfile.mkdtemp()
    
    # Determine if we're using database storage
    is_database_models = 'ml_system' in models_dir
    is_database_downloads = 'ml_system' in downloads_dir
    
    try:
        # Clear old zip files from the downloads directory
        if is_database_downloads:
            # Extract directory name
            parts = downloads_dir.replace('\\', '/').strip('/').split('/')
            idx = parts.index('ml_system')
            if idx + 1 < len(parts):
                downloads_dir_name = parts[idx + 1]
            else:
                downloads_dir_name = 'downloads'
            
            # Get list of existing zip files
            existing_files = db_fs.list_files(downloads_dir_name)
            for filename in existing_files:
                if filename.endswith('.zip'):
                    db_fs.delete_file(filename, downloads_dir_name)
                    print(f"Removed old zip file from database: {filename}")
        else:
            # Standard filesystem cleanup
            for item in os.listdir(downloads_dir):
                if item.endswith('.zip'):
                    try:
                        os.remove(os.path.join(downloads_dir, item))
                        print(f"Removed old zip file: {item}")
                    except Exception as e:
                        print(f"Error removing old zip file {item}: {e}")
        
        # Generate unique ID for the download
        download_id = str(uuid.uuid4())
        temp_zip_path = os.path.join(temp_dir, f"project_{download_id}.zip")
        
        # Create the ZIP file
        with zipfile.ZipFile(temp_zip_path, 'w') as zipf:
            # Add the model file
            if is_database_models:
                # Extract directory name
                parts = models_dir.replace('\\', '/').strip('/').split('/')
                idx = parts.index('ml_system')
                if idx + 1 < len(parts):
                    models_dir_name = parts[idx + 1]
                else:
                    models_dir_name = 'models'
                
                # Get the model from database
                try:
                    model_content = db_fs.get_file(model_file, models_dir_name)
                    # Save to a temporary file
                    temp_model_path = os.path.join(temp_dir, model_file)
                    with open(temp_model_path, 'wb') as f:
                        f.write(model_content)
                    # Add to zip
                    zipf.write(temp_model_path, arcname=model_file)
                except Exception as e:
                    print(f"Error getting model file from database: {e}")
            else:
                # Standard filesystem
                model_path = os.path.join(models_dir, model_file)
                if os.path.exists(model_path):
                    zipf.write(model_path, arcname=model_file)
            
            # Add the load_model.py file
            if is_database_downloads:
                # Extract directory name
                parts = downloads_dir.replace('\\', '/').strip('/').split('/')
                idx = parts.index('ml_system')
                if idx + 1 < len(parts):
                    downloads_dir_name = parts[idx + 1]
                else:
                    downloads_dir_name = 'downloads'
                
                # Get the file from database
                try:
                    content = db_fs.get_file("load_model.py", downloads_dir_name)
                    # Save to a temporary file
                    temp_file_path = os.path.join(temp_dir, "load_model.py")
                    with open(temp_file_path, 'wb') as f:
                        f.write(content)
                    # Add to zip
                    zipf.write(temp_file_path, arcname="load_model.py")
                except Exception as e:
                    print(f"Error getting load_model.py from database: {e}")
            else:
                # Standard filesystem
                load_model_path = os.path.join(downloads_dir, "load_model.py")
                if os.path.exists(load_model_path):
                    zipf.write(load_model_path, arcname="load_model.py")
            
            # Add the requirements.txt file
            if is_database_downloads:
                # Get the file from database
                try:
                    content = db_fs.get_file("requirements.txt", downloads_dir_name)
                    # Save to a temporary file
                    temp_file_path = os.path.join(temp_dir, "requirements.txt")
                    with open(temp_file_path, 'wb') as f:
                        f.write(content)
                    # Add to zip
                    zipf.write(temp_file_path, arcname="requirements.txt")
                except Exception as e:
                    print(f"Error getting requirements.txt from database: {e}")
            else:
                # Standard filesystem
                requirements_path = os.path.join(downloads_dir, "requirements.txt")
                if os.path.exists(requirements_path):
                    zipf.write(requirements_path, arcname="requirements.txt")
            
            # Add design files for Streamlit theme
            try:
                # Add .streamlit/config.toml
                config_toml_content = """[theme]
primaryColor = "#4f46e5"
backgroundColor = "#ffffff"
secondaryBackgroundColor = "#f9fafb"
textColor = "#1a1a1a"
font = "sans serif"

[server]
headless = true
enableCORS = false
enableXsrfProtection = false

[browser]
gatherUsageStats = false"""
                zipf.writestr(".streamlit/config.toml", config_toml_content)
                
                # Add style.css with custom theme
                css_content = """/* Custom CSS for Streamlit App with Violet Theme */

:root {
  --background: #ffffff;
  --foreground: #1a1a1a;
  --primary-violet: rgba(79, 70, 229, 0.9);
  --violet-light: rgba(79, 70, 229, 0.1);
  --violet-medium: rgba(79, 70, 229, 0.3);
  --gray-50: #f9fafb;
  --gray-100: #f3f4f6;
  --gray-200: #e5e7eb;
  --gray-300: #d1d5db;
  --gray-600: #4b5563;
  --gray-800: #1f2937;
}

/* Hide Streamlit default elements */
#MainMenu {visibility: hidden;}
footer {visibility: hidden;}
header {visibility: hidden;}

/* Main container styling */
.main {
    padding-top: 2rem;
}

/* Custom scrollbar */
::-webkit-scrollbar {
    width: 8px;
}

::-webkit-scrollbar-track {
    background: var(--gray-100);
}

::-webkit-scrollbar-thumb {
    background: var(--primary-violet);
    border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
    background: rgba(79, 70, 229, 1);
}

/* Selection color */
::selection {
    background: var(--violet-light);
    color: var(--foreground);
}

/* Custom button styling */
.stButton > button {
    background: linear-gradient(135deg, var(--primary-violet), #6366f1) !important;
    color: white !important;
    border: none !important;
    border-radius: 0.5rem !important;
    padding: 0.75rem 2rem !important;
    font-weight: 600 !important;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
    box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3) !important;
}

.stButton > button:hover {
    transform: translateY(-2px) !important;
    box-shadow: 0 8px 24px rgba(79, 70, 229, 0.4) !important;
}

/* File uploader styling */
.stFileUploader {
    border: 2px dashed var(--violet-medium) !important;
    border-radius: 1rem !important;
    padding: 2rem !important;
    background: var(--violet-light) !important;
}

/* Progress bar styling */
.stProgress .st-bo {
    background-color: var(--primary-violet) !important;
}

/* Info boxes */
.stAlert {
    border-radius: 0.75rem !important;
    border-left: 4px solid var(--primary-violet) !important;
}

/* Code blocks */
.stCode {
    background-color: var(--gray-50) !important;
    border: 1px solid var(--gray-200) !important;
    border-radius: 0.5rem !important;
}

/* Responsive design */
@media (max-width: 768px) {
    .main {
        padding: 1rem;
    }
}"""
                zipf.writestr("style.css", css_content)
                
                # Add .env template file
                env_template = """# Environment Variables for FreeMindAI ML App
# Add your Gemini AI API key below to enable AI explanations

# Get your API key from: https://makersuite.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Other configuration
# DEBUG=False
# LOG_LEVEL=INFO
"""
                zipf.writestr(".env.template", env_template)
                
                print("Added design files to ZIP: config.toml, style.css, and .env template")
            except Exception as e:
                print(f"Warning: Could not add design files to ZIP: {e}")
            
            # Add a README file
            readme_content = "# Machine Learning Project\n\n"
            readme_content += "This project contains a trained machine learning model and Streamlit app with custom theme.\n\n"
            readme_content += "## Files\n\n"
            readme_content += f"- {model_file}: The trained model\n"
            readme_content += "- load_model.py: Streamlit app to load and use the model\n"
            readme_content += "- requirements.txt: Required Python packages\n"
            readme_content += "- .streamlit/config.toml: Streamlit configuration with custom theme\n"
            readme_content += "- style.css: Custom CSS styling for the app\n"
            readme_content += "- setup_env.py: Virtual environment setup script\n\n"
            readme_content += "## Usage\n\n"
            readme_content += "### Quick Start\n"
            readme_content += "1. Install the required packages: `pip install -r requirements.txt`\n"
            readme_content += "2. Run the app: `streamlit run load_model.py`\n\n"
            readme_content += "### With Virtual Environment (Recommended)\n"
            readme_content += "1. Run the setup script: `python setup_env.py`\n"
            readme_content += "2. Activate virtual environment:\n"
            readme_content += "   - Windows: `venv\\Scripts\\activate`\n"
            readme_content += "   - Linux/Mac: `source venv/bin/activate`\n"
            readme_content += "3. Run the app: `streamlit run load_model.py`\n\n"
            readme_content += "## Features\n\n"
            readme_content += "- Custom violet theme matching FreeMindAI design\n"
            readme_content += "- Responsive design for mobile and desktop\n"
            readme_content += "- Advanced interactive visualizations with Plotly\n"
            readme_content += "- AI-powered explanations using Google Gemini\n"
            readme_content += "- Feature importance analysis\n"
            readme_content += "- Prediction confidence charts\n"
            readme_content += "- Input analysis radar charts\n"
            readme_content += "- Intelligent prediction explanations\n\n"
            readme_content += "## AI Features Setup\n\n"
            readme_content += "To enable AI-powered explanations:\n"
            readme_content += "1. Get a Gemini API key from https://makersuite.google.com/app/apikey\n"
            readme_content += "2. Copy `.env.template` to `.env`\n"
            readme_content += "3. Replace `your_gemini_api_key_here` with your actual API key\n"
            readme_content += "4. Restart the Streamlit app\n\n"
            readme_content += "## Customization\n\n"
            readme_content += "You can customize the app theme by editing:\n"
            readme_content += "- `.streamlit/config.toml`: Basic Streamlit theme settings\n"
            readme_content += "- `style.css`: Advanced CSS styling and animations\n"
            
            zipf.writestr("README.md", readme_content)
            
            # Add a setup script
            setup_script = """import subprocess
import os
import sys

def setup_venv():
    print("Setting up virtual environment...")
    # Create virtual environment
    subprocess.run([sys.executable, "-m", "venv", "venv"])
    
    # Get the pip path based on OS
    pip_path = os.path.join("venv", "Scripts", "pip") if os.name == "nt" else os.path.join("venv", "bin", "pip")
    
    # Install packages
    subprocess.run([pip_path, "install", "-r", "requirements.txt"])
    print("Virtual environment setup complete!")

if __name__ == "__main__":
    setup_venv()
"""
            zipf.writestr("setup_env.py", setup_script)
        
        # Upload to Cloudinary first
        cloudinary_result = None
        try:
            # Determine task type for Cloudinary organization
            detected_task_type = task_type
            if not detected_task_type:
                if is_object_detection:
                    detected_task_type = "object_detection"
                elif is_image_model:
                    detected_task_type = "image_classification"
                else:
                    detected_task_type = "general_ml"
            
            # Upload to Cloudinary
            print(f"Uploading zip to Cloudinary...")
            cloudinary_result = upload_zip_to_cloudinary(
                temp_zip_path,
                project_name=project_name or f"ML_Project_{download_id[:8]}",
                user_id=user_id,
                task_type=detected_task_type
            )
            
            if cloudinary_result and cloudinary_result.get('success'):
                print(f"Successfully uploaded to Cloudinary: {cloudinary_result['url']}")
                print(f"   - File size: {cloudinary_result.get('size', 0)} bytes")
                print(f"   - Public ID: {cloudinary_result['public_id']}")
                
                # Store Cloudinary URL in MongoDB project
                try:
                    print(f"Updating project database with Cloudinary URL...")
                    db_update_result = update_project_with_cloudinary(
                        project_id=project_id,  # Use the actual project ID from request
                        cloudinary_data=cloudinary_result,
                        project_name=project_name or f"ML_Project_{download_id[:8]}",
                        task_type=detected_task_type,
                        user_id=user_id  # Pass user_id for better project matching
                    )
                    
                    if db_update_result.get('success'):
                        print(f"Database updated successfully:")
                        print(f"   - Project ID: {db_update_result.get('project_id')}")
                        print(f"   - Cloudinary URL stored in: projects.generatedFiles.zipFile.cloudinaryUrl")
                        
                        # Add database info to cloudinary result
                        cloudinary_result['database_update'] = db_update_result
                    else:
                        print(f"Database update failed: {db_update_result.get('message', 'Unknown error')}")
                        # Don't fail the whole process, just log the warning
                        cloudinary_result['database_update'] = {
                            'success': False,
                            'error': db_update_result.get('message', 'Unknown error')
                        }
                        
                except Exception as db_error:
                    print(f"Error updating database: {str(db_error)}")
                    # Don't fail the whole process, just log the error
                    cloudinary_result['database_update'] = {
                        'success': False,
                        'error': str(db_error)
                    }
            else:
                print(f"Cloudinary upload failed: {cloudinary_result.get('error') if cloudinary_result else 'Unknown error'}")
                
        except Exception as e:
            print(f"Error uploading to Cloudinary: {str(e)}")
            # Continue with normal processing even if Cloudinary fails
        
        # Now save the zip file to the database or filesystem
        if is_database_downloads:
            # Save to database
            zip_filename = f"project_{download_id}.zip"
            db_fs.save_file(temp_zip_path, downloads_dir_name)
            print(f"Created new zip file in database: {zip_filename}")
            # Return logical path
            zip_path = os.path.join(downloads_dir, zip_filename)
        else:
            # Save to filesystem
            zip_path = os.path.join(downloads_dir, f"project_{download_id}.zip")
            os.makedirs(os.path.dirname(zip_path), exist_ok=True)
            import shutil
            shutil.copy2(temp_zip_path, zip_path)
            print(f"Created new zip file: {os.path.basename(zip_path)}")
        
        # Create result object with both local and Cloudinary info
        result = {
            'local_path': zip_path,
            'cloudinary': cloudinary_result
        }
        
        return result
    
    finally:
        # Clean up temporary directory
        import shutil
        try:
            shutil.rmtree(temp_dir)
        except Exception as e:
            print(f"Error cleaning up temporary directory: {e}")

