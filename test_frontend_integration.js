#!/usr/bin/env node

/**
 * Test Frontend Integration
 * 
 * This script demonstrates how the frontend should send project context
 * to ensure the ML training updates the correct project with Cloudinary URLs.
 */

const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');

// Mock project and user data (replace with real data)
const MOCK_PROJECT_ID = "68e1979c6db5633590e64a2";  // Use actual project ID from your MongoDB
const MOCK_USER_ID = "68e10772b79cb2e8d2c009e6";     // Use actual user ID from your MongoDB
const MOCK_PROJECT_NAME = "My AI Project";

async function testProjectContextIntegration() {
    console.log('🧪 Testing Frontend Project Context Integration');
    console.log('=' * 60);
    console.log(`Project ID: ${MOCK_PROJECT_ID}`);
    console.log(`User ID: ${MOCK_USER_ID}`);
    console.log(`Project Name: ${MOCK_PROJECT_NAME}`);
    console.log('');

    // Create sample CSV data
    const csvContent = `feature1,feature2,target
1.2,2.3,A
2.1,3.4,B
3.2,1.5,A
4.1,2.8,B
1.8,3.1,A
2.9,1.9,B`;

    // Write to temporary file
    const tempFile = 'temp_test_data.csv';
    fs.writeFileSync(tempFile, csvContent);

    try {
        // Create FormData exactly like the frontend should
        const formData = new FormData();
        
        // Add file
        formData.append('file', fs.createReadStream(tempFile), {
            filename: 'test_data.csv',
            contentType: 'text/csv'
        });
        
        // Add ML training parameters
        formData.append('task_type', 'classification');
        formData.append('text_prompt', 'Test classification task');
        
        // ✅ CRITICAL: Add project context - This is what fixes the issue!
        formData.append('project_id', MOCK_PROJECT_ID);
        formData.append('user_id', MOCK_USER_ID);
        formData.append('project_name', MOCK_PROJECT_NAME);

        console.log('📤 Sending request with project context...');
        console.log('📋 Form data being sent:');
        console.log('  - file: test_data.csv');
        console.log('  - task_type: classification');
        console.log('  - text_prompt: Test classification task');
        console.log(`  - project_id: ${MOCK_PROJECT_ID} ✅`);
        console.log(`  - user_id: ${MOCK_USER_ID} ✅`);
        console.log(`  - project_name: ${MOCK_PROJECT_NAME} ✅`);
        console.log('');

        // Send request to backend
        const response = await fetch('http://localhost:5000/process', {
            method: 'POST',
            body: formData
        });

        console.log('📥 Response received:');
        console.log(`Status: ${response.status} ${response.statusText}`);

        if (response.ok) {
            const result = await response.json();
            console.log('✅ SUCCESS!');
            
            // Check if project was updated
            if (result.cloudinary && result.cloudinary.database_update) {
                const dbUpdate = result.cloudinary.database_update;
                if (dbUpdate.success) {
                    console.log('🎯 PROJECT UPDATED SUCCESSFULLY!');
                    console.log(`   Project ID: ${dbUpdate.project_id}`);
                    console.log(`   Message: ${dbUpdate.message}`);
                    console.log('   Cloudinary URL stored in existing project ✅');
                } else {
                    console.log('⚠️  Database update failed:');
                    console.log(`   Message: ${dbUpdate.message}`);
                }
            } else {
                console.log('⚠️  No database update info in response');
                console.log('   This might mean a new project was created instead');
            }

            // Show Cloudinary info
            if (result.cloudinary) {
                console.log('');
                console.log('☁️  Cloudinary Upload:');
                console.log(`   Success: ${result.cloudinary.success}`);
                console.log(`   URL: ${result.cloudinary.url}`);
                console.log(`   Size: ${result.cloudinary.size} bytes`);
            }

        } else {
            const errorText = await response.text();
            console.log('❌ FAILED!');
            console.log(`Error: ${errorText}`);
        }

    } catch (error) {
        console.log('❌ REQUEST FAILED!');
        console.log(`Error: ${error.message}`);
        
        if (error.code === 'ECONNREFUSED') {
            console.log('💡 Make sure your Flask backend is running on http://localhost:5000');
        }
    } finally {
        // Clean up
        if (fs.existsSync(tempFile)) {
            fs.unlinkSync(tempFile);
        }
    }

    console.log('');
    console.log('=' * 60);
    console.log('💡 FRONTEND INTEGRATION SUMMARY:');
    console.log('');
    console.log('To fix the Cloudinary URL storage issue, ensure your');
    console.log('frontend (React component) includes these lines:');
    console.log('');
    console.log('```javascript');
    console.log('// In your ML training component');
    console.log('const handleSubmit = async () => {');
    console.log('  const formData = new FormData();');
    console.log('  formData.append("file", selectedFile);');
    console.log('  formData.append("task_type", taskType);');
    console.log('  formData.append("text_prompt", prompt);');
    console.log('');
    console.log('  // ✅ ADD THESE CRITICAL LINES:');
    console.log('  if (currentProject && user) {');
    console.log('    formData.append("project_id", currentProject.id);');
    console.log('    formData.append("user_id", user.id);');
    console.log('    formData.append("project_name", currentProject.name);');
    console.log('  }');
    console.log('');
    console.log('  const response = await fetch("/api/process", {');
    console.log('    method: "POST",');
    console.log('    body: formData');
    console.log('  });');
    console.log('};');
    console.log('```');
    console.log('');
    console.log('🎯 Result: Cloudinary URLs will be stored in the CORRECT');
    console.log('   existing project instead of creating new projects!');
    console.log('=' * 60);
}

// Run the test
testProjectContextIntegration().catch(console.error);

module.exports = { testProjectContextIntegration };