
import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv('.env', override=True)
api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")

if not api_key:
    print("No API key found.")
    exit(1)

genai.configure(api_key=api_key)

print("--- Listing Available Models ---")
try:
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(f" - {m.name}")
except Exception as e:
    print(f"Error listing models: {e}")

print("\n--- Testing gemini-2.5-flash ---")
try:
    model = genai.GenerativeModel("gemini-2.5-flash")
    resp = model.generate_content("Hello")
    print(f"Success! Response: {resp.text}")
except Exception as e:
    print(f"Failed to use gemini-2.5-flash: {e}")

print("\n--- Testing gemini-2.0-flash-exp (just in case) ---")
try:
    model = genai.GenerativeModel("gemini-2.0-flash-exp")
    resp = model.generate_content("Hello")
    print(f"Success! Response: {resp.text}")
except Exception as e:
    print(f"Failed to use gemini-2.0-flash-exp: {e}")
