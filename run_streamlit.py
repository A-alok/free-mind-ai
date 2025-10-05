#!/usr/bin/env python3
"""
Simple script to run the FreeMindAI Streamlit app
"""

import subprocess
import sys
import os

def main():
    """Run the Streamlit app"""
    print("🚀 Starting FreeMindAI Streamlit App...")
    print("📍 Make sure you have all dependencies installed:")
    print("   pip install streamlit pandas numpy scikit-learn matplotlib seaborn")
    print()
    
    # Check if streamlit is installed
    try:
        import streamlit
        print("✅ Streamlit is installed")
    except ImportError:
        print("❌ Streamlit is not installed. Run: pip install streamlit")
        return
    
    # Check if the app file exists
    app_file = "streamlit_app.py"
    if not os.path.exists(app_file):
        print(f"❌ App file '{app_file}' not found in current directory")
        return
    
    print(f"📂 Running app from: {os.path.abspath(app_file)}")
    print("🌐 The app will open in your default browser")
    print("🎨 Features: Custom violet theme, responsive design, ML workflows")
    print()
    print("To stop the app, press Ctrl+C")
    print("-" * 50)
    
    # Run streamlit
    try:
        subprocess.run([sys.executable, "-m", "streamlit", "run", app_file], check=True)
    except KeyboardInterrupt:
        print("\n👋 App stopped by user")
    except subprocess.CalledProcessError as e:
        print(f"❌ Error running Streamlit: {e}")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")

if __name__ == "__main__":
    main()