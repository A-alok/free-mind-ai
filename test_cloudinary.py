#!/usr/bin/env python3
"""
Test script for Cloudinary integration
"""
import os
import tempfile
import zipfile
from cloudinary_utils import upload_zip_to_cloudinary, delete_zip_from_cloudinary

def test_cloudinary_integration():
    """Test Cloudinary upload and delete functionality"""
    
    print("🧪 Testing Cloudinary Integration...")
    
    # Check if Cloudinary is configured
    cloud_name = os.getenv('CLOUDINARY_CLOUD_NAME')
    api_key = os.getenv('CLOUDINARY_API_KEY')
    api_secret = os.getenv('CLOUDINARY_API_SECRET')
    
    if not all([cloud_name, api_key, api_secret]):
        print("⚠️ Cloudinary not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables.")
        print("ℹ️ Copy .env.example to .env and fill in your Cloudinary credentials.")
        return False
    
    print(f"✅ Cloudinary configured with cloud name: {cloud_name}")
    
    # Create a test zip file
    with tempfile.NamedTemporaryFile(suffix='.zip', delete=False) as temp_zip:
        with zipfile.ZipFile(temp_zip.name, 'w') as zipf:
            zipf.writestr("test_file.txt", "This is a test file for Cloudinary upload")
            zipf.writestr("README.md", "# Test ML Project\n\nThis is a test project.")
        
        temp_zip_path = temp_zip.name
    
    try:
        # Test upload
        print("📤 Testing upload to Cloudinary...")
        result = upload_zip_to_cloudinary(
            temp_zip_path,
            project_name="Test_ML_Project",
            user_id="test_user",
            task_type="test"
        )
        
        if result and result.get('success'):
            print(f"✅ Upload successful!")
            print(f"   - URL: {result['url']}")
            print(f"   - Public ID: {result['public_id']}")
            print(f"   - Size: {result.get('size', 0)} bytes")
            
            # Test delete
            print("🗑️ Testing delete from Cloudinary...")
            delete_result = delete_zip_from_cloudinary(result['public_id'])
            
            if delete_result and delete_result.get('success'):
                print("✅ Delete successful!")
            else:
                print(f"❌ Delete failed: {delete_result}")
            
            return True
            
        else:
            print(f"❌ Upload failed: {result}")
            return False
            
    except Exception as e:
        print(f"❌ Test failed with error: {str(e)}")
        return False
        
    finally:
        # Clean up temp file
        try:
            os.unlink(temp_zip_path)
        except Exception:
            pass

def main():
    """Main test function"""
    print("=" * 50)
    print("🧪 CLOUDINARY INTEGRATION TEST")
    print("=" * 50)
    
    success = test_cloudinary_integration()
    
    print("=" * 50)
    if success:
        print("✅ All tests passed! Cloudinary integration is working.")
    else:
        print("❌ Tests failed. Check your Cloudinary configuration.")
    print("=" * 50)

if __name__ == "__main__":
    main()