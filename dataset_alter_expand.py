from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import random
import json
import time
import re
import pandas as pd
import io
import csv
import base64
import traceback
import tempfile
import requests
from datetime import datetime, timedelta
from db_file_system import DBFileSystem
from db_system_integration import apply_patches
from PIL import Image
import zipfile

from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Initialize the database file system
db_fs = DBFileSystem()
fs_adapter = apply_patches()

# Set dataset directory name in the database
DATASET_DIR = "datasets"
EXPORTS_DIR = "exports"

class DataExpander:
    def __init__(self, openrouter_api_key=None, model_name="meta-llama/llama-3.1-8b-instruct"):
        self.openrouter_api_key = openrouter_api_key or os.getenv("OPENROUTER_API_KEY", "")
        self.model_name = model_name

    def generate_with_openrouter(self, prompt, system_prompt=None):
        """Generate response using OpenRouter API"""
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

    def alter_csv(self, df, alter_prompt):
        """Alter CSV data using a prompt via Llama on OpenRouter - EXACT STREAMLIT LOGIC"""
        if df.empty:
            print("The CSV file contains no data.")
            return df
        
        # For large datasets, show only first few rows to the model
        if len(df) > 50:
            sample_data = df.head(10).to_csv(index=False)
            full_data = df.to_csv(index=False)
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
        response_text = self.generate_with_openrouter(prompt)
        
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
        """Expand CSV data by generating new rows - EXACT STREAMLIT LOGIC"""
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
            
            response_text = self.generate_with_openrouter(prompt)
            
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
        # Get general dataset info
        num_rows = len(df)
        num_cols = len(df.columns)
        insights.append(f"Dataset contains {num_rows} rows and {num_cols} columns.")
        
        # Check for completeness
        null_counts = df.isnull().sum()
        columns_with_nulls = [col for col, count in null_counts.items() if count > 0]
        if columns_with_nulls:
            insights.append(f"Data quality: {len(columns_with_nulls)} column(s) contain missing values.")
        else:
            insights.append("Data quality: All columns are complete with no missing values.")
        
        # Check for numeric columns
        numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
        if numeric_cols:
            insights.append(f"Found {len(numeric_cols)} numeric columns for analysis.")
        
        # Check for categorical columns
        cat_cols = df.select_dtypes(include=['object', 'category']).columns.tolist()
        if cat_cols:
            insights.append(f"Found {len(cat_cols)} categorical columns.")
    
    except Exception as e:
        print(f"Error generating insights: {str(e)}")
        insights.append("Basic dataset analysis completed.")
    
    return insights[:5]

# API Routes

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
        
        # Save the file to the database
        db_fs.save_file(temp_file_path.name, DATASET_DIR)
        
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
                
                # Save CSV to database
                db_fs.save_file(temp_csv_path, DATASET_DIR)
                
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
    
    if not api_key:
        return jsonify({"error": "OpenRouter API key is required. Please provide it in the request or set OPENROUTER_API_KEY in environment"}), 400
    
    try:
        # Check if file exists in database
        if not db_fs.file_exists(file_name, DATASET_DIR):
            return jsonify({"error": f"File {file_name} not found in database"}), 404
        
        # Get file content from database
        file_content = db_fs.get_file(file_name, DATASET_DIR)
        
        # Read the CSV content into a DataFrame
        df = pd.read_csv(io.BytesIO(file_content))
        
        # Initialize data expander
        expander = DataExpander(openrouter_api_key=api_key, model_name=model_name)
        
        # Expand the dataset using EXACT STREAMLIT LOGIC
        expanded_df = expander.expand_csv(df, expansion_prompt, num_samples)
        
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
        
        return jsonify({
            "success": True,
            "message": f"Dataset expanded successfully! Added {num_samples} new rows.",
            "expanded_filename": expanded_filename,
            "previewData": preview_data,
            "columns": columns_with_types,
            "original_rows": len(df),
            "expanded_rows": len(expanded_df),
            "insights": insights,
            "csvData": base64.b64encode(clean_csv.encode('utf-8')).decode('utf-8')
        })
        
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
    
    if not api_key:
        return jsonify({"error": "OpenRouter API key is required. Please provide it in the request or set OPENROUTER_API_KEY in environment"}), 400
    
    try:
        # Check if file exists in database
        if not db_fs.file_exists(file_name, DATASET_DIR):
            return jsonify({"error": f"File {file_name} not found in database"}), 404
        
        # Get file content from database
        file_content = db_fs.get_file(file_name, DATASET_DIR)
        
        # Read the CSV content into a DataFrame
        original_df = pd.read_csv(io.BytesIO(file_content))
        
        # Initialize data expander
        expander = DataExpander(openrouter_api_key=api_key, model_name=model_name)
        
        # Alter the dataset using EXACT STREAMLIT LOGIC
        altered_df = expander.alter_csv(original_df, alter_prompt)
        
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
        
        return jsonify({
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
            "csvData": base64.b64encode(clean_csv.encode('utf-8')).decode('utf-8')
        })
        
    except Exception as e:
        error_traceback = traceback.format_exc()
        print(f"Error altering dataset: {str(e)}")
        print(error_traceback)
        return jsonify({"error": f"Failed to alter dataset: {str(e)}"}), 500

@app.route('/api/expand-images', methods=['POST'])
def expand_images():
    """Expand images by creating augmented versions"""
    if 'images' not in request.files:
        return jsonify({"error": "No images provided"}), 400
    
    images = request.files.getlist('images')
    num_copies = int(request.form.get('num_copies', 2))
    
    if not images:
        return jsonify({"error": "No images selected"}), 400
    
    try:
        # Initialize data expander
        expander = DataExpander()
        
        # Expand images
        zip_path = expander.expand_images(images, num_copies)
        
        # Save zip file to database
        current_time = time.strftime("%Y%m%d_%H%M%S")
        zip_filename = f"expanded_images_{current_time}.zip"
        
        try:
            db_fs.save_file(zip_path, EXPORTS_DIR)
            print(f"Saved expanded images to database: {zip_filename}")
        except Exception as save_error:
            print(f"Error saving to database: {str(save_error)}")
        
        # Return the zip file for download
        return send_file(zip_path, as_attachment=True, download_name=zip_filename)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/download/<path:filename>', methods=['GET'])
def download_file(filename):
    """Download file from the database"""
    try:
        # Check if file exists in database
        if not db_fs.file_exists(filename, DATASET_DIR):
            return jsonify({"error": "File not found in database"}), 404
        
        # Get file content from database
        file_content = db_fs.get_file(filename, DATASET_DIR)
        
        # Create a temporary file to serve
        temp_file = tempfile.NamedTemporaryFile(delete=False)
        temp_file.write(file_content)
        temp_file.close()
        
        # Send the file
        response = send_file(temp_file.name, as_attachment=True, download_name=filename)
        
        # Delete the temporary file after sending
        @response.call_on_close
        def cleanup():
            if os.path.exists(temp_file.name):
                os.unlink(temp_file.name)
        
        return response
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
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

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5004, debug=False)