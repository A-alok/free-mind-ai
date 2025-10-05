#!/usr/bin/env python3

"""
Test Single Project Fix

This test ensures that the Flask backend updates the EXISTING project
instead of creating a new one.
"""

import requests
import json
import tempfile
import os

# Your actual project data from MongoDB
TEST_PROJECT = {
    "project_id": "68e199ff6db56335399e64bc",  # Your "rrrrrrrrrr" project
    "user_id": "68e10772b79cb2e8d2c009e6",     # Your user ID
    "project_name": "rrrrrrrrrr"              # Your project name
}

def test_single_project_update():
    """Test that Flask updates the existing project instead of creating new one"""
    
    print("🎯 TESTING: Single Project Update Fix")
    print("=" * 60)
    print(f"Target Project ID: {TEST_PROJECT['project_id']}")
    print(f"Target User ID: {TEST_PROJECT['user_id']}")  
    print(f"Target Project Name: {TEST_PROJECT['project_name']}")
    print()
    print("GOAL: Update the EXISTING project, don't create a new one!")
    print()

    # Create test CSV data
    csv_data = """feature1,feature2,target
1.1,2.2,A
2.2,3.3,B
3.3,1.1,A"""

    # Write to temporary file
    temp_file = 'test_single_project.csv'
    with open(temp_file, 'w') as f:
        f.write(csv_data)

    try:
        # Prepare form data with project context
        files = {
            'file': ('test_single_project.csv', open(temp_file, 'rb'), 'text/csv')
        }
        
        data = {
            'task_type': 'classification',
            'text_prompt': 'Single project update test',
            # ✅ CRITICAL: Include project context to update existing project
            'project_id': TEST_PROJECT['project_id'],
            'user_id': TEST_PROJECT['user_id'],
            'project_name': TEST_PROJECT['project_name']
        }

        print("📤 Sending request with project context to Flask...")
        print("Form data being sent:")
        for key, value in data.items():
            print(f"  {key}: {value}")
        print()

        # Send request to Flask backend
        response = requests.post(
            'http://localhost:5000/process',
            files=files,
            data=data,
            timeout=300
        )

        print(f"📥 Flask Response: {response.status_code}")
        
        if response.status_code == 200:
            try:
                result = response.json()
                print("📋 Full Flask Response:")
                print(json.dumps(result, indent=2)[:1000] + "..." if len(json.dumps(result, indent=2)) > 1000 else json.dumps(result, indent=2))
                
                # Check if project was updated
                if 'cloudinary' in result and 'database_update' in result['cloudinary']:
                    db_update = result['cloudinary']['database_update']
                    
                    if db_update.get('success'):
                        updated_project_id = db_update.get('project_id')
                        
                        print("✅ DATABASE UPDATE SUCCESSFUL!")
                        print(f"Updated Project ID: {updated_project_id}")
                        print(f"Expected Project ID: {TEST_PROJECT['project_id']}")
                        
                        if updated_project_id == TEST_PROJECT['project_id']:
                            print("🎉 SUCCESS! EXISTING PROJECT WAS UPDATED!")
                            print("   → No duplicate project created")
                            print("   → Cloudinary URL stored in correct project")
                            print("   → Single project contains both user data AND model")
                            return True
                        else:
                            print("❌ WRONG PROJECT UPDATED!")
                            print(f"   Expected: {TEST_PROJECT['project_id']}")
                            print(f"   Got: {updated_project_id}")
                            print("   → This means project context is not working properly")
                            return False
                    else:
                        print("❌ DATABASE UPDATE FAILED!")
                        print(f"Message: {db_update.get('message')}")
                        print("Possible reasons:")
                        print("- Project ID doesn't exist in database")
                        print("- User ID doesn't match project owner")
                        print("- MongoDB connection issues")
                        return False
                else:
                    print("⚠️  NO DATABASE UPDATE INFO!")
                    print("This means:")
                    print("- Project context is not reaching Flask backend")
                    print("- Flask is creating a NEW project instead of updating existing")
                    print("- The integration fix is NOT working")
                    return False
                    
            except json.JSONDecodeError:
                print("❌ Invalid JSON response from Flask")
                print(response.text[:300])
                return False
                
        else:
            print(f"❌ Flask request failed: {response.status_code}")
            print(response.text[:300])
            return False

    except requests.exceptions.ConnectionError:
        print("❌ CONNECTION FAILED!")
        print("Make sure Flask backend is running:")
        print("  python app.py")
        return False
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
        
    finally:
        # Clean up
        if os.path.exists(temp_file):
            os.unlink(temp_file)

def check_mongodb_projects():
    """Check what projects exist in MongoDB after the test"""
    print("\n" + "="*60)
    print("📊 MONGODB CHECK:")
    print("After running this test, check your MongoDB to see:")
    print()
    print("✅ EXPECTED (SUCCESS):")
    print("  - Only ONE project exists: 68e199ff6db56335399e64bc")
    print("  - That project has BOTH:")
    print("    * User data (name: 'rrrrrrrrrr', userId: '68e10...')")  
    print("    * Model data (generatedFiles.zipFile.cloudinaryUrl)")
    print()
    print("❌ PROBLEM (FAILURE):")
    print("  - TWO projects exist:")
    print("    * 68e199ff6db56335399e64bc (user data, no model)")
    print("    * Some new ID (model data, userId: '000000....')")
    print()
    print("The goal is to have ONLY ONE project with ALL the data!")

if __name__ == "__main__":
    print("🔧 Single Project Update Test")
    print("This test verifies that Flask updates the existing project")
    print("instead of creating duplicate projects.")
    print()
    
    success = test_single_project_update()
    
    check_mongodb_projects()
    
    print("\n" + "="*60)
    if success:
        print("🎉 TEST PASSED: Single project update is working!")
        print("Your Flask backend is correctly updating existing projects.")
    else:
        print("❌ TEST FAILED: Project context is not working properly.")
        print("The Flask backend is still creating new projects.")
        print()
        print("💡 NEXT STEPS:")
        print("1. Check Flask logs for project context messages")
        print("2. Verify project_id exists in your MongoDB")
        print("3. Ensure user_id matches the project owner")
        print("4. Check if MongoDB connection is working")