
import os
import google.generativeai as genai
from dotenv import load_dotenv
import traceback

print("--- Starting Test ---")

# 1. Load .env
load_dotenv('.env', override=True)
key_from_env = os.getenv("GOOGLE_API_KEY")

print(f"Key from os.getenv: {repr(key_from_env)}")

if not key_from_env:
    print("Key is None/Empty!")
    exit(1)

# 2. Manual trim
cleaned_key = key_from_env.strip()
print(f"Key .strip():       {repr(cleaned_key)}")

# 3. Configure
print("Configuring genai...")
try:
    genai.configure(api_key=cleaned_key)
    
    # 4. Test
    print("Generating content...")
    model = genai.GenerativeModel('gemini-pro')
    response = model.generate_content("Ping")
    print(f"Response: {response.text}")
    print("SUCCESS")
except Exception as e:
    print("FAILURE")
    print(e)
    # detailed traceback might help
    traceback.print_exc()
