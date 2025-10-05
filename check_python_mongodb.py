#!/usr/bin/env python3

"""
Check what MongoDB URI Python is actually using
"""

import os
import sys

print("🔍 CHECKING PYTHON MONGODB CONFIGURATION")
print("=" * 60)

# Check environment variable
mongodb_uri_env = os.getenv('MONGODB_URI')
print(f"MONGODB_URI from environment: {mongodb_uri_env}")

# Check what the mongodb_utils would use
sys.path.append(os.path.dirname(__file__))
from mongodb_utils import MongoDBConnector

# Create a connector but don't connect yet
connector = MongoDBConnector()

# Check what URI it would use
print(f"Default URI in mongodb_utils: mongodb://localhost:27017/freemind_ai")

# Test what URI is actually used
print()
print("🔗 TESTING CONNECTION:")
if connector.connect():
    print(f"✅ Connected successfully!")
    print(f"Database name: {connector.db.name}")
    print(f"Connection client: {connector.client}")
    
    # List collections
    collections = connector.db.list_collection_names()
    print(f"Collections in database: {collections}")
    
    # Count projects
    if 'projects' in collections:
        project_count = connector.db.projects.count_documents({})
        print(f"Number of projects: {project_count}")
    
    connector.disconnect()
else:
    print("❌ Connection failed!")

print()
print("💡 SOLUTION:")
print("If the Python backend is connecting to a different database than Next.js,")
print("you need to set the MONGODB_URI environment variable for Python.")
print()
print("In Windows, you can set it with:")
print('set MONGODB_URI=mongodb+srv://A-alok17:Gupta2005@cluster0.zmkrfwa.mongodb.net/freemind_ai')
print()
print("Or create a .env file that Python can read.")