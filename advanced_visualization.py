import matplotlib.pyplot as plt
import seaborn as sns
import pandas as pd
import numpy as np
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
import plotly.figure_factory as ff
from sklearn.metrics import confusion_matrix, classification_report, roc_curve, auc, precision_recall_curve
from sklearn.model_selection import learning_curve, validation_curve
from sklearn.inspection import permutation_importance
import warnings
warnings.filterwarnings('ignore')

# Set style
plt.style.use('seaborn-v0_8')
sns.set_palette("husl")

class AdvancedVisualizer:
    def __init__(self):
        self.colors = {
            'primary': '#4f46e5',
            'secondary': '#7c3aed', 
            'success': '#10b981',
            'warning': '#f59e0b',
            'error': '#ef4444',
            'background': '#f8fafc'
        }
    
    def create_comprehensive_analysis(self, df, model, X_train, X_test, y_train, y_test, y_pred, feature_names, task_type):
        """Create comprehensive data analysis with multiple visualizations"""
        visualizations = {}
        
        try:
            # 1. Data Overview
            visualizations['data_overview'] = self._create_data_overview(df)
            
            # 2. Feature Analysis
            visualizations['feature_analysis'] = self._create_feature_analysis(df, feature_names)
            
            # 3. Correlation Analysis
            if len(df.select_dtypes(include=[np.number]).columns) > 1:
                visualizations['correlation_matrix'] = self._create_correlation_matrix(df)
            
            # 4. Distribution Analysis
            visualizations['distribution_analysis'] = self._create_distribution_analysis(df)
            
            # 5. Model Performance
            if task_type == 'classification':
                visualizations.update(self._create_classification_analysis(y_test, y_pred, model, X_test))
            else:
                visualizations.update(self._create_regression_analysis(y_test, y_pred))
            
            # 6. Feature Importance
            visualizations['feature_importance'] = self._create_feature_importance(model, X_test, y_test, feature_names)
            
            # 7. Learning Curves
            visualizations['learning_curves'] = self._create_learning_curves(model, X_train, y_train)
            
        except Exception as e:
            print(f"Error in comprehensive analysis: {e}")
        
        return visualizations
    
    def _create_data_overview(self, df):
        """Create data overview visualization"""
        try:
            fig, axes = plt.subplots(2, 2, figsize=(15, 10))
            fig.suptitle('Dataset Overview', fontsize=16, fontweight='bold')
            
            # Dataset info
            axes[0, 0].axis('off')
            info_text = f"""Dataset Information:
            • Shape: {df.shape[0]} rows × {df.shape[1]} columns
            • Memory Usage: {df.memory_usage(deep=True).sum() / 1024**2:.2f} MB
            • Numeric Columns: {len(df.select_dtypes(include=[np.number]).columns)}
            • Categorical Columns: {len(df.select_dtypes(include=['object']).columns)}
            • Missing Values: {df.isnull().sum().sum()}
            """
            axes[0, 0].text(0.1, 0.5, info_text, fontsize=12, verticalalignment='center')
            axes[0, 0].set_title('Dataset Statistics')
            
            # Missing values heatmap
            if df.isnull().sum().sum() > 0:
                sns.heatmap(df.isnull(), cbar=True, ax=axes[0, 1], cmap='viridis')
                axes[0, 1].set_title('Missing Values Pattern')
            else:
                axes[0, 1].text(0.5, 0.5, 'No Missing Values', ha='center', va='center', fontsize=14)
                axes[0, 1].set_title('Missing Values Pattern')
            
            # Data types distribution
            dtype_counts = df.dtypes.value_counts()
            axes[1, 0].pie(dtype_counts.values, labels=dtype_counts.index, autopct='%1.1f%%', 
                          colors=sns.color_palette("husl", len(dtype_counts)))
            axes[1, 0].set_title('Data Types Distribution')
            
            # Numeric columns summary
            numeric_df = df.select_dtypes(include=[np.number])
            if len(numeric_df.columns) > 0:
                summary_stats = numeric_df.describe()
                im = axes[1, 1].imshow(summary_stats.values, cmap='RdYlBu', aspect='auto')
                axes[1, 1].set_xticks(range(len(summary_stats.columns)))
                axes[1, 1].set_xticklabels(summary_stats.columns, rotation=45, ha='right')
                axes[1, 1].set_yticks(range(len(summary_stats.index)))
                axes[1, 1].set_yticklabels(summary_stats.index)
                axes[1, 1].set_title('Numeric Columns Summary')
                plt.colorbar(im, ax=axes[1, 1])
            
            plt.tight_layout()
            return self._fig_to_base64(fig)
        
        except Exception as e:
            print(f"Error creating data overview: {e}")
            return None
    
    def _create_feature_analysis(self, df, feature_names):
        """Create feature analysis visualization"""
        try:
            numeric_cols = df.select_dtypes(include=[np.number]).columns[:6]  # Limit to 6 for readability
            
            if len(numeric_cols) == 0:
                return None
            
            n_cols = min(3, len(numeric_cols))
            n_rows = (len(numeric_cols) + n_cols - 1) // n_cols
            
            fig, axes = plt.subplots(n_rows, n_cols, figsize=(5 * n_cols, 4 * n_rows))
            fig.suptitle('Feature Analysis - Box Plots', fontsize=16, fontweight='bold')
            
            if n_rows == 1:
                axes = [axes] if n_cols == 1 else axes
            
            for i, col in enumerate(numeric_cols):
                row = i // n_cols
                col_idx = i % n_cols
                
                if n_rows == 1:
                    ax = axes[col_idx] if n_cols > 1 else axes
                else:
                    ax = axes[row, col_idx]
                
                sns.boxplot(data=df, y=col, ax=ax, color=self.colors['primary'])
                ax.set_title(f'{col}', fontweight='bold')
                ax.grid(True, alpha=0.3)
            
            # Remove empty subplots
            for i in range(len(numeric_cols), n_rows * n_cols):
                row = i // n_cols
                col_idx = i % n_cols
                if n_rows == 1:
                    if n_cols > 1:
                        fig.delaxes(axes[col_idx])
                else:
                    fig.delaxes(axes[row, col_idx])
            
            plt.tight_layout()
            return self._fig_to_base64(fig)
        
        except Exception as e:
            print(f"Error creating feature analysis: {e}")
            return None
    
    def _create_correlation_matrix(self, df):
        """Create correlation matrix visualization"""
        try:
            numeric_df = df.select_dtypes(include=[np.number])
            corr = numeric_df.corr()
            
            fig, ax = plt.subplots(figsize=(12, 10))
            
            # Create mask for upper triangle
            mask = np.triu(np.ones_like(corr, dtype=bool))
            
            # Generate heatmap
            sns.heatmap(corr, mask=mask, annot=True, cmap='RdBu_r', center=0,
                       square=True, linewidths=0.5, cbar_kws={"shrink": .8}, ax=ax)
            
            ax.set_title('Feature Correlation Matrix', fontsize=16, fontweight='bold', pad=20)
            plt.tight_layout()
            return self._fig_to_base64(fig)
        
        except Exception as e:
            print(f"Error creating correlation matrix: {e}")
            return None
    
    def _create_distribution_analysis(self, df):
        """Create distribution analysis for key features"""
        try:
            numeric_cols = df.select_dtypes(include=[np.number]).columns[:4]  # Limit to 4
            
            if len(numeric_cols) == 0:
                return None
            
            fig, axes = plt.subplots(2, 2, figsize=(15, 10))
            fig.suptitle('Feature Distributions', fontsize=16, fontweight='bold')
            
            axes = axes.flatten()
            
            for i, col in enumerate(numeric_cols):
                if i >= 4:
                    break
                    
                ax = axes[i]
                
                # Create histogram with KDE
                sns.histplot(data=df, x=col, kde=True, ax=ax, 
                           color=self.colors['primary'], alpha=0.7)
                ax.set_title(f'{col} Distribution', fontweight='bold')
                ax.grid(True, alpha=0.3)
            
            # Remove unused subplots
            for i in range(len(numeric_cols), 4):
                fig.delaxes(axes[i])
            
            plt.tight_layout()
            return self._fig_to_base64(fig)
        
        except Exception as e:
            print(f"Error creating distribution analysis: {e}")
            return None
    
    def _create_classification_analysis(self, y_test, y_pred, model, X_test):
        """Create classification-specific analysis"""
        visualizations = {}
        
        try:
            # Confusion Matrix
            cm = confusion_matrix(y_test, y_pred)
            fig, ax = plt.subplots(figsize=(8, 6))
            sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', ax=ax)
            ax.set_title('Confusion Matrix', fontsize=14, fontweight='bold')
            ax.set_xlabel('Predicted')
            ax.set_ylabel('Actual')
            plt.tight_layout()
            visualizations['confusion_matrix'] = self._fig_to_base64(fig)
            
            # Classification Report Heatmap
            try:
                report = classification_report(y_test, y_pred, output_dict=True)
                report_df = pd.DataFrame(report).iloc[:-1, :].T  # Remove support row and transpose
                
                fig, ax = plt.subplots(figsize=(10, 6))
                sns.heatmap(report_df.iloc[:, :-1], annot=True, cmap='RdYlBu_r', ax=ax)
                ax.set_title('Classification Report', fontsize=14, fontweight='bold')
                plt.tight_layout()
                visualizations['classification_report'] = self._fig_to_base64(fig)
            except:
                pass
            
            # ROC Curve (for binary classification)
            if len(np.unique(y_test)) == 2:
                try:
                    if hasattr(model, 'predict_proba'):
                        y_prob = model.predict_proba(X_test)[:, 1]
                        fpr, tpr, _ = roc_curve(y_test, y_prob)
                        roc_auc = auc(fpr, tpr)
                        
                        fig, ax = plt.subplots(figsize=(8, 6))
                        ax.plot(fpr, tpr, color=self.colors['primary'], 
                               label=f'ROC Curve (AUC = {roc_auc:.2f})')
                        ax.plot([0, 1], [0, 1], 'k--', label='Random')
                        ax.set_xlabel('False Positive Rate')
                        ax.set_ylabel('True Positive Rate')
                        ax.set_title('ROC Curve', fontsize=14, fontweight='bold')
                        ax.legend()
                        ax.grid(True, alpha=0.3)
                        plt.tight_layout()
                        visualizations['roc_curve'] = self._fig_to_base64(fig)
                except:
                    pass
        
        except Exception as e:
            print(f"Error creating classification analysis: {e}")
        
        return visualizations
    
    def _create_regression_analysis(self, y_test, y_pred):
        """Create regression-specific analysis"""
        visualizations = {}
        
        try:
            fig, axes = plt.subplots(2, 2, figsize=(15, 10))
            fig.suptitle('Regression Analysis', fontsize=16, fontweight='bold')
            
            # Actual vs Predicted
            axes[0, 0].scatter(y_test, y_pred, alpha=0.6, color=self.colors['primary'])
            axes[0, 0].plot([y_test.min(), y_test.max()], [y_test.min(), y_test.max()], 
                           'r--', lw=2, label='Perfect Prediction')
            axes[0, 0].set_xlabel('Actual Values')
            axes[0, 0].set_ylabel('Predicted Values')
            axes[0, 0].set_title('Actual vs Predicted')
            axes[0, 0].legend()
            axes[0, 0].grid(True, alpha=0.3)
            
            # Residuals
            residuals = y_test - y_pred
            axes[0, 1].scatter(y_pred, residuals, alpha=0.6, color=self.colors['secondary'])
            axes[0, 1].axhline(y=0, color='red', linestyle='--')
            axes[0, 1].set_xlabel('Predicted Values')
            axes[0, 1].set_ylabel('Residuals')
            axes[0, 1].set_title('Residuals Plot')
            axes[0, 1].grid(True, alpha=0.3)
            
            # Residuals histogram
            axes[1, 0].hist(residuals, bins=30, alpha=0.7, color=self.colors['success'])
            axes[1, 0].set_xlabel('Residuals')
            axes[1, 0].set_ylabel('Frequency')
            axes[1, 0].set_title('Residuals Distribution')
            axes[1, 0].grid(True, alpha=0.3)
            
            # Q-Q plot for residuals
            from scipy import stats
            stats.probplot(residuals, dist="norm", plot=axes[1, 1])
            axes[1, 1].set_title('Q-Q Plot of Residuals')
            axes[1, 1].grid(True, alpha=0.3)
            
            plt.tight_layout()
            visualizations['regression_analysis'] = self._fig_to_base64(fig)
        
        except Exception as e:
            print(f"Error creating regression analysis: {e}")
        
        return visualizations
    
    def _create_feature_importance(self, model, X_test, y_test, feature_names):
        """Create feature importance visualization"""
        try:
            # Try different methods to get feature importance
            importance_scores = None
            method_used = ""
            
            if hasattr(model, 'feature_importances_'):
                importance_scores = model.feature_importances_
                method_used = "Model Feature Importance"
            elif hasattr(model, 'coef_'):
                importance_scores = np.abs(model.coef_).flatten()
                method_used = "Coefficient Magnitude"
            else:
                # Use permutation importance as fallback
                try:
                    perm_importance = permutation_importance(model, X_test, y_test, n_repeats=5, random_state=42)
                    importance_scores = perm_importance.importances_mean
                    method_used = "Permutation Importance"
                except:
                    return None
            
            if importance_scores is not None:
                feature_importance_df = pd.DataFrame({
                    'feature': feature_names[:len(importance_scores)],
                    'importance': importance_scores
                }).sort_values('importance', ascending=True)
                
                fig, ax = plt.subplots(figsize=(10, max(6, len(feature_names) * 0.4)))
                bars = ax.barh(feature_importance_df['feature'], feature_importance_df['importance'], 
                              color=self.colors['primary'])
                ax.set_xlabel('Importance Score')
                ax.set_title(f'Feature Importance ({method_used})', fontsize=14, fontweight='bold')
                ax.grid(True, alpha=0.3, axis='x')
                
                # Add value labels on bars
                for bar in bars:
                    width = bar.get_width()
                    ax.text(width, bar.get_y() + bar.get_height()/2, 
                           f'{width:.3f}', ha='left', va='center')
                
                plt.tight_layout()
                return self._fig_to_base64(fig)
        
        except Exception as e:
            print(f"Error creating feature importance: {e}")
        
        return None
    
    def _create_learning_curves(self, model, X_train, y_train):
        """Create learning curves visualization"""
        try:
            train_sizes, train_scores, val_scores = learning_curve(
                model, X_train, y_train, cv=5, 
                train_sizes=np.linspace(0.1, 1.0, 10),
                scoring='accuracy' if hasattr(model, 'predict_proba') else 'neg_mean_squared_error'
            )
            
            train_mean = np.mean(train_scores, axis=1)
            train_std = np.std(train_scores, axis=1)
            val_mean = np.mean(val_scores, axis=1)
            val_std = np.std(val_scores, axis=1)
            
            fig, ax = plt.subplots(figsize=(10, 6))
            
            ax.plot(train_sizes, train_mean, 'o-', color=self.colors['primary'], 
                   label='Training Score')
            ax.fill_between(train_sizes, train_mean - train_std, train_mean + train_std, 
                           alpha=0.2, color=self.colors['primary'])
            
            ax.plot(train_sizes, val_mean, 'o-', color=self.colors['secondary'], 
                   label='Validation Score')
            ax.fill_between(train_sizes, val_mean - val_std, val_mean + val_std, 
                           alpha=0.2, color=self.colors['secondary'])
            
            ax.set_xlabel('Training Set Size')
            ax.set_ylabel('Score')
            ax.set_title('Learning Curves', fontsize=14, fontweight='bold')
            ax.legend()
            ax.grid(True, alpha=0.3)
            
            plt.tight_layout()
            return self._fig_to_base64(fig)
        
        except Exception as e:
            print(f"Error creating learning curves: {e}")
        
        return None
    
    def _fig_to_base64(self, fig):
        """Convert matplotlib figure to base64 string"""
        import io
        import base64
        
        buffer = io.BytesIO()
        fig.savefig(buffer, format='png', dpi=150, bbox_inches='tight')
        buffer.seek(0)
        image_base64 = base64.b64encode(buffer.getvalue()).decode()
        plt.close(fig)
        return image_base64