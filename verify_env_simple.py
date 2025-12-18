
import os
from dotenv import load_dotenv

print("Loading .env...")
# Force reload by clearing if needed, though separate process is fine
load_dotenv('.env', override=True)
key = os.getenv("GOOGLE_API_KEY")
if key:
    print(f"Loaded key: {key[:5]}...{key[-5:]}")
    print(f"Length: {len(key)}")
    # Check for quotes in value
    if '"' in key or "'" in key:
        print("WARNING: Key contains quotes, might be parsing error.")
else:
    print("Failed to load key from .env")
