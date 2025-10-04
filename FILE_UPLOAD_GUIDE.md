# 📁 Enhanced Data Processing: Upload Files from Anywhere

Your data processing system now supports uploading files from **any location** on your computer! No need to copy files to specific folders.

## 🚀 New Features

### 1. **Browse Files from Anywhere**
- Click the upload area to open file browser
- Navigate to **any folder** on your drive
- Select CSV, Excel (.xlsx), or JSON files
- Instant upload and processing

### 2. **Drag & Drop Support** 🐇
- Drag files directly from File Explorer
- Drop them onto the upload area
- Automatic file type detection
- Visual feedback with hover effects

### 3. **Smart File Detection**
- **CSV files**: `.csv` format
- **Excel files**: `.xlsx` format  
- **JSON files**: `.json` format
- Automatic conversion when needed

## 📋 How to Use

### Method 1: Browse Files
1. Go to `/alter_expand` page
2. Click **"Click to browse or drag & drop files from anywhere"**
3. Navigate to your file location (Downloads, Desktop, Documents, etc.)
4. Select your data file
5. File uploads automatically

### Method 2: Drag & Drop
1. Open File Explorer alongside your browser
2. Navigate to your data file
3. **Drag** the file from Explorer
4. **Drop** it onto the upload area
5. Watch the visual feedback and automatic processing

## 💡 Example Use Cases

### From Downloads Folder:
```
C:\Users\Vinayak\Downloads\sample_data.csv  ✅
```

### From Desktop:
```
C:\Users\Vinayak\Desktop\my_dataset.xlsx   ✅
```

### From Any Custom Location:
```
D:\Projects\data\analysis.csv              ✅
C:\Company\Reports\quarterly.xlsx          ✅
E:\Research\survey_data.json               ✅
```

## 🎯 Sample Operations

### **Expand Data Example:**
- Upload: `C:\Users\Vinayak\Downloads\sample_data.csv`
- Prompt: `"Generate 5 more employees with similar job roles and realistic salaries for 2024"`
- Result: Original 10 employees + 5 new AI-generated employees

### **Alter Data Example:**  
- Upload: Same employee dataset
- Prompt: `"Add a bonus column with 10-20% of salary and convert salaries to yearly format"`
- Result: Enhanced dataset with new calculations

## 🔧 Technical Details

### Supported Locations:
- ✅ **Local Drives**: C:, D:, E:, etc.
- ✅ **Network Drives**: Mapped network locations
- ✅ **External Storage**: USB drives, external HDDs
- ✅ **Cloud Sync Folders**: OneDrive, Dropbox sync folders

### File Size Limits:
- **Recommended**: Under 50MB for best performance
- **Maximum**: 100MB per file
- **Large files**: Automatically sampled for processing

### Security:
- Files are uploaded securely to local server
- No data leaves your machine
- Temporary processing only
- Automatic cleanup after processing

## 🎉 Benefits

1. **Convenience**: No file copying required
2. **Flexibility**: Access files from anywhere
3. **Speed**: Direct processing from source location  
4. **User-Friendly**: Visual drag & drop interface
5. **Robust**: Handles various file formats and locations

## 🆘 Troubleshooting

### File Not Found:
- Ensure data processing server is running (`python dataset_alter_expand.py`)
- Check file permissions (readable)
- Verify file format (CSV/Excel/JSON)

### Upload Failed:
- Check file size (under 100MB recommended)
- Ensure stable network connection
- Verify server is running on port 5004

### Connection Error:
- Restart data processing server
- Check if port 5004 is available
- Verify OpenRouter API key is configured

---

**🎬 Your files can now be anywhere on your drive - just drag, drop, and process!** 🚀