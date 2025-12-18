
import os
import shutil

filename = '.env'
backup = '.env.bak'

if not os.path.exists(filename):
    print(f"{filename} not found.")
    exit(1)

# Backup
shutil.copy2(filename, backup)
print(f"Backed up {filename} to {backup}")

with open(filename, 'rb') as f:
    data = f.read()

print(f"Read {len(data)} bytes.")

content = None
encoding = None

# Try UTF-8 first
try:
    content = data.decode('utf-8')
    # If it contains null bytes, it might be falsely decoded as utf-8 (unlikely but possible if mostly ascii)
    if '\x00' in content:
        raise ValueError("Null bytes in utf-8 decoded content")
    print("File seems to be valid UTF-8 already.")
    encoding = 'utf-8'
except (UnicodeDecodeError, ValueError):
    print("Not valid UTF-8. Trying UTF-16...")
    try:
        content = data.decode('utf-16')
        print("Decoded as UTF-16.")
        encoding = 'utf-16'
    except UnicodeDecodeError:
        print("Not valid UTF-16. Trying cp1252...")
        content = data.decode('cp1252')
        encoding = 'cp1252'

if content:
    # re-encode to utf-8 cleanly
    # Remove any BOM if present
    if content.startswith('\ufeff'):
        content = content[1:]
    
    # Normalize line endings
    content = content.replace('\r\n', '\n')
    
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"Converted {filename} from {encoding} to UTF-8.")
else:
    print("Failed to decode content.")
