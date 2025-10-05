"""
Enhanced Class Probabilities Demo
==================================

This demo shows the new Class Probabilities display with:
1. Label column (Predicted/Alternative)
2. Detailed AI explanations using Gemini
3. Enhanced probability analysis

Run with: streamlit run demo_enhanced_probabilities.py
"""

import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px

def demo_class_probabilities():
    st.set_page_config(
        page_title="Enhanced Class Probabilities Demo",
        page_icon="📊",
        layout="wide"
    )
    
    st.title("📊 Enhanced Class Probabilities Display")
    st.markdown("*Demonstrating the new Label column and AI-powered detailed explanations*")
    
    st.markdown("---")
    
    # Simulate class probabilities
    st.header("🎯 Sample Classification Results")
    
    # Sample data
    classes = ['Iris-setosa', 'Iris-versicolor', 'Iris-virginica']
    probabilities = [0.85, 0.12, 0.03]  # Simulated probabilities
    
    # Enhanced probability table with Label column
    st.subheader("📊 Class Probabilities")
    
    prob_df = pd.DataFrame({
        'Class': classes,
        'Probability': probabilities,
        'Label': classes  # Show actual class names as labels
    })
    
    st.dataframe(prob_df, use_container_width=True)
    
    # Confidence chart
    st.subheader("📈 Probability Visualization")
    fig = px.bar(
        x=classes,
        y=probabilities,
        title='Prediction Confidence by Class',
        color=probabilities,
        color_continuous_scale='RdYlGn',
        labels={'x': 'Classes', 'y': 'Probability'}
    )
    fig.update_layout(height=400)
    st.plotly_chart(fig, use_container_width=True)
    
    # Sample AI explanation
    st.subheader("🧠 AI Analysis of Class Probabilities")
    
    st.markdown("""
    **🎯 Primary Prediction**: Iris-setosa (85.0% confidence)
    
    ## 📊 Detailed Probability Analysis
    
    ### Overall Assessment
    The model strongly predicts **Iris-setosa** with 85% confidence, indicating a clear distinction from other iris species based on the input features.
    
    ### Probability Breakdown:
    - **🌸 Iris-setosa: 85.0%** (Predicted - High Confidence)
      - This is the dominant prediction with very high confidence
      - The model found strong patterns matching setosa characteristics
    
    - **🌺 Iris-versicolor: 12.0%** (Alternative - Low Confidence) 
      - Secondary possibility but significantly lower probability
      - Some features may partially overlap with versicolor patterns
    
    - **🌼 Iris-virginica: 3.0%** (Alternative - Very Low Confidence)
      - Minimal probability indicating clear distinction from virginica
      - Input features strongly contradict virginica characteristics
    
    ### 🔍 Feature Impact Analysis
    Based on the probability distribution:
    - **Sepal length & width**: Likely in the typical setosa range (shorter, wider)
    - **Petal characteristics**: Probably showing the distinctive small petal size of setosa
    - **Overall pattern**: Strong match with setosa training examples
    
    ### 💡 Confidence Evaluation
    **Very High Confidence** - The 85% probability with such a large gap (73% difference to next class) indicates:
    - Clear feature pattern recognition
    - Low ambiguity in the data
    - Strong model certainty
    
    ### 🔄 Alternative Scenarios
    For other classes to be more likely:
    - **Versicolor**: Would need larger petal length/width measurements
    - **Virginica**: Would require significantly larger overall measurements
    
    ### 🎯 Practical Insights
    - **Decision**: Confidently classify as Iris-setosa
    - **Risk**: Very low chance of misclassification
    - **Action**: Proceed with setosa classification
    - **Monitoring**: No additional validation needed given high confidence
    """)
    
    st.markdown("---")
    
    # Feature comparison
    st.header("📋 What's New in Enhanced Display")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("🆕 New Features")
        st.markdown("""
        ### Label Column
        - Shows **actual class names** from the dataset
        - Same values as Class column for easy reference
        - Direct mapping to original dataset labels
        
        ### AI Analysis
        - Detailed explanation of each probability
        - Feature impact analysis
        - Confidence assessment
        - Alternative scenarios
        - Practical recommendations
        """)
    
    with col2:
        st.subheader("⚙️ Technical Details")
        st.markdown("""
        ### Implementation
        - Uses Gemini AI for detailed explanations
        - Fallback mode when API not available
        - Formatted markdown output
        - Interactive visualizations
        
        ### User Benefits
        - Better understanding of model decisions
        - Clear probability interpretation
        - Actionable insights
        - Professional presentation
        """)
    
    # Sample code
    st.header("💻 Code Example")
    
    st.code("""
# Enhanced Class Probabilities Display
prob_df = pd.DataFrame({
    'Class': model.classes_,
    'Probability': proba[0],
    'Label': model.classes_  # Show actual class names as labels
})

# AI-powered detailed explanation
class_probs = dict(zip(model.classes_, proba[0]))
detailed_explanation = explainer.explain_class_probabilities(
    user_inputs,
    class_probs,
    model_type
)
st.markdown(detailed_explanation)
    """, language="python")
    
    st.success("🎉 This enhanced display is now automatically included in all generated Streamlit apps!")
    
    # Footer
    st.markdown("---")
    st.markdown("""
    <div style='text-align: center; color: #666; padding: 1rem;'>
        🧠 Enhanced with Gemini AI | 📊 Professional ML Analytics
    </div>
    """, unsafe_allow_html=True)

if __name__ == "__main__":
    demo_class_probabilities()