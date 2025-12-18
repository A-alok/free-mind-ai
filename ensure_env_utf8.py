
import os
import shutil

print(f"CWD: {os.getcwd()}")
try:
    print("Files in dir:", os.listdir('.'))
except Exception as e:
    print(f"Error listing dir: {e}")

filename = '.env'
local_filename = '.env.local'

if os.path.exists(filename):
    print(f"Found {filename}")
else:
    print(f"{filename} not found.")
    if os.path.exists(local_filename):
        print(f"Found {local_filename}, checking content...")
        try:
            with open(local_filename, 'rb') as f:
                 raw = f.read()
            
            txt = ""
            try:
                txt = raw.decode('utf-8')
            except:
                try:
                    txt = raw.decode('utf-16')
                except:
                    txt = raw.decode('cp1252', errors='ignore')
            
            if 'GOOGLE_API_KEY' in txt:
                 print(f"Copying {local_filename} to {filename} as fallback")
                 with open(filename, 'w', encoding='utf-8') as f:
                     f.write(txt)
                 print(f"Created {filename} from {local_filename} (normalized to UTF-8)")
            else:
                 print(f"{local_filename} does not contain GOOGLE_API_KEY")
        except Exception as e:
            print(f"Error reading local file: {e}")
    else:
        print("Neither .env nor .env.local found.")

# Verify .env now
if os.path.exists(filename):
    with open(filename, 'rb') as f:
        data = f.read()
    
    # Check encoding and fix if needed (if it was existing)
    content = None
    needs_fix = False
    try:
        content = data.decode('utf-8')
        if '\x00' in content: 
            needs_fix = True
            print("Detected null bytes in UTF-8 decode (likely UTF-16 misread), fixing...")
    except:
        needs_fix = True
        print("UTF-8 decode failed, fixing...")
    
    if needs_fix:
        try:
            content = data.decode('utf-16')
        except:
             content = data.decode('cp1252', errors='ignore')
        
        if content:
            if content.startswith('\ufeff'): content = content[1:]
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(content)
            print("Fixed .env encoding to UTF-8")
        else:
            print("Failed to decode .env content to fix it.")
    else:
        print(".env seems okay (UTF-8).")

