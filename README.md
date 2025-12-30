# 🧠 FreeMindAI - No-Code ML Platform

<div align="center">

![FreeMindAI](https://img.shields.io/badge/FreeMindAI-ML%20Platform-9d4edd?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-15.4-black?style=for-the-badge&logo=next.js)
![Flask](https://img.shields.io/badge/Flask-Python-green?style=for-the-badge&logo=flask)
![TensorFlow](https://img.shields.io/badge/TensorFlow-ML-orange?style=for-the-badge&logo=tensorflow)

**Build, Train & Deploy Machine Learning Models Without Writing Code**

</div>

---

## 📋 Overview

FreeMindAI is a full-stack, no-code machine learning platform that enables users to:

- 🎯 **Train ML Models** - Classification, Regression, NLP, Image Classification, and Object Detection
- 📊 **Visualize Results** - Beautiful, AI-explained visualizations with modern purple theme
- 🤖 **AI-Powered Insights** - Google Gemini integration for intelligent explanations
- 📦 **Export & Deploy** - Download trained models as ready-to-use Streamlit apps
- 🔄 **Dataset Processing** - Upload, expand, and alter datasets with AI assistance

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FreeMindAI Platform                       │
├──────────────────────────┬──────────────────────────────────┤
│   Next.js Frontend       │        Flask Backend             │
│   (React 19, TailwindCSS)│   (Python, ML Libraries)         │
│   Port: 3000             │        Port: 5000                │
├──────────────────────────┼──────────────────────────────────┤
│   • Modern UI            │   • scikit-learn                 │
│   • Real-time updates    │   • TensorFlow/Keras             │
│   • File uploads         │   • PyTorch + YOLO               │
│   • Visualizations       │   • Google Gemini AI             │
│   • User authentication  │   • Kaggle API                   │
└──────────────────────────┴──────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │   MongoDB Atlas   │
                    │   (User Data)     │
                    └───────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ 
- **Python** 3.10+
- **MongoDB Atlas** account (for authentication & data storage)

### Environment Variables

Create a `.env` file in the root directory:

```env
# MongoDB
MONGODB_URI=mongodb+srv://your-connection-string

# Google Gemini AI
GOOGLE_API_KEY=your-gemini-api-key

# Kaggle (for dataset downloads)
KAGGLE_USERNAME=your-kaggle-username
KAGGLE_KEY=your-kaggle-key

# NextAuth
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000

# Optional
OPENROUTER_API_KEY=your-openrouter-key
```

---

## 💻 Local Development

### Option 1: Run Separately (Recommended for Development)

**Terminal 1 - Backend (Flask):**
```powershell
# Create virtual environment
python -m venv venv

# Activate (Windows)
.\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run Flask server
python app.py
```

**Terminal 2 - Frontend (Next.js):**
```powershell
# Install dependencies
npm install

# Run development server
npm run dev
```

**Access the app:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

---

### Option 2: Docker (Production)

```powershell
# Build and run both services
docker-compose up --build

# Run in background
docker-compose up -d

# Stop services
docker-compose down
```

**Access:**
- Frontend: http://localhost:3000
- Backend: http://localhost:5000

---

## 📁 Project Structure

```
FreeMindAi/
├── app/                    # Next.js App Router
│   ├── api/               # API routes (auth, projects, etc.)
│   ├── dashboard/         # Dashboard pages
│   └── page.js            # Home page
├── components/            # React components
│   ├── ml-system.jsx     # Main ML training interface
│   └── ...
├── lib/                   # Utility libraries
├── models/                # MongoDB models
├── public/                # Static assets
│
├── app.py                 # Flask backend entry point
├── model_training.py      # ML model training logic
├── visualization.py       # Chart generation
├── data_handling.py       # Dataset processing
├── preprocessing.py       # Data preprocessing
│
├── Dockerfile             # Backend Docker config
├── Dockerfile.frontend    # Frontend Docker config
├── docker-compose.yml     # Multi-container orchestration
├── requirements.txt       # Python dependencies
└── package.json           # Node.js dependencies
```

---

## 🎯 Features

### 1. Model Training
- **Classification**: Decision Tree, Random Forest, SVM, KNN, Gradient Boosting
- **Regression**: Linear, Ridge, Lasso, Random Forest, XGBoost
- **NLP**: Text classification with TF-IDF
- **Image Classification**: CNN with TensorFlow
- **Object Detection**: YOLOv8

### 2. Dataset Sources
- 📤 **Upload CSV/Excel** files directly
- 🌐 **Kaggle Integration** - Import datasets via URL
- 🤖 **AI Generation** - Create synthetic datasets with prompts
- 🔄 **Data Expansion** - Augment existing datasets

### 3. Visualizations
- Confusion Matrix
- ROC Curves
- Precision-Recall Curves
- Feature Importance
- Residual Plots
- Q-Q Plots

### 4. Export Options
- Download trained models (`.pkl`)
- Ready-to-run Streamlit app (`.zip`)
- Model deployment on Render

---

## 🔧 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/process` | POST | Train ML model |
| `/api/datasets` | GET | List datasets |
| `/api/upload-dataset` | POST | Upload dataset |
| `/api/preview-dataset` | POST | Preview dataset |
| `/download/<filename>` | GET | Download model/app |

---

## 🐳 Docker Commands

```powershell
# Build images
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild specific service
docker-compose build backend
docker-compose build frontend
```

---

## 🛠️ Troubleshooting

### Port Already in Use
```powershell
# Find process using port
netstat -ano | findstr :3000

# Kill process
taskkill /PID <PID> /F
```

### Docker Build Slow
The first build takes ~10-15 minutes due to ML dependencies. Subsequent builds are cached.

### Streamlit App Not Running
```powershell
# Install streamlit
pip install streamlit

# Run the exported app
streamlit run load_model.py
```

---

## 📄 License

This project is private and proprietary.

---

## 👨‍💻 Author

**Alok** - Full Stack Developer

---

<div align="center">

**Built with ❤️ using Next.js, Flask, and Machine Learning**

</div>
