#!/usr/bin/env python3
"""
Test script to verify project context integration
This simulates what your frontend should send to the Flask backend
"""

import requests
import json
import os

def test_with_project_context():
    """Test training request with project context"""
    
    # Your existing project ID from MongoDB (use the ID from your screenshot)
    project_id = "68e1979c6db5633590e64a2"  # First project from your screenshot
    user_id = "68e10772b79cb2e8d2c009e6"      # User ID from your screenshot
    project_name = "My Existing Project"       # Name for the project
    
    print("🧪 Testing Project Context Integration")
    print("=" * 50)
    print(f"Project ID: {project_id}")
    print(f"User ID: {user_id}")
    print(f"Project Name: {project_name}")
    print()
    
    # Create sample CSV data for testing
    sample_csv = """feature1,feature2,target
1.2,2.3,A
2.1,3.4,B
3.2,1.5,A
4.1,2.8,B
1.8,3.1,A
2.9,1.9,B"""
    
    # Write sample data to file
    test_file_path = "test_dataset.csv"
    with open(test_file_path, 'w') as f:
        f.write(sample_csv)
    
    try:
        # Prepare form data with project context
        with open(test_file_path, 'rb') as f:
            files = {
                'file': ('test_dataset.csv', f, 'text/csv')
            }
            
            data = {
                'task_type': 'classification',
                'text_prompt': 'Sample classification task',
                
                # PROJECT CONTEXT - This is what your frontend needs to send
                'project_id': project_id,
                'user_id': user_id, 
                'project_name': project_name
            }
            
            print("📤 Sending request with project context...")
            print(f"Data being sent: {data}")
            print()
            
            # Send request to Flask backend
            response = requests.post(
                'http://localhost:5000/process',
                files=files,
                data=data,
                timeout=300  # 5 minutes timeout
            )
            
        print("📥 Response received:")
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ SUCCESS!")
            print(json.dumps(result, indent=2))
            
            # Check if project was updated correctly
            if 'cloudinary' in result and 'database_update' in result['cloudinary']:
                db_update = result['cloudinary']['database_update']
                if db_update.get('success'):
                    print(f"🎯 Project updated successfully: {db_update.get('project_id')}")
                    print(f"Message: {db_update.get('message')}")
                else:
                    print(f"⚠️ Database update failed: {db_update.get('message')}")
            else:
                print("⚠️ No Cloudinary/database update info in response")
                
        else:
            print("❌ FAILED!")
            print(response.text)
            
    except requests.exceptions.ConnectionError:
        print("❌ Connection failed. Make sure Flask app is running on http://localhost:5000")
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        # Clean up test file
        if os.path.exists(test_file_path):
            os.remove(test_file_path)

def test_without_project_context():
    """Test training request without project context (backward compatibility)"""
    
    print()
    print("🧪 Testing WITHOUT Project Context (Backward Compatibility)")
    print("=" * 70)
    
    # Create sample CSV data for testing
    sample_csv = """feature1,feature2,target
1.2,2.3,A
2.1,3.4,B
3.2,1.5,A"""
    
    # Write sample data to file
    test_file_path = "test_dataset_no_context.csv"
    with open(test_file_path, 'w') as f:
        f.write(sample_csv)
    
    try:
        # Prepare form data WITHOUT project context
        with open(test_file_path, 'rb') as f:
            files = {
                'file': ('test_dataset_no_context.csv', f, 'text/csv')
            }
            
            data = {
                'task_type': 'classification',
                'text_prompt': 'Sample classification without context'
                # NO project context - should create new project
            }
            
            print("📤 Sending request WITHOUT project context...")
            print(f"Data being sent: {data}")
            print()
            
            # Send request to Flask backend
            response = requests.post(
                'http://localhost:5000/process',
                files=files,
                data=data,
                timeout=300
            )
            
        print("📥 Response received:")
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ SUCCESS!")
            
            # Check if new project was created
            if 'cloudinary' in result and 'database_update' in result['cloudinary']:
                db_update = result['cloudinary']['database_update']
                if db_update.get('success'):
                    print(f"📝 New project created: {db_update.get('project_id')}")
                    print(f"Message: {db_update.get('message')}")
                    
        else:
            print("❌ FAILED!")
            print(response.text)
            
    except requests.exceptions.ConnectionError:
        print("❌ Connection failed. Make sure Flask app is running on http://localhost:5000")
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        # Clean up test file
        if os.path.exists(test_file_path):
            os.remove(test_file_path)

if __name__ == "__main__":
    print("🚀 Project Context Integration Test")
    print("This script tests whether your Flask backend correctly")
    print("updates existing projects vs. creating new ones")
    print()
    
    # Test with project context (should update existing project)
    test_with_project_context()
    
    # Test without project context (should create new project)
    test_without_project_context()
    
    print()
    print("=" * 70)
    print("💡 FRONTEND INTEGRATION:")
    print("To fix the issue, your frontend needs to include:")
    print()
    print("JavaScript/React example:")
    print("  formData.append('project_id', project._id);")
    print("  formData.append('user_id', user._id);")
    print("  formData.append('project_name', project.name);")
    print()
    print("Or as HTTP headers:")
    print("  'X-Project-Id': project._id")
    print("  'X-User-Id': user._id")
    print("  'X-Project-Name': project.name")
    print("=" * 70)