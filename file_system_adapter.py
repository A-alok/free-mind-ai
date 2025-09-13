# file_system_adapter.py

import os
import tempfile
from db_file_system import DBFileSystem

class FileSystemAdapter:
    """
    Adapter class to replace standard file system operations with database operations
    """
    def __init__(self, db_path="ml_system.db"):
        self.db_fs = DBFileSystem(db_path)
    
    def makedirs(self, path, exist_ok=False):
        """Create directory structure - no-op in DB version but needs to be compatible"""
        # Extract directory name (last part of path)
        parts = path.replace('\\', '/').strip('/').split('/')
        if 'ml_system' in parts:
            idx = parts.index('ml_system')
            if idx + 1 < len(parts):
                dir_name = parts[idx + 1]
                # Ensure directory exists in our structure
                try:
                    self.db_fs._get_directory_id(dir_name)
                except ValueError:
                    # Directory doesn't exist, create it
                    with self.db_fs._get_connection() as conn:
                        cursor = conn.cursor()
                        cursor.execute('INSERT INTO directories (name, parent_id) VALUES (?, 1)', (dir_name,))
                        conn.commit()
    
    def listdir(self, path):
        """List directory contents"""
        # Extract directory name from path
        parts = path.replace('\\', '/').strip('/').split('/')
        if 'ml_system' in parts:
            idx = parts.index('ml_system')
            if idx + 1 < len(parts):
                dir_name = parts[idx + 1]
                return self.db_fs.list_files(dir_name)
        return []
    
    def remove(self, path):
        """Remove a file"""
        # Extract directory and filename
        parts = path.replace('\\', '/').strip('/').split('/')
        if 'ml_system' in parts:
            idx = parts.index('ml_system')
            if idx + 1 < len(parts) and idx + 2 < len(parts):
                dir_name = parts[idx + 1]
                filename = parts[idx + 2]
                return self.db_fs.delete_file(filename, dir_name)
    
    def rmtree(self, path):
        """Remove a directory and all its contents"""
        # Extract directory name
        parts = path.replace('\\', '/').strip('/').split('/')
        if 'ml_system' in parts:
            idx = parts.index('ml_system')
            if idx + 1 < len(parts):
                dir_name = parts[idx + 1]
                return self.db_fs.clear_directory(dir_name)
    
    def exists(self, path):
        """Check if a path exists"""
        # Determine if it's a file or directory
        parts = path.replace('\\', '/').strip('/').split('/')
        if 'ml_system' in parts:
            idx = parts.index('ml_system')
            if idx + 1 < len(parts):
                dir_name = parts[idx + 1]
                try:
                    self.db_fs._get_directory_id(dir_name)
                    # If there's a filename, check if the file exists
                    if idx + 2 < len(parts):
                        filename = parts[idx + 2]
                        return self.db_fs.file_exists(filename, dir_name)
                    return True  # Directory exists
                except ValueError:
                    return False  # Directory doesn't exist
        return False
    
    def isdir(self, path):
        """Check if a path is a directory"""
        # Extract directory name
        parts = path.replace('\\', '/').strip('/').split('/')
        if 'ml_system' in parts:
            idx = parts.index('ml_system')
            if idx + 1 < len(parts):
                dir_name = parts[idx + 1]
                try:
                    self.db_fs._get_directory_id(dir_name)
                    # If there's no filename, it's a directory
                    return idx + 2 >= len(parts)
                except ValueError:
                    return False
        return False
    
    def isfile(self, path):
        """Check if a path is a file"""
        # Extract directory and filename
        parts = path.replace('\\', '/').strip('/').split('/')
        if 'ml_system' in parts:
            idx = parts.index('ml_system')
            if idx + 1 < len(parts) and idx + 2 < len(parts):
                dir_name = parts[idx + 1]
                filename = parts[idx + 2]
                return self.db_fs.file_exists(filename, dir_name)
        return False
    
    def read_file(self, path, mode='r'):
        """Read a file from disk or database"""
        # Determine if we should try to read from database
        parts = path.replace('\\', '/').strip('/').split('/')
        if 'ml_system' in parts:
            idx = parts.index('ml_system')
            if idx + 1 < len(parts) and idx + 2 < len(parts):
                dir_name = parts[idx + 1]
                filename = parts[idx + 2]
                try:
                    content = self.db_fs.get_file(filename, dir_name)
                    # If mode is text mode, decode the content
                    if 'b' not in mode:
                        content = content.decode('utf-8')
                    return content
                except FileNotFoundError:
                    pass  # Fall back to disk
        
        # Fall back to regular file reading
        if 'b' in mode:
            with open(path, mode) as f:
                return f.read()
        else:
            with open(path, mode, encoding='utf-8') as f:
                return f.read()
    
    def write_file(self, path, content, mode='w'):
        """Write content to a file in disk or database"""
        # Determine if we should try to write to database
        parts = path.replace('\\', '/').strip('/').split('/')
        if 'ml_system' in parts:
            idx = parts.index('ml_system')
            if idx + 1 < len(parts):
                dir_name = parts[idx + 1]
                # Convert content to bytes if needed
                if isinstance(content, str) and 'b' in mode:
                    content = content.encode('utf-8')
                elif isinstance(content, bytes) and 'b' not in mode:
                    content = content.decode('utf-8')
                
                # Create a temporary file to save
                temp_dir = tempfile.gettempdir()
                filename = os.path.basename(path)
                temp_path = os.path.join(temp_dir, filename)
                
                if 'b' in mode:
                    with open(temp_path, 'wb') as f:
                        f.write(content)
                else:
                    with open(temp_path, 'w', encoding='utf-8') as f:
                        f.write(content)
                
                # Save to database
                self.db_fs.save_file(temp_path, dir_name)
                os.remove(temp_path)
                return
        
        # Fall back to regular file writing
        os.makedirs(os.path.dirname(path), exist_ok=True)
        if 'b' in mode:
            with open(path, mode) as f:
                f.write(content)
        else:
            with open(path, mode, encoding='utf-8') as f:
                f.write(content)