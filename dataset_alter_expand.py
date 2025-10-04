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
import numpy as np
import google.generativeai as genai

# Load both .env.local and .env if present
try:
    load_dotenv('.env.local')
except Exception:
    pass
load_dotenv()

# Configure Gemini if key available
try:
    _gem_key = os.getenv("GOOGLE_API_KEY")
    if _gem_key:
        genai.configure(api_key=_gem_key)
        print("Gemini API configured successfully")
    else:
        print("Warning: GOOGLE_API_KEY not found in environment variables")
except Exception as _e:
    print(f"Gemini configuration skipped: {_e}")

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Initialize the database file system
db_fs = DBFileSystem()
fs_adapter = apply_patches()

# Set dataset directory name in the database
DATASET_DIR = "datasets"
EXPORTS_DIR = "exports"

class DataExpander:
    def __init__(self, openrouter_api_key=None, model_name="meta-llama/llama-3.1-8b-instruct", provider="auto"):
        self.openrouter_api_key = openrouter_api_key or os.getenv("OPENROUTER_API_KEY", "")
        self.model_name = model_name
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
        if self.provider == "gemini" and not str(self.model_name).startswith("gemini"):
            self.model_name = os.getenv("GEMINI_MODEL", "gemini-1.5-flash-8b-latest")

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
        if not os.getenv("GOOGLE_API_KEY"):
            return "NO_GEMINI_API_KEY"
        requested = []
        if str(self.model_name).startswith("gemini"):
            requested.append(self.model_name)
        requested += [
            "gemini-1.5-flash-8b-latest",
            "gemini-1.5-flash-latest",
            "gemini-1.5-pro-latest",
            "gemini-1.5-flash",
            "gemini-1.5-pro",
        ]
        available = set()
        try:
            for m in genai.list_models():
                name = getattr(m, "name", "")
                if name:
                    available.add(name)
        except Exception:
            pass
        candidates = []
        for m in requested:
            if available:
                if (m in available) or (f"models/{m}" in available):
                    candidates.append(m if m in available else f"models/{m}")
            else:
                candidates.append(m)
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
                    s = sigma if sigma and sigma > 0 else (abs(mu) * 0.1 or 1.0)
                    val = float(rng.normal(mu, s))
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

        def parse_number(s: str):
            try:
                return float(s)
            except Exception:
                return None

        num = None
        op = None
        pct = False

        m_pct = re.search(r"(\d+(?:\.\d+)?)\s*%", low)
        if m_pct:
            num = float(m_pct.group(1))
            pct = True

        if op is None:
            m = re.search(r"multiply[\w\s]*?(?:by|with)\s*(-?\d+(?:\.\d+)?)", low)
            if m:
                op = "mul"
                num = parse_number(m.group(1))
        if op is None:
            m = re.search(r"divide[\w\s]*?by\s*(-?\d+(?:\.\d+)?)", low)
            if m:
                op = "div"
                num = parse_number(m.group(1))
        if op is None and ("add" in low or "increase" in low):
            m = re.search(r"(?:add|increase)[\w\s]*?(?:by\s*)?(-?\d+(?:\.\d+)?)(?:\s*%)?", low)
            if m:
                op = "add"
                if pct and num is not None:
                    pass
                else:
                    num = parse_number(m.group(1))
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
                    s = sigma if sigma and sigma > 0 else (abs(mu) * 0.1 or 1.0)
                    val = float(rng.normal(mu, s))
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
    provider = data.get('provider', 'auto')

    if not file_name or not expansion_prompt:
        return jsonify({"error": "File name and expansion prompt are required"}), 400

    # Try LLM if we have either OpenRouter or Gemini configured
    use_llm = bool(api_key) or bool(os.getenv("GOOGLE_API_KEY"))

    try:
        # Check if file exists in database
        if not db_fs.file_exists(file_name, DATASET_DIR):
            return jsonify({"error": f"File {file_name} not found in database"}), 404

        # Get file content from database
        file_content = db_fs.get_file(file_name, DATASET_DIR)

        # Read the CSV content into a DataFrame
        df = pd.read_csv(io.BytesIO(file_content))

        # Initialize data expander
        expander = DataExpander(openrouter_api_key=api_key, model_name=model_name, provider=provider)

        # Expand the dataset
        expanded_df = None
        generation_mode = "offline"
        warning = None
        if use_llm:
            try:
                expanded_df = expander.expand_csv(df, expansion_prompt, num_samples)
                generation_mode = "llm" if expander.provider in ("openrouter", "gemini") else "offline"
            except Exception as llm_err:
                warning = f"LLM expansion failed, falling back to offline: {str(llm_err)}"
                print(warning)

        if expanded_df is None:
            if not use_llm and not warning:
                warning = "No LLM key detected; generated synthetic rows locally. Set GOOGLE_API_KEY for Gemini or OPENROUTER_API_KEY for OpenRouter to use LLM."
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