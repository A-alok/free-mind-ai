import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
import seaborn as sns
from io import BytesIO
import base64
from sklearn.metrics import confusion_matrix, classification_report, accuracy_score
import os
import tensorflow as tf
import matplotlib.patheffects as path_effects
from matplotlib.colors import LinearSegmentedColormap

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
    print(f"Warning: Failed to initialize Gemini in visualization_cnn.py: {e}")
    GEMINI_AVAILABLE = False
# Define modern purple theme colors (matching the main visualization module)
PURPLE_DARK = '#2D1B55'  # Dark purple background
PURPLE_PRIMARY = '#9C27B0'  # Main purple 
PURPLE_SECONDARY = '#BA68C8'  # Medium purple
PURPLE_ACCENT = '#E040FB'  # Bright accent purple
PURPLE_LIGHT = '#E1BEE7'  # Light purple
PURPLE_BG = '#13111C'  # Very dark purple/black background

# Create custom purple color maps
purple_cmap = LinearSegmentedColormap.from_list('custom_purple', 
                                             [PURPLE_BG, PURPLE_DARK, PURPLE_PRIMARY, PURPLE_ACCENT], 
                                             N=256)
diverging_purple = LinearSegmentedColormap.from_list('diverging_purple',
                                                   ['#6A1B9A', '#9C27B0', '#CE93D8', '#F3E5F5'], 
                                                   N=256)

def apply_modern_style():
    """Apply modern styling to all matplotlib plots"""
    plt.style.use('dark_background')
    
    # Set custom styling for all plots
    plt.rcParams['figure.facecolor'] = PURPLE_BG
    plt.rcParams['axes.facecolor'] = PURPLE_BG
    plt.rcParams['axes.edgecolor'] = PURPLE_SECONDARY
    plt.rcParams['axes.labelcolor'] = PURPLE_LIGHT
    plt.rcParams['xtick.color'] = PURPLE_LIGHT
    plt.rcParams['ytick.color'] = PURPLE_LIGHT
    plt.rcParams['text.color'] = PURPLE_LIGHT
    plt.rcParams['grid.color'] = PURPLE_DARK
    plt.rcParams['grid.linestyle'] = '--'
    plt.rcParams['grid.linewidth'] = 0.5
    plt.rcParams['figure.figsize'] = (10, 6)
    plt.rcParams['font.family'] = 'sans-serif'
    plt.rcParams['font.size'] = 12
    
    # Set Seaborn style
    sns.set_style("darkgrid", {
        'axes.facecolor': PURPLE_BG,
        'axes.edgecolor': PURPLE_SECONDARY,
        'axes.grid': True,
        'grid.color': PURPLE_DARK,
        'grid.linestyle': '--',
    })

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

def get_gemini_explanation(data, prompt):
    """Get AI-generated explanation for visualizations using Gemini model"""
    if GEMINI_AVAILABLE:
        try:
            model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(prompt)
            return response.text
        except Exception as e:
            return f"Unable to generate explanation: {str(e)}"
    else:
        return "AI explanations not available (Gemini API not installed)"

def create_cnn_visualization(model, training_set, test_set, history=None, user_prompt=None):
    """
    Create visualizations specific to CNN models for image classification
    
    Parameters:
    model: Trained CNN model
    training_set: Training data generator
    test_set: Test data generator
    history: Training history (if available)
    user_prompt: Original user query for context in explanations
    
    Returns:
    List of visualizations with base64 encoded images
    """
    visualizations = []
    apply_modern_style()  # Apply the purple theme styling
    
    # If no user prompt was provided
    if user_prompt is None:
        user_prompt = "image classification task"
    
    # 1. Confusion Matrix visualization
    try:
        print("Generating confusion matrix for CNN...")
        
        # Get class names from the generator
        class_names = list(training_set.class_indices.keys())
        num_classes = len(class_names)
        
        # Extract a batch of test images and predict
        test_set.reset()
        test_images, test_labels = next(test_set)
        
        # Get as many samples as available from the test set
        all_images = []
        all_labels = []
        
        test_set.reset()
        batch_limit = min(10, test_set.n // test_set.batch_size)  # Limit batches for performance
        
        for i in range(batch_limit):
            try:
                img_batch, label_batch = next(test_set)
                all_images.append(img_batch)
                all_labels.append(label_batch)
            except StopIteration:
                break
        
        if all_images:
            X_test = np.vstack(all_images)
            y_test = np.vstack(all_labels)
            
            # Get predictions
            y_pred_prob = model.predict(X_test)
            y_pred = np.argmax(y_pred_prob, axis=1)
            y_true = np.argmax(y_test, axis=1)
            
            # Create confusion matrix
            cm = confusion_matrix(y_true, y_pred)
            
            # Plot confusion matrix with enhanced styling
            fig, ax = plt.subplots(figsize=(10, 8))
            
            # Create stylish heatmap with custom colormap
            sns.heatmap(cm, annot=True, fmt='d', cmap=purple_cmap,
                       linewidths=1, linecolor=PURPLE_SECONDARY,
                       annot_kws={"color": "white", "fontsize": 14, "fontweight": "bold"},
                       xticklabels=class_names,
                       yticklabels=class_names)
            
            # Add style elements
            add_style_to_plot(fig, ax, 'Confusion Matrix', 'Predicted Class', 'True Class')
            
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
            cm_details = "\n".join([f"Class {class_names[i]}: TP={cm[i,i]}, Total={np.sum(cm[i,:])}" for i in range(num_classes)])
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
    except Exception as e:
        print(f"Error generating confusion matrix: {e}")
    
    # 2. Training & Validation Performance (if history is available)
    if history and hasattr(history, 'history') and 'accuracy' in history.history:
        try:
            fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))
            fig.patch.set_facecolor(PURPLE_BG)
            
            # Plot training & validation accuracy with enhanced styling
            epochs = range(1, len(history.history['accuracy']) + 1)
            
            # Set gradient background
            ax1.set_facecolor(PURPLE_BG)
            ax2.set_facecolor(PURPLE_BG)
            
            # Accuracy plot
            line1 = ax1.plot(epochs, history.history['accuracy'], linewidth=3, 
                           color=PURPLE_ACCENT, label='Training Accuracy')
            # Add glow effect
            line1[0].set_path_effects([
                path_effects.Stroke(linewidth=5, foreground=PURPLE_ACCENT, alpha=0.3),
                path_effects.Normal()
            ])
            
            if 'val_accuracy' in history.history:
                line2 = ax1.plot(epochs, history.history['val_accuracy'], linewidth=3,
                               color=PURPLE_SECONDARY, label='Validation Accuracy')
                # Add glow effect
                line2[0].set_path_effects([
                    path_effects.Stroke(linewidth=5, foreground=PURPLE_SECONDARY, alpha=0.3),
                    path_effects.Normal()
                ])
            
            add_style_to_plot(fig, ax1, 'Model Accuracy', 'Epoch', 'Accuracy')
            
            # Add a translucent badge with final accuracy
            final_acc = history.history['accuracy'][-1]
            final_val_acc = history.history['val_accuracy'][-1] if 'val_accuracy' in history.history else None
            
            badge_text = f"Final: {final_acc:.2f}"
            if final_val_acc:
                badge_text += f"\nVal: {final_val_acc:.2f}"
                
            ax1.text(0.5, 0.2, badge_text, fontsize=14, 
                    bbox=dict(boxstyle='round,pad=0.5', facecolor=PURPLE_DARK, 
                             alpha=0.7, edgecolor=PURPLE_ACCENT),
                    color=PURPLE_LIGHT, ha='center', va='center',
                    transform=ax1.transAxes)
            
            # Style legend
            legend1 = ax1.legend(loc="lower right", frameon=True, facecolor=PURPLE_DARK, edgecolor=PURPLE_SECONDARY)
            for text in legend1.get_texts():
                text.set_color(PURPLE_LIGHT)
            
            # Loss plot
            line3 = ax2.plot(epochs, history.history['loss'], linewidth=3,
                           color=PURPLE_ACCENT, label='Training Loss')
            # Add glow effect
            line3[0].set_path_effects([
                path_effects.Stroke(linewidth=5, foreground=PURPLE_ACCENT, alpha=0.3),
                path_effects.Normal()
            ])
            
            if 'val_loss' in history.history:
                line4 = ax2.plot(epochs, history.history['val_loss'], linewidth=3,
                               color=PURPLE_SECONDARY, label='Validation Loss')
                # Add glow effect
                line4[0].set_path_effects([
                    path_effects.Stroke(linewidth=5, foreground=PURPLE_SECONDARY, alpha=0.3),
                    path_effects.Normal()
                ])
            
            add_style_to_plot(fig, ax2, 'Model Loss', 'Epoch', 'Loss')
            
            # Add a translucent badge with final loss
            final_loss = history.history['loss'][-1]
            final_val_loss = history.history['val_loss'][-1] if 'val_loss' in history.history else None
            
            badge_text = f"Final: {final_loss:.2f}"
            if final_val_loss:
                badge_text += f"\nVal: {final_val_loss:.2f}"
                
            ax2.text(0.5, 0.8, badge_text, fontsize=14, 
                    bbox=dict(boxstyle='round,pad=0.5', facecolor=PURPLE_DARK, 
                             alpha=0.7, edgecolor=PURPLE_ACCENT),
                    color=PURPLE_LIGHT, ha='center', va='center',
                    transform=ax2.transAxes)
            
            # Style legend
            legend2 = ax2.legend(loc="upper right", frameon=True, facecolor=PURPLE_DARK, edgecolor=PURPLE_SECONDARY)
            for text in legend2.get_texts():
                text.set_color(PURPLE_LIGHT)
            
            # Add an overlay for the overfitting/underfitting region
            if 'val_loss' in history.history:
                train_loss = history.history['loss']
                val_loss = history.history['val_loss']
                if max(val_loss) > max(train_loss) * 1.2:  # If val_loss is significantly higher than train_loss
                    # Highlight potential overfitting region
                    for i in range(len(epochs)-1, 0, -1):
                        if val_loss[i] > train_loss[i] * 1.2:
                            rect = plt.Rectangle((i, 0), len(epochs)-i, max(val_loss), 
                                               alpha=0.2, color=PURPLE_ACCENT, zorder=-1)
                            ax2.add_patch(rect)
                            # Add annotation
                            ax2.text(i + (len(epochs)-i)/2, max(val_loss)/2, "Potential\nOverfitting", 
                                   color=PURPLE_LIGHT, ha='center', va='center', alpha=0.7,
                                   fontsize=10)
                            break
            
            plt.tight_layout()
            training_history_img = fig_to_base64(fig)
            plt.close(fig)
            
            # Get AI explanation for training history
            final_train_acc = history.history['accuracy'][-1]
            final_val_acc = history.history['val_accuracy'][-1] if 'val_accuracy' in history.history else "N/A"
            explanation_prompt = f"""
            Analyze this training history for {user_prompt}:
            - Final training accuracy: {final_train_acc:.4f}
            - Final validation accuracy: {final_val_acc}
            Explain what these curves tell us about the model's learning process.
            Is there evidence of overfitting or underfitting?
            Provide a detailed analysis in 10-12 lines.
            """
            explanation = get_gemini_explanation(str(history.history), explanation_prompt)
            
            visualizations.append({
                'title': 'Training History',
                'image': training_history_img,
                'explanation': explanation
            })
        except Exception as e:
            print(f"Error generating training history plot: {e}")
    
    # 3. Class Distribution visualization
    try:
        fig, ax = plt.subplots(figsize=(10, 6))
        fig.patch.set_facecolor(PURPLE_BG)
        ax.set_facecolor(PURPLE_BG)
        
        # Get class counts from the training set
        class_counts = {}
        for class_name, class_idx in training_set.class_indices.items():
            count = len([filename for filename in training_set.filenames 
                         if os.path.dirname(filename).split('/')[-1] == class_name])
            class_counts[class_name] = count
        
        # Create gradient colors for bars
        num_classes = len(class_counts)
        cmap = plt.cm.get_cmap(purple_cmap)
        colors = [cmap(i/num_classes) for i in range(num_classes)]
        
        # Plot class distribution with custom colors
        bars = ax.bar(list(class_counts.keys()), list(class_counts.values()), 
                     alpha=0.8, color=colors)
        
        # Add glow effect to bars
        for bar in bars:
            bar.set_path_effects([
                path_effects.Stroke(linewidth=3, foreground=PURPLE_ACCENT, alpha=0.3),
                path_effects.Normal()
            ])
        
        # Add count labels on top of bars
        for i, (_, count) in enumerate(class_counts.items()):
            ax.text(i, count + max(class_counts.values())*0.02, str(count), ha='center', va='bottom', 
                   color=PURPLE_LIGHT, fontweight='bold',
                   path_effects=[path_effects.withStroke(linewidth=3, foreground=PURPLE_BG)])
        
        # Apply styling
        add_style_to_plot(fig, ax, 'Class Distribution in Training Data', 'Class', 'Number of Images')
        
        # Add class imbalance indicator
        max_count = max(class_counts.values())
        min_count = min(class_counts.values())
        imbalance_ratio = max_count / min_count if min_count > 0 else float('inf')
        
        imbalance_text = f"Imbalance Ratio: {imbalance_ratio:.2f}x"
        imbalance_color = PURPLE_ACCENT
        if imbalance_ratio > 10:
            imbalance_color = '#FF5252'  # Red for severe imbalance
        elif imbalance_ratio > 3:
            imbalance_color = '#FFA726'  # Orange for moderate imbalance
        
        ax.text(0.98, 0.95, imbalance_text, transform=ax.transAxes, fontsize=12,
               ha='right', va='top', color=imbalance_color,
               bbox=dict(facecolor=PURPLE_DARK, alpha=0.7, edgecolor=PURPLE_SECONDARY, pad=5))
        
        # Rotate x-axis labels for better readability
        plt.xticks(rotation=45, ha='right')
        
        plt.tight_layout()
        class_dist_img = fig_to_base64(fig)
        plt.close(fig)
        
        # Get AI explanation for class distribution
        explanation_prompt = f"""
        Analyze this class distribution for {user_prompt}:
        {str(class_counts)}
        Explain the implications of this distribution on model training.
        Are there any concerns about class imbalance?
        Provide a concise analysis in 10-12 lines.
        """
        explanation = get_gemini_explanation(str(class_counts), explanation_prompt)
        
        visualizations.append({
            'title': 'Class Distribution',
            'image': class_dist_img,
            'explanation': explanation
        })
    except Exception as e:
        print(f"Error generating class distribution plot: {e}")
    
    # 4. Model Architecture Visualization
    try:
        # Create a text representation of the model architecture
        model_summary_io = BytesIO()
        
        # Redirect stdout to capture model.summary() output
        import contextlib
        with contextlib.redirect_stdout(model_summary_io):
            model.summary()
        
        model_summary = model_summary_io.getvalue().decode('utf-8')
        
        # Create a visual representation of model architecture
        fig, ax = plt.subplots(figsize=(10, 12))
        fig.patch.set_facecolor(PURPLE_BG)
        ax.set_facecolor(PURPLE_BG)
        
        # Extract layer information
        layers = model.layers
        layer_names = [layer.name for layer in layers]
        layer_types = [layer.__class__.__name__ for layer in layers]
        
        # Calculate layer sizes for visualization
        layer_sizes = []
        layer_colors = []
        
        # Create type-based coloring
        layer_type_colors = {
            'Conv2D': PURPLE_ACCENT,
            'Dense': PURPLE_PRIMARY,
            'MaxPooling2D': PURPLE_SECONDARY,
            'Flatten': PURPLE_LIGHT,
            'Dropout': '#CE93D8',
            'BatchNormalization': '#BA68C8'
        }
        
        for layer in layers:
            if hasattr(layer, 'output_shape'):
                if isinstance(layer.output_shape, tuple):
                    size = layer.output_shape[1] if len(layer.output_shape) > 1 else 1
                elif isinstance(layer.output_shape, list):
                    size = layer.output_shape[0][1] if len(layer.output_shape[0]) > 1 else 1
                else:
                    size = 10  # Default size
            else:
                size = 10  # Default size
            layer_sizes.append(min(100, size))  # Cap at 100 for visualization
            
            # Assign color based on layer type
            layer_type = layer.__class__.__name__
            layer_colors.append(layer_type_colors.get(layer_type, PURPLE_SECONDARY))
        
        # Plot the architecture with the custom colors
        y_positions = np.arange(len(layer_names))
        bars = ax.barh(y_positions, layer_sizes, align='center', color=layer_colors, alpha=0.8)
        
        # Add glow effect to bars
        for bar in bars:
            bar.set_path_effects([
                path_effects.Stroke(linewidth=3, foreground=PURPLE_ACCENT, alpha=0.3),
                path_effects.Normal()
            ])
        
        # Add layer names and types with styled text
        for i, (name, type_name) in enumerate(zip(layer_names, layer_types)):
            # Add a background for better readability
            text = ax.text(5, i, f"{name} ({type_name})", va='center', color=PURPLE_LIGHT,
                         bbox=dict(facecolor=PURPLE_DARK, alpha=0.7, edgecolor=PURPLE_SECONDARY, pad=3))
            
            # Add parameter count if available
            if hasattr(model.layers[i], 'count_params'):
                params = model.layers[i].count_params()
                if params > 0:
                    ax.text(layer_sizes[i] + 5, i, f"{params:,} params", va='center', 
                          color=PURPLE_LIGHT, alpha=0.8, fontsize=10)
        
        # Add a legend for layer types
        handles = []
        for layer_type, color in layer_type_colors.items():
            if layer_type in layer_types:  # Only include types that exist in the model
                patch = plt.Rectangle((0, 0), 1, 1, color=color)
                handles.append((patch, layer_type))
        
        # Add legend
        legend_patches, legend_labels = zip(*handles)
        legend = ax.legend(legend_patches, legend_labels, 
                         loc='upper center', bbox_to_anchor=(0.5, -0.05),
                         fancybox=True, shadow=True, ncol=3, 
                         frameon=True, facecolor=PURPLE_DARK, edgecolor=PURPLE_SECONDARY)
        
        for text in legend.get_texts():
            text.set_color(PURPLE_LIGHT)
        
        ax.set_yticks([])  # Hide y-axis
        
        # Apply styling
        add_style_to_plot(fig, ax, 'Model Architecture', 'Layer Output Size', '')
        
        # Add network complexity metrics
        total_params = model.count_params()
        trainable_params = sum([K.count_params(w) for w in model.trainable_weights])
        non_trainable_params = total_params - trainable_params
        
        complexity_text = (f"Total Parameters: {total_params:,}\n"
                          f"Trainable: {trainable_params:,}\n"
                          f"Non-Trainable: {non_trainable_params:,}")
        
        ax.text(0.98, 0.98, complexity_text, transform=ax.transAxes, fontsize=12,
               ha='right', va='top', color=PURPLE_LIGHT,
               bbox=dict(facecolor=PURPLE_DARK, alpha=0.7, edgecolor=PURPLE_SECONDARY, pad=5))
        
        plt.tight_layout()
        architecture_img = fig_to_base64(fig)
        plt.close(fig)
        
        # Get AI explanation for model architecture
        explanation_prompt = f"""
        Analyze this CNN architecture for {user_prompt}:
        {model_summary}
        Explain the network architecture and how different layers contribute to image classification.
        Provide insights on the complexity and design choices in 10-12 lines.
        """
        explanation = get_gemini_explanation(model_summary, explanation_prompt)
        
        visualizations.append({
            'title': 'Model Architecture',
            'image': architecture_img,
            'explanation': explanation
        })
    except Exception as e:
        print(f"Error generating model architecture visualization: {e}")
    
    # 5. Sample Predictions Visualization
    try:
        # Get a small batch of test images
        test_set.reset()
        test_batch = next(test_set)
        test_images, test_labels = test_batch
        
        # Limit to 9 images for the grid
        num_images = min(9, len(test_images))
        test_images = test_images[:num_images]
        test_labels = test_labels[:num_images]
        
        # Get predictions
        predictions = model.predict(test_images)
        predicted_classes = np.argmax(predictions, axis=1)
        true_classes = np.argmax(test_labels, axis=1)
        
        # Get class names
        class_names = list(test_set.class_indices.keys())
        
        # Plot the images with predictions
        fig = plt.figure(figsize=(12, 12))
        fig.patch.set_facecolor(PURPLE_BG)
        
        for i in range(num_images):
            ax = plt.subplot(3, 3, i+1)
            ax.set_facecolor(PURPLE_BG)
            
            # Display the image
            plt.imshow(test_images[i])
            
            # Determine color based on correctness
            is_correct = predicted_classes[i] == true_classes[i]
            color = PURPLE_ACCENT if is_correct else '#FF5252'  # Purple for correct, Red for incorrect
            
            # Add a styled title with prediction info
            title = f"True: {class_names[true_classes[i]]}\nPred: {class_names[predicted_classes[i]]}"
            title_obj = plt.title(title, color=color, fontsize=12, pad=10)
            
            # Add glow effect to title
            title_obj.set_path_effects([
                path_effects.Stroke(linewidth=3, foreground=PURPLE_BG, alpha=0.8),
                path_effects.Normal()
            ])
            
            # Add a border with glow effect for correct/incorrect indication
            border_color = PURPLE_ACCENT if is_correct else '#FF5252'
            rect = plt.Rectangle((-0.5, -0.5), test_images[i].shape[0], test_images[i].shape[1], 
                                fill=False, lw=3, edgecolor=border_color, alpha=0.7)
            ax.add_patch(rect)
            rect.set_path_effects([
                path_effects.Stroke(linewidth=5, foreground=border_color, alpha=0.3),
                path_effects.Normal()
            ])
            
            # Add confidence score
            confidence = predictions[i][predicted_classes[i]] * 100
            ax.text(0.5, -0.15, f"Confidence: {confidence:.1f}%", 
                   color=PURPLE_LIGHT, ha='center', transform=ax.transAxes,
                   fontsize=10, bbox=dict(facecolor=PURPLE_DARK, alpha=0.7, 
                                       edgecolor=PURPLE_SECONDARY, pad=3))
            
            plt.axis('off')
        
        plt.tight_layout()
        plt.subplots_adjust(wspace=0.3, hspace=0.3)  # Add some space between subplots
        
        # Add a title for the entire figure
        fig.suptitle('Sample Predictions', fontsize=20, color=PURPLE_LIGHT, y=0.98)
        
        # Add overall glow effect to the figure
        for i in range(2):
            fig.patch.set_path_effects([
                path_effects.Stroke(linewidth=4+i, foreground=PURPLE_ACCENT, alpha=0.05+i*0.05),
                path_effects.Normal()
            ])
        
        # Add summary statistics
        correct_count = sum(predicted_classes == true_classes)
        accuracy = correct_count / num_images
        
        # Add a summary box
        summary_text = (f"Accuracy: {accuracy:.2f} ({correct_count}/{num_images})"
                       f"\nAvg Confidence: {np.mean(np.max(predictions, axis=1)*100):.1f}%")
        
        fig.text(0.5, 0.02, summary_text, ha='center', va='bottom',
                color=PURPLE_LIGHT, fontsize=14,
                bbox=dict(facecolor=PURPLE_DARK, alpha=0.7, 
                         edgecolor=PURPLE_SECONDARY, pad=5))
        
        sample_predictions_img = fig_to_base64(fig)
        plt.close(fig)
        
        # Get AI explanation for sample predictions
        explanation_prompt = f"""
        Analyze these sample predictions for {user_prompt}:
        - {correct_count} out of {num_images} predictions are correct.
        - Average confidence: {np.mean(np.max(predictions, axis=1)*100):.1f}%
        Explain what these sample predictions tell us about the model's performance.
        What types of images does the model struggle with?
        Provide a detailed analysis in 10-12 lines.
        """
        explanation = get_gemini_explanation(f"Sample predictions with {correct_count}/{num_images} correct", explanation_prompt)
        
        visualizations.append({
            'title': 'Sample Predictions',
            'image': sample_predictions_img,
            'explanation': explanation
        })
    except Exception as e:
        print(f"Error generating sample predictions: {e}")
        
    # Optional: Add a learning curve visualization if history contains enough epochs
    if history and hasattr(history, 'history') and 'accuracy' in history.history and len(history.history['accuracy']) >= 5:
        try:
            fig, ax = plt.subplots(figsize=(10, 6))
            fig.patch.set_facecolor(PURPLE_BG)
            ax.set_facecolor(PURPLE_BG)
            
            # Get epochs and metrics
            epochs = range(1, len(history.history['accuracy']) + 1)
            train_acc = history.history['accuracy']
            val_acc = history.history['val_accuracy'] if 'val_accuracy' in history.history else None
            
            # Plot learning curve with styled elements
            # Plot training accuracy
            line1 = ax.plot(epochs, train_acc, 'o-', linewidth=3, markersize=8,
                          color=PURPLE_ACCENT, label='Training Accuracy')
            line1[0].set_path_effects([
                path_effects.Stroke(linewidth=5, foreground=PURPLE_ACCENT, alpha=0.3),
                path_effects.Normal()
            ])
            
            # Plot validation accuracy if available
            if val_acc:
                line2 = ax.plot(epochs, val_acc, 'o-', linewidth=3, markersize=8,
                              color=PURPLE_SECONDARY, label='Validation Accuracy')
                line2[0].set_path_effects([
                    path_effects.Stroke(linewidth=5, foreground=PURPLE_SECONDARY, alpha=0.3),
                    path_effects.Normal()
                ])
            
            # Add style to the plot
            add_style_to_plot(fig, ax, 'Learning Curve', 'Epoch', 'Accuracy')
            
            # Add a guide line at 90% accuracy 
            ax.axhline(y=0.9, linestyle='--', color=PURPLE_LIGHT, alpha=0.5, linewidth=1)
            ax.text(0, 0.91, "90% accuracy", color=PURPLE_LIGHT, alpha=0.7, fontsize=10)
            
            # Find the epoch where validation accuracy starts to plateau (if validation data exists)
            if val_acc and len(val_acc) > 5:
                # Simple heuristic to find plateau: when improvement becomes less than 1% for 3 consecutive epochs
                plateau_epoch = None
                for i in range(3, len(val_acc)):
                    if (val_acc[i] - val_acc[i-3]) < 0.01:
                        plateau_epoch = i + 1  # +1 because epochs are 1-indexed
                        break
                
                if plateau_epoch:
                    # Add a vertical line and annotation for the plateau point
                    ax.axvline(x=plateau_epoch, linestyle=':', color=PURPLE_ACCENT, alpha=0.7, linewidth=2)
                    ax.text(plateau_epoch + 0.2, min(train_acc) + 0.05, 
                           f"Plateau\nEpoch {plateau_epoch}", 
                           color=PURPLE_LIGHT, fontsize=10,
                           bbox=dict(facecolor=PURPLE_DARK, alpha=0.7, edgecolor='none', pad=3))
            
            # Add a note about gap between training and validation (if validation data exists)
            if val_acc:
                final_gap = abs(train_acc[-1] - val_acc[-1])
                gap_text = f"Final Gap: {final_gap:.2f}"
                gap_color = PURPLE_ACCENT
                if final_gap > 0.15:  # Large gap indicates overfitting
                    gap_color = '#FF5252'  # Red for warning
                    gap_text += " (Potential Overfitting)"
                    
                ax.text(0.98, 0.05, gap_text, transform=ax.transAxes, 
                       ha='right', va='bottom', color=gap_color, fontsize=12,
                       bbox=dict(facecolor=PURPLE_DARK, alpha=0.7, edgecolor=PURPLE_SECONDARY, pad=5))
            
            # Style legend
            legend = ax.legend(loc="lower right", frameon=True, facecolor=PURPLE_DARK, edgecolor=PURPLE_SECONDARY)
            for text in legend.get_texts():
                text.set_color(PURPLE_LIGHT)
            
            plt.tight_layout()
            learning_curve_img = fig_to_base64(fig)
            plt.close(fig)
            
            # Get AI explanation for learning curve
            explanation_prompt = f"""
            Analyze this learning curve for {user_prompt}:
            - Training data shows an accuracy progression from {train_acc[0]:.2f} to {train_acc[-1]:.2f}
            - {'Validation data shows an accuracy progression from ' + str(val_acc[0]) + ' to ' + str(val_acc[-1]) if val_acc else 'No validation data available'}
            Explain what this learning curve tells us about the model's training process.
            What insights can we draw about potential overfitting, underfitting, or appropriate training duration?
            Provide a detailed analysis in 10-12 lines.
            """
            explanation = get_gemini_explanation("Learning curve analysis", explanation_prompt)
            
            visualizations.append({
                'title': 'Learning Curve',
                'image': learning_curve_img,
                'explanation': explanation
            })
        except Exception as e:
            print(f"Error generating learning curve: {e}")
    
    # Optional: Add a prediction confidence distribution visualization
    try:
        # Get a larger batch of test samples for confidence distribution
        test_set.reset()
        all_images = []
        all_labels = []
        
        # Collect more samples for better distribution analysis
        sample_limit = min(100, test_set.n)  # Limit to 100 samples
        collected = 0
        
        while collected < sample_limit:
            try:
                img_batch, label_batch = next(test_set)
                all_images.append(img_batch)
                all_labels.append(label_batch)
                collected += len(img_batch)
            except StopIteration:
                break
        
        if all_images:
            X_test_large = np.vstack(all_images)[:sample_limit]
            y_test_large = np.vstack(all_labels)[:sample_limit]
            
            # Get predictions
            y_pred_prob_large = model.predict(X_test_large)
            y_pred_large = np.argmax(y_pred_prob_large, axis=1)
            y_true_large = np.argmax(y_test_large, axis=1)
            
            # Get confidence scores
            confidence_scores = np.max(y_pred_prob_large, axis=1) * 100  # Convert to percentage
            
            # Split confidence scores by correct and incorrect predictions
            correct_mask = y_pred_large == y_true_large
            correct_confidence = confidence_scores[correct_mask]
            incorrect_confidence = confidence_scores[~correct_mask]
            
            # Create confidence distribution visualization
            fig, ax = plt.subplots(figsize=(10, 6))
            fig.patch.set_facecolor(PURPLE_BG)
            ax.set_facecolor(PURPLE_BG)
            
            # Plot histograms for correct and incorrect predictions
            bins = np.linspace(0, 100, 20)
            
            if len(correct_confidence) > 0:
                # Plot correct predictions confidence
                n_correct, bins_correct, patches_correct = ax.hist(
                    correct_confidence, bins=bins, alpha=0.7, 
                    color=PURPLE_ACCENT, label='Correct Predictions')
                
                # Add glow effect to bars
                for patch in patches_correct:
                    patch.set_path_effects([
                        path_effects.Stroke(linewidth=3, foreground=PURPLE_ACCENT, alpha=0.3),
                        path_effects.Normal()
                    ])
            
            if len(incorrect_confidence) > 0:
                # Plot incorrect predictions confidence
                n_incorrect, bins_incorrect, patches_incorrect = ax.hist(
                    incorrect_confidence, bins=bins, alpha=0.7, 
                    color='#FF5252', label='Incorrect Predictions')
                
                # Add glow effect to bars
                for patch in patches_incorrect:
                    patch.set_path_effects([
                        path_effects.Stroke(linewidth=3, foreground='#FF5252', alpha=0.3),
                        path_effects.Normal()
                    ])
            
            # Add style to the plot
            add_style_to_plot(fig, ax, 'Prediction Confidence Distribution', 
                             'Confidence Score (%)', 'Frequency')
            
            # Style legend
            legend = ax.legend(loc="upper left", frameon=True, facecolor=PURPLE_DARK, edgecolor=PURPLE_SECONDARY)
            for text in legend.get_texts():
                text.set_color(PURPLE_LIGHT)
            
            # Add summary statistics
            accuracy = np.mean(correct_mask) * 100
            avg_confidence = np.mean(confidence_scores)
            avg_correct_conf = np.mean(correct_confidence) if len(correct_confidence) > 0 else 0
            avg_incorrect_conf = np.mean(incorrect_confidence) if len(incorrect_confidence) > 0 else 0
            
            stats_text = (f"Accuracy: {accuracy:.1f}%\n"
                         f"Avg Confidence: {avg_confidence:.1f}%\n"
                         f"Avg Correct: {avg_correct_conf:.1f}%\n"
                         f"Avg Incorrect: {avg_incorrect_conf:.1f}%")
            
            ax.text(0.98, 0.98, stats_text, transform=ax.transAxes, 
                   ha='right', va='top', color=PURPLE_LIGHT, fontsize=12,
                   bbox=dict(facecolor=PURPLE_DARK, alpha=0.7, edgecolor=PURPLE_SECONDARY, pad=5))
            
            # Add calibration reference line
            if len(correct_confidence) > 0 and len(incorrect_confidence) > 0:
                # Calculate calibration ratio (how well confidence matches accuracy)
                calib_ratio = avg_confidence / accuracy * 100
                calib_text = f"Calibration: {'Overconfident' if calib_ratio > 1.1 else 'Underconfident' if calib_ratio < 0.9 else 'Well Calibrated'}"
                
                ax.text(0.98, 0.8, calib_text, transform=ax.transAxes,
                       ha='right', va='top', color=PURPLE_LIGHT, fontsize=12,
                       bbox=dict(facecolor=PURPLE_DARK, alpha=0.7, edgecolor=PURPLE_SECONDARY, pad=5))
            
            plt.tight_layout()
            confidence_dist_img = fig_to_base64(fig)
            plt.close(fig)
            
            # Get AI explanation for confidence distribution
            explanation_prompt = f"""
            Analyze this confidence distribution for {user_prompt}:
            - Model accuracy: {accuracy:.1f}%
            - Average prediction confidence: {avg_confidence:.1f}%
            - Average confidence for correct predictions: {avg_correct_conf:.1f}%
            - Average confidence for incorrect predictions: {avg_incorrect_conf:.1f}%
            Explain what this confidence distribution tells us about the model.
            Is the model well-calibrated, overconfident, or underconfident?
            What are the implications for using this model in production?
            Provide a detailed analysis in 10-12 lines.
            """
            explanation = get_gemini_explanation("Confidence distribution analysis", explanation_prompt)
            
            visualizations.append({
                'title': 'Confidence Distribution',
                'image': confidence_dist_img,
                'explanation': explanation
            })
        
    except Exception as e:
        print(f"Error generating confidence distribution: {e}")
    
    return visualizations