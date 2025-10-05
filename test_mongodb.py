#!/usr/bin/env python3
"""
Test script for MongoDB integration
"""
import os
from mongodb_utils import update_project_with_cloudinary, get_project_cloudinary_stats

def test_mongodb_integration():
    """Test MongoDB connection and project update functionality"""
    
    print("🧪 Testing MongoDB Integration...")
    
    # Check if MongoDB is configured
    mongodb_uri = os.getenv('MONGODB_URI')
    
    if not mongodb_uri:
        print("⚠️ MONGODB_URI not configured. Set MONGODB_URI environment variable.")
        print("ℹ️ Example: MONGODB_URI=mongodb://localhost:27017/freemind_ai")
        return False
    
    print(f"✅ MongoDB URI configured: {mongodb_uri[:20]}...")
    
    try:
        # Test database connection with sample Cloudinary data
        sample_cloudinary_data = {
            'success': True,
            'url': 'https://res.cloudinary.com/test/raw/upload/v123/test_project.zip',
            'public_id': 'freemind-ml-projects/test_user/general_ml/test_project_20241004',
            'filename': 'test_project_20241004.zip',
            'size': 1024567,
            'folder': 'freemind-ml-projects/test_user/general_ml',
            'tags': ['ml-project', 'generated-code', 'general_ml', 'user_test_user'],
            'context': {
                'project_name': 'Test ML Project',
                'task_type': 'general_ml',
                'user_id': 'test_user',
                'created_at': '2024-01-04T21:25:00Z'
            }
        }
        
        print("💾 Testing project update with Cloudinary data...")
        result = update_project_with_cloudinary(
            project_id=None,  # Will create new project
            cloudinary_data=sample_cloudinary_data,
            project_name="Test ML Project",
            task_type="general_ml"
        )
        
        if result.get('success'):
            print(f"✅ Project update successful!")
            print(f"   - Project ID: {result.get('project_id')}")
            print(f"   - Cloudinary URL: {result.get('cloudinary_url')}")
            print(f"   - Message: {result.get('message')}")
            
            # Test statistics
            print("📊 Testing statistics retrieval...")
            stats = get_project_cloudinary_stats()
            
            print(f"📈 Statistics:")
            print(f"   - Total projects with Cloudinary files: {stats.get('total_projects', 0)}")
            print(f"   - Total storage used: {stats.get('total_size_bytes', 0)} bytes")
            print(f"   - Total downloads: {stats.get('total_downloads', 0)}")
            
            return True
            
        else:
            print(f"❌ Project update failed: {result.get('message', 'Unknown error')}")
            print(f"   - Error: {result.get('error', 'N/A')}")
            return False
            
    except Exception as e:
        print(f"❌ Test failed with error: {str(e)}")
        return False

def main():
    """Main test function"""
    print("=" * 50)
    print("🧪 MONGODB INTEGRATION TEST")
    print("=" * 50)
    
    success = test_mongodb_integration()
    
    print("=" * 50)
    if success:
        print("✅ All tests passed! MongoDB integration is working.")
        print("🎯 Cloudinary URLs will now be stored in MongoDB projects collection.")
    else:
        print("❌ Tests failed. Check your MongoDB configuration and connection.")
    print("=" * 50)

if __name__ == "__main__":
    main()