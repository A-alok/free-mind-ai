#!/usr/bin/env python3

"""
Quick Test Script for Project Context Integration

This script tests if the frontend is now properly sending project context
and if the Flask backend is updating the correct existing project.
"""

import requests
import json
import tempfile
import os

# Test configuration (REPLACE WITH YOUR ACTUAL PROJECT DATA!)
TEST_CONFIG = {
    "project_id": "68e1979c6db5633590e64a2",  # From your MongoDB screenshot
    "user_id": "68e10772b79cb2e8d2c009e6",     # From your MongoDB screenshot
    "project_name": "Test Project Integration",
    "flask_url": "http://localhost:5000/process"
}

def test_project_context_integration():
    """Test that project context is properly sent and processed"""
    print("🧪 Testing Project Context Integration Fix")
    print("=" * 60)
    print(f"Project ID: {TEST_CONFIG['project_id']}")
    print(f"User ID: {TEST_CONFIG['user_id']}")
    print(f"Project Name: {TEST_CONFIG['project_name']}")
    print()

    # Create test CSV data
    csv_data = """feature1,feature2,target
1.1,2.2,A
2.2,3.3,B
3.3,1.1,A
4.4,2.5,B"""

    # Create temporary file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
        f.write(csv_data)
        temp_file = f.name

    try:
        # Prepare form data with project context
        files = {
            'file': ('test_data.csv', open(temp_file, 'rb'), 'text/csv')
        }
        
        data = {
            'task_type': 'classification',
            'text_prompt': 'Test classification with project context',
            # ✅ CRITICAL: Include project context
            'project_id': TEST_CONFIG['project_id'],
            'user_id': TEST_CONFIG['user_id'],
            'project_name': TEST_CONFIG['project_name']
        }

        print("📤 Sending request with project context to Flask backend...")
        print(f"URL: {TEST_CONFIG['flask_url']}")
        print(f"Data: {data}")
        print()

        # Send request to Flask backend
        response = requests.post(
            TEST_CONFIG['flask_url'],
            files=files,
            data=data,
            timeout=300  # 5 minutes
        )

        print("📥 Response received:")
        print(f"Status: {response.status_code}")
        print()

        if response.status_code == 200:
            try:
                result = response.json()
                print("✅ SUCCESS! Request completed.")
                
                # Check if project was updated with Cloudinary URL
                if 'cloudinary' in result and 'database_update' in result['cloudinary']:
                    db_update = result['cloudinary']['database_update']
                    if db_update.get('success'):
                        print("🎯 PROJECT UPDATED SUCCESSFULLY!")
                        print(f"   Updated Project ID: {db_update.get('project_id')}")
                        print(f"   Message: {db_update.get('message')}")
                        print("   ✅ Cloudinary URL stored in EXISTING project!")
                        print()
                        print("🔧 INTEGRATION FIX WORKING! ✅")
                    else:
                        print("⚠️ Database update failed:")
                        print(f"   Error: {db_update.get('message')}")
                        print("   This means the project context may not be working properly.")
                else:
                    print("⚠️ No database update info in response.")
                    print("   This could mean:")
                    print("   1. Project context is not being sent properly")
                    print("   2. Backend is creating a new project instead of updating existing")
                    print("   3. MongoDB connection issues")

                # Show Cloudinary info if available
                if 'cloudinary' in result:
                    print()
                    print("☁️ Cloudinary Upload Info:")
                    cloudinary = result['cloudinary']
                    print(f"   Success: {cloudinary.get('success')}")
                    print(f"   URL: {cloudinary.get('url')}")
                    print(f"   Size: {cloudinary.get('size')} bytes")

            except json.JSONDecodeError as e:
                print("⚠️ Response is not valid JSON:")
                print(response.text[:500])

        else:
            print(f"❌ Request failed with status {response.status_code}")
            print("Response:")
            print(response.text[:500])

    except requests.exceptions.ConnectionError:
        print("❌ CONNECTION FAILED!")
        print("Make sure your Flask backend is running:")
        print("  python app.py")
        print()
        print("Expected to see:")
        print("  * Running on http://127.0.0.1:5000")

    except Exception as e:
        print(f"❌ Error: {e}")

    finally:
        # Clean up
        if os.path.exists(temp_file):
            os.unlink(temp_file)

    print()
    print("=" * 60)
    print("💡 NEXT STEPS:")
    print()
    print("1. If you see '🎯 PROJECT UPDATED SUCCESSFULLY!' above:")
    print("   ✅ The integration fix is working!")
    print("   ✅ Your frontend will now store Cloudinary URLs in correct projects!")
    print()
    print("2. If you see warnings or errors:")
    print("   - Check that both Flask backend (app.py) and Next.js frontend are running")
    print("   - Verify the project_id and user_id exist in your MongoDB")
    print("   - Check MongoDB connection")
    print()
    print("3. Test with your actual frontend:")
    print("   - Go to http://localhost:3000")
    print("   - Open an existing project")
    print("   - Train a model")
    print("   - Check that the project gets updated with Cloudinary URL")

if __name__ == "__main__":
    test_project_context_integration()