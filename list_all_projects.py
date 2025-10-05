#!/usr/bin/env python3

"""
List all projects in MongoDB to compare with screenshots
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from mongodb_utils import mongodb_connector
from bson import ObjectId
from datetime import datetime

def list_all_projects():
    """List all projects in the database"""
    
    print("📋 LISTING ALL PROJECTS IN MONGODB")
    print("=" * 60)
    
    try:
        # Connect to MongoDB
        if not mongodb_connector.connect():
            print("❌ Failed to connect to MongoDB")
            return
        
        projects_collection = mongodb_connector.db.projects
        
        # Find all projects
        all_projects = list(projects_collection.find({}))
        
        print(f"Found {len(all_projects)} total projects:")
        print()
        
        for i, project in enumerate(all_projects, 1):
            print(f"📁 PROJECT #{i}:")
            print(f"   ID: {project['_id']}")
            print(f"   Name: {project.get('name', 'N/A')}")
            print(f"   Description: {project.get('description', 'N/A')}")
            print(f"   User ID: {project.get('userId', 'N/A')}")
            print(f"   Task Type: {project.get('taskType', 'N/A')}")
            print(f"   Status: {project.get('status', 'N/A')}")
            print(f"   Created At: {project.get('createdAt', 'N/A')}")
            print(f"   Updated At: {project.get('updatedAt', 'N/A')}")
            
            # Check for generatedFiles
            generated_files = project.get('generatedFiles', {})
            if generated_files:
                print(f"   📦 GENERATED FILES:")
                
                # Check zipFile
                zip_file = generated_files.get('zipFile', {})
                if zip_file:
                    print(f"      ZIP FILE:")
                    for key, value in zip_file.items():
                        if key == 'cloudinaryUrl' and value:
                            print(f"         🌐 {key}: {value}")
                        else:
                            print(f"         {key}: {value}")
                else:
                    print(f"      ZIP FILE: (empty)")
                
                # Check metadata
                metadata = generated_files.get('metadata', {})
                if metadata:
                    print(f"      METADATA: {list(metadata.keys())}")
                
                # Check sourceFiles
                source_files = generated_files.get('sourceFiles', [])
                if source_files:
                    print(f"      SOURCE FILES: {len(source_files)} files")
            else:
                print(f"   📦 GENERATED FILES: (empty)")
            
            print()
        
        # Check the specific project IDs from your screenshots
        screenshot_ids = [
            "68e1a2eddb2f1581495f37e7",  # "poi" project from screenshot
        ]
        
        print("🔍 CHECKING PROJECT IDs FROM SCREENSHOTS:")
        for project_id in screenshot_ids:
            try:
                project = projects_collection.find_one({"_id": ObjectId(project_id)})
                if project:
                    print(f"   ✅ {project_id}: Found!")
                    print(f"      Name: {project.get('name', 'N/A')}")
                    has_url = bool(project.get('generatedFiles', {}).get('zipFile', {}).get('cloudinaryUrl'))
                    print(f"      Has Cloudinary URL: {'✅ YES' if has_url else '❌ NO'}")
                    if has_url:
                        url = project['generatedFiles']['zipFile']['cloudinaryUrl']
                        print(f"      URL: {url}")
                else:
                    print(f"   ❌ {project_id}: Not found")
            except Exception as e:
                print(f"   ❌ {project_id}: Error: {e}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    
    finally:
        mongodb_connector.disconnect()

if __name__ == "__main__":
    list_all_projects()