
import sys
import os

sys.stdout.reconfigure(encoding='utf-8')

def hex_dump(data):
    return " ".join(f"{b:02x}" for b in data[:20])

def check(filename):
    print(f"--- Checking {filename} ---")
    if not os.path.exists(filename):
        print("Not found")
        return
    
    try:
        with open(filename, 'rb') as f:
            data = f.read()
        
        print(f"Size: {len(data)}")
        print(f"Hex start: {hex_dump(data)}")
        
        # Check for null bytes
        if b'\x00' in data:
            print("WARNING: detected null bytes, likely UTF-16")
        
        text = ""
        encoding = "unknown"
        
        try:
            text = data.decode('utf-8')
            encoding = "utf-8"
            print("Decodes as UTF-8: YES")
        except:
            print("Decodes as UTF-8: NO")
            try:
                text = data.decode('utf-16')
                encoding = "utf-16"
                print("Decodes as UTF-16: YES")
            except:
                 print("Decodes as UTF-16: NO")
                 text = data.decode('cp1252', errors='ignore')
                 encoding = "cp1252"
    
        # Look for key
        if 'GOOGLE_API_KEY' in text:
            print(f"Found GOOGLE_API_KEY string in text (encoding: {encoding})")
            # Find the line
            for line in text.splitlines():
                if 'GOOGLE_API_KEY' in line:
                     # removing sensitive part before printing
                     parts = line.split('=')
                     if len(parts) > 1:
                         key = parts[0].strip()
                         val = parts[1].strip()
                         masked_val = val[:4] + "..." + val[-4:] if len(val) > 8 else "***"
                         print(f"Line found: {key}={masked_val}")
                     else:
                         print(f"Line found (no equals?): {repr(line)}")
        else:
            print("Did NOT find GOOGLE_API_KEY in text")
    except Exception as e:
        print(f"Error checking file: {e}")

check('.env')
check('.env.local')
