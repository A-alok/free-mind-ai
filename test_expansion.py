#!/usr/bin/env python3
"""
Test script to expand the movies dataset
"""
import requests
import json
import base64

def expand_movies_dataset():
    """Expand the movies dataset with AI-generated new movies"""
    
    # Make request to expand dataset
    url = 'http://localhost:5004/api/expand-dataset'
    data = {
        'file_name': 'movies.csv',
        'expansion_prompt': 'Generate new movies similar to the existing dataset with different titles, directors from the 2020s era, with realistic ratings and box office numbers',
        'num_samples': 10
    }

    try:
        print("🎬 Generating new movies with AI...")
        print("🔄 This may take a few minutes as the AI processes each movie...")
        
        response = requests.post(url, json=data, timeout=300)  # 5 minute timeout
        result = response.json()
        
        if result.get('success'):
            # Decode and save the CSV
            csv_data = base64.b64decode(result['csvData']).decode('utf-8')
            with open('expanded_movies.csv', 'w', encoding='utf-8') as f:
                f.write(csv_data)
            
            print("✅ Success! Generated expanded movies dataset")
            print(f"📊 Original rows: {result['original_rows']}")
            print(f"📈 Expanded rows: {result['expanded_rows']}")
            print(f"➕ New movies added: {result['expanded_rows'] - result['original_rows']}")
            print("💾 Saved as: expanded_movies.csv")
            
            # Show some insights
            if 'insights' in result and result['insights']:
                print("\n🔍 Data Insights:")
                for insight in result['insights']:
                    print(f"  • {insight}")
            
            # Show a preview of the new data
            print("\n🎭 Preview of Generated Movies:")
            if 'previewData' in result:
                preview = result['previewData'][-5:]  # Show last 5 (new movies)
                for i, movie in enumerate(preview, 1):
                    print(f"  {i}. {movie.get('title', 'Unknown')} ({movie.get('year', 'N/A')}) - {movie.get('director', 'Unknown')}")
                    
            return True
            
        else:
            print(f"❌ Error: {result.get('error', 'Unknown error')}")
            return False
            
    except requests.exceptions.Timeout:
        print("⏱️ Request timed out. The AI model might be busy. Please try again.")
        return False
    except requests.exceptions.ConnectionError:
        print("🔌 Connection error: Make sure the data processing server is running on port 5004")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    print("🎬 Movies Dataset Expansion Tool")
    print("=" * 50)
    expand_movies_dataset()