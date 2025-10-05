#!/usr/bin/env python3

"""
Check Cloudinary URLs in MongoDB projects
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from mongodb_utils import mongodb_connector

def check_project_cloudinary_urls():
    """Check if projects have Cloudinary URLs stored"""
    
    print("🔍 CHECKING CLOUDINARY URLs IN MONGODB PROJECTS")
    print("=" * 60)
    
    try:
        # Connect to MongoDB
        if not mongodb_connector.connect():
            print("❌ Failed to connect to MongoDB")
            return
        
        projects_collection = mongodb_connector.db.projects
        
        # Find projects with Cloudinary URLs
        projects_with_urls = list(projects_collection.find(
            {"generatedFiles.zipFile.cloudinaryUrl": {"$exists": True}},
            {
                "_id": 1,
                "name": 1,
                "userId": 1,
                "taskType": 1,
                "status": 1,
                "generatedFiles.zipFile.cloudinaryUrl": 1,
                "generatedFiles.zipFile.fileName": 1,
                "generatedFiles.zipFile.fileSize": 1,
                "generatedFiles.zipFile.generatedAt": 1
            }
        ))
        
        if projects_with_urls:
            print(f"✅ Found {len(projects_with_urls)} project(s) with Cloudinary URLs:")
            print()
            
            for i, project in enumerate(projects_with_urls, 1):
                print(f"📁 PROJECT #{i}:")
                print(f"   ID: {project['_id']}")
                print(f"   Name: {project.get('name', 'N/A')}")
                print(f"   User ID: {project.get('userId', 'N/A')}")
                print(f"   Task Type: {project.get('taskType', 'N/A')}")
                print(f"   Status: {project.get('status', 'N/A')}")
                
                zip_file = project.get('generatedFiles', {}).get('zipFile', {})
                if zip_file:
                    print(f"   📦 ZIP FILE INFO:")
                    print(f"      Cloudinary URL: {zip_file.get('cloudinaryUrl', 'N/A')}")
                    print(f"      File Name: {zip_file.get('fileName', 'N/A')}")
                    print(f"      File Size: {zip_file.get('fileSize', 'N/A')} bytes")
                    print(f"      Generated At: {zip_file.get('generatedAt', 'N/A')}")
                print()
        else:
            print("⚠️  No projects found with Cloudinary URLs")
        
        # Find all projects (to compare)
        all_projects = list(projects_collection.find(
            {},
            {
                "_id": 1,
                "name": 1,
                "userId": 1,
                "taskType": 1,
                "status": 1,
                "generatedFiles": 1
            }
        ))
        
        print(f"📊 SUMMARY:")
        print(f"   Total projects: {len(all_projects)}")
        print(f"   Projects with Cloudinary URLs: {len(projects_with_urls)}")
        print(f"   Projects without Cloudinary URLs: {len(all_projects) - len(projects_with_urls)}")
        
        # Show projects without Cloudinary URLs
        projects_without_urls = [p for p in all_projects if not p.get('generatedFiles', {}).get('zipFile', {}).get('cloudinaryUrl')]
        
        if projects_without_urls:
            print()
            print("📋 PROJECTS WITHOUT CLOUDINARY URLs:")
            for project in projects_without_urls:
                print(f"   - {project['_id']} ({project.get('name', 'N/A')})")
        
        # Check specific project IDs from logs
        specific_ids = [
            "68e1a1c19342d60872e5d5ab",  # From successful log
            "68e199ff6db56335399e64bc",  # From test attempts
        ]
        
        print()
        print("🎯 CHECKING SPECIFIC PROJECT IDs FROM LOGS:")
        for project_id in specific_ids:
            try:
                from bson import ObjectId
                project = projects_collection.find_one({"_id": ObjectId(project_id)})
                if project:
                    has_url = bool(project.get('generatedFiles', {}).get('zipFile', {}).get('cloudinaryUrl'))
                    print(f"   {project_id}: {'✅ HAS' if has_url else '❌ NO'} Cloudinary URL")
                    if has_url:
                        url = project['generatedFiles']['zipFile']['cloudinaryUrl']
                        print(f"      URL: {url}")
                else:
                    print(f"   {project_id}: ❓ Project not found")
            except Exception as e:
                print(f"   {project_id}: ❌ Error checking: {e}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    
    finally:
        mongodb_connector.disconnect()

if __name__ == "__main__":
    check_project_cloudinary_urls()