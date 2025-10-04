#!/usr/bin/env python3
"""
Test uploading chronic_disease_dataset.csv to verify fix works
"""
import requests
from dotenv import load_dotenv

def test_chronic_upload():
    """Test the upload and database storage"""
    print('🔄 Testing Upload Fix for chronic_disease_dataset.csv')
    print('=' * 60)
    
    try:
        # Test upload
        url = 'http://localhost:5004/api/upload-dataset'
        filename = 'chronic_disease_dataset.csv'
        
        with open(filename, 'rb') as f:
            files = {'file': (filename, f, 'text/csv')}
            response = requests.post(url, files=files)
        
        print('📤 Upload Response:')
        print(f'   Status: {response.status_code}')
        
        if response.status_code == 200:
            result = response.json()
            print(f'   Success: {result.get("success", False)}')
            print(f'   Message: {result.get("message", "No message")}')
        else:
            print(f'   Error: {response.text}')
            return False
        
        # Check database
        if response.status_code == 200:
            print('\n📋 Database Check:')
            
            # Import here to avoid loading issues
            from dataset_alter_expand import db_fs, DATASET_DIR
            load_dotenv()
            
            file_exists = db_fs.file_exists(filename, DATASET_DIR)
            print(f'   File exists in DB: {"✅ Yes" if file_exists else "❌ No"}')
            
            if file_exists:
                content = db_fs.get_file(filename, DATASET_DIR)
                print(f'   File size: {len(content) / 1024:.1f} KB')
                print('\n🎉 SUCCESS! File upload and database storage working correctly!')
                
                # Test data processing
                print('\n🧪 Testing Data Processing:')
                process_url = 'http://localhost:5004/api/expand-dataset'
                process_data = {
                    'file_name': filename,
                    'expansion_prompt': 'Generate 3 more patients with similar health profiles and realistic medical data',
                    'num_samples': 3
                }
                
                process_response = requests.post(process_url, json=process_data, timeout=60)
                
                if process_response.status_code == 200:
                    process_result = process_response.json()
                    if process_result.get('success'):
                        print('   ✅ Data processing successful!')
                        print(f'   Original rows: {process_result.get("original_rows", "Unknown")}')
                        print(f'   Expanded rows: {process_result.get("expanded_rows", "Unknown")}')
                    else:
                        print(f'   ❌ Data processing failed: {process_result.get("error")}')
                else:
                    print(f'   ❌ Data processing request failed: {process_response.status_code}')
                
                return True
            else:
                print('\n❌ File upload response was successful but file not found in database.')
                return False
    
    except Exception as e:
        print(f'❌ Test failed: {e}')
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_chronic_upload()