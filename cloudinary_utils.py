"""
Cloudinary utility module for uploading ML project zips
"""
import os
import cloudinary
import cloudinary.uploader
from datetime import datetime
import tempfile
import logging

# Configure Cloudinary
cloudinary.config(
    cloud_name=os.getenv('CLOUDINARY_CLOUD_NAME', ''),
    api_key=os.getenv('CLOUDINARY_API_KEY', ''),
    api_secret=os.getenv('CLOUDINARY_API_SECRET', ''),
    secure=True
)

# Set up logging
logger = logging.getLogger(__name__)

def upload_zip_to_cloudinary(zip_path, project_name=None, user_id=None, task_type=None):
    """
    Upload a zip file to Cloudinary
    
    Args:
        zip_path (str): Path to the zip file
        project_name (str): Name of the project (optional)
        user_id (str): User ID for organization (optional)
        task_type (str): Type of ML task (optional)
    
    Returns:
        dict: Upload result with URL and metadata
    """
    try:
        # Check if Cloudinary is configured
        if not all([cloudinary.config().cloud_name, cloudinary.config().api_key, cloudinary.config().api_secret]):
            logger.warning("Cloudinary not configured. Skipping upload to Cloudinary.")
            return None
        
        # Generate unique filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        base_name = project_name.replace(" ", "_") if project_name else "ml_project"
        unique_filename = f"{base_name}_{timestamp}"
        
        # Determine folder structure
        folder_parts = ["freemind-ml-projects"]
        if user_id:
            folder_parts.append(str(user_id))
        if task_type:
            folder_parts.append(task_type)
        
        folder_path = "/".join(folder_parts)
        
        # Upload options
        upload_options = {
            "folder": folder_path,
            "public_id": unique_filename,
            "resource_type": "raw",  # For non-image files
            "use_filename": False,  # Use our custom filename
            "unique_filename": False,  # Don't add random suffix
            "overwrite": True,  # Allow overwriting
            "tags": [
                "ml-project",
                "generated-code",
                task_type if task_type else "general",
                f"user_{user_id}" if user_id else "anonymous"
            ]
        }
        
        # Add context metadata
        if project_name or task_type:
            context = {}
            if project_name:
                context["project_name"] = project_name
            if task_type:
                context["task_type"] = task_type
            if user_id:
                context["user_id"] = str(user_id)
            context["created_at"] = datetime.now().isoformat()
            upload_options["context"] = context
        
        logger.info(f"Uploading zip to Cloudinary: {zip_path} -> {folder_path}/{unique_filename}")
        
        # Upload the file
        result = cloudinary.uploader.upload(zip_path, **upload_options)
        
        logger.info(f"Successfully uploaded to Cloudinary: {result['secure_url']}")
        
        return {
            "success": True,
            "url": result["secure_url"],
            "public_id": result["public_id"],
            "folder": folder_path,
            "filename": f"{unique_filename}.zip",
            "size": result.get("bytes", 0),
            "format": result.get("format", "zip"),
            "created_at": result.get("created_at"),
            "tags": result.get("tags", []),
            "context": result.get("context", {}),
            "cloudinary_response": {
                "asset_id": result.get("asset_id"),
                "version": result.get("version"),
                "signature": result.get("signature")
            }
        }
        
    except Exception as e:
        logger.error(f"Error uploading to Cloudinary: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to upload to Cloudinary"
        }

def delete_zip_from_cloudinary(public_id):
    """
    Delete a zip file from Cloudinary
    
    Args:
        public_id (str): Cloudinary public ID of the file
    
    Returns:
        dict: Deletion result
    """
    try:
        if not all([cloudinary.config().cloud_name, cloudinary.config().api_key, cloudinary.config().api_secret]):
            logger.warning("Cloudinary not configured. Skipping deletion from Cloudinary.")
            return None
        
        result = cloudinary.uploader.destroy(public_id, resource_type="raw")
        
        logger.info(f"Deleted from Cloudinary: {public_id}")
        
        return {
            "success": True,
            "result": result.get("result"),
            "public_id": public_id
        }
        
    except Exception as e:
        logger.error(f"Error deleting from Cloudinary: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to delete from Cloudinary"
        }

def get_cloudinary_download_url(public_id):
    """
    Get a download URL for a Cloudinary asset
    
    Args:
        public_id (str): Cloudinary public ID
    
    Returns:
        str: Download URL
    """
    try:
        if not cloudinary.config().cloud_name:
            return None
        
        # Generate URL with attachment flag for download
        url = cloudinary.utils.cloudinary_url(
            public_id,
            resource_type="raw",
            flags="attachment",
            secure=True
        )[0]
        
        return url
        
    except Exception as e:
        logger.error(f"Error generating Cloudinary URL: {str(e)}")
        return None

def upload_buffer_to_cloudinary(buffer_data, filename, project_name=None, user_id=None, task_type=None):
    """
    Upload buffer data to Cloudinary
    
    Args:
        buffer_data (bytes): File content as bytes
        filename (str): Original filename
        project_name (str): Name of the project (optional)
        user_id (str): User ID for organization (optional)
        task_type (str): Type of ML task (optional)
    
    Returns:
        dict: Upload result with URL and metadata
    """
    try:
        # Create temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.zip') as temp_file:
            temp_file.write(buffer_data)
            temp_path = temp_file.name
        
        try:
            # Upload the temporary file
            result = upload_zip_to_cloudinary(
                temp_path, 
                project_name=project_name,
                user_id=user_id,
                task_type=task_type
            )
            return result
        finally:
            # Clean up temporary file
            try:
                os.unlink(temp_path)
            except Exception as cleanup_error:
                logger.warning(f"Failed to cleanup temporary file: {cleanup_error}")
        
    except Exception as e:
        logger.error(f"Error uploading buffer to Cloudinary: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to upload buffer to Cloudinary"
        }