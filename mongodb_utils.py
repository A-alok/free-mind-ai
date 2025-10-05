"""
MongoDB utilities for Python to interact with the FreeMindAI database
"""
import os
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime, timedelta
import logging

# Set up logging
logger = logging.getLogger(__name__)

class MongoDBConnector:
    """MongoDB connection and operations for FreeMindAI"""
    
    def __init__(self):
        self.client = None
        self.db = None
        self.connected = False
        
    def connect(self):
        """Connect to MongoDB using environment variables"""
        try:
            # Get MongoDB URI from environment
            mongodb_uri = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/freemind_ai')
            
            # Create client
            self.client = MongoClient(mongodb_uri)
            
            # Test connection
            self.client.admin.command('ping')
            
            # Get database name from URI or use default
            if '/' in mongodb_uri and not mongodb_uri.endswith('/'):
                db_name = mongodb_uri.split('/')[-1].split('?')[0]
            else:
                db_name = 'freemind_ai'
                
            self.db = self.client[db_name]
            self.connected = True
            
            logger.info(f"Connected to MongoDB: {db_name}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to connect to MongoDB: {str(e)}")
            self.connected = False
            return False
    
    def disconnect(self):
        """Close MongoDB connection"""
        if self.client:
            self.client.close()
            self.connected = False
            logger.info("Disconnected from MongoDB")
    
    def update_project_cloudinary_url(self, project_id, cloudinary_data, project_name=None, task_type=None, user_id=None):
        """
        Update project with Cloudinary URL in generatedFiles.zipFile
        
        Args:
            project_id (str): MongoDB ObjectId as string (if available)
            cloudinary_data (dict): Cloudinary upload result
            project_name (str): Project name for finding project if no ID
            task_type (str): Task type for metadata
        
        Returns:
            dict: Update result
        """
        if not self.connected:
            if not self.connect():
                return {"success": False, "error": "Database not connected"}
        
        try:
            projects_collection = self.db.projects
            
            # Try to find project by ID first, then by name with user context
            project = None
            
            # First priority: Find by exact project_id
            if project_id:
                try:
                    # Try to convert to ObjectId if it looks like one
                    if len(str(project_id)) == 24:
                        query = {"_id": ObjectId(project_id)}
                    else:
                        # Fallback: search by string ID
                        query = {"_id": project_id}
                    
                    project = projects_collection.find_one(query)
                    if project:
                        logger.info(f"Found project by ID: {project_id}")
                except Exception as id_error:
                    logger.warning(f"Error using project ID {project_id}: {id_error}")
            
            # Second priority: Find by project name + user_id combination
            if not project and project_name and user_id:
                try:
                    user_object_id = ObjectId(user_id) if len(str(user_id)) == 24 else user_id
                    query = {
                        "userId": user_object_id,
                        "$or": [
                            {"name": {"$regex": project_name.replace("_", " "), "$options": "i"}},
                            {"name": project_name}
                        ],
                        "createdAt": {"$gte": datetime.now() - timedelta(hours=24)}  # Recent projects only
                    }
                    project = projects_collection.find_one(query, sort=[("createdAt", -1)])
                    if project:
                        logger.info(f"Found project by name+user: {project_name} (User: {user_id})")
                except Exception as user_error:
                    logger.warning(f"Error searching by user_id {user_id}: {user_error}")
            
            # Third priority: Find by project name only (less reliable)
            if not project and project_name:
                query = {
                    "$or": [
                        {"name": {"$regex": project_name.replace("_", " "), "$options": "i"}},
                        {"name": project_name}
                    ],
                    "createdAt": {"$gte": datetime.now() - timedelta(hours=24)}  # Recent projects only
                }
                project = projects_collection.find_one(query, sort=[("createdAt", -1)])
                if project:
                    logger.info(f"Found project by name only: {project_name}")
            
            # If still not found, NEVER create new project when we have project context
            if not project:
                if project_id or (project_name and user_id):
                    # If we have project context (ID or name+user), don't create a new project
                    error_context = f"ID {project_id}" if project_id else f"name '{project_name}' for user {user_id}"
                    logger.warning(f"❌ Project with {error_context} not found. Will NOT create duplicate project.")
                    logger.warning(f"   → This prevents creating ghost projects with default userId")
                    logger.warning(f"   → Check if project exists in database or if lookup criteria are correct")
                    return {
                        "success": False,
                        "error": f"Project with {error_context} not found",
                        "message": "Project not found and won't create duplicate. Check project ID or name.",
                        "context": {
                            "project_id": project_id,
                            "project_name": project_name,
                            "user_id": user_id,
                            "task_type": task_type
                        }
                    }
                
                # Only create new project if NO project context is provided (legacy behavior)
                logger.info(f"No project context provided, creating new project record for: {project_name}")
                
                # Use provided user_id or default
                project_user_id = ObjectId("000000000000000000000000")  # Default user ID
                if user_id:
                    try:
                        if len(str(user_id)) == 24:
                            project_user_id = ObjectId(user_id)
                        else:
                            project_user_id = user_id
                    except Exception as user_error:
                        logger.warning(f"Invalid user_id format {user_id}, using default: {user_error}")
                
                new_project = {
                    "name": project_name or "ML Project",
                    "description": f"Generated ML project ({task_type})" if task_type else "Generated ML project",
                    "userId": project_user_id,
                    "status": "completed",
                "taskType": task_type if task_type in [
                    'classification', 'regression', 'nlp', 'image_classification', 
                    'object_detection', 'text_classification', 'sentiment_analysis', 
                    'clustering', 'time_series'
                ] else None,
                    "generatedFiles": {},
                    "createdAt": datetime.now(),
                    "updatedAt": datetime.now()
                }
                
                result = projects_collection.insert_one(new_project)
                project_id = str(result.inserted_id)
                logger.info(f"Created new project with ID: {project_id}")
            else:
                project_id = str(project["_id"])
                logger.info(f"Found existing project: {project_id}")
            
            # Prepare the zip file data
            zip_file_data = {
                "cloudinaryUrl": cloudinary_data.get("url"),
                "cloudinaryPublicId": cloudinary_data.get("public_id"),
                "fileName": cloudinary_data.get("filename", "project.zip"),
                "fileSize": cloudinary_data.get("size", 0),
                "generatedAt": datetime.now(),
                "downloadCount": 0,
                "expiresAt": datetime.now() + timedelta(days=365)  # 1 year expiration
            }
            
            # Update the project with Cloudinary data
            update_data = {
                "$set": {
                    "generatedFiles.zipFile": zip_file_data,
                    "generatedFiles.metadata.cloudinaryUpload": {
                        "uploadedAt": datetime.now(),
                        "folder": cloudinary_data.get("folder"),
                        "tags": cloudinary_data.get("tags", []),
                        "context": cloudinary_data.get("context", {})
                    },
                    "updatedAt": datetime.now(),
                    "status": "completed"
                }
            }
            
            # Add task type if provided
            if task_type:
                update_data["$set"]["taskType"] = task_type
            
            # Perform the update
            result = projects_collection.update_one(
                {"_id": ObjectId(project_id)},
                update_data,
                upsert=False
            )
            
            if result.modified_count > 0:
                logger.info(f"Updated project {project_id} with Cloudinary URL: {cloudinary_data.get('url')}")
                return {
                    "success": True,
                    "project_id": project_id,
                    "cloudinary_url": cloudinary_data.get("url"),
                    "message": "Project updated with Cloudinary URL"
                }
            else:
                logger.warning(f"⚠️ Project {project_id} was not modified")
                return {
                    "success": False,
                    "project_id": project_id,
                    "message": "Project was not modified"
                }
                
        except Exception as e:
            logger.error(f"❌ Error updating project with Cloudinary URL: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "message": "Failed to update project in database"
            }
    
    def find_project_by_cloudinary_url(self, cloudinary_url):
        """Find project by Cloudinary URL"""
        if not self.connected:
            if not self.connect():
                return None
        
        try:
            projects_collection = self.db.projects
            project = projects_collection.find_one({
                "generatedFiles.zipFile.cloudinaryUrl": cloudinary_url
            })
            
            return project
            
        except Exception as e:
            logger.error(f"Error finding project by Cloudinary URL: {str(e)}")
            return None
    
    def get_project_stats(self, user_id=None):
        """Get statistics about projects with Cloudinary files"""
        if not self.connected:
            if not self.connect():
                return {}
        
        try:
            projects_collection = self.db.projects
            
            # Build query
            query = {"generatedFiles.zipFile.cloudinaryUrl": {"$exists": True}}
            if user_id:
                query["userId"] = ObjectId(user_id) if len(str(user_id)) == 24 else user_id
            
            # Get stats
            total_projects = projects_collection.count_documents(query)
            
            # Get total file sizes
            pipeline = [
                {"$match": query},
                {"$group": {
                    "_id": None,
                    "totalSize": {"$sum": "$generatedFiles.zipFile.fileSize"},
                    "totalDownloads": {"$sum": "$generatedFiles.zipFile.downloadCount"}
                }}
            ]
            
            result = list(projects_collection.aggregate(pipeline))
            
            stats = {
                "total_projects": total_projects,
                "total_size_bytes": result[0]["totalSize"] if result else 0,
                "total_downloads": result[0]["totalDownloads"] if result else 0
            }
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting project stats: {str(e)}")
            return {}


# Create a global instance
mongodb_connector = MongoDBConnector()


def update_project_with_cloudinary(project_id=None, cloudinary_data=None, project_name=None, task_type=None, user_id=None):
    """
    Convenience function to update project with Cloudinary data
    
    Args:
        project_id (str): Project ID (optional)
        cloudinary_data (dict): Cloudinary upload result
        project_name (str): Project name for finding/creating project
        task_type (str): ML task type
    
    Returns:
        dict: Update result
    """
    if not cloudinary_data or not cloudinary_data.get("success"):
        return {"success": False, "error": "Invalid Cloudinary data"}
    
    try:
        result = mongodb_connector.update_project_cloudinary_url(
            project_id=project_id,
            cloudinary_data=cloudinary_data,
            project_name=project_name,
            task_type=task_type,
            user_id=user_id
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Error in update_project_with_cloudinary: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to update project with Cloudinary data"
        }


def get_project_cloudinary_stats(user_id=None):
    """Get statistics about Cloudinary storage usage"""
    try:
        return mongodb_connector.get_project_stats(user_id)
    except Exception as e:
        logger.error(f"Error getting Cloudinary stats: {str(e)}")
        return {}


# Cleanup function
def disconnect_mongodb():
    """Close MongoDB connection"""
    mongodb_connector.disconnect()