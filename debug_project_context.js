#!/usr/bin/env node

/**
 * Debug Project Context Flow
 * 
 * This script tests the complete flow to identify where project context is being lost.
 */

const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');

// Use the actual project ID from your MongoDB data
const TEST_CONFIG = {
    project_id: "68e199ff6db56335399e64bc",  // Your original "rrrrrrrrrr" project
    user_id: "68e10772b79cb2e8d2c009e6",     // Your user ID
    project_name: "rrrrrrrrrr",              // Your original project name
    next_api_url: "http://localhost:3000/api/process",
    flask_direct_url: "http://localhost:5000/process"
};

async function testNextJSAPIRoute() {
    console.log('🧪 Testing Next.js API Route (/api/process)');
    console.log('=' * 50);
    console.log(`Project ID: ${TEST_CONFIG.project_id}`);
    console.log(`User ID: ${TEST_CONFIG.user_id}`);
    console.log(`Project Name: ${TEST_CONFIG.project_name}`);
    console.log();

    // Create test CSV data
    const csvData = `feature1,feature2,target
1,2,A
2,3,B
3,1,A`;

    const tempFile = 'temp_debug.csv';
    fs.writeFileSync(tempFile, csvData);

    try {
        const formData = new FormData();
        
        // Add file
        formData.append('file', fs.createReadStream(tempFile), {
            filename: 'debug_test.csv',
            contentType: 'text/csv'
        });
        
        // Add ML parameters
        formData.append('task_type', 'classification');
        formData.append('text_prompt', 'Debug test classification');
        
        // Add project context - THIS IS CRITICAL
        formData.append('project_id', TEST_CONFIG.project_id);
        formData.append('user_id', TEST_CONFIG.user_id);
        formData.append('project_name', TEST_CONFIG.project_name);

        console.log('📤 Sending request to Next.js API route...');
        console.log(`URL: ${TEST_CONFIG.next_api_url}`);
        console.log('Form data includes:');
        console.log(`  - project_id: ${TEST_CONFIG.project_id}`);
        console.log(`  - user_id: ${TEST_CONFIG.user_id}`);
        console.log(`  - project_name: ${TEST_CONFIG.project_name}`);
        console.log();

        const response = await fetch(TEST_CONFIG.next_api_url, {
            method: 'POST',
            body: formData
        });

        console.log('📥 Response from Next.js API:');
        console.log(`Status: ${response.status}`);
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ Next.js API request succeeded');
            
            // Check if project was updated
            if (result.cloudinary && result.cloudinary.database_update) {
                const dbUpdate = result.cloudinary.database_update;
                if (dbUpdate.success) {
                    console.log('🎯 PROJECT UPDATED SUCCESSFULLY!');
                    console.log(`   Updated Project ID: ${dbUpdate.project_id}`);
                    console.log(`   Expected Project ID: ${TEST_CONFIG.project_id}`);
                    console.log(`   Match: ${dbUpdate.project_id === TEST_CONFIG.project_id ? '✅ YES' : '❌ NO'}`);
                } else {
                    console.log('❌ Database update failed:');
                    console.log(`   Message: ${dbUpdate.message}`);
                }
            } else {
                console.log('⚠️ No database update info - project context may not be reaching Flask');
            }
        } else {
            console.log('❌ Next.js API request failed');
            const errorText = await response.text();
            console.log(`Error: ${errorText.substring(0, 200)}`);
        }

    } catch (error) {
        console.log(`❌ Error testing Next.js API: ${error.message}`);
    } finally {
        if (fs.existsSync(tempFile)) {
            fs.unlinkSync(tempFile);
        }
    }
}

async function testFlaskDirectly() {
    console.log('');
    console.log('🧪 Testing Flask Backend Directly (/process)');
    console.log('=' * 50);

    // Create test CSV data
    const csvData = `feature1,feature2,target
1,2,A
2,3,B
3,1,A`;

    const tempFile = 'temp_debug_flask.csv';
    fs.writeFileSync(tempFile, csvData);

    try {
        const formData = new FormData();
        
        // Add file
        formData.append('file', fs.createReadStream(tempFile), {
            filename: 'debug_test_flask.csv',
            contentType: 'text/csv'
        });
        
        // Add ML parameters
        formData.append('task_type', 'classification');
        formData.append('text_prompt', 'Direct Flask test classification');
        
        // Add project context
        formData.append('project_id', TEST_CONFIG.project_id);
        formData.append('user_id', TEST_CONFIG.user_id);
        formData.append('project_name', TEST_CONFIG.project_name);

        console.log('📤 Sending request directly to Flask...');
        console.log(`URL: ${TEST_CONFIG.flask_direct_url}`);
        console.log();

        const response = await fetch(TEST_CONFIG.flask_direct_url, {
            method: 'POST',
            body: formData
        });

        console.log('📥 Response from Flask:');
        console.log(`Status: ${response.status}`);
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ Flask request succeeded');
            
            // Check if project was updated
            if (result.cloudinary && result.cloudinary.database_update) {
                const dbUpdate = result.cloudinary.database_update;
                if (dbUpdate.success) {
                    console.log('🎯 PROJECT UPDATED BY FLASK!');
                    console.log(`   Updated Project ID: ${dbUpdate.project_id}`);
                    console.log(`   Expected Project ID: ${TEST_CONFIG.project_id}`);
                    console.log(`   Match: ${dbUpdate.project_id === TEST_CONFIG.project_id ? '✅ YES' : '❌ NO'}`);
                } else {
                    console.log('❌ Database update failed:');
                    console.log(`   Message: ${dbUpdate.message}`);
                }
            } else {
                console.log('⚠️ No database update info from Flask');
            }
        } else {
            console.log('❌ Flask request failed');
            const errorText = await response.text();
            console.log(`Error: ${errorText.substring(0, 200)}`);
        }

    } catch (error) {
        console.log(`❌ Error testing Flask directly: ${error.message}`);
        if (error.code === 'ECONNREFUSED') {
            console.log('💡 Make sure Flask is running: python app.py');
        }
    } finally {
        if (fs.existsSync(tempFile)) {
            fs.unlinkSync(tempFile);
        }
    }
}

async function runDebugTests() {
    console.log('🔍 DEBUG: Project Context Integration Flow');
    console.log('=' * 60);
    console.log('This script will test both paths to see where project context is lost:');
    console.log('1. Frontend → Next.js API → Flask (full path)');
    console.log('2. Direct → Flask (to verify Flask works)');
    console.log('');

    // Test Next.js API route first
    await testNextJSAPIRoute();
    
    // Test Flask directly
    await testFlaskDirectly();

    console.log('');
    console.log('=' * 60);
    console.log('💡 INTERPRETATION:');
    console.log('');
    console.log('If Flask direct test works but Next.js API test fails:');
    console.log('  → Issue is in Next.js API route forwarding');
    console.log('');
    console.log('If both tests fail:');
    console.log('  → Issue is in Flask backend project context handling');
    console.log('');
    console.log('If both tests succeed but frontend still creates new projects:');
    console.log('  → Issue is in frontend not sending project context');
    console.log('');
    console.log('Expected result: Both should update project 68e199ff6db56335399e64bc');
}

runDebugTests().catch(console.error);