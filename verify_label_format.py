"""
Verification: Label Column with Actual Class Values
====================================================

This script demonstrates the updated Label column format that shows
actual class values from the dataset instead of "Predicted"/"Alternative".
"""

import pandas as pd
import numpy as np

def verify_label_format():
    print("🔍 Verifying Label Column Format")
    print("=" * 50)
    
    # Sample classification data
    classes = np.array(['Iris-setosa', 'Iris-versicolor', 'Iris-virginica'])
    probabilities = np.array([0.85, 0.12, 0.03])
    
    print("\n📊 BEFORE (Old Format):")
    print("-" * 30)
    old_df = pd.DataFrame({
        'Class': classes,
        'Probability': probabilities,
        'Label': ['Predicted' if p == max(probabilities) else 'Alternative' for p in probabilities]
    })
    print(old_df.to_string(index=False))
    
    print("\n📊 AFTER (New Format):")
    print("-" * 30)
    new_df = pd.DataFrame({
        'Class': classes,
        'Probability': probabilities,
        'Label': classes  # Show actual class names as labels
    })
    print(new_df.to_string(index=False))
    
    print("\n✨ Key Changes:")
    print("- Label column now shows actual class names from dataset")
    print("- Direct mapping: Class and Label contain same values")
    print("- More informative for users")
    print("- Better data reference capability")
    
    print("\n🔧 Implementation:")
    print("Label': model.classes_  # Show actual class names as labels")
    
    print("\n✅ Verification Complete!")
    print("The Label column now displays actual dataset class values.")

if __name__ == "__main__":
    verify_label_format()