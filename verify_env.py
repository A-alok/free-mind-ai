
import os
from dotenv import load_dotenv
import google.generativeai as genai

print("Loading .env...")
load_dotenv('.env')
key_env = os.getenv("GOOGLE_API_KEY")

print(f"GOOGLE_API_KEY in .env: {'Found' if key_env else 'Missing'}")
if key_env:
    print(f"Length: {len(key_env)}")
    print(f"Starts with: {key_env[:4]}...")
    print(f"Ends with: ...{key_env[-4:]}")
    # Check for quotes
    if key_env.startswith('"') or key_env.startswith("'"):
        print("WARNING: Key starts with a quote character. This might be part of the value if not parsed correctly.")

print("\nLoading .env.local...")
load_dotenv('.env.local', override=True)
key_local = os.getenv("GOOGLE_API_KEY")
print(f"GOOGLE_API_KEY after .env.local: {'Found' if key_local else 'Missing'}")
if key_local:
    print(f"Length: {len(key_local)}")
    if key_local != key_env:
        print("Key changed after loading .env.local")
        print(f"Starts with: {key_local[:4]}...")

print("\nTrying genai configure...")
try:
    if key_local:
        genai.configure(api_key=key_local)
        print("Configure successful (client side check only).")
        
        # Try a minimal list_models call to verify validity
        print("Attempting to list models to verify key validity...")
        try:
            models = list(genai.list_models())
            print(f"Success! Found {len(models)} models.")
        except Exception as e:
            print(f"API Call Failed: {e}")
    else:
        print("Skipping configure (no key).")
except Exception as e:
    print(f"Configure Failed: {e}")
