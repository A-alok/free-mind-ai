
import os

def check_file(filename):
    print(f"Checking {filename}...")
    if not os.path.exists(filename):
        print(f"{filename} does not exist.")
        return

    try:
        with open(filename, 'rb') as f:
            raw = f.read()
            print(f"File size: {len(raw)} bytes")
            # Try to decode as utf-8
            try:
                content = raw.decode('utf-8')
                print("Decoded as UTF-8 successfully.")
            except UnicodeDecodeError:
                print("Failed to decode as UTF-8. Trying to detect encoding...")
                content = raw.decode('utf-16') if b'\x00' in raw else raw.decode('cp1252', errors='ignore')
                print("Decoded with fallback (utf-16/cp1252).")

            lines = content.splitlines()
            for i, line in enumerate(lines):
                if 'GOOGLE_API_KEY' in line:
                    print(f"Line {i+1}: Found GOOGLE_API_KEY")
                    key, val = line.split('=', 1)
                    val = val.strip()
                    print(f"  Key: '{key.strip()}'")
                    print(f"  Value Length: {len(val)}")
                    print(f"  Value Start: '{val[:4]}...'")
                    if val.startswith('"') or val.startswith("'"):
                         print(f"  Value likely quoted: {val[0]}")
    except Exception as e:
        print(f"Error reading {filename}: {e}")

check_file('.env')
check_file('.env.local')
