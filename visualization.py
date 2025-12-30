import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
import seaborn as sns
from io import BytesIO
import base64
from sklearn.metrics import (confusion_matrix, precision_recall_curve, roc_curve, auc,
                             classification_report, average_precision_score, 
                             mean_squared_error, r2_score)
from sklearn.inspection import permutation_importance
from sklearn.preprocessing import label_binarize
from scipy import stats
import matplotlib.patheffects as path_effects
from matplotlib.colors import LinearSegmentedColormap
import itertools  # Added missing import

# ===============================
# Modern Purple-themed Color Palette
# ===============================
PURPLE_BG = '#1a1a2e'
PURPLE_DARK = '#16213e'
PURPLE_SECONDARY = '#4a4e69'
PURPLE_ACCENT = '#9d4edd'
PURPLE_LIGHT = '#e0aaff'

# Custom colormap for heatmaps
purple_cmap = LinearSegmentedColormap.from_list('purple_theme', 
    [PURPLE_BG, PURPLE_DARK, PURPLE_ACCENT, PURPLE_LIGHT])

def apply_modern_style():
    """Apply a modern dark purple theme to all matplotlib plots"""
    plt.style.use('dark_background')
    plt.rcParams.update({
        'figure.facecolor': PURPLE_BG,
        'axes.facecolor': PURPLE_DARK,
        'axes.edgecolor': PURPLE_SECONDARY,
        'axes.labelcolor': PURPLE_LIGHT,
        'text.color': PURPLE_LIGHT,
        'xtick.color': PURPLE_LIGHT,
        'ytick.color': PURPLE_LIGHT,
        'grid.color': PURPLE_SECONDARY,
        'grid.alpha': 0.3,
        'font.family': 'sans-serif',
        'font.size': 12,
        'axes.titlesize': 16,
        'axes.labelsize': 14,
    })

try:
    import google.generativeai as genai
    import os
    from dotenv import load_dotenv
    
    GEMINI_AVAILABLE = True
    
    # Load environment variables from .env and .env.local
    load_dotenv('.env')
    load_dotenv('.env.local', override=True)
    
    # Configure Gemini API with key from environment variables
    api_key = os.getenv('GOOGLE_API_KEY')
    if not api_key:
        print("WARNING: GOOGLE_API_KEY not found. Gemini features will be disabled.")
        GEMINI_AVAILABLE = False
    else:
        genai.configure(api_key=api_key)
    
except ImportError:
    GEMINI_AVAILABLE = False
except Exception as e:
    print(f"Warning: Failed to initialize Gemini in visualization.py: {e}")
    GEMINI_AVAILABLE = False

# ... (lines 38-80 unchanged)

def get_gemini_explanation(data, prompt):
    """Get AI-generated explanation for visualizations using Gemini model"""
    if GEMINI_AVAILABLE:
        try:
            model = genai.GenerativeModel('gemini-pro')
            response = model.generate_content(prompt)
            return response.text
        except Exception as e:
            return f"Unable to generate explanation: {str(e)}"
    else:
        return "AI explanations not available (Gemini API not installed)"

def add_style_to_plot(fig, ax, title, xlabel=None, ylabel=None):
    """Add consistent modern styling to a plot"""
    # Add title with glowing effect
    title_obj = ax.set_title(title, fontsize=18, fontweight='bold', color=PURPLE_LIGHT, pad=20)
    title_obj.set_path_effects([path_effects.Stroke(linewidth=2, foreground=PURPLE_ACCENT, alpha=0.5),
                               path_effects.Normal()])
    
    # Set axis labels
    if xlabel:
        ax.set_xlabel(xlabel, fontsize=14, color=PURPLE_LIGHT, labelpad=10)
    if ylabel:
        ax.set_ylabel(ylabel, fontsize=14, color=PURPLE_LIGHT, labelpad=10)
    
    # Add subtle grid
    ax.grid(color=PURPLE_DARK, linestyle='--', linewidth=0.5, alpha=0.5)
    
    # Style spine colors
    for spine in ax.spines.values():
        spine.set_edgecolor(PURPLE_SECONDARY)
        spine.set_linewidth(1.5)
    
    # Add a subtle glow effect around the plot edges
    fig.patch.set_alpha(0.9)
    
    # Make tick labels more visible
    ax.tick_params(colors=PURPLE_LIGHT, labelsize=12)
    
    # Add a subtle background gradient
    gradient = np.linspace(0, 1, 100).reshape(-1, 1)
    ax.imshow(gradient, aspect='auto', extent=[ax.get_xlim()[0], ax.get_xlim()[1], 
                                              ax.get_ylim()[0], ax.get_ylim()[1]],
             cmap=LinearSegmentedColormap.from_list('bg_gradient', 
                                                  [PURPLE_BG, PURPLE_DARK]),
             alpha=0.1, zorder=-1)

def fig_to_base64(fig):
    """Convert matplotlib figure to base64 encoded string with improved quality"""
    buf = BytesIO()
    fig.savefig(buf, format='png', bbox_inches='tight', dpi=150, 
               facecolor=PURPLE_BG, edgecolor=PURPLE_SECONDARY)
    buf.seek(0)
    img_str = base64.b64encode(buf.read()).decode('utf-8')
    buf.close()
    return img_str

def create_visualization(task_type, y_test, y_pred, best_model, X_test, feature_names, user_prompt):
    """Create stylish visualizations based on task type and return as base64 encoded images"""
    visualizations = []
    apply_modern_style()
    
    # Classification Task Visualization
    if task_type in ['classification', 'nlp']:
        # Determine number of classes
        n_classes = len(np.unique(y_test))
        
        # Multiclass Classification
        if n_classes > 2:
            # Confusion Matrix with enhanced styling
            cm = confusion_matrix(y_test, y_pred)
            fig, ax = plt.subplots(figsize=(10, 8))
            
            # Create stylish heatmap with custom colormap
            sns.heatmap(cm, annot=True, fmt='d', cmap=purple_cmap,
                       linewidths=1, linecolor=PURPLE_SECONDARY,
                       annot_kws={"color": "white", "fontsize": 14, "fontweight": "bold"})
            
            # Add style elements
            add_style_to_plot(fig, ax, 'Confusion Matrix', 'Predicted', 'Actual')
            
            # Add subtle border glow
            fig.patch.set_alpha(0.95)
            for i in range(3):
                fig.patch.set_path_effects([
                    path_effects.Stroke(linewidth=3+i, foreground=PURPLE_ACCENT, alpha=0.1+i*0.05),
                    path_effects.Normal()
                ])
            
            confusion_matrix_img = fig_to_base64(fig)
            plt.close(fig)
            
            # Get AI explanation for confusion matrix
            cm_details = "\n".join([f"Class {i}: TP={cm[i,i]}, Total={np.sum(cm[i,:])}" for i in range(n_classes)])
            explanation_prompt = f"""
            Analyze this multiclass confusion matrix for {user_prompt}:
            {cm_details}
            Explain the performance across different classes.
            What insights can we draw about the model's classification ability?
            Provide a detailed explanation in 10-12 lines.
            """
            explanation = get_gemini_explanation(str(cm.tolist()), explanation_prompt)
            
            visualizations.append({
                'title': 'Confusion Matrix',
                'image': confusion_matrix_img,
                'explanation': explanation
            })
            
            # Enhanced Multiclass ROC Curve
            if hasattr(best_model, 'predict_proba'):
                y_test_bin = label_binarize(y_test, classes=range(n_classes))
                y_pred_proba = best_model.predict_proba(X_test)
                
                # Compute ROC curve and ROC area for each class
                fpr = dict()
                tpr = dict()
                roc_auc = dict()
                
                # Create a stylish figure for ROC curves
                fig, ax = plt.subplots(figsize=(10, 8))
                
                # Gradient background for plot area
                ax.set_facecolor(PURPLE_BG)
                
                # Custom color palette for lines
                colors = [PURPLE_ACCENT, '#E040FB', '#D500F9', '#AA00FF', '#7C4DFF', '#651FFF']
                
                # Plot each class ROC curve with enhanced styling
                for i in range(n_classes):
                    fpr[i], tpr[i], _ = roc_curve(y_test_bin[:, i], y_pred_proba[:, i])
                    roc_auc[i] = auc(fpr[i], tpr[i])
                    
                    # Add glowing effect to the line
                    line = ax.plot(fpr[i], tpr[i], 
                                  color=colors[i % len(colors)],
                                  lw=3, 
                                  label=f'Class {i} (AUC = {roc_auc[i]:.2f})')
                    
                    # Add glow effect to the line
                    line[0].set_path_effects([
                        path_effects.Stroke(linewidth=5, foreground=colors[i % len(colors)], alpha=0.3),
                        path_effects.Normal()
                    ])
                
                # Add diagonal reference line
                ax.plot([0, 1], [0, 1], '--', color=PURPLE_SECONDARY, lw=2, alpha=0.7)
                
                # Set plot limits and grid
                ax.set_xlim([0.0, 1.0])
                ax.set_ylim([0.0, 1.05])
                
                # Style the legend
                legend = ax.legend(loc="lower right", frameon=True, facecolor=PURPLE_DARK, edgecolor=PURPLE_SECONDARY)
                for text in legend.get_texts():
                    text.set_color(PURPLE_LIGHT)
                
                # Add overall style to the plot
                add_style_to_plot(fig, ax, 'Multiclass ROC Curve', 'False Positive Rate', 'True Positive Rate')
                
                # Add a semi-transparent overlay in the top-left (better performance area)
                performance_highlight = plt.Rectangle((0, 0.7), 0.3, 0.3, 
                                                   fc=PURPLE_ACCENT, ec='none', alpha=0.1)
                ax.add_patch(performance_highlight)
                
                roc_img = fig_to_base64(fig)
                plt.close(fig)
                
                # AI Explanation for Multiclass ROC
                auc_details = ", ".join([f"Class {i}: {roc_auc[i]:.2f}" for i in range(n_classes)])
                explanation_prompt = f"""
                Analyze these multiclass ROC curves for {user_prompt}:
                AUC Scores: {auc_details}
                Explain what these ROC curves tell us about the model's performance.
                How well can the model distinguish between different classes?
                Provide insights in 10-12 lines.
                """
                explanation = get_gemini_explanation(str(roc_auc), explanation_prompt)
                
                visualizations.append({
                    'title': 'Multiclass ROC Curve',
                    'image': roc_img,
                    'explanation': explanation
                })
                
                # Enhanced Precision-Recall Curve for Multiclass
                fig, ax = plt.subplots(figsize=(10, 8))
                
                # Gradient background
                ax.set_facecolor(PURPLE_BG)
                
                for i in range(n_classes):
                    precision, recall, _ = precision_recall_curve(y_test_bin[:, i], y_pred_proba[:, i])
                    ap_score = average_precision_score(y_test_bin[:, i], y_pred_proba[:, i])
                    
                    # Create line with glow effect
                    line = ax.plot(recall, precision, 
                                  color=colors[i % len(colors)],
                                  lw=3, 
                                  label=f'Class {i} (AP = {ap_score:.2f})')
                    
                    # Add glow effect
                    line[0].set_path_effects([
                        path_effects.Stroke(linewidth=5, foreground=colors[i % len(colors)], alpha=0.3),
                        path_effects.Normal()
                    ])
                    
                    # Add area under curve with slight transparency
                    ax.fill_between(recall, 0, precision, 
                                   color=colors[i % len(colors)], 
                                   alpha=0.1)
                
                # Style legend
                legend = ax.legend(loc="best", frameon=True, facecolor=PURPLE_DARK, edgecolor=PURPLE_SECONDARY)
                for text in legend.get_texts():
                    text.set_color(PURPLE_LIGHT)
                
                # Add overall style
                add_style_to_plot(fig, ax, 'Multiclass Precision-Recall Curve', 'Recall', 'Precision')
                
                pr_img = fig_to_base64(fig)
                plt.close(fig)
                
                # AI Explanation for Multiclass Precision-Recall
                ap_details = ", ".join([f"Class {i}: {average_precision_score(y_test_bin[:, i], y_pred_proba[:, i]):.2f}" for i in range(n_classes)])
                explanation_prompt = f"""
                Analyze these multiclass Precision-Recall curves for {user_prompt}:
                Average Precision Scores: {ap_details}
                Explain what these curves reveal about the model's performance.
                How precisely can the model predict each class?
                Provide detailed insights in 10-12 lines.
                """
                explanation = get_gemini_explanation(str(ap_details), explanation_prompt)
                
                visualizations.append({
                    'title': 'Multiclass Precision-Recall Curve',
                    'image': pr_img,
                    'explanation': explanation
                })
        
        # Binary Classification with enhanced styling
        else:
            # Confusion Matrix with modern styling
            cm = confusion_matrix(y_test, y_pred)
            fig, ax = plt.subplots(figsize=(10, 8))
            
            # Create heatmap with custom colormap and styling
            sns.heatmap(cm, annot=True, fmt='d', cmap=purple_cmap,
                       linewidths=1.5, linecolor=PURPLE_SECONDARY,
                       annot_kws={"color": "white", "fontsize": 16, "fontweight": "bold"},
                       xticklabels=['Class 0', 'Class 1'],
                       yticklabels=['Class 0', 'Class 1'])
            
            # Add decorative elements
            for i, j in itertools.product(range(2), range(2)):
                if i == j:  # Diagonal elements (correct predictions)
                    text = ax.text(j + 0.5, i + 0.5, "+", 
                       ha="center", va="center", alpha=0.4,
                       color=PURPLE_ACCENT, fontsize=36)
            
            # Add overall style
            add_style_to_plot(fig, ax, 'Confusion Matrix', 'Predicted', 'Actual')
            
            # Add annotations for TP, FP, FN, TN
            descriptors = [["TN", "FP"], ["FN", "TP"]]
            for i in range(2):
                for j in range(2):
                    text = ax.text(j + 0.5, i + 0.15, descriptors[i][j],
                                  ha="center", va="center",
                                  color=PURPLE_LIGHT, fontsize=12, alpha=0.7)
            
            confusion_matrix_img = fig_to_base64(fig)
            plt.close(fig)
            
            # Get AI explanation for confusion matrix
            explanation_prompt = f"""
            Analyze this confusion matrix for {user_prompt}:
            - True Positives: {cm[1,1]}
            - False Positives: {cm[0,1]}
            - False Negatives: {cm[1,0]}
            - True Negatives: {cm[0,0]}
            Explain what these numbers mean in the context of {user_prompt} and their implications.
            All in 10 lines paragraph.
            """
            explanation = get_gemini_explanation(str(cm.tolist()), explanation_prompt)
            
            visualizations.append({
                'title': 'Confusion Matrix',
                'image': confusion_matrix_img,
                'explanation': explanation
            })
            
            # Enhanced ROC Curve (for binary classification)
            if hasattr(best_model, 'predict_proba'):
                y_pred_proba = best_model.predict_proba(X_test)[:, 1]
                fpr, tpr, _ = roc_curve(y_test, y_pred_proba)
                roc_auc = auc(fpr, tpr)
                
                fig, ax = plt.subplots(figsize=(10, 8))
                
                # Create gradient background
                ax.set_facecolor(PURPLE_BG)
                
                # Plot ROC curve with glow effect
                line = ax.plot(fpr, tpr, color=PURPLE_ACCENT, lw=3, 
                             label=f'ROC curve (AUC = {roc_auc:.2f})')
                
                # Add glow effect
                line[0].set_path_effects([
                    path_effects.Stroke(linewidth=6, foreground=PURPLE_ACCENT, alpha=0.3),
                    path_effects.Normal()
                ])
                
                # Fill area under curve
                ax.fill_between(fpr, tpr, 0, color=PURPLE_ACCENT, alpha=0.2)
                
                # Add diagonal reference line
                ax.plot([0, 1], [0, 1], '--', color=PURPLE_SECONDARY, lw=2, alpha=0.7)
                
                # Set plot limits
                ax.set_xlim([0.0, 1.0])
                ax.set_ylim([0.0, 1.05])
                
                # Style legend
                legend = ax.legend(loc="lower right", frameon=True, facecolor=PURPLE_DARK, edgecolor=PURPLE_SECONDARY)
                for text in legend.get_texts():
                    text.set_color(PURPLE_LIGHT)
                
                # Add annotations for different regions
                ax.text(0.15, 0.9, "Better Performance →", fontsize=12, color=PURPLE_LIGHT, alpha=0.8)
                
                # Add overall style
                add_style_to_plot(fig, ax, 'Receiver Operating Characteristic (ROC)', 
                                 'False Positive Rate', 'True Positive Rate')
                
                # Add AUC score as a translucent badge
                ax.text(0.75, 0.3, f"AUC: {roc_auc:.2f}", fontsize=16, 
                       bbox=dict(boxstyle='round,pad=0.5', facecolor=PURPLE_DARK, 
                                alpha=0.7, edgecolor=PURPLE_ACCENT),
                       color=PURPLE_LIGHT, ha='center', va='center')
                
                roc_img = fig_to_base64(fig)
                plt.close(fig)
                
                # AI Explanation for ROC Curve
                explanation_prompt = f"""
                Analyze this ROC curve for {user_prompt}:
                - AUC Score: {roc_auc:.2f}
                Explain what this curve and AUC score mean in the context of {user_prompt}.
                How good is the model at distinguishing between classes?
                All in 10 lines paragraph.
                """
                explanation = get_gemini_explanation(f"AUC: {roc_auc}", explanation_prompt)
                
                visualizations.append({
                    'title': 'ROC Curve',
                    'image': roc_img,
                    'explanation': explanation
                })
                
                # Enhanced Precision-Recall Curve
                precision, recall, _ = precision_recall_curve(y_test, y_pred_proba)
                ap_score = average_precision_score(y_test, y_pred_proba)
                
                fig, ax = plt.subplots(figsize=(10, 8))
                
                # Set gradient background
                ax.set_facecolor(PURPLE_BG)
                
                # Create the precision-recall curve with glow effect
                line = ax.plot(recall, precision, color=PURPLE_ACCENT, lw=3)
                
                # Add glow effect
                line[0].set_path_effects([
                    path_effects.Stroke(linewidth=6, foreground=PURPLE_ACCENT, alpha=0.3),
                    path_effects.Normal()
                ])
                
                # Fill area under curve
                ax.fill_between(recall, precision, 0, color=PURPLE_ACCENT, alpha=0.2)
                
                # Add baseline
                ax.axhline(y=sum(y_test)/len(y_test), color=PURPLE_SECONDARY, 
                          linestyle='--', lw=2, alpha=0.7, 
                          label=f'Baseline (Prevalence: {sum(y_test)/len(y_test):.2f})')
                
                # Add AP score as a translucent badge
                ax.text(0.5, 0.3, f"AP: {ap_score:.2f}", fontsize=16, 
                       bbox=dict(boxstyle='round,pad=0.5', facecolor=PURPLE_DARK, 
                                alpha=0.7, edgecolor=PURPLE_ACCENT),
                       color=PURPLE_LIGHT, ha='center', va='center')
                
                # Style legend
                legend = ax.legend(loc="lower left", frameon=True, facecolor=PURPLE_DARK, edgecolor=PURPLE_SECONDARY)
                for text in legend.get_texts():
                    text.set_color(PURPLE_LIGHT)
                
                # Add overall style
                add_style_to_plot(fig, ax, f'Precision-Recall Curve (AP = {ap_score:.2f})', 
                                 'Recall', 'Precision')
                
                pr_img = fig_to_base64(fig)
                plt.close(fig)
                
                # AI Explanation for Precision-Recall
                explanation_prompt = f"""
                Analyze this Precision-Recall curve for {user_prompt}:
                - Average Precision: {ap_score:.2f}
                Explain what these metrics mean in the context of {user_prompt}.
                What does this tell us about the model's performance?
                All in 10 lines paragraph.
                """
                explanation = get_gemini_explanation(f"AP: {ap_score}", explanation_prompt)
                
                visualizations.append({
                    'title': 'Precision-Recall Curve',
                    'image': pr_img,
                    'explanation': explanation
                })
        
        # Enhanced Feature Importance visualization
        if hasattr(best_model, 'feature_importances_'):
            importances = best_model.feature_importances_
            indices = np.argsort(importances)[::-1]
            
            fig, ax = plt.subplots(figsize=(12, 8))
            
            # Set gradient background
            ax.set_facecolor(PURPLE_BG)
            
            # Create the bar chart with gradient bars
            bars = ax.barh(range(len(indices)), importances[indices], align='center',
                         color=PURPLE_ACCENT, alpha=0.8)
            
            # Add gradient effect to bars
            for bar in bars:
                bar.set_alpha(0.8)
                # Add a subtle glow effect
                bar.set_path_effects([
                    path_effects.Stroke(linewidth=3, foreground=PURPLE_ACCENT, alpha=0.3),
                    path_effects.Normal()
                ])
            
            # Add feature names
            valid_indices = [i for i in indices if i < len(feature_names)]
            ax.set_yticks(range(len(valid_indices)))
            ax.set_yticklabels([feature_names[i] for i in valid_indices])

            
            # Add importance values at the end of each bar
            for i, v in enumerate(importances[indices]):
                ax.text(v + 0.01, i, f"{v:.3f}", 
                       color=PURPLE_LIGHT, va='center', fontsize=12)
            
            # Add decorative elements
            for i, v in enumerate(importances[indices[:len(valid_indices)]]):
             ax.text(v + 0.01, i, f"{v:.3f}", 
               color=PURPLE_LIGHT, va='center', fontsize=12)
            
            # Add overall style
            add_style_to_plot(fig, ax, 'Feature Importance', 'Relative Importance', '')
            
            # Add explanatory annotation
            ax.text(0.5, -0.1, 
                   "Higher values indicate more important features for model predictions",
                   transform=ax.transAxes, ha='center', fontsize=11, 
                   color=PURPLE_LIGHT, alpha=0.8,
                   bbox=dict(boxstyle='round,pad=0.5', facecolor=PURPLE_DARK, 
                            alpha=0.6, edgecolor=PURPLE_SECONDARY))
            
            feature_importance_img = fig_to_base64(fig)
            plt.close(fig)
            
            # AI Explanation for feature importance
            top_features = [feature_names[i] for i in indices[:3]]
            explanation_prompt = f"""
            Analyze the feature importance for {user_prompt}:
            Top 3 most important features are: {', '.join(top_features)}
            Explain why these features might be important for {user_prompt} and how they influence the predictions.
            Provide a comprehensive explanation in 10-12 lines.
            """
            explanation = get_gemini_explanation(str(dict(zip(feature_names, importances))), explanation_prompt)
            
            visualizations.append({
                'title': 'Feature Importance',
                'image': feature_importance_img,
                'explanation': explanation
            })
        else:
            # Try permutation importance with enhanced styling if feature_importances_ is not available
            try:
                result = permutation_importance(best_model, X_test, y_test, n_repeats=30, random_state=0)
                sorted_idx = result.importances_mean.argsort()[::-1]
                
                fig, ax = plt.subplots(figsize=(12, 8))
                
                # Set gradient background
                ax.set_facecolor(PURPLE_BG)
                
                # Create bar chart with custom styling
                bars = ax.barh(range(len(sorted_idx)), result.importances_mean[sorted_idx], 
                             align='center', color=PURPLE_ACCENT, alpha=0.8)
                
                # Add error bars
                ax.errorbar(result.importances_mean[sorted_idx], range(len(sorted_idx)),
                           xerr=result.importances_std[sorted_idx], fmt='o',
                           color=PURPLE_LIGHT, alpha=0.7, capsize=5)
                
                # Add visual effects to bars
                for bar in bars:
                    bar.set_alpha(0.8)
                    # Add glow effect
                    bar.set_path_effects([
                        path_effects.Stroke(linewidth=3, foreground=PURPLE_ACCENT, alpha=0.3),
                        path_effects.Normal()
                    ])
                
                # Add feature names
                ax.set_yticks(range(len(sorted_idx)))
                ax.set_yticklabels([feature_names[i] for i in sorted_idx])
                
                # Add importance values at the end of each bar
                for i, v in enumerate(result.importances_mean[sorted_idx]):
                    ax.text(v + 0.01, i, f"{v:.3f}", 
                           color=PURPLE_LIGHT, va='center', fontsize=12)
                
                # Highlight top features
                for i in range(len(sorted_idx)):
                    if i < 3:  # Highlight top 3 features
                        ax.get_yticklabels()[i].set_color(PURPLE_ACCENT)
                        ax.get_yticklabels()[i].set_fontweight('bold')
                
                # Add overall style
                add_style_to_plot(fig, ax, 'Feature Importance (Permutation)', 
                                 'Relative Importance', '')
                
                # Add explanatory annotation
                ax.text(0.5, -0.1, 
                       "Features ranked by their impact on model performance when shuffled",
                       transform=ax.transAxes, ha='center', fontsize=11, 
                       color=PURPLE_LIGHT, alpha=0.8,
                       bbox=dict(boxstyle='round,pad=0.5', facecolor=PURPLE_DARK, 
                                alpha=0.6, edgecolor=PURPLE_SECONDARY))
                
                feature_importance_img = fig_to_base64(fig)
                plt.close(fig)
                
                # AI Explanation for permutation importance
                top_features = [feature_names[i] for i in sorted_idx[:3]]
                explanation_prompt = f"""
                Analyze the permutation feature importance for {user_prompt}:
                Top 3 most important features are: {', '.join(top_features)}
                Explain why these features might be important for {user_prompt} and how they influence the predictions.
                Provide a comprehensive explanation in 10-12 lines.
                """
                explanation = get_gemini_explanation(str(dict(zip(feature_names, result.importances_mean))), explanation_prompt)
                
                visualizations.append({
                    'title': 'Feature Importance (Permutation)',
                    'image': feature_importance_img,
                    'explanation': explanation
                })
            except Exception as e:
                # Skip if permutation importance fails
                print(f"Error calculating permutation importance: {e}")
    
    # Regression Task Visualization with enhanced styling
    elif task_type == 'regression':
        # Actual vs Predicted with modern styling
        fig, ax = plt.subplots(figsize=(10, 8))
        
        # Create gradient background
        ax.set_facecolor(PURPLE_BG)
        
        # Scatter plot with glowing points
        scatter = ax.scatter(y_test, y_pred, alpha=0.7, s=50, 
                           c=np.abs(y_test-y_pred), cmap=purple_cmap)
        
        # Add glow effect to points - FIXED using scatter instead of individual paths
        scatter.set_path_effects([
            path_effects.Stroke(linewidth=3, foreground=PURPLE_ACCENT, alpha=0.3),
            path_effects.Normal()
        ])
        
        # Add diagonal reference line
        perfect_line = ax.plot([y_test.min(), y_test.max()], [y_test.min(), y_test.max()], 
                             '--', color=PURPLE_SECONDARY, lw=2, alpha=0.7,
                             label='Perfect Predictions')
        
        # Add a colorbar for error magnitude
        cb = plt.colorbar(scatter, ax=ax, pad=0.02)
        cb.set_label('Absolute Error', color=PURPLE_LIGHT)
        cb.ax.yaxis.set_tick_params(color=PURPLE_LIGHT)
        cb.outline.set_edgecolor(PURPLE_SECONDARY)
        plt.setp(plt.getp(cb.ax, 'yticklabels'), color=PURPLE_LIGHT)
        
        # Calculate and display statistics
        mse = mean_squared_error(y_test, y_pred)
        r2 = r2_score(y_test, y_pred)
        
        # Add stats box
        stats_text = f'$R^2$: {r2:.3f}\nMSE: {mse:.3f}'
        ax.text(0.05, 0.95, stats_text, transform=ax.transAxes,
               fontsize=14, va='top', ha='left',
               bbox=dict(boxstyle='round,pad=0.5', facecolor=PURPLE_DARK, 
                        alpha=0.7, edgecolor=PURPLE_ACCENT),
               color=PURPLE_LIGHT)
        
        # Style legend
        legend = ax.legend(loc="lower right", frameon=True, facecolor=PURPLE_DARK, edgecolor=PURPLE_SECONDARY)
        for text in legend.get_texts():
            text.set_color(PURPLE_LIGHT)
        
        # Add overall style
        add_style_to_plot(fig, ax, 'Actual vs Predicted Values', 'Actual', 'Predicted')
        
        actual_vs_pred_img = fig_to_base64(fig)
        plt.close(fig)
        
        # AI Explanation for Actual vs Predicted
        explanation_prompt = f"""
        Analyze this Actual vs Predicted plot for {user_prompt}:
        - R² Score: {r2:.2f}
        - Mean Squared Error: {mse:.2f}
        Explain what these results mean in the context of {user_prompt}.
        How well is the model performing?
        All in 10-12 lines.
        """
        explanation = get_gemini_explanation(f"R2: {r2}, MSE: {mse}", explanation_prompt)
        
        visualizations.append({
            'title': 'Actual vs Predicted Values',
            'image': actual_vs_pred_img,
            'explanation': explanation
        })
        
        # Enhanced Residual Plot
        residuals = y_test - y_pred
        fig, ax = plt.subplots(figsize=(10, 8))
        
        # Create gradient background
        ax.set_facecolor(PURPLE_BG)
        
        # Create scatter plot with color gradient based on prediction value
        scatter = ax.scatter(y_pred, residuals, alpha=0.7, s=50,
                           c=y_pred, cmap=purple_cmap)
        
        # Add glow effect to points - FIXED using scatter instead of individual paths
        scatter.set_path_effects([
            path_effects.Stroke(linewidth=3, foreground=PURPLE_ACCENT, alpha=0.3),
            path_effects.Normal()
        ])
        
        # Add reference line at y=0
        ax.axhline(y=0, color=PURPLE_SECONDARY, linestyle='--', alpha=0.7, lw=2)
        
        # Add a colorbar
        cb = plt.colorbar(scatter, ax=ax, pad=0.02)
        cb.set_label('Predicted Value', color=PURPLE_LIGHT)
        cb.ax.yaxis.set_tick_params(color=PURPLE_LIGHT)
        cb.outline.set_edgecolor(PURPLE_SECONDARY)
        plt.setp(plt.getp(cb.ax, 'yticklabels'), color=PURPLE_LIGHT)
        
        # Add stats box
        stats_text = f'Mean Residual: {np.mean(residuals):.3f}\nStd Residual: {np.std(residuals):.3f}'
        ax.text(0.05, 0.95, stats_text, transform=ax.transAxes,
               fontsize=14, va='top', ha='left',
               bbox=dict(boxstyle='round,pad=0.5', facecolor=PURPLE_DARK, 
                        alpha=0.7, edgecolor=PURPLE_ACCENT),
               color=PURPLE_LIGHT)
        
        # Add trend line for residuals
        try:
            from scipy.stats import linregress
            slope, intercept, r_value, p_value, std_err = linregress(y_pred, residuals)
            x_line = np.array([min(y_pred), max(y_pred)])
            y_line = intercept + slope * x_line
            ax.plot(x_line, y_line, color=PURPLE_ACCENT, alpha=0.5, 
                   linestyle='-', linewidth=2, 
                   label=f'Trend (slope: {slope:.4f})')
            
            # Style legend
            legend = ax.legend(loc="upper right", frameon=True, facecolor=PURPLE_DARK, edgecolor=PURPLE_SECONDARY)
            for text in legend.get_texts():
                text.set_color(PURPLE_LIGHT)
        except:
            pass
        
        # Add overall style
        add_style_to_plot(fig, ax, 'Residual Plot', 'Predicted', 'Residuals')
        
        residual_img = fig_to_base64(fig)
        plt.close(fig)
        
        # AI Explanation for Residuals
        explanation_prompt = f"""
        Analyze this Residual plot for {user_prompt}:
        - Mean Residual: {np.mean(residuals):.2f}
        - Std Residual: {np.std(residuals):.2f}
        Explain what these residuals tell us about the model's predictions for {user_prompt}.
        Are there any patterns or concerns?
        All in 10-12 lines.
        """
        explanation = get_gemini_explanation(f"Residuals stats: {{'mean': {np.mean(residuals)}, 'std': {np.std(residuals)}}}", explanation_prompt)
        
        visualizations.append({
            'title': 'Residual Plot',
            'image': residual_img,
            'explanation': explanation
        })
        
        # Enhanced Q-Q Plot
        fig, ax = plt.subplots(figsize=(10, 8))
        
        # Create gradient background
        ax.set_facecolor(PURPLE_BG)
        
        # Create Q-Q plot
        (osm, osr), (slope, intercept, r) = stats.probplot(residuals, dist="norm", plot=ax, fit=True)
        
        # Style the points
        ax.get_lines()[0].set_markerfacecolor(PURPLE_ACCENT)
        ax.get_lines()[0].set_markeredgecolor(PURPLE_SECONDARY)
        ax.get_lines()[0].set_markersize(10)
        ax.get_lines()[0].set_alpha(0.7)
        
        # Style the reference line
        ax.get_lines()[1].set_color(PURPLE_SECONDARY)
        ax.get_lines()[1].set_linestyle('--')
        ax.get_lines()[1].set_linewidth(2)
        ax.get_lines()[1].set_alpha(0.7)
        
        # Add glow effect to points
        ax.get_lines()[0].set_path_effects([
            path_effects.Stroke(linewidth=3, foreground=PURPLE_ACCENT, alpha=0.3),
            path_effects.Normal()
        ])
        
        # Add overall style
        add_style_to_plot(fig, ax, 'Q-Q Plot (Residuals)', 'Theoretical Quantiles', 'Ordered Values')
        
        # Add annotation explaining the plot
        ax.text(0.05, 0.95, 
               "Points along the line suggest\nnormally distributed residuals",
               transform=ax.transAxes, fontsize=14, va='top', ha='left',
               bbox=dict(boxstyle='round,pad=0.5', facecolor=PURPLE_DARK, 
                        alpha=0.7, edgecolor=PURPLE_ACCENT),
               color=PURPLE_LIGHT)
        
        qq_img = fig_to_base64(fig)
        plt.close(fig)
        
        # AI Explanation for Q-Q Plot
        explanation_prompt = f"""
        Analyze this Q-Q plot for {user_prompt}:
        Explain what this plot tells us about the normality of residuals and its implications for {user_prompt}.
        All in 10-12 lines.
        """
        explanation = get_gemini_explanation("Q-Q Plot Analysis", explanation_prompt)
        
        visualizations.append({
            'title': 'Q-Q Plot',
            'image': qq_img,
            'explanation': explanation
        })
        
        # Enhanced Error Distribution
        fig, ax = plt.subplots(figsize=(10, 8))
        
        # Create gradient background
        ax.set_facecolor(PURPLE_BG)
        
        # Create histogram with custom styling
        n, bins, patches = ax.hist(residuals, bins=30, alpha=0.7, color=PURPLE_ACCENT, 
                                 edgecolor=PURPLE_SECONDARY, linewidth=1)
        
        # Add gradient color to bars based on bin position
        bin_centers = 0.5 * (bins[:-1] + bins[1:])
        cm = plt.cm.get_cmap(purple_cmap)
        for c, p in zip(bin_centers, patches):
            plt.setp(p, 'facecolor', cm(0.5 + c/np.max(np.abs(bin_centers))))
            
            # Add glow effect
            p.set_path_effects([
                path_effects.Stroke(linewidth=2, foreground=PURPLE_ACCENT, alpha=0.3),
                path_effects.Normal()
            ])
        
        # Add vertical line at x=0
        ax.axvline(x=0, color=PURPLE_SECONDARY, linestyle='--', linewidth=2, alpha=0.7)
        
        # Add a fitted normal distribution curve
        from scipy import stats as st
        
        mu, sigma = st.norm.fit(residuals)
        x = np.linspace(min(residuals), max(residuals), 100)
        y = st.norm.pdf(x, mu, sigma) * len(residuals) * (bins[1] - bins[0])
        
        line = ax.plot(x, y, '-', color=PURPLE_LIGHT, linewidth=2, 
                     label=f'Normal Fit\n(μ={mu:.2f}, σ={sigma:.2f})')
        
        # Add glow effect to the line
        line[0].set_path_effects([
            path_effects.Stroke(linewidth=4, foreground=PURPLE_LIGHT, alpha=0.3),
            path_effects.Normal()
        ])
        
        # Style legend
        legend = ax.legend(loc="upper right", frameon=True, facecolor=PURPLE_DARK, edgecolor=PURPLE_SECONDARY)
        for text in legend.get_texts():
            text.set_color(PURPLE_LIGHT)
        
        # Add overall style
        add_style_to_plot(fig, ax, 'Error Distribution', 'Prediction Error', 'Frequency')
        
        # Add stats annotation
        stats_text = f'Mean: {np.mean(residuals):.3f}\nStd Dev: {np.std(residuals):.3f}'
        ax.text(0.05, 0.95, stats_text, transform=ax.transAxes,
               fontsize=14, va='top', ha='left',
               bbox=dict(boxstyle='round,pad=0.5', facecolor=PURPLE_DARK, 
                        alpha=0.7, edgecolor=PURPLE_ACCENT),
               color=PURPLE_LIGHT)
        
        error_dist_img = fig_to_base64(fig)
        plt.close(fig)
        
        # AI Explanation for Error Distribution
        explanation_prompt = f"""
        Analyze this Error Distribution for {user_prompt}:
        - Mean Error: {np.mean(residuals):.2f}
        - Std Error: {np.std(residuals):.2f}
        Explain what these stats imply about the predictions in the context of {user_prompt}.
        All in 10-12 lines.
        """
        explanation = get_gemini_explanation(f"Error Distribution stats: {{'mean': {np.mean(residuals)}, 'std': {np.std(residuals)}}}", explanation_prompt)
        
        visualizations.append({
            'title': 'Error Distribution',
            'image': error_dist_img,
            'explanation': explanation
        })
        
        # Feature Importance (if applicable) with enhanced styling
        if hasattr(best_model, 'feature_importances_'):
            importances = best_model.feature_importances_
            indices = np.argsort(importances)[::-1]
            
            fig, ax = plt.subplots(figsize=(12, 8))
            
            # Set gradient background
            ax.set_facecolor(PURPLE_BG)
            
            # Create bar chart with custom styling
            cmap = plt.cm.get_cmap(purple_cmap)
            colors = [cmap(i/len(importances)) for i in range(len(importances))]
            
            bars = ax.barh(range(len(indices)), importances[indices], align='center',
                         color=[colors[i] for i in range(len(indices))])
            
            # Add visual effects to bars
            for bar in bars:
                # Add glow effect
                bar.set_path_effects([
                    path_effects.Stroke(linewidth=3, foreground=PURPLE_ACCENT, alpha=0.3),
                    path_effects.Normal()
                ])
            
            # Add feature names
            valid_indices = [i for i in indices if i < len(feature_names)]
            ax.set_yticks(range(len(valid_indices)))
            ax.set_yticklabels([feature_names[i] for i in valid_indices])
            
            # Add importance values at the end of each bar
            for i, v in enumerate(importances[indices[:len(valid_indices)]]):
                ax.text(v + 0.01, i, f"{v:.3f}", 
                       color=PURPLE_LIGHT, va='center', fontsize=12)
            
            # Highlight top features
            for i in range(min(3, len(valid_indices))):  # Highlight top 3 features
                ax.get_yticklabels()[i].set_color(PURPLE_ACCENT)
                ax.get_yticklabels()[i].set_fontweight('bold')
                
            # Add overall style
            add_style_to_plot(fig, ax, 'Feature Importance', 'Relative Importance', '')
            
            # Add explanatory annotation
            ax.text(0.5, -0.1, 
                   "Higher values indicate more important features for model predictions",
                   transform=ax.transAxes, ha='center', fontsize=11, 
                   color=PURPLE_LIGHT, alpha=0.8,
                   bbox=dict(boxstyle='round,pad=0.5', facecolor=PURPLE_DARK, 
                            alpha=0.6, edgecolor=PURPLE_SECONDARY))
            
            feature_importance_img = fig_to_base64(fig)
            plt.close(fig)
            
            # AI Explanation for feature importance
            top_features = [feature_names[i] for i in indices[:3] if i < len(feature_names)]
            explanation_prompt = f"""
            Analyze the feature importance for {user_prompt}:
            Top 3 most important features are: {', '.join(top_features)}
            Explain why these features might be important for {user_prompt} and how they influence the predictions.
            Provide a comprehensive explanation in 10-12 lines.
            """
            explanation = get_gemini_explanation(str(dict(zip(feature_names, importances))), explanation_prompt)
            
            visualizations.append({
                'title': 'Feature Importance',
                'image': feature_importance_img,
                'explanation': explanation
            })
        else:
            # Try permutation importance with enhanced styling if feature_importances_ is not available
            try:
                result = permutation_importance(best_model, X_test, y_test, n_repeats=30, random_state=0)
                sorted_idx = result.importances_mean.argsort()[::-1]
                
                fig, ax = plt.subplots(figsize=(12, 8))
                
                # Set gradient background
                ax.set_facecolor(PURPLE_BG)
                
                # Create bar chart with gradient colors
                cmap = plt.cm.get_cmap(purple_cmap)
                colors = [cmap(i/len(sorted_idx)) for i in range(len(sorted_idx))]
                
                bars = ax.barh(range(len(sorted_idx)), result.importances_mean[sorted_idx], 
                             align='center', color=[colors[i] for i in range(len(sorted_idx))])
                
                # Add error bars
                ax.errorbar(result.importances_mean[sorted_idx], range(len(sorted_idx)),
                           xerr=result.importances_std[sorted_idx], fmt='o',
                           color=PURPLE_LIGHT, alpha=0.7, capsize=5)
                
                # Add glow effect to bars
                for bar in bars:
                    bar.set_path_effects([
                        path_effects.Stroke(linewidth=3, foreground=PURPLE_ACCENT, alpha=0.3),
                        path_effects.Normal()
                    ])
                
                # Add feature names
                ax.set_yticks(range(len(sorted_idx)))
                ax.set_yticklabels([feature_names[i] for i in sorted_idx])
                
                # Add importance values
                for i, v in enumerate(result.importances_mean[sorted_idx]):
                    ax.text(v + 0.01, i, f"{v:.3f}", 
                           color=PURPLE_LIGHT, va='center', fontsize=12)
                
                # Highlight top features
                for i in range(min(3, len(sorted_idx))):  # Highlight top 3 features
                    ax.get_yticklabels()[i].set_color(PURPLE_ACCENT)
                    ax.get_yticklabels()[i].set_fontweight('bold')
                    
                # Add overall style
                add_style_to_plot(fig, ax, 'Feature Importance (Permutation)', 
                                 'Relative Importance', '')
                
                # Add explanatory annotation
                ax.text(0.5, -0.1, 
                       "Features ranked by their impact on model performance when shuffled",
                       transform=ax.transAxes, ha='center', fontsize=11, 
                       color=PURPLE_LIGHT, alpha=0.8,
                       bbox=dict(boxstyle='round,pad=0.5', facecolor=PURPLE_DARK, 
                                alpha=0.6, edgecolor=PURPLE_SECONDARY))
                
                feature_importance_img = fig_to_base64(fig)
                plt.close(fig)
                
                # AI Explanation for permutation importance
                top_features = [feature_names[i] for i in sorted_idx[:3]]
                explanation_prompt = f"""
                Analyze the permutation feature importance for {user_prompt}:
                Top 3 most important features are: {', '.join(top_features)}
                Explain why these features might be important for {user_prompt} and how they influence the predictions.
                Provide a comprehensive explanation in 10-12 lines.
                """
                explanation = get_gemini_explanation(str(dict(zip(feature_names, result.importances_mean))), explanation_prompt)
                
                visualizations.append({
                    'title': 'Feature Importance (Permutation)',
                    'image': feature_importance_img,
                    'explanation': explanation
                })
            except Exception as e:
                # Skip if permutation importance fails
                print(f"Error calculating permutation importance: {e}")
    
    return visualizations

def fig_to_base64(fig):
    """Convert matplotlib figure to base64 encoded string"""
    buf = BytesIO()
    fig.savefig(buf, format='png', bbox_inches='tight')
    buf.seek(0)
    img_str = base64.b64encode(buf.read()).decode('utf-8')
    buf.close()
    return img_str