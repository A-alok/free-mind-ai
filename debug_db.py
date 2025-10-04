#!/usr/bin/env python3
"""
Debug script to check database file contents and diagnose upload issues
"""
from dataset_alter_expand import db_fs, DATASET_DIR
from dotenv import load_dotenv
load_dotenv()

def debug_database():
    """Check database contents and diagnose issues"""
    print('🔍 Database Diagnostics')
    print('=' * 50)
    
    try:
        # List all files in database
        files = db_fs.list_files(DATASET_DIR)
        print(f'📁 Files in database ({len(files)} total):')
        
        if files:
            for i, file in enumerate(files, 1):
                try:
                    # Get file size
                    content = db_fs.get_file(file, DATASET_DIR)
                    size_kb = len(content) / 1024
                    print(f'  {i:2d}. {file} ({size_kb:.1f} KB)')
                except Exception as e:
                    print(f'  {i:2d}. {file} (error reading: {e})')
        else:
            print('  ❌ No files found in database')
        
        # Check for the specific file
        target_file = 'chronic_disease_dataset.csv'
        print(f'\n🎯 Checking for specific file: {target_file}')
        
        file_exists = db_fs.file_exists(target_file, DATASET_DIR)
        print(f'   File exists: {"✅ Yes" if file_exists else "❌ No"}')
        
        if file_exists:
            try:
                content = db_fs.get_file(target_file, DATASET_DIR)
                print(f'   File size: {len(content) / 1024:.1f} KB')
                
                # Try to read as CSV to validate
                import pandas as pd
                import io
                df = pd.read_csv(io.BytesIO(content))
                print(f'   CSV valid: ✅ Yes ({len(df)} rows, {len(df.columns)} columns)')
                print(f'   Column names: {list(df.columns)[:5]}...' if len(df.columns) > 5 else f'   Column names: {list(df.columns)}')
                
            except Exception as e:
                print(f'   File reading error: ❌ {e}')
        else:
            print('\n🔧 File not found. Possible issues:')
            print('   1. Upload process failed silently')
            print('   2. File was uploaded with different name')
            print('   3. Database write permission issue')
            print('   4. Server needs restart')
            
            # Check for similar named files
            similar_files = [f for f in files if 'chronic' in f.lower() or 'disease' in f.lower()]
            if similar_files:
                print(f'\n🔍 Found similar files:')
                for f in similar_files:
                    print(f'   - {f}')
    
    except Exception as e:
        print(f'❌ Database access error: {e}')
        print('\n💡 Troubleshooting:')
        print('   1. Restart the data processing server')
        print('   2. Check file permissions')
        print('   3. Verify database initialization')

if __name__ == "__main__":
    debug_database()