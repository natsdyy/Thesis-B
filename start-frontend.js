#!/usr/bin/env node

// Script to start both frontend and backend services
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('Starting both frontend and backend services...');

// Check if we're in a Railway environment
const isRailway = process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID || process.env.RAILWAY_STATIC_URL || process.env.PORT;

// In Railway, we only need to start the backend since it serves the frontend
if (isRailway) {
  console.log('Railway environment detected - starting backend only (serves frontend)');
  const backendProcess = spawn('npm', ['start'], {
    cwd: path.join(__dirname, 'backend'),
    stdio: 'inherit',
    shell: true
  });

  backendProcess.on('error', (error) => {
    console.error('Failed to start backend:', error);
    process.exit(1);
  });

  backendProcess.on('exit', (code) => {
    console.log(`Backend process exited with code ${code}`);
    process.exit(code);
  });
} else {
  // Local development - start both services
  console.log('Local development - starting both frontend and backend');
  
  // Start backend first
  console.log('Starting backend server...');
  const backendProcess = spawn('npm', ['start'], {
    cwd: path.join(__dirname, 'backend'),
    stdio: 'inherit',
    shell: true
  });

  // Wait a moment for backend to start, then start frontend
  setTimeout(() => {
    console.log('Starting frontend preview server...');
    
    // Check if frontend dist directory exists
    const frontendDistPath = path.join(__dirname, 'frontend', 'dist');
    if (!fs.existsSync(frontendDistPath)) {
      console.error('Frontend dist directory not found. Please run "npm run build" first.');
      process.exit(1);
    }
    
    const frontendProcess = spawn('npm', ['run', 'preview'], {
      cwd: path.join(__dirname, 'frontend'),
      stdio: 'inherit',
      shell: true,
      env: {
        ...process.env,
        PORT: process.env.PORT || 8080
      }
    });

    frontendProcess.on('error', (error) => {
      console.error('Failed to start frontend:', error);
      process.exit(1);
    });

    frontendProcess.on('exit', (code) => {
      console.log(`Frontend process exited with code ${code}`);
      process.exit(code);
    });
  }, 3000); // Wait 3 seconds for backend to start

  backendProcess.on('error', (error) => {
    console.error('Failed to start backend:', error);
    process.exit(1);
  });

  backendProcess.on('exit', (code) => {
    console.log(`Backend process exited with code ${code}`);
    process.exit(code);
  });
}
