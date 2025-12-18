from flask import Flask, request, jsonify, send_file, render_template, send_from_directory
import pandas as pd
import os
import io
import zipfile
import shutil
import uuid
import json
import logging
import tempfile
import subprocess
import requests
import time
import base64
import csv
import traceback
import yaml
from pathlib import Path
from datetime import datetime, timedelta
from werkzeug.utils import secure_filename
from PIL import Image
from data_handling import download_kaggle_dataset, generate_dataset_from_text, process_dataset_folder, auto_detect_task_type
from preprocessing import preprocess_dataset, preprocess_image_dataset
from model_training import train_models, train_image_classification_model, train_yolo_model, save_best_model
from visualization import create_visualization, fig_to_base64
from visualization_cnn import create_cnn_visualization  # Import the CNN visualization module
from visualization_object import create_object_detection_visualization  # Import the object detection visualization module
from utils import generate_loading_code, write_requirements_file, create_project_zip
from db_system_integration import apply_patches
from db_file_system import DBFileSystem
import google.generativeai as genai
from flask_cors import CORS
from dotenv import load_dotenv
import numpy as np
import re

# Load environment variables
# Try .env.local first (for Next.js dev setups), then fall back to default .env if present
load_dotenv('.env.local')
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

db_fs = apply_patches()

# Configure Gemini API
# Configure Gemini API
# Configure Gemini API
# Support both GEMINI_API_KEY (preferred by some new docs) and GOOGLE_API_KEY
api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")

print(f"DEBUG: Checking API Key configuration...")
if api_key:
    # Mask key for safety in logs
    masked_key = f"{api_key[:5]}...{api_key[-5:]}" if len(api_key) > 10 else "***"
    print(f"DEBUG: Found API Key: {masked_key} (Length: {len(api_key)})")
    
    # Check for quotes
    if api_key.startswith('"') or api_key.startswith("'") or api_key.endswith('"') or api_key.endswith("'"):
        print("DEBUG: WARNING: API Key appears to be quoted! Trimming quotes...")
        api_key = api_key.strip("'\"")
    
    # Configure the library
    genai.configure(api_key=api_key)
        
    print(f"Gemini API configured successfully")
    
    # Perform a startup test
    print("DEBUG: Running Gemini startup test...")
    try:
        # Try to use a standard stable model for connection test
        # Allow user to configure model via env, default to 1.5-flash
        model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
        model = genai.GenerativeModel(model_name)
        # Generate a simple response to verify connectivity
        test_resp = model.generate_content("Ping")
        if test_resp and test_resp.text:
             print("DEBUG: Gemini Startup Test PASSED. Response received.")
        else:
             print("DEBUG: Gemini Startup Test: No text received.")
    except Exception as e:
        print(f"DEBUG: Gemini Startup Test FAILED: {e}")
        # Only print full trace if it helps
        # print(f"DEBUG: Error details: {traceback.format_exc()}")
else:
    print("Warning: GEMINI_API_KEY or GOOGLE_API_KEY not found in environment variables")

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

# Create a directory for CSV analysis files
CSV_ANALYSIS_DIR = os.path.join(BASE_DIR, 'csv_analysis')
os.makedirs(CSV_ANALYSIS_DIR, exist_ok=True)

# Dataset processing constants
DATASET_DIR = "datasets"
EXPORTS_DIR = "exports"
DEPLOYMENT_DIR = "deployments"

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

# ===== DATASET PROCESSING CLASSES AND FUNCTIONS =====

class DataExpander:
    def __init__(self, openrouter_api_key=None, model_name="meta-llama/llama-3.1-8b-instruct", provider="auto"):
        self.openrouter_api_key = openrouter_api_key or os.getenv("OPENROUTER_API_KEY", "")
        self.model_name = model_name
        # provider can be: 'openrouter', 'gemini', 'auto'
        if provider not in ("openrouter", "gemini", "auto"):
            provider = "auto"
        if provider == "auto":
            if self.openrouter_api_key:
                self.provider = "openrouter"
            elif os.getenv("GOOGLE_API_KEY"):
                self.provider = "gemini"
            else:
                self.provider = "offline"
        else:
            self.provider = provider
        # Ensure a reasonable default model when using Gemini
        if self.provider == "gemini" and not str(self.model_name).startswith("gemini"):
            self.model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash-8b-latest")

    def generate_with_openrouter(self, prompt, system_prompt=None):
        """Generate response using OpenRouter API"""
        if not self.openrouter_api_key:
            return "NO_API_KEY"
        url = "https://openrouter.ai/api/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.openrouter_api_key}",
            "Content-Type": "application/json"
        }
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        payload = {
            "model": self.model_name,
            "messages": messages,
            "max_tokens": 1024,
            "temperature": 0.2
        }
        try:
            response = requests.post(url, headers=headers, json=payload)
            if response.status_code == 200:
                return response.json()["choices"][0]["message"]["content"]
            else:
                return f"Error: {response.status_code} - {response.text}"
        except Exception as e:
            return f"Connection error: {str(e)}"

    def generate_with_gemini(self, prompt, system_prompt=None):
        """Generate response using Google Gemini API with robust model discovery/fallback"""
        if not os.getenv("GOOGLE_API_KEY"):
            return "NO_GEMINI_API_KEY"
        # Start with requested/default candidates
        requested = []
        if str(self.model_name).startswith("gemini"):
            requested.append(self.model_name)
        requested += [
            "gemini-2.5-flash-8b-latest",
            "gemini-2.5-flash-latest",
            "gemini-1.5-pro-latest",
            "gemini-2.5-flash",
            "gemini-1.5-pro",
        ]
        # Query available models to filter invalid ones
        available = set()
        try:
            for m in genai.list_models():
                name = getattr(m, "name", "")
                if name:
                    available.add(name)
        except Exception:
            # If listing fails, fall back to requested list
            pass
        candidates = []
        for m in requested:
            # list_models returns names prefixed with "models/"
            if available:
                if (m in available) or (f"models/{m}" in available):
                    candidates.append(m if m in available else f"models/{m}")
            else:
                candidates.append(m)
        # As a last resort, include whatever was originally requested
        if not candidates:
            candidates = requested
        content = "\n\n".join([p for p in [system_prompt, prompt] if p])
        last_err = None
        for m in candidates:
            try:
                model = genai.GenerativeModel(m)
                resp = model.generate_content(
                    content,
                    generation_config={
                        "temperature": 0.2,
                        "max_output_tokens": 1024,
                    },
                )
                text = getattr(resp, "text", None)
                if not text and getattr(resp, "candidates", None):
                    parts = resp.candidates[0].content.parts
                    text = "".join(getattr(p, "text", "") for p in parts)
                if text:
                    return text
                last_err = "Empty response"
            except Exception as e:
                last_err = str(e)
                continue
        return f"Connection error: {last_err or 'Unknown error'}"

    def generate(self, prompt, system_prompt=None):
        if self.provider == "openrouter":
            return self.generate_with_openrouter(prompt, system_prompt)
        if self.provider == "gemini":
            return self.generate_with_gemini(prompt, system_prompt)
        # offline caller should not call generate(); return marker
        return "NO_PROVIDER"

    def expand_csv_offline(self, df, num_samples):
        """Generate synthetic rows without external APIs.
        - Numeric columns: sample around mean with small noise.
        - Categorical/text: sample from existing non-null values, or use synthetic_#.
        """
        if df.empty:
            return df
        rng = np.random.default_rng()
        cols = list(df.columns)
        out_rows = df.to_dict(orient="records")

        # Precompute stats and value pools
        numeric_cols = df.select_dtypes(include=["number"]).columns.tolist()
        stats = {col: (df[col].mean(), df[col].std(ddof=0) if df[col].std(ddof=0) > 0 else (abs(df[col].mean()) or 1.0)) for col in numeric_cols}
        pools = {}
        for col in cols:
            if col not in numeric_cols:
                values = [v for v in df[col].dropna().tolist() if str(v).strip() != ""]
                pools[col] = values if values else []

        for i in range(num_samples):
            new_row = {}
            for col in cols:
                if col in numeric_cols:
                    mu, sigma = stats[col]
                    # Use 10% of std as noise if sigma is too small
                    s = sigma if sigma and sigma > 0 else (abs(mu) * 0.1 or 1.0)
                    val = float(rng.normal(mu, s))
                    # If original column looked like int, round
                    if pd.api.types.is_integer_dtype(df[col].dtype):
                        val = int(round(val))
                    new_row[col] = val
                else:
                    pool = pools.get(col, [])
                    if pool:
                        new_row[col] = rng.choice(pool)
                    else:
                        new_row[col] = f"synthetic_{i+1}"
            out_rows.append(new_row)
        return pd.DataFrame(out_rows)

    def alter_csv_offline(self, df, alter_prompt):
        """Lightweight offline alteration without LLM when no specific rule matches.
        - Numeric: apply small noise to a subset of rows (5-20%).
        - Categorical/Text: swap with another value from the same column or append a small suffix.
        """
        if df.empty:
            return df
        rng = np.random.default_rng()
        out = df.copy(deep=True)
        n = len(out)
        if n == 0:
            return out
        frac = 0.2 if n < 100 else 0.1
        idx = out.sample(frac=frac, random_state=42).index if n > 1 else out.index

        # Numeric columns
        num_cols = out.select_dtypes(include=["number"]).columns.tolist()
        for col in num_cols:
            series = out.loc[idx, col].astype(float)
            mu = float(df[col].mean()) if pd.notna(df[col].mean()) else 0.0
            sd = float(df[col].std(ddof=0)) if pd.notna(df[col].std(ddof=0)) and df[col].std(ddof=0) > 0 else (abs(mu) * 0.1 or 1.0)
            noise = rng.normal(0.0, sd * 0.1, size=len(series))
            out.loc[idx, col] = series + noise
            if pd.api.types.is_integer_dtype(df[col].dtype):
                out[col] = out[col].round().astype(int)
            # keep non-negative if original data is non-negative
            if (df[col] >= 0).all():
                out[col] = out[col].clip(lower=0)

        # Non-numeric columns
        other_cols = [c for c in out.columns if c not in num_cols]
        for col in other_cols:
            values = [v for v in df[col].dropna().tolist() if str(v).strip() != ""]
            if not values:
                continue
            for i in idx:
                if rng.random() < 0.5:
                    out.at[i, col] = str(rng.choice(values))
                else:
                    base = str(out.at[i, col]) if pd.notna(out.at[i, col]) else ""
                    out.at[i, col] = (base + "*").strip()
        return out

    def alter_csv_rule_based(self, df, alter_prompt):
        """Apply deterministic transformations based on simple natural-language prompts.
        Supports operations on all numeric columns or specified columns:
        - multiply ... by/with N
        - divide ... by N
        - add/increase ... by N or by N%
        - subtract/decrease/reduce ... by N or by N%
        Examples:
        - "multiply each row with 100"
        - "multiply column price by 1.2"
        - "increase revenue by 10%"
        Returns (df_out, matched): dataframe and whether a rule matched.
        """
        if df.empty:
            return df, False
        text = (alter_prompt or "").strip()
        low = text.lower()

        # Determine target columns
        all_numeric = df.select_dtypes(include=["number"]).columns.tolist()
        targets = set(all_numeric)  # default to all numeric

        # Try to detect explicit columns mentioned in the prompt
        mentioned = []
        for col in df.columns:
            pattern = r"\b" + re.escape(str(col).lower()) + r"\b"
            if re.search(pattern, low):
                mentioned.append(col)
        if mentioned:
            targets = set([c for c in mentioned if c in df.columns])
            # If any mentioned columns are non-numeric, we will skip them safely

        # Helper to parse scalar number (integer/float)
        def parse_number(s: str):
            try:
                return float(s)
            except Exception:
                return None

        # Detect operations
        num = None
        op = None
        pct = False

        # percent patterns like 10%
        m_pct = re.search(r"(\d+(?:\.\d+)?)\s*%", low)
        if m_pct:
            num = float(m_pct.group(1))
            pct = True

        # multiply
        if op is None:
            m = re.search(r"multiply[\w\s]*?(?:by|with)\s*(-?\d+(?:\.\d+)?)", low)
            if m:
                op = "mul"
                num = parse_number(m.group(1))
        # divide
        if op is None:
            m = re.search(r"divide[\w\s]*?by\s*(-?\d+(?:\.\d+)?)", low)
            if m:
                op = "div"
                num = parse_number(m.group(1))
        # add/increase
        if op is None and ("add" in low or "increase" in low):
            m = re.search(r"(?:add|increase)[\w\s]*?(?:by\s*)?(-?\d+(?:\.\d+)?)(?:\s*%)?", low)
            if m:
                op = "add"
                if pct and num is not None:
                    pass
                else:
                    num = parse_number(m.group(1))
        # subtract/decrease/reduce
        if op is None and ("subtract" in low or "decrease" in low or "reduce" in low):
            m = re.search(r"(?:subtract|decrease|reduce)[\w\s]*?(?:by\s*)?(-?\d+(?:\.\d+)?)(?:\s*%)?", low)
            if m:
                op = "sub"
                if pct and num is not None:
                    pass
                else:
                    num = parse_number(m.group(1))

        if op is None:
            return df, False

        out = df.copy()
        applied = False
        for col in targets:
            if col not in out.columns:
                continue
            if not pd.api.types.is_numeric_dtype(out[col]):
                continue
            series = out[col].astype(float)
            if op == "mul" and num is not None:
                out[col] = series * num
                applied = True
            elif op == "div" and num not in (None, 0):
                out[col] = series / num
                applied = True
            elif op == "add" and num is not None:
                if pct:
                    out[col] = series * (1.0 + num / 100.0)
                else:
                    out[col] = series + num
                applied = True
            elif op == "sub" and num is not None:
                if pct:
                    out[col] = series * (1.0 - num / 100.0)
                else:
                    out[col] = series - num
                applied = True
        return out, applied

    def alter_csv(self, df, alter_prompt):
        """Alter CSV data using a prompt via Llama on OpenRouter"""
        if df.empty:
            print("The CSV file contains no data.")
            return df
        
        # For large datasets, show only first few rows to the model
        if len(df) > 50:
            sample_data = df.head(10).to_csv(index=False)
            prompt = f"""
You are a data scientist. Here is a sample of a CSV dataset (showing first 10 rows of {len(df)} total rows):

{sample_data}

The full dataset has the same structure with {len(df)} rows.

Instruction: {alter_prompt}

Return the complete modified CSV with all {len(df)} rows, following the same format. Return only the CSV data, no explanations.
"""
        else:
            csv_data = df.to_csv(index=False)
            prompt = f"""
You are a data scientist. Here is a CSV dataset:

{csv_data}

Instruction: {alter_prompt}

Return the modified CSV only, no extra text or explanations.
"""
        
        print("Processing data alteration...")
        response_text = self.generate(prompt)
        
        # Try to parse the returned CSV
        try:
            from io import StringIO
            # Clean the response
            response_text = response_text.strip()
            if response_text.startswith('```csv'):
                response_text = response_text[6:]
            elif response_text.startswith('```'):
                response_text = response_text[3:]
            if response_text.endswith('```'):
                response_text = response_text[:-3]
            response_text = response_text.strip()
            
            df_out = pd.read_csv(StringIO(response_text))
            return df_out
        except Exception as e:
            print(f"Could not parse the altered CSV: {str(e)}")
            print("Raw LLM Output:")
            print(response_text[:500] + "..." if len(response_text) > 500 else response_text)
            return df

    def expand_csv(self, df, expansion_prompt, num_samples):
        """Expand CSV data by generating new rows"""
        if df.empty:
            print("The CSV file contains no data.")
            return df
        
        fieldnames = list(df.columns)
        expanded_rows = df.to_dict(orient="records")

        print(f"Generating {num_samples} new rows...")

        for i in range(num_samples):
            # Update progress
            progress = (i + 1) / num_samples
            print(f"Generating row {i + 1} of {num_samples}... ({progress*100:.1f}%)")
            
            prompt = (
                f"Generate a new CSV row as a JSON object for fields: {fieldnames} "
                f"based on: {expansion_prompt}. "
                f"Return only valid JSON, no additional text or formatting."
            )
            
            response_text = self.generate(prompt)
            
            try:
                # Clean the response to extract JSON
                response_text = response_text.strip()
                if response_text.startswith('```json'):
                    response_text = response_text[7:]
                elif response_text.startswith('```'):
                    response_text = response_text[3:]
                if response_text.endswith('```'):
                    response_text = response_text[:-3]
                response_text = response_text.strip()
                
                new_row = json.loads(response_text)
            except json.JSONDecodeError:
                # Fallback to dummy data if JSON parsing fails
                new_row = {col: f"generated_{i}" for col in fieldnames}
                
            expanded_rows.append({col: new_row.get(col, "") for col in fieldnames})
        
        print("Generation completed!")
        out_df = pd.DataFrame(expanded_rows)
        return out_df

    def expand_images(self, image_files, num_copies):
        """Expand images by creating augmented versions"""
        temp_dir = tempfile.mkdtemp()
        
        for image_file in image_files:
            # Read image from uploaded file
            img = Image.open(image_file)
            img_basename = os.path.splitext(image_file.filename)[0]
            ext = os.path.splitext(image_file.filename)[1]
            
            # Save original
            img.save(os.path.join(temp_dir, f"{img_basename}{ext}"))
            
            # Generate augmented copies
            for i in range(num_copies):
                aug = img.copy()
                if i % 3 == 0:
                    aug = aug.transpose(Image.FLIP_LEFT_RIGHT)
                elif i % 3 == 1:
                    aug = aug.rotate(15 * (i+1))
                else:
                    aug = aug.rotate(-15 * (i+1))
                aug.save(os.path.join(temp_dir, f"{img_basename}_aug{i+1}{ext}"))
        
        # Zip folder
        zip_path = os.path.join(temp_dir, "expanded_images.zip")
        with zipfile.ZipFile(zip_path, 'w') as zipf:
            for file_name in os.listdir(temp_dir):
                if file_name.endswith(('.jpg','.jpeg','.png')):
                    zipf.write(os.path.join(temp_dir, file_name), arcname=file_name)
        
        return zip_path

def generate_data_insights(df):
    """Generate insights about the dataset"""
    insights = []
    
    try:
        # Basic statistics
        total_rows = len(df)
        total_cols = len(df.columns)
        insights.append(f"Dataset contains {total_rows:,} rows and {total_cols} columns")
        
        # Null values
        null_count = df.isnull().sum().sum()
        if null_count > 0:
            insights.append(f"Found {null_count:,} missing values across all columns")
        else:
            insights.append("No missing values detected")
        
        # Data types
        numeric_cols = len(df.select_dtypes(include=['number']).columns)
        text_cols = len(df.select_dtypes(include=['object']).columns)
        if numeric_cols > 0:
            insights.append(f"Contains {numeric_cols} numeric and {text_cols} text columns")
        
        # Memory usage
        memory_mb = df.memory_usage(deep=True).sum() / (1024 * 1024)
        insights.append(f"Dataset uses approximately {memory_mb:.1f} MB of memory")
        
        # Duplicates
        duplicates = df.duplicated().sum()
        if duplicates > 0:
            insights.append(f"Found {duplicates:,} duplicate rows")
    
    except Exception as e:
        print(f"Error generating insights: {str(e)}")
        insights.append("Basic dataset analysis completed.")
    
    return insights[:5]

# Deployment helper functions
def load_config():
    config = {
        'github_token': os.getenv('GITHUB_TOKEN', ''),
        'github_username': os.getenv('GITHUB_USERNAME', ''),
    }
    
    # Verify that credentials exist
    if not config['github_token'] or not config['github_username']:
        logger.error("GitHub credentials missing from environment variables")
        return None
    
    return config

# ===== DATASET PROCESSING API ROUTES =====

@app.route('/api/upload-dataset', methods=['POST'])
def upload_dataset():
    """Upload dataset file to the database"""
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
        
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
        
    if not file.filename.endswith(('.csv', '.xlsx', '.json')):
        return jsonify({"error": "Only CSV, XLSX and JSON files are allowed"}), 400
    
    try:
        # Create a temporary file to save the uploaded content
        temp_file_path = tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1])
        file.save(temp_file_path.name)
        temp_file_path.close()
        
        # Save the file to the database with original filename
        with open(temp_file_path.name, 'rb') as temp_file:
            file_content = temp_file.read()
            db_fs.save_file_content(file_content, file.filename, DATASET_DIR)
        
        # Clean up temporary file
        os.unlink(temp_file_path.name)
        
        # If it's an Excel file, also convert to CSV for easier processing
        if file.filename.endswith('.xlsx'):
            try:
                # Create a temporary file
                with tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx') as temp_excel:
                    file.seek(0)
                    file.save(temp_excel.name)
                    temp_excel_path = temp_excel.name
                
                # Read the Excel file
                excel_df = pd.read_excel(temp_excel_path)
                
                # Create CSV filename
                csv_filename = file.filename.replace('.xlsx', '.csv')
                
                # Save as CSV to a temporary file
                with tempfile.NamedTemporaryFile(mode='w+', delete=False, suffix='.csv', encoding='utf-8') as temp_csv:
                    excel_df.to_csv(temp_csv, index=False)
                    temp_csv_path = temp_csv.name
                
                # Save CSV to database with proper filename
                with open(temp_csv_path, 'rb') as temp_csv_file:
                    csv_content = temp_csv_file.read()
                    db_fs.save_file_content(csv_content, csv_filename, DATASET_DIR)
                
                # Clean up temporary files
                os.unlink(temp_excel_path)
                os.unlink(temp_csv_path)
                
                return jsonify({
                    "message": f"File {file.filename} uploaded successfully and converted to CSV ({csv_filename})",
                    "csv_file": csv_filename,
                    "success": True
                })
            except Exception as excel_error:
                return jsonify({
                    "message": f"File {file.filename} uploaded but could not convert to CSV: {str(excel_error)}",
                    "warning": True,
                    "success": True
                })
        
        return jsonify({
            "message": f"File {file.filename} uploaded successfully", 
            "success": True
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/datasets', methods=['GET'])
def list_datasets():
    """List all available datasets from the database"""
    try:
        datasets = []
        
        # Get CSV datasets from database
        db_files = db_fs.list_files(DATASET_DIR)
        
        for filename in db_files:
            if filename.endswith('.csv'):
                # Get actual file size from database
                try:
                    file_content = db_fs.get_file(filename, DATASET_DIR)
                    file_size_kb = len(file_content) / 1024
                    if file_size_kb < 1024:
                        size_str = f"{file_size_kb:.1f} KB"
                    else:
                        size_str = f"{file_size_kb/1024:.1f} MB"
                except:
                    size_str = "Unknown"
                
                datasets.append({
                    "name": filename,
                    "size": size_str,
                    "modified": time.strftime('%Y-%m-%d %H:%M:%S'),
                    "type": "tabular"
                })
        
        return jsonify({
            "datasets": datasets,
            "success": True
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/preview-dataset', methods=['POST'])
def preview_dataset():
    """Preview dataset content from the database"""
    data = request.json
    file_name = data.get('file_name', '')
    view_all = data.get('view_all', False)
    
    if not file_name:
        return jsonify({"error": "No file name provided"}), 400
    
    try:
        # Check if file exists in database
        if not db_fs.file_exists(file_name, DATASET_DIR):
            return jsonify({"error": f"File {file_name} not found in database"}), 404
        
        # Get file content from database
        file_content = db_fs.get_file(file_name, DATASET_DIR)
        
        # Read the CSV content into a DataFrame
        df = pd.read_csv(io.BytesIO(file_content))
        
        # Get data types for each column
        column_types = {col: str(df[col].dtype) for col in df.columns}
        
        # Get basic statistics for numeric columns
        numeric_stats = {}
        for col in df.select_dtypes(include=['number']).columns:
            numeric_stats[col] = {
                'min': float(df[col].min()) if not pd.isna(df[col].min()) else None,
                'max': float(df[col].max()) if not pd.isna(df[col].max()) else None,
                'mean': float(df[col].mean()) if not pd.isna(df[col].mean()) else None,
                'median': float(df[col].median()) if not pd.isna(df[col].median()) else None
            }
        
        # Generate insights
        insights = generate_data_insights(df)
        
        # Return enhanced preview data
        preview_rows = df.to_dict(orient='records') if view_all else df.head(10).to_dict(orient='records')
        
        return jsonify({
            "preview": preview_rows,
            "columns": df.columns.tolist(),
            "column_types": column_types,
            "rows": len(df),
            "showing_rows": len(preview_rows),
            "is_full_view": view_all,
            "numeric_stats": numeric_stats,
            "insights": insights,
            "success": True
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/expand-dataset', methods=['POST'])
def expand_dataset():
    """Expand dataset by adding new rows"""
    data = request.json
    file_name = data.get('file_name', '')
    expansion_prompt = data.get('expansion_prompt', '')
    num_samples = data.get('num_samples', 10)
    api_key = data.get('api_key', '') or os.getenv("OPENROUTER_API_KEY", "")
    model_name = data.get('model_name', 'meta-llama/llama-3.1-8b-instruct')
    
    if not file_name or not expansion_prompt:
        return jsonify({"error": "File name and expansion prompt are required"}), 400
    
    # Do not hard-fail on missing API key. We'll fallback to offline generation.
    use_llm = bool(api_key)
    
    try:
        # Check if file exists in database
        if not db_fs.file_exists(file_name, DATASET_DIR):
            return jsonify({"error": f"File {file_name} not found in database"}), 404
        
        # Get file content from database
        file_content = db_fs.get_file(file_name, DATASET_DIR)
        
        # Read the CSV content into a DataFrame
        df = pd.read_csv(io.BytesIO(file_content))
        
        # Initialize data expander
        provider = data.get('provider', 'auto')
        expander = DataExpander(openrouter_api_key=api_key, model_name=model_name, provider=provider)
        
        # Expand the dataset
        expanded_df = None
        generation_mode = "offline"
        warning = None
        if use_llm:
            try:
                expanded_df = expander.expand_csv(df, expansion_prompt, num_samples)
                generation_mode = "llm"
            except Exception as llm_err:
                warning = f"LLM expansion failed, falling back to offline: {str(llm_err)}"
                print(warning)
        
        if expanded_df is None:
            if not use_llm and not warning:
                warning = "OpenRouter API key not found; generated synthetic rows without LLM. Set OPENROUTER_API_KEY to use LLM expansion."
                print(f"Warning: {warning}")
            expanded_df = expander.expand_csv_offline(df, num_samples)
            generation_mode = "offline"
        
        # Save expanded dataset to database
        current_time = time.strftime("%Y%m%d_%H%M%S")
        expanded_filename = f"expanded_{current_time}_{file_name}"
        
        # Create a temporary file to save the expanded CSV
        with tempfile.NamedTemporaryFile(mode='w+', delete=False, suffix='.csv', encoding='utf-8') as temp_file:
            expanded_df.to_csv(temp_file, index=False)
            temp_file_path = temp_file.name
        
        try:
            # Save the expanded file to the database with the correct filename
            with open(temp_file_path, 'rb') as temp_file:
                db_fs.save_file_content(temp_file.read(), expanded_filename, DATASET_DIR)
            print(f"Saved expanded dataset to database: {expanded_filename}")
            # Clean up the temporary file
            os.unlink(temp_file_path)
        except Exception as save_error:
            print(f"Error saving to database: {str(save_error)}")
        
        # Convert DataFrame to JSON for preview
        preview_data = expanded_df.head(10).to_dict(orient='records')
        
        # Get column info with data types
        columns_with_types = []
        for col in expanded_df.columns:
            data_type = str(expanded_df[col].dtype)
            columns_with_types.append({
                "name": col,
                "type": data_type
            })
        
        # Generate insights
        insights = generate_data_insights(expanded_df)
        
        # Prepare CSV data for download
        clean_csv = expanded_df.to_csv(index=False)
        
        response_payload = {
            "success": True,
            "message": f"Dataset expanded successfully! Added {num_samples} new rows.",
            "expanded_filename": expanded_filename,
            "previewData": preview_data,
            "columns": columns_with_types,
            "original_rows": len(df),
            "expanded_rows": len(expanded_df),
            "insights": insights,
            "csvData": base64.b64encode(clean_csv.encode('utf-8')).decode('utf-8'),
            "generation_mode": generation_mode
        }
        if warning:
            response_payload["warning"] = warning
        return jsonify(response_payload)
        
    except Exception as e:
        error_traceback = traceback.format_exc()
        print(f"Error expanding dataset: {str(e)}")
        print(error_traceback)
        return jsonify({"error": f"Failed to expand dataset: {str(e)}"}), 500

@app.route('/api/alter-dataset', methods=['POST'])
def alter_dataset():
    """Alter dataset by modifying existing data"""
    data = request.json
    file_name = data.get('file_name', '')
    alter_prompt = data.get('alter_prompt', '')
    api_key = data.get('api_key', '') or os.getenv("OPENROUTER_API_KEY", "")
    model_name = data.get('model_name', 'meta-llama/llama-3.1-8b-instruct')
    
    if not file_name or not alter_prompt:
        return jsonify({"error": "File name and alter prompt are required"}), 400
    
    # Do not hard-fail on missing API key. We'll fallback to offline alteration.
    use_llm = bool(api_key) or bool(os.getenv("GOOGLE_API_KEY"))
    
    try:
        # Check if file exists in database
        if not db_fs.file_exists(file_name, DATASET_DIR):
            return jsonify({"error": f"File {file_name} not found in database"}), 404
        
        # Get file content from database
        file_content = db_fs.get_file(file_name, DATASET_DIR)
        
        # Read the CSV content into a DataFrame
        original_df = pd.read_csv(io.BytesIO(file_content))
        
        # Initialize data expander
        provider = data.get('provider', 'auto')
        expander = DataExpander(openrouter_api_key=api_key, model_name=model_name, provider=provider)
        
        # Alter the dataset: prefer rule-based local transforms first
        altered_df = None
        generation_mode = "offline"
        warning = None

        # 1) Try rule-based first (ensures exact math like "multiply by 10")
        rb_df, matched = expander.alter_csv_rule_based(original_df, alter_prompt)
        if matched:
            altered_df = rb_df
            generation_mode = "rule-based"

        # 2) If still not altered and LLM is available, try LLM
        if altered_df is None and use_llm:
            try:
                altered_df = expander.alter_csv(original_df, alter_prompt)
                generation_mode = "llm"
            except Exception as llm_err:
                warning = f"LLM alteration failed, falling back to offline: {str(llm_err)}"
                print(warning)

        # 3) If still not altered, last resort: offline noise-based alteration
        if altered_df is None:
            if not use_llm and not warning:
                warning = "OpenRouter API key not found; altered data locally without LLM. Set OPENROUTER_API_KEY to use LLM alteration."
                print(f"Warning: {warning}")
            altered_df = expander.alter_csv_offline(original_df, alter_prompt)
            generation_mode = "offline"
        
        # Save altered dataset to database
        current_time = time.strftime("%Y%m%d_%H%M%S")
        altered_filename = f"altered_{current_time}_{file_name}"
        
        # Create a temporary file to save the altered CSV
        with tempfile.NamedTemporaryFile(mode='w+', delete=False, suffix='.csv', encoding='utf-8') as temp_file:
            altered_df.to_csv(temp_file, index=False)
            temp_file_path = temp_file.name
        
        try:
            # Save the altered file to the database with the correct filename
            with open(temp_file_path, 'rb') as temp_file:
                db_fs.save_file_content(temp_file.read(), altered_filename, DATASET_DIR)
            print(f"Saved altered dataset to database: {altered_filename}")
            # Clean up the temporary file
            os.unlink(temp_file_path)
        except Exception as save_error:
            print(f"Error saving to database: {str(save_error)}")
        
        # Convert DataFrame to JSON for preview
        preview_data = altered_df.head(10).to_dict(orient='records')
        original_preview = original_df.head(10).to_dict(orient='records')
        
        # Get column info with data types
        columns_with_types = []
        for col in altered_df.columns:
            data_type = str(altered_df[col].dtype)
            columns_with_types.append({
                "name": col,
                "type": data_type
            })
        
        # Generate insights
        insights = generate_data_insights(altered_df)
        
        # Check for changes
        changes = {
            "columns_added": list(set(altered_df.columns) - set(original_df.columns)),
            "columns_removed": list(set(original_df.columns) - set(altered_df.columns)),
            "row_count_changed": len(altered_df) != len(original_df)
        }
        
        # Prepare CSV data for download
        clean_csv = altered_df.to_csv(index=False)
        
        response_payload = {
            "success": True,
            "message": f"Dataset altered successfully!",
            "altered_filename": altered_filename,
            "originalPreviewData": original_preview,
            "alteredPreviewData": preview_data,
            "columns": columns_with_types,
            "original_rows": len(original_df),
            "altered_rows": len(altered_df),
            "changes": changes,
            "insights": insights,
            "csvData": base64.b64encode(clean_csv.encode('utf-8')).decode('utf-8'),
            "generation_mode": generation_mode
        }
        if warning:
            response_payload["warning"] = warning
        return jsonify(response_payload)
        
    except Exception as e:
        error_traceback = traceback.format_exc()
        print(f"Error altering dataset: {str(e)}")
        print(error_traceback)
        return jsonify({"error": f"Failed to alter dataset: {str(e)}"}), 500

@app.route('/api/datasets-health', methods=['GET'])
def api_health_check():
    """Check server health and API status"""
    status = {
        "status": "ok",
        "server": "running",
        "storage": {
            "database": "connected", 
            "total_datasets": 0
        },
        "version": "2.0.0"
    }
    
    # Count datasets
    try:
        csv_count = len([f for f in db_fs.list_files(DATASET_DIR) if f.endswith('.csv')])
        status["storage"]["total_datasets"] = csv_count
    except Exception as e:
        status["storage"]["error"] = str(e)
    
    return jsonify(status)

# ===== FLASK ROUTES =====

@app.route('/process', methods=['POST'])
def process():
    """Process the uploaded data and train a model"""
    try:
        # Get form data
        task_type = request.form.get('task_type', 'classification')
        text_prompt = request.form.get('text_prompt', '')
        
        logger.info(f"Processing request - Task Type: {task_type}")
        
        # Initialize variables
        df = None
        dataset_folder = None
        dataset_info = None
        detected_task_type = None
        
        # Check if a file was uploaded
        # Check if a file was uploaded
        if 'file' in request.files and request.files['file'].filename != '':
            file = request.files['file']

            for existing_file in os.listdir(DATASETS_DIR):
             os.remove(os.path.join(DATASETS_DIR, existing_file))
    
    # Save the file directly to DATASETS_DIR instead of TEMP_DIR
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
        
        # Check if a folder zip was uploaded
        elif 'folder_zip' in request.files and request.files['folder_zip'].filename != '':
            folder_zip = request.files['folder_zip']
            dataset_info = process_dataset_folder(folder_zip, task_type, DATASETS_DIR)
            dataset_folder = DATASETS_DIR
            
            # For folder uploads, the task type is typically determined by the folder structure
            # We maintain the user-selected task type for image_classification and object_detection
        
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
            return jsonify({'error': 'No data provided. Please upload a file, folder, or provide a text prompt.'})
        
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
                    })
                
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
                    })
            
            # Check for object detection task
            elif task_type == "object_detection":
                # Check if YOLO is available
                if not YOLO_AVAILABLE:
                    return jsonify({
                        'error': 'YOLO is required for object detection but not available. Please install ultralytics and torch.'
                    })
                
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
                    })
            
            else:
                return jsonify({
                    'error': f'Task type {task_type} not supported for the uploaded dataset.'
                })
        
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

# ===== CSV ANALYSIS ROUTES =====

# Storage for uploaded CSV files
uploaded_csv_files = {}

def chat_with_csv(df, query):
    """
    Chat with CSV data using Gemini
    """
    try:
        # Get DataFrame info
        df_info = df.describe().to_string()
        df_head = df.head(5).to_string()
        df_columns = ', '.join(df.columns.tolist())
        
        # Create prompt for Gemini
        prompt = f"""
        I have a CSV dataset with the following columns: {df_columns}
        
        Here's a sample of the data:
        {df_head}
        
        Here's a statistical summary:
        {df_info}
        
        Based on this data, please answer the following question:
        {query}
        
        Provide a direct and concise answer. If calculations are needed, explain your approach.
        """
        
        # Initialize Gemini model
        model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
        model = genai.GenerativeModel(model_name)
        
        # Get response from Gemini
        response = model.generate_content(prompt)
        
        return response.text
    
    except Exception as e:
        return f"An error occurred: {str(e)}"

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint for CSV analysis"""
    return jsonify({
        "success": True, 
        "message": "Analysis server is running", 
        "port": 5000,
        "gemini_configured": bool(api_key),
        "csv_analysis_dir": os.path.exists(CSV_ANALYSIS_DIR),
        "uploaded_files_count": len(uploaded_csv_files),
        "database_connected": db_fs is not None
    })

@app.route('/upload', methods=['POST'])
def upload_csv_file():
    """Upload CSV files for analysis"""
    if 'files' not in request.files:
        return jsonify({"success": False, "error": "No file part"})
    
    files = request.files.getlist('files')
    
    if not files or files[0].filename == '':
        return jsonify({"success": False, "error": "No files selected"})
    
    file_info = []
    
    for file in files:
        if file and file.filename.endswith('.csv'):
            filename = file.filename
            
            try:
                # Read file content directly
                file.seek(0)
                file_content = file.read()
                
                # Ensure the csv_analysis directory exists in database
                try:
                    if not hasattr(db_fs, 'ensure_directory_exists'):
                        # Fallback: try to create a dummy file to ensure directory exists
                        dummy_content = b"directory_marker"
                        db_fs.save_file_content(dummy_content, ".directory_marker", 'csv_analysis')
                except Exception as dir_error:
                    logger.info(f"Directory creation attempt: {str(dir_error)}")
                
                # Save to database storage using file content
                try:
                    db_fs.save_file_content(file_content, filename, 'csv_analysis')
                    storage_location = 'database'
                except Exception as db_error:
                    # Fallback to filesystem storage
                    logger.info(f"Database storage failed, using filesystem: {str(db_error)}")
                    file_path = os.path.join(CSV_ANALYSIS_DIR, filename)
                    with open(file_path, 'wb') as f:
                        f.write(file_content)
                    storage_location = 'filesystem'
                
                # Store filename and storage location for later use
                uploaded_csv_files[filename] = {
                    'filename': filename,
                    'storage': storage_location
                }
                
                # Create DataFrame from content for preview
                df = pd.read_csv(io.BytesIO(file_content))
                
                preview = df.head(3).to_dict('records')
                columns = df.columns.tolist()
                file_info.append({
                    "filename": filename,
                    "preview": preview,
                    "columns": columns
                })
            except Exception as e:
                return jsonify({"success": False, "error": f"Error processing CSV: {str(e)}"})
    
    return jsonify({"success": True, "files": file_info})

@app.route('/query', methods=['POST'])
def query_csv():
    """Query CSV data using natural language"""
    data = request.json
    
    if not data or 'filename' not in data or 'query' not in data:
        return jsonify({"success": False, "error": "Missing filename or query"})
    
    filename = data['filename']
    query = data['query']
    
    # Check if file was uploaded
    if filename not in uploaded_csv_files:
        return jsonify({"success": False, "error": "File not found. Please upload the file first."})
    
    try:
        # Get file content based on storage method
        file_info = uploaded_csv_files[filename]
        
        if isinstance(file_info, dict) and file_info.get('storage') == 'filesystem':
            # Read from filesystem
            file_path = os.path.join(CSV_ANALYSIS_DIR, filename)
            if not os.path.exists(file_path):
                return jsonify({"success": False, "error": "File not found in filesystem"})
            df = pd.read_csv(file_path)
        else:
            # Try database first
            try:
                file_content = db_fs.get_file(filename, 'csv_analysis')
                df = pd.read_csv(io.BytesIO(file_content))
            except Exception as db_error:
                # Fallback to filesystem
                file_path = os.path.join(CSV_ANALYSIS_DIR, filename)
                if os.path.exists(file_path):
                    df = pd.read_csv(file_path)
                else:
                    return jsonify({"success": False, "error": f"File not found in any storage: {str(db_error)}"})
        
        # Use the chat_with_csv function with Gemini
        result = chat_with_csv(df, query)
        
        return jsonify({"success": True, "result": result})
    except Exception as e:
        return jsonify({"success": False, "error": f"An error occurred: {str(e)}"})

    
if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0', port=5000)
