#!/usr/bin/env python3

"""
Test Single Project Fix with Text Generation

This test uses text prompts instead of file uploads for more reliable testing.
"""

import requests
import json

# Your actual project data from MongoDB
TEST_PROJECT = {
    "project_id": "68e199ff6db56335399e64bc",  # Your "rrrrrrrrrr" project
    "user_id": "68e10772b79cb2e8d2c009e6",     # Your user ID
    "project_name": "rrrrrrrrrr"              # Your project name
}

def test_text_project_update():
    """Test that Flask updates the existing project using text generation"""
    
    print("🎯 TESTING: Single Project Update Fix (Text Generation)")
    print("=" * 60)
    print(f"Target Project ID: {TEST_PROJECT['project_id']}")
    print(f"Target User ID: {TEST_PROJECT['user_id']}")  
    print(f"Target Project Name: {TEST_PROJECT['project_name']}")
    print()
    print("GOAL: Update the EXISTING project, don't create a new one!")
    print()

    try:
        # Prepare form data with project context - using text instead of file
        data = {
            'task_type': 'classification',
            'text_prompt': 'classification dataset with age, income, education to predict purchase decision',
            # ✅ CRITICAL: Include project context to update existing project
            'project_id': TEST_PROJECT['project_id'],
            'user_id': TEST_PROJECT['user_id'],
            'project_name': TEST_PROJECT['project_name']
        }

        print("📤 Sending text-based request with project context to Flask...")
        print("Form data being sent:")
        for key, value in data.items():
            print(f"  {key}: {value}")
        print()

        # Send request to Flask backend (no files, just text generation)
        response = requests.post(
            'http://localhost:5000/process',
            data=data,  # No files, just data
            timeout=300
        )

        print(f"📥 Flask Response: {response.status_code}")
        
        if response.status_code == 200:
            try:
                result = response.json()
                print("📋 Full Flask Response:")
                response_text = json.dumps(result, indent=2)
                print(response_text[:1500] + "..." if len(response_text) > 1500 else response_text)
                print()
                
                # Check if there's an error first
                if 'error' in result:
                    print(f"❌ FLASK ERROR: {result['error']}")
                    return False
                
                # Check if project was updated
                if 'cloudinary' in result and result['cloudinary'] and 'database_update' in result['cloudinary']:
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
                        print(f"Error: {db_update.get('error')}")
                        return False
                else:
                    print("⚠️  NO DATABASE UPDATE INFO!")
                    print("Checking if Cloudinary info exists...")
                    if 'cloudinary' in result:
                        print(f"Cloudinary info: {result['cloudinary']}")
                    else:
                        print("No cloudinary info in response")
                    return False
                    
            except json.JSONDecodeError:
                print("❌ Invalid JSON response from Flask")
                print(response.text[:500])
                return False
                
        else:
            print(f"❌ Flask request failed: {response.status_code}")
            print(response.text[:500])
            return False

    except requests.exceptions.ConnectionError:
        print("❌ CONNECTION FAILED!")
        print("Make sure Flask backend is running:")
        print("  python app.py")
        return False
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    print("🔧 Single Project Update Test (Text Generation)")
    print("This test verifies that Flask updates the existing project")
    print("instead of creating duplicate projects using text generation.")
    print()
    
    success = test_text_project_update()
    
    print("\n" + "="*60)
    if success:
        print("🎉 TEST PASSED: Single project update is working!")
        print("Your Flask backend is correctly updating existing projects.")
    else:
        print("❌ TEST FAILED: Project context may not be working properly.")
        print("Check the Flask response above for details.")