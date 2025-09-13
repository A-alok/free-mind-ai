# db_file_system.py

import sqlite3
import os
import tempfile
import datetime
import shutil
import mimetypes
from contextlib import contextmanager

class DBFileSystem:
    """
    A class that provides file system-like operations but uses a SQLite database
    as the storage backend.
    """
    
    def __init__(self, db_path="ml_system.db"):
        """Initialize the database file system with the given database path"""
        self.db_path = db_path
        self._initialize_db()
    
    def _initialize_db(self):
        """Initialize the database with the required structure"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Create directories table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS directories (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          parent_id INTEGER,
          FOREIGN KEY (parent_id) REFERENCES directories(id)
        )
        ''')
        
        # Create files table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS files (
          id INTEGER PRIMARY KEY,
          filename TEXT NOT NULL,
          directory_id INTEGER NOT NULL,
          content BLOB,
          mime_type TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (directory_id) REFERENCES directories(id)
        )
        ''')
        
        # Create indexes
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_files_directory ON files(directory_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_directories_parent ON directories(parent_id)')
        
        # Create root directory
        cursor.execute('INSERT OR IGNORE INTO directories (id, name, parent_id) VALUES (1, "ml_system", NULL)')
        
        # Create subdirectories
        subdirs = ['datasets', 'models', 'downloads', 'runs']
        for subdir in subdirs:
            cursor.execute('INSERT OR IGNORE INTO directories (name, parent_id) VALUES (?, 1)', (subdir,))
        
        conn.commit()
        conn.close()
    
    @contextmanager
    def _get_connection(self):
        """Context manager for database connections"""
        conn = sqlite3.connect(self.db_path)
        try:
            yield conn
        finally:
            conn.close()
    
    def _get_directory_id(self, directory_name):
        """Get the ID of a directory by name"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT id FROM directories WHERE name = ?', (directory_name,))
            result = cursor.fetchone()
            
            if not result:
                raise ValueError(f"Directory not found: {directory_name}")
            
            return result[0]
    
    def _get_or_create_directory(self, directory_path):
        """
        Get a directory ID by path, creating it if necessary
        Path can be like 'datasets/images/train'
        """
        parts = directory_path.replace('\\', '/').strip('/').split('/')
        
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            parent_id = 1  # Start with root
            current_id = None
            
            for part in parts:
                cursor.execute(
                    'SELECT id FROM directories WHERE name = ? AND parent_id = ?', 
                    (part, parent_id)
                )
                result = cursor.fetchone()
                
                if result:
                    current_id = result[0]
                else:
                    cursor.execute(
                        'INSERT INTO directories (name, parent_id) VALUES (?, ?)',
                        (part, parent_id)
                    )
                    current_id = cursor.lastrowid
                
                parent_id = current_id
            
            conn.commit()
            return current_id
    
    def save_file(self, filepath, directory_name, replace=True):
        """
        Save a file to the database under the specified directory
        
        Args:
            filepath: Path to the file to save
            directory_name: Name of the directory (datasets, models, downloads, runs)
            replace: If True, replace existing file with same name
        
        Returns:
            file_id: ID of the file in the database
        """
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"File not found: {filepath}")
        
        # Read file content
        with open(filepath, 'rb') as f:
            content = f.read()
        
        # Determine filename
        filename = os.path.basename(filepath)
        
        return self.save_file_content(content, filename, directory_name, replace)
    
    def save_file_content(self, content, filename, directory_name, replace=True):
        """
        Save file content directly to the database
        
        Args:
            content: File content as bytes
            filename: Name of the file
            directory_name: Name of the directory (datasets, models, downloads, runs)
            replace: If True, replace existing file with same name
        
        Returns:
            file_id: ID of the file in the database
        """
        # Get mime type
        mime_type = mimetypes.guess_type(filename)[0] or 'application/octet-stream'
        
        # Get directory ID
        directory_id = self._get_directory_id(directory_name)
        
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            # Check if file already exists
            cursor.execute('SELECT id FROM files WHERE filename = ? AND directory_id = ?', 
                        (filename, directory_id))
            existing_file = cursor.fetchone()
            
            if existing_file and replace:
                # Update existing file
                file_id = existing_file[0]
                cursor.execute('''
                UPDATE files 
                SET content = ?, mime_type = ?, updated_at = ?
                WHERE id = ?
                ''', (content, mime_type, datetime.datetime.now(), file_id))
            else:
                # Insert new file
                cursor.execute('''
                INSERT INTO files (filename, directory_id, content, mime_type)
                VALUES (?, ?, ?, ?)
                ''', (filename, directory_id, content, mime_type))
                file_id = cursor.lastrowid
            
            conn.commit()
            return file_id
    
    def get_file(self, filename, directory_name, save_to_disk=False):
        """
        Retrieve a file from the database
        
        Args:
            filename: Name of the file to retrieve
            directory_name: Name of the directory (datasets, models, downloads, runs)
            save_to_disk: If True, save the file to a temporary location and return the path
        
        Returns:
            content: The file content as bytes, or file path if save_to_disk is True
        """
        directory_id = self._get_directory_id(directory_name)
        
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            # Get file content
            cursor.execute('''
            SELECT content, mime_type FROM files 
            WHERE filename = ? AND directory_id = ?
            ''', (filename, directory_id))
            
            result = cursor.fetchone()
            if not result:
                raise FileNotFoundError(f"File not found: {filename} in {directory_name}")
            
            content, mime_type = result
        
        if save_to_disk:
            # Create temporary file
            temp_dir = tempfile.gettempdir()
            file_path = os.path.join(temp_dir, filename)
            
            with open(file_path, 'wb') as f:
                f.write(content)
            
            return file_path
        
        return content
    
    def list_files(self, directory_name):
        """List all files in a directory"""
        directory_id = self._get_directory_id(directory_name)
        
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute('''
            SELECT filename FROM files 
            WHERE directory_id = ?
            ORDER BY filename
            ''', (directory_id,))
            
            return [row[0] for row in cursor.fetchall()]
    
    def clear_directory(self, directory_name):
        """Remove all files from a directory"""
        directory_id = self._get_directory_id(directory_name)
        
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute('DELETE FROM files WHERE directory_id = ?', (directory_id,))
            deleted_count = cursor.rowcount
            
            conn.commit()
            return deleted_count
    
    def file_exists(self, filename, directory_name):
        """Check if a file exists in the directory"""
        directory_id = self._get_directory_id(directory_name)
        
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute('''
            SELECT id FROM files 
            WHERE filename = ? AND directory_id = ?
            ''', (filename, directory_id))
            
            return cursor.fetchone() is not None
    
    def delete_file(self, filename, directory_name):
        """Delete a specific file from the directory"""
        directory_id = self._get_directory_id(directory_name)
        
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute('''
            DELETE FROM files 
            WHERE filename = ? AND directory_id = ?
            ''', (filename, directory_id))
            
            deleted = cursor.rowcount > 0
            conn.commit()
            return deleted
    
    def readFile(self, filepath, directory_name=None):
        """
        Read a file - either from disk (if directory_name is None) or from the database
        This helps with integration with existing code
        """
        if directory_name is None:
            # Read from disk
            with open(filepath, 'rb') as f:
                return f.read()
        else:
            # Read from database
            filename = os.path.basename(filepath)
            return self.get_file(filename, directory_name)
    
    def writeFile(self, filepath, content, directory_name=None):
        """
        Write a file - either to disk (if directory_name is None) or to the database
        This helps with integration with existing code
        """
        if directory_name is None:
            # Write to disk
            os.makedirs(os.path.dirname(filepath), exist_ok=True)
            with open(filepath, 'wb') as f:
                f.write(content)
        else:
            # Write to database - first save to temp file
            temp_dir = tempfile.gettempdir()
            filename = os.path.basename(filepath)
            temp_path = os.path.join(temp_dir, filename)
            
            with open(temp_path, 'wb') as f:
                f.write(content)
            
            self.save_file(temp_path, directory_name)
            os.remove(temp_path)