# db_system_integration.py

import os
import sys
import types
import tempfile
from io import BytesIO, StringIO
import shutil
from db_file_system import DBFileSystem
from file_system_adapter import FileSystemAdapter

# Create our database filesystem
db_fs = DBFileSystem()
fs_adapter = FileSystemAdapter()

def patch_os_module():
    """Patch os module functions to use our database"""
    # Save original functions
    original_makedirs = os.makedirs
    original_listdir = os.listdir
    original_remove = os.remove
    original_path_exists = os.path.exists
    original_path_isdir = os.path.isdir
    original_path_isfile = os.path.isfile
    
    # Create patched versions
    def patched_makedirs(path, mode=0o777, exist_ok=False):
        if 'ml_system' in path:
            return fs_adapter.makedirs(path, exist_ok)
        return original_makedirs(path, mode, exist_ok)
    
    def patched_listdir(path):
        if 'ml_system' in path:
            return fs_adapter.listdir(path)
        return original_listdir(path)
    
    def patched_remove(path):
        if 'ml_system' in path:
            return fs_adapter.remove(path)
        return original_remove(path)
    
    def patched_exists(path):
        if 'ml_system' in path:
            return fs_adapter.exists(path)
        return original_path_exists(path)
    
    def patched_isdir(path):
        if 'ml_system' in path:
            return fs_adapter.isdir(path)
        return original_path_isdir(path)
    
    def patched_isfile(path):
        if 'ml_system' in path:
            return fs_adapter.isfile(path)
        return original_path_isfile(path)
    
    # Apply patches
    os.makedirs = patched_makedirs
    os.listdir = patched_listdir
    os.remove = patched_remove
    os.path.exists = patched_exists
    os.path.isdir = patched_isdir
    os.path.isfile = patched_isfile
    
    # Replace shutil functions
    original_rmtree = shutil.rmtree
    
    def patched_rmtree(path, *args, **kwargs):
        if 'ml_system' in path:
            return fs_adapter.rmtree(path)
        return original_rmtree(path, *args, **kwargs)
    
    shutil.rmtree = patched_rmtree
    
    # Patch open function to handle files in our database
    original_open = open
    
    def patched_open(file, mode='r', *args, **kwargs):
        if isinstance(file, str) and 'ml_system' in file:
            if 'r' in mode:  # Reading mode
                content = fs_adapter.read_file(file, mode)
                # For binary mode, return a BytesIO object
                if 'b' in mode:
                    return BytesIO(content)
                # For text mode, return a StringIO object
                return StringIO(content)
            elif 'w' in mode or 'a' in mode or '+' in mode:  # Writing/appending mode
                # For writing and appending, we need a custom file-like object
                # that will save to our database when closed
                class DBFileWrapper:
                    def __init__(self, filepath, mode):
                        self.filepath = filepath
                        self.mode = mode
                        self.buffer = BytesIO() if 'b' in mode else StringIO()
                    
                    def write(self, data):
                        return self.buffer.write(data)
                    
                    def read(self, *args, **kwargs):
                        return self.buffer.read(*args, **kwargs)
                    
                    def __enter__(self):
                        return self
                    
                    def __exit__(self, exc_type, exc_val, exc_tb):
                        self.close()
                    
                    def close(self):
                        self.buffer.seek(0)
                        content = self.buffer.read()
                        fs_adapter.write_file(self.filepath, content, self.mode)
                        self.buffer.close()
                    
                    def seek(self, *args, **kwargs):
                        return self.buffer.seek(*args, **kwargs)
                    
                    def tell(self):
                        return self.buffer.tell()
                    
                    def truncate(self, size=None):
                        return self.buffer.truncate(size)
                    
                    def flush(self):
                        pass
                
                return DBFileWrapper(file, mode)
        
        # For all other files, use the original open function
        return original_open(file, mode, *args, **kwargs)
    
    # Replace the built-in open function
    builtins_module = sys.modules['builtins']
    builtins_module.open = patched_open

def apply_patches():
    """Apply all patches to make the system use SQLite"""
    patch_os_module()
    
    print("Database filesystem patches applied")
    return db_fs