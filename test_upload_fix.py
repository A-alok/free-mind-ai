#!/usr/bin/env python3
"""
Test the upload fix by manually uploading a file
"""
import requests
import os

def test_upload_fix():
    """Test uploading a file with the fixed endpoint"""
    
    # Create a test CSV file
    test_filename = 'test_upload_fix.csv'
    test_content = """name,age,city
John Doe,25,New York
Jane Smith,30,Los Angeles
Bob Johnson,35,Chicago"""
    
    with open(test_filename, 'w') as f:
        f.write(test_content)
    
    try:
        print('🧪 Testing File Upload Fix')
        print('=' * 40)
        
        # Upload the file
        url = 'http://localhost:5004/api/upload-dataset'
        
        with open(test_filename, 'rb') as f:
            files = {'file': (test_filename, f, 'text/csv')}
            response = requests.post(url, files=files)
        
        print(f'📤 Upload Response:')
        print(f'   Status: {response.status_code}')
        print(f'   Response: {response.json()}')
        
        if response.status_code == 200:
            # Check if file exists in database
            from dataset_alter_expand import db_fs, DATASET_DIR
            from dotenv import load_dotenv
            load_dotenv()
            
            file_exists = db_fs.file_exists(test_filename, DATASET_DIR)
            print(f'\n📋 Database Check:')
            print(f'   File exists: {"✅ Yes" if file_exists else "❌ No"}')
            
            if file_exists:
                print('🎉 Upload fix successful! Files are now saved with correct names.')
            else:
                print('❌ Upload fix failed. File not found in database.')
        else:
            print(f'❌ Upload failed with status {response.status_code}')
    
    except Exception as e:
        print(f'❌ Test failed: {e}')
    
    finally:
        # Clean up test file
        if os.path.exists(test_filename):
            os.unlink(test_filename)

if __name__ == "__main__":
    test_upload_fix()