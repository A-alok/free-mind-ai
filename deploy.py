from flask import Flask, request, jsonify, send_from_directory, render_template
import os
import zipfile
import tempfile
import subprocess
import shutil
import requests
import json
import time
from pathlib import Path
import io
import yaml
import base64
import logging
from werkzeug.utils import secure_filename
from db_file_system import DBFileSystem
from db_system_integration import apply_patches
from dotenv import load_dotenv
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__, static_folder='../public')

# Initialize the database file system
db_fs = DBFileSystem()
fs_adapter = apply_patches()

# Directory name in the database for deployment files
DEPLOYMENT_DIR = "deployments"

# Load configuration from environment variables
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

def generate_render_yaml(task_type, github_username, repo_name, model_file):
    """Generate render.yaml content based on the project type"""
    # Keep as Python since we're deploying Flask backend
    render_yaml = f"""services:
  - type: web
    name: {task_type.replace('_', '-')}-service
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: python app.py
    repo: https://github.com/{github_username}/{repo_name}.git
    branch: main
    plan: free
    autoDeploy: true
    envVars:
      - key: PYTHON_VERSION
        value: "3.9"
      - key: MODEL_FILE
        value: {model_file}
      - key: PORT
        value: "10000"
"""
    return render_yaml

def generate_setup_env(model_file):
    """Generate setup_env.py content for ML model deployment"""
    setup_env_content = f'''import os
import sys
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)

# Get environment variables with defaults
MODEL_FILE = os.environ.get('MODEL_FILE', '{model_file}')
PORT = int(os.environ.get('PORT', 10000))

# Set up model directory
MODEL_DIR = os.path.dirname(os.path.abspath(__file__))

def get_model_path():
    """Return the full path to the model file"""
    return os.path.join(MODEL_DIR, MODEL_FILE)

def setup_environment():
    """Set up any additional environment configuration"""
    logging.info(f"Setting up environment for {{MODEL_FILE}}")
    logging.info(f"Model directory: {{MODEL_DIR}}")
    logging.info(f"Server will run on port: {{PORT}}")
    
    # Create any necessary directories
    os.makedirs('logs', exist_ok=True)
    
    return {{
        'model_path': get_model_path(),
        'port': PORT
    }}

if __name__ == "__main__":
    # Test the setup
    config = setup_environment()
    logging.info(f"Environment setup complete: {{config}}")
'''
    return setup_env_content

def update_requirements(extraction_dir):
    """Add or update necessary dependencies in requirements.txt"""
    req_path = os.path.join(extraction_dir, "requirements.txt")
    
    # Read existing requirements
    with open(req_path, 'r') as f:
        requirements = f.read().splitlines()
    
    # Remove any existing altair entries (to avoid version conflicts)
    filtered_requirements = []
    for req in requirements:
        if not req.lower().startswith("altair"):
            filtered_requirements.append(req)
    
    # List of required packages for Streamlit deployment
    required_packages = [
        "streamlit>=1.22.0",
        "numpy>=1.20.0",
        "altair==4.2.2",  # Pin to exact version that works with Streamlit
        "matplotlib>=3.5.0",
        "scikit-learn>=1.0.0",
    ]
    
    # Add all required packages
    for package in required_packages:
        package_name = package.split('=')[0].split('>')[0].lower()
        # Check if package exists already
        exists = False
        for req in filtered_requirements:
            if req.lower().startswith(package_name):
                exists = True
                break
        
        if not exists:
            filtered_requirements.append(package)
    
    # Write updated requirements
    with open(req_path, 'w') as f:
        f.write("\n".join(filtered_requirements))

def fix_load_model(extraction_dir):
    """Check load_model.py and make minimal adjustments for Streamlit deployment"""
    load_model_path = os.path.join(extraction_dir, "load_model.py")
    
    # Read the file
    with open(load_model_path, 'r') as f:
        content = f.read()
    
    # Check if it uses streamlit
    if 'import streamlit' in content:
        logger.info("Detected Streamlit in load_model.py - Will keep Streamlit implementation.")
        
        # Create a wrapper script to handle port binding properly
        logger.info("Creating a wrapper script to handle Render deployment properly")
        
        # Create a run.py file that will be the actual entry point
        run_script = """import os
import subprocess
import sys

# Get port from environment variable for Render compatibility
port = int(os.environ.get("PORT", 8501))

# Build the command to run streamlit with the correct port
cmd = [
    "streamlit", "run", 
    "load_model.py",
    "--server.port", str(port),
    "--server.address", "0.0.0.0",
    "--server.headless", "true",
    "--browser.serverAddress", "0.0.0.0",
    "--browser.gatherUsageStats", "false"
]

# Execute the command
process = subprocess.Popen(cmd)
process.wait()
"""
        
        # Write the run.py file
        with open(os.path.join(extraction_dir, "run.py"), 'w') as f:
            f.write(run_script)
        
        # Make a backup of original load_model.py
        backup_path = load_model_path + '.bak'
        shutil.copy(load_model_path, backup_path)
        
        return True
    else:
        logger.warning("No Streamlit import found in load_model.py - You may need to add streamlit code")
        return False

def push_files_to_github(repo_url, token, files_dir):
    """
    Push files to GitHub repository, skipping virtual environments and other unnecessary files
    
    Args:
        repo_url: GitHub repository URL
        token: GitHub API token
        files_dir: Directory containing files to upload
        
    Returns:
        bool: True if successful, False otherwise
    """
    repo_parts = repo_url.split('/')
    repo_owner = repo_parts[-2]
    repo_name = repo_parts[-1]
    
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json"
    }
    
    # Directories to skip when uploading
    skip_dirs = ["venv", ".venv", "__pycache__", ".git", ".ipynb_checkpoints", ".pytest_cache", ".vscode"]
    
    # File extensions to skip
    skip_extensions = [".pyc", ".pyo", ".pyd", ".so", ".dll", ".exe"]
    
    # Log directory structure for user feedback
    logger.info("Files to be uploaded to GitHub:")
    file_list = []
    for root, dirs, files in os.walk(files_dir):
        # Skip directories we don't want to upload
        dirs[:] = [d for d in dirs if d not in skip_dirs]
        
        level = root.replace(files_dir, '').count(os.sep)
        indent = ' ' * 4 * level
        subdir = os.path.basename(root)
        
        # Only add directory to list if it's not a root directory
        if subdir:
            file_list.append(f"{indent}{subdir}/")
            
        subindent = ' ' * 4 * (level + 1)
        for f in files:
            # Skip files with unwanted extensions
            if not any(f.endswith(ext) for ext in skip_extensions):
                file_list.append(f"{subindent}{f}")
    
    logger.info("\n".join(file_list))
    
    # Upload files to GitHub
    logger.info("Using direct file upload method...")
    
    uploaded_files = 0
    upload_errors = 0
    
    # Loop through files and upload each directly
    for root, dirs, filenames in os.walk(files_dir):
        # Skip directories we don't want to upload
        dirs[:] = [d for d in dirs if d not in skip_dirs]
        
        for filename in filenames:
            # Skip files with unwanted extensions
            if any(filename.endswith(ext) for ext in skip_extensions):
                continue
                
            if filename != '.git' and not filename.startswith('.git'):
                file_path = os.path.join(root, filename)
                rel_path = os.path.relpath(file_path, files_dir)
                
                # Skip based on relative path (additional check)
                if any(skip_dir in rel_path.split(os.sep) for skip_dir in skip_dirs):
                    continue
                    
                try:
                    # Read file content
                    with open(file_path, 'rb') as f:
                        content = f.read()
                    
                    # Detect content type (text vs binary)
                    try:
                        # Try to decode as text first
                        content_str = content.decode('utf-8')
                        
                        # Create or update file via GitHub API
                        file_url = f"https://api.github.com/repos/{repo_owner}/{repo_name}/contents/{rel_path}"
                        file_data = {
                            "message": f"Add {rel_path}",
                            "content": base64.b64encode(content).decode('ascii')
                        }
                        
                        # Check if file exists (to update instead of create)
                        file_check = requests.get(file_url, headers=headers)
                        if file_check.status_code == 200:
                            # File exists, need to update
                            file_data["sha"] = file_check.json()["sha"]
                        
                        # Upload the file
                        response = requests.put(file_url, headers=headers, json=file_data)
                        
                        if response.status_code not in [200, 201]:
                            logger.warning(f"Failed to upload {rel_path}: {response.text}")
                            upload_errors += 1
                        else:
                            logger.info(f"Uploaded: {rel_path}")
                            uploaded_files += 1
                        
                    except UnicodeDecodeError:
                        # Binary file
                        file_url = f"https://api.github.com/repos/{repo_owner}/{repo_name}/contents/{rel_path}"
                        file_data = {
                            "message": f"Add binary file {rel_path}",
                            "content": base64.b64encode(content).decode('ascii')
                        }
                        
                        # Upload the file
                        response = requests.put(file_url, headers=headers, json=file_data)
                        
                        if response.status_code not in [200, 201]:
                            logger.warning(f"Failed to upload binary file {rel_path}: {response.text}")
                            upload_errors += 1
                        else:
                            logger.info(f"Uploaded binary file: {rel_path}")
                            uploaded_files += 1
                except Exception as e:
                    logger.error(f"Error uploading {rel_path}: {str(e)}")
                    upload_errors += 1
    
    # Provide a summary
    if uploaded_files > 0:
        logger.info(f"Successfully uploaded {uploaded_files} files to GitHub")
        if upload_errors > 0:
            logger.warning(f"Failed to upload {upload_errors} files. See logs for details.")
    
    # Check if files were uploaded successfully
    contents_url = f"https://api.github.com/repos/{repo_owner}/{repo_name}/contents"
    response = requests.get(contents_url, headers=headers)
    
    if response.status_code == 200 and len(response.json()) > 0:
        logger.info("Repository verified successfully!")
        return True
    else:
        logger.error(f"Failed to verify file upload. Status: {response.status_code}")
        if response.status_code == 200:
            logger.error(f"Repository appears to be empty.")
        return False

def deploy_project(zip_file, task_type="ml"):
    """
    Deploys the ML project keeping the original structure intact
    but skipping virtual environment directories
    
    Args:
        zip_file: The uploaded ZIP file
        task_type: Type of ML task
    
    Returns:
        dict: GitHub URL and Render dashboard URL
    """
    # Create temp directory for extraction
    extraction_dir = tempfile.mkdtemp(prefix="ml_extraction_")
    logger.info(f"Extracting files to temporary directory: {extraction_dir}")

    try:
        # Create a list of directories to skip
        skip_dirs = ["venv/", ".venv/", "__pycache__/", ".git/", ".vscode/"]
        
        # Extract the ZIP file, skipping virtual environment directories
        with zipfile.ZipFile(zip_file, 'r') as zip_ref:
            # First, list all members to identify which ones to extract
            members_to_extract = []
            for member in zip_ref.namelist():
                # Check if this member is in a directory we want to skip
                should_skip = False
                for skip_dir in skip_dirs:
                    if member.startswith(skip_dir) or f"/{skip_dir}" in member:
                        should_skip = True
                        break
                
                if not should_skip:
                    members_to_extract.append(member)
            
            # Now extract only the filtered members
            logger.info(f"Extracting {len(members_to_extract)} files (skipping venv directories)")
            for member in members_to_extract:
                zip_ref.extract(member, extraction_dir)
        
        # Check for required files
        required_files = ["load_model.py", "requirements.txt"]
        model_files = ["best_model.pkl", "best_model.keras", "best_model.pt", "best_model.h5"]
        
        model_file = None
        for mf in model_files:
            if os.path.exists(os.path.join(extraction_dir, mf)):
                model_file = mf
                break
        
        if not model_file:
            logger.error("No model file found")
            shutil.rmtree(extraction_dir)
            return {"error": "No model file found in the ZIP. Need one of: best_model.pkl, best_model.keras, best_model.pt, or best_model.h5"}
        
        for req_file in required_files:
            if not os.path.exists(os.path.join(extraction_dir, req_file)):
                logger.error(f"Required file missing: {req_file}")
                shutil.rmtree(extraction_dir)
                return {"error": f"Required file {req_file} not found in the ZIP."}
        
        logger.info("Required files verified")
        
        # Create setup_env.py file
        setup_env_content = generate_setup_env(model_file)
        with open(os.path.join(extraction_dir, "setup_env.py"), "w") as f:
            f.write(setup_env_content)
        logger.info("setup_env.py created")
        
        # Check Streamlit load_model.py and make minimal adjustments
        if fix_load_model(extraction_dir):
            logger.info("load_model.py checked and prepared for Streamlit deployment")
        
        # Update requirements.txt with necessary packages
        update_requirements(extraction_dir)
        logger.info("requirements.txt updated with necessary dependencies")
        
        # Load GitHub credentials
        config = load_config()
        if not config:
            shutil.rmtree(extraction_dir)
            return {"error": "GitHub credentials not found in environment variables"}
            
        github_token = config.get('github_token')
        github_username = config.get('github_username')
        
        # Create repository name
        if task_type == "object_detection" or model_file.endswith(".pt"):
            repo_prefix = "object-detection"
        elif task_type == "image_classification" or model_file.endswith(".keras"):
            repo_prefix = "image-classification"
        else:
            repo_prefix = task_type.replace("_", "-")
            
        repo_name = f"{repo_prefix}-project-{int(time.time())}"
        
        # Create render.yaml
        render_yaml_content = generate_render_yaml(
            task_type,
            github_username,
            repo_name,
            model_file
        )
        
        with open(os.path.join(extraction_dir, "render.yaml"), "w") as f:
            f.write(render_yaml_content)
        
        logger.info("Render.yaml file created")
        
        # Create GitHub repository via API
        logger.info("Creating GitHub repository...")
        headers = {
            "Authorization": f"token {github_token}",
            "Accept": "application/vnd.github.v3+json"
        }
        
        create_repo_url = "https://api.github.com/user/repos"
        repo_data = {
            "name": repo_name,
            "private": False,
            "description": f"{repo_prefix.replace('-', ' ').title()} ML project repository"
        }
        
        try:
            response = requests.post(
                create_repo_url, 
                headers=headers, 
                data=json.dumps(repo_data)
            )
            
            if response.status_code != 201:
                error_message = response.json().get("message", "Unknown error")
                shutil.rmtree(extraction_dir)
                return {"error": f"Failed to create GitHub repository: {error_message}"}
            
            repo_url = response.json()["html_url"]
            
            logger.info(f"Created GitHub repository: {repo_url}")
            
            # Push files to GitHub using the API
            logger.info("Using GitHub API for direct file upload...")
            
            success = push_files_to_github(repo_url, github_token, extraction_dir)
            
            if success:
                logger.info("Files pushed to GitHub successfully")
                
                # Store project info in database for reference
                # Create a JSON record of the deployment
                deployment_info = {
                    "repo_name": repo_name,
                    "repo_url": repo_url,
                    "task_type": task_type,
                    "model_file": model_file,
                    "timestamp": int(time.time()),
                    "status": "success"
                }

                # Convert to JSON string
                deployment_json = json.dumps(deployment_info)
                
                temp_file_path = None
                try:
                    # Create a temp file to store this data
                    with tempfile.NamedTemporaryFile(mode='w+', delete=False, suffix='.json') as temp_file:
                        temp_file.write(deployment_json)
                        temp_file_path = temp_file.name
                    
                    # Save to database
                    deployment_filename = f"{repo_name}_deployment_info.json"
                    # Ensure deployments directory exists in database
                    if not DEPLOYMENT_DIR in db_fs.list_files("ml_system"):
                        db_fs._get_or_create_directory(DEPLOYMENT_DIR)
                    
                    # Save the deployment info
                    db_fs.save_file(temp_file_path, DEPLOYMENT_DIR)
                    logger.info(f"Saved deployment info to database: {deployment_filename}")
                except Exception as db_error:
                    logger.error(f"Error saving deployment info to database: {str(db_error)}")
                finally:
                    # Clean up temp file
                    if temp_file_path and os.path.exists(temp_file_path):
                        try:
                            os.unlink(temp_file_path)
                        except Exception as e:
                            logger.error(f"Error cleaning up temp file: {str(e)}")
                
                # Create Render dashboard URL (direct to blueprint creation)
                render_url = "https://dashboard.render.com/blueprint/new"
                
                logger.info("Deployment preparation complete!")
                
                # Clean up
                shutil.rmtree(extraction_dir)
                
                return {
                    "github_url": repo_url,
                    "render_url": render_url,
                    "render_status": "created",
                    "status": "success",
                    "message": "Repository created and files uploaded successfully"
                }
            else:
                logger.error("Failed to push files to GitHub")
                shutil.rmtree(extraction_dir)
                return {"error": "Failed to push files to GitHub"}
            
        except Exception as e:
            logger.error(f"Error during GitHub operations: {str(e)}")
            shutil.rmtree(extraction_dir)
            return {"error": f"Deployment failed: {str(e)}"}
    
    except Exception as e:
        logger.error(f"Error extracting files: {str(e)}")
        try:
            shutil.rmtree(extraction_dir)
        except Exception as cleanup_error:
            logger.error(f"Error cleaning up extraction directory: {str(cleanup_error)}")
        return {"error": f"Error extracting files: {str(e)}"}

@app.route('/api/render-status/<service_id>', methods=['GET'])
def check_render_status(service_id):
    """
    Check the status of a Render deployment
    
    Args:
        service_id: The Render service ID
        
    Returns:
        dict: Current status of the deployment
    """
    # Simulated status sequence: created -> building -> live
    # In a real implementation, this would call the Render API
    
    # Get the current time
    current_time = time.time()
    
    # Generate a deterministic status based on the service_id and current time
    # This simulates the progression of a deployment over time
    seconds_since_creation = current_time % 60
    
    if seconds_since_creation < 20:
        status = "building"
        progress = (seconds_since_creation / 20) * 100
    elif seconds_since_creation < 40:
        status = "deploying"
        progress = 100
    else:
        status = "live"
        progress = 100
    
    # Store status update in database
    try:
        status_record = {
            "service_id": service_id,
            "status": status,
            "progress": progress,
            "timestamp": int(current_time),
            "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }
        
        # Convert to JSON string
        status_json = json.dumps(status_record)
        
        temp_file_path = None
        try:
            # Create a temp file to store this data
            with tempfile.NamedTemporaryFile(mode='w+', delete=False, suffix='.json') as temp_file:
                temp_file.write(status_json)
                temp_file_path = temp_file.name
            
            # Save to database
            status_filename = f"{service_id}_status.json"
            db_fs.save_file(temp_file_path, DEPLOYMENT_DIR)
            logger.info(f"Updated deployment status in database: {status_filename}")
        except Exception as db_error:
            logger.error(f"Error saving status to database: {str(db_error)}")
        finally:
            # Clean up temp file
            if temp_file_path and os.path.exists(temp_file_path):
                try:
                    os.unlink(temp_file_path)
                except Exception as e:
                    logger.error(f"Error cleaning up status temp file: {str(e)}")
    except Exception as e:
        logger.error(f"Error recording status update: {str(e)}")
    
    return jsonify({
        "id": service_id,
        "status": status,
        "progress": progress,
        "logs": f"Deployment log for service {service_id}...\nBuild completed\nStarting service...",
        "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    })

# API endpoint for deployment
@app.route('/api/deploy', methods=['POST'])
def api_deploy():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    
    if not file.filename.endswith('.zip'):
        return jsonify({"error": "File must be a ZIP archive"}), 400
    
    # Get task type from form data
    task_type = request.form.get('task_type', 'ml')
    
    temp_zip_path = None
    try:
        # Create a temporary file for the zip
        with tempfile.NamedTemporaryFile(delete=False, suffix='.zip') as temp_file:
            file.save(temp_file.name)
            temp_zip_path = temp_file.name
        
        # At this point, the file is properly closed because we're outside the with block
        
        # Verify GitHub credentials before proceeding
        config = load_config()
        if not config:
            if temp_zip_path and os.path.exists(temp_zip_path):
                os.unlink(temp_zip_path)
            return jsonify({"error": "GitHub credentials not found in environment variables"}), 400
        
        # Deploy the project
        result = deploy_project(temp_zip_path, task_type)
        
        # Add a mock render service ID for status checking
        # In a real implementation, this would come from the Render API
        service_id = f"srv-{int(time.time())}"
        
        if "error" not in result:
            result["render_service_id"] = service_id
            
            # Store the deployment record in the database
            try:
                deployment_record = {
                    "service_id": service_id,
                    "repo_url": result["github_url"],
                    "render_url": result["render_url"],
                    "task_type": task_type,
                    "timestamp": int(time.time()),
                    "status": "created"
                }
                
                # Convert to JSON string
                deployment_json = json.dumps(deployment_record)
                
                # Create a temp file to store this data
                deployment_temp_path = None
                try:
                    with tempfile.NamedTemporaryFile(mode='w+', delete=False, suffix='.json') as temp_file:
                        temp_file.write(deployment_json)
                        deployment_temp_path = temp_file.name
                    
                    # Save to database
                    deployment_filename = f"{service_id}_deployment.json"
                    db_fs.save_file(deployment_temp_path, DEPLOYMENT_DIR)
                    logger.info(f"Saved deployment record to database: {deployment_filename}")
                except Exception as db_error:
                    logger.error(f"Error saving deployment record to database: {str(db_error)}")
                finally:
                    # Clean up temp file
                    if deployment_temp_path and os.path.exists(deployment_temp_path):
                        try:
                            os.unlink(deployment_temp_path)
                        except Exception as cleanup_error:
                            logger.error(f"Error cleaning up deployment temp file: {str(cleanup_error)}")
            except Exception as e:
                logger.error(f"Error recording deployment: {str(e)}")
        
        return jsonify(result), 200 if "error" not in result else 400
    
    except Exception as e:
        logger.error(f"Error in deployment process: {str(e)}")
        return jsonify({"error": str(e)}), 500
    
    finally:
        # Clean up the temporary zip file - this runs regardless of success or failure
        if temp_zip_path and os.path.exists(temp_zip_path):
            try:
                os.unlink(temp_zip_path)
            except Exception as cleanup_error:
                # Log the error but don't fail the request
                logger.error(f"Error cleaning up temporary zip file: {str(cleanup_error)}")

# List all deployments from the database
@app.route('/api/deployments', methods=['GET'])
def list_deployments():
    try:
        deployments = []
        
        # Get all deployment files from database
        files = db_fs.list_files(DEPLOYMENT_DIR)
        deployment_files = [f for f in files if f.endswith('_deployment.json') or f.endswith('_deployment_info.json')]
        
        for filename in deployment_files:
            try:
                # Get file content
                file_content = db_fs.get_file(filename, DEPLOYMENT_DIR)
                deployment_data = json.loads(file_content.decode('utf-8'))
                deployments.append(deployment_data)
            except Exception as e:
                logger.error(f"Error reading deployment file {filename}: {str(e)}")
        
        # Sort by timestamp (newest first)
        deployments.sort(key=lambda x: x.get('timestamp', 0), reverse=True)
        
        return jsonify({"deployments": deployments}), 200
    except Exception as e:
        logger.error(f"Error listing deployments: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Serve the React app
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(app.static_folder + '/' + path):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

if __name__ == "__main__":
    # Check if environment variables are set
   if __name__ == "__main__":
    # Check if environment variables are set
    if not os.environ.get('GITHUB_TOKEN') or not os.environ.get('GITHUB_USERNAME'):
        logger.warning("GITHUB_TOKEN or GITHUB_USERNAME environment variables not set.")
        logger.warning("Please set these in your .env.local file")
        logger.warning("Example .env.local file:")
        logger.warning("GITHUB_TOKEN=your_github_token")
        logger.warning("GITHUB_USERNAME=your_github_username")
    
    # Ensure deployment directory exists in database
    try:
        db_fs._get_or_create_directory(DEPLOYMENT_DIR)
        logger.info(f"Ensured {DEPLOYMENT_DIR} directory exists in database")
    except Exception as e:
        logger.error(f"Error creating {DEPLOYMENT_DIR} directory in database: {str(e)}")
    
    port = int(os.environ.get('PORT', 5006))
    app.run(host='0.0.0.0', port=port, debug=False)