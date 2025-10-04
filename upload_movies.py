#!/usr/bin/env python3
"""
Script to upload movies.csv to the database for data processing
"""
import os
from dataset_alter_expand import db_fs, DATASET_DIR
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def upload_movies_csv():
    """Upload the movies.csv file to the database"""
    csv_file_path = "movies.csv"
    
    if not os.path.exists(csv_file_path):
        print(f"❌ File {csv_file_path} not found in current directory")
        return False
    
    try:
        print(f"📤 Uploading {csv_file_path} to database...")
        
        # Save the file to database
        db_fs.save_file(csv_file_path, DATASET_DIR)
        
        print(f"✅ Successfully uploaded {csv_file_path} to database!")
        
        # List all datasets to confirm
        print("\n📋 Available datasets in database:")
        files = db_fs.list_files(DATASET_DIR)
        for i, file in enumerate(files, 1):
            print(f"  {i}. {file}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error uploading file: {e}")
        return False

if __name__ == "__main__":
    print("🎬 Movies Dataset Upload Tool")
    print("=" * 40)
    upload_movies_csv()