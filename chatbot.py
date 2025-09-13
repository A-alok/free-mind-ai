from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv('.env.local')
app = Flask(__name__)
CORS(app)

# Get API key
api_key = os.getenv("GOOGLE_API_KEY")

if not api_key:
    print("WARNING: API key not found")
else:
    print("API key loaded successfully")

# Configure Google Generative AI
genai.configure(api_key=api_key)

def get_data_science_response(user_question, conversation_history=""):
    try:
        # Create a focused prompt for data science questions
        prompt = f"""
        You are FreeMindAi, an expert data science AI assistant. Answer data science related questions clearly and concisely.
        
        Focus areas:
        - Machine Learning algorithms and concepts
        - Data analysis and statistics
        - Python libraries (pandas, numpy, scikit-learn, etc.)
        - Data visualization
        - Deep learning and neural networks
        - Data preprocessing and cleaning
        - Model evaluation and validation
        
        Previous conversation:
        {conversation_history}
        
        Current question: {user_question}
        
        Provide a helpful, accurate answer about data science. If the question is not related to data science, 
        politely redirect to data science topics.
        
        Answer:
        """
        
        # Use Gemini model
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(prompt)
        
        return response.text
    except Exception as e:
        return f"Sorry, I encountered an error: {str(e)}"

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json
    user_question = data.get('message', '')
    conversation_history = data.get('history', '')
    
    if not user_question:
        return jsonify({"error": "No message provided"}), 400
    
    response = get_data_science_response(user_question, conversation_history)
    return jsonify({"response": response})

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)