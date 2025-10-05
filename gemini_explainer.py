import os
import google.generativeai as genai
from dotenv import load_dotenv
import json
import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional

class GeminiExplainer:
    def __init__(self):
        """Initialize Gemini AI for explanations"""
        load_dotenv()
        self.api_key = os.getenv('GEMINI_API_KEY')
        
        if self.api_key:
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel('gemini-pro')
        else:
            self.model = None
            print("Warning: GEMINI_API_KEY not found in .env file")
    
    def explain_dataset(self, df: pd.DataFrame, dataset_name: str = "Dataset") -> str:
        """Generate comprehensive dataset explanation"""
        if not self.model:
            return self._fallback_dataset_explanation(df, dataset_name)
        
        try:
            # Prepare dataset summary
            summary = self._prepare_dataset_summary(df)
            
            prompt = f"""
            As a data science expert, analyze this dataset and provide a comprehensive explanation:
            
            Dataset: {dataset_name}
            
            Dataset Summary:
            {summary}
            
            Please provide:
            1. **Dataset Overview**: What this dataset represents and its potential use cases
            2. **Key Characteristics**: Important patterns, distributions, and data quality insights
            3. **Feature Analysis**: Explanation of key features and their significance
            4. **Data Quality Assessment**: Missing values, outliers, and data integrity
            5. **Recommendations**: Suggestions for data preprocessing and analysis approaches
            
            Format your response in clear markdown with emojis for better readability.
            """
            
            response = self.model.generate_content(prompt)
            return response.text
            
        except Exception as e:
            print(f"Error generating dataset explanation: {e}")
            return self._fallback_dataset_explanation(df, dataset_name)
    
    def explain_model_results(self, model_info: Dict, predictions_sample: Dict, 
                            feature_importance: Optional[Dict] = None, 
                            task_type: str = "classification") -> str:
        """Generate model results explanation"""
        if not self.model:
            return self._fallback_model_explanation(model_info, task_type)
        
        try:
            prompt = f"""
            As a machine learning expert, explain these model results in detail:
            
            Model Information:
            - Model Type: {model_info.get('model_name', 'Unknown')}
            - Task Type: {task_type}
            - Performance Score: {model_info.get('score', 'N/A')}
            
            Sample Predictions:
            {json.dumps(predictions_sample, indent=2)}
            
            {f"Feature Importance: {json.dumps(feature_importance, indent=2)}" if feature_importance else ""}
            
            Please provide:
            1. **Model Performance Analysis**: What the scores mean and how good they are
            2. **Prediction Interpretation**: How to understand the predictions
            3. **Feature Insights**: Which features are most important and why (if available)
            4. **Reliability Assessment**: How much to trust these predictions
            5. **Practical Applications**: Real-world use cases for this model
            6. **Improvement Suggestions**: How to potentially improve the model
            
            Format your response in clear markdown with emojis for better readability.
            Be technical but accessible to non-experts.
            """
            
            response = self.model.generate_content(prompt)
            return response.text
            
        except Exception as e:
            print(f"Error generating model explanation: {e}")
            return self._fallback_model_explanation(model_info, task_type)
    
    def explain_visualization(self, viz_type: str, data_context: Dict) -> str:
        """Generate visualization explanations"""
        if not self.model:
            return self._fallback_viz_explanation(viz_type)
        
        try:
            prompt = f"""
            As a data visualization expert, explain this {viz_type} chart:
            
            Context:
            {json.dumps(data_context, indent=2)}
            
            Please provide:
            1. **What This Chart Shows**: Clear explanation of the visualization
            2. **Key Insights**: Important patterns and findings
            3. **How to Interpret**: Guide for reading and understanding the chart
            4. **Business Implications**: What this means in practical terms
            
            Be concise but informative. Use emojis for better engagement.
            """
            
            response = self.model.generate_content(prompt)
            return response.text
            
        except Exception as e:
            print(f"Error generating visualization explanation: {e}")
            return self._fallback_viz_explanation(viz_type)
    
    def explain_predictions(self, predictions: List, feature_values: Dict, 
                          model_type: str, task_type: str) -> str:
        """Explain individual predictions"""
        if not self.model:
            return self._fallback_prediction_explanation(predictions, task_type)
        
        try:
            prompt = f"""
            As a machine learning expert, explain these specific predictions:
            
            Model Type: {model_type}
            Task Type: {task_type}
            
            Input Features:
            {json.dumps(feature_values, indent=2)}
            
            Predictions:
            {json.dumps(predictions, indent=2)}
            
            Please provide:
            1. **Prediction Summary**: What the model predicted and confidence level
            2. **Key Factors**: Which input features likely influenced this prediction
            3. **Reasoning**: Why the model might have made this prediction
            4. **Uncertainty**: How confident should we be in this result
            5. **Actionable Insights**: What this prediction means for decision-making
            
            Be clear and practical. Use emojis to make it engaging.
            """
            
            response = self.model.generate_content(prompt)
            return response.text
            
        except Exception as e:
            print(f"Error generating prediction explanation: {e}")
            return self._fallback_prediction_explanation(predictions, task_type)
    
    def _prepare_dataset_summary(self, df: pd.DataFrame) -> str:
        """Prepare dataset summary for Gemini"""
        summary = []
        
        # Basic info
        summary.append(f"Shape: {df.shape[0]} rows, {df.shape[1]} columns")
        
        # Column types
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        categorical_cols = df.select_dtypes(include=['object']).columns.tolist()
        
        summary.append(f"Numeric columns ({len(numeric_cols)}): {numeric_cols[:10]}")
        summary.append(f"Categorical columns ({len(categorical_cols)}): {categorical_cols[:10]}")
        
        # Missing values
        missing = df.isnull().sum().sum()
        summary.append(f"Total missing values: {missing}")
        
        # Basic statistics for numeric columns
        if len(numeric_cols) > 0:
            numeric_summary = df[numeric_cols].describe()
            summary.append(f"Numeric data ranges:")
            for col in numeric_cols[:5]:  # Limit to first 5
                if col in numeric_summary.columns:
                    min_val = numeric_summary.loc['min', col]
                    max_val = numeric_summary.loc['max', col]
                    mean_val = numeric_summary.loc['mean', col]
                    summary.append(f"  {col}: {min_val:.2f} to {max_val:.2f} (avg: {mean_val:.2f})")
        
        # Categorical data info
        if len(categorical_cols) > 0:
            summary.append(f"Categorical data unique values:")
            for col in categorical_cols[:5]:  # Limit to first 5
                unique_count = df[col].nunique()
                top_values = df[col].value_counts().head(3).index.tolist()
                summary.append(f"  {col}: {unique_count} unique values, top: {top_values}")
        
        return "\\n".join(summary)
    
    def _fallback_dataset_explanation(self, df: pd.DataFrame, dataset_name: str) -> str:
        """Fallback explanation when Gemini is not available"""
        return f"""
        ## 📊 Dataset Analysis: {dataset_name}
        
        ### Overview
        This dataset contains **{df.shape[0]} rows** and **{df.shape[1]} columns** of data.
        
        ### Data Composition
        - **Numeric features**: {len(df.select_dtypes(include=[np.number]).columns)} columns
        - **Categorical features**: {len(df.select_dtypes(include=['object']).columns)} columns  
        - **Missing values**: {df.isnull().sum().sum()} total
        
        ### Key Characteristics
        - Memory usage: {df.memory_usage(deep=True).sum() / 1024**2:.2f} MB
        - Data quality: {'Good' if df.isnull().sum().sum() / (df.shape[0] * df.shape[1]) < 0.1 else 'Needs attention'}
        
        ### Next Steps
        1. Explore feature distributions
        2. Check for correlations between variables
        3. Handle missing values if present
        4. Consider feature engineering opportunities
        """
    
    def _fallback_model_explanation(self, model_info: Dict, task_type: str) -> str:
        """Fallback model explanation when Gemini is not available"""
        score = model_info.get('score', 0)
        model_name = model_info.get('model_name', 'Unknown')
        
        if task_type == 'classification':
            performance = 'Excellent' if score > 0.9 else 'Good' if score > 0.8 else 'Fair' if score > 0.7 else 'Needs improvement'
        else:
            performance = 'Good' if score > 0.8 else 'Fair' if score > 0.6 else 'Needs improvement'
        
        return f"""
        ## 🤖 Model Results Analysis
        
        ### Model Performance
        - **Model Type**: {model_name}
        - **Task**: {task_type.title()}
        - **Performance Score**: {score:.4f}
        - **Assessment**: {performance}
        
        ### Key Insights
        - The model has been trained and validated on your data
        - Performance score indicates the model's accuracy on unseen data
        - Consider collecting more data if performance is below expectations
        
        ### Recommendations
        1. Test the model with new data to validate performance
        2. Monitor predictions for any unexpected patterns
        3. Retrain periodically with new data
        """
    
    def _fallback_viz_explanation(self, viz_type: str) -> str:
        """Fallback visualization explanation when Gemini is not available"""
        explanations = {
            'confusion_matrix': "Shows classification accuracy by comparing actual vs predicted values",
            'correlation_matrix': "Displays relationships between different features in your data",
            'distribution': "Shows how values are spread across your dataset features",
            'feature_importance': "Indicates which features have the most impact on predictions",
            'learning_curves': "Shows how model performance changes with training data size"
        }
        
        return f"## 📈 {viz_type.replace('_', ' ').title()}\n\n{explanations.get(viz_type, 'This visualization helps understand your data and model performance.')}"
    
    def _fallback_prediction_explanation(self, predictions: List, task_type: str) -> str:
        """Fallback prediction explanation when Gemini is not available"""
        return f"""
        ## 🎯 Prediction Results
        
        ### Summary
        - **Task Type**: {task_type.title()}
        - **Predictions**: {len(predictions)} made
        
        ### Interpretation
        The model has analyzed your input data and generated predictions based on patterns learned during training.
        
        ### Confidence
        Results are based on the model's training data. Consider the model's performance score when interpreting results.
        """