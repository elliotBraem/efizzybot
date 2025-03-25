#!/usr/bin/env node
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Path to the dist directory
const distDir = path.join(__dirname, '../dist');
const mainJsPath = path.join(distDir, 'main.js');

let serverProcess = null;

// Function to start or restart the server
function startServer() {
  // Kill existing server process if it exists
  if (serverProcess) {
    console.log('🔄 Restarting server...');
    serverProcess.kill();
  }

  // Start the server
  serverProcess = spawn('node', [mainJsPath], {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development' }
  });

  serverProcess.on('error', (error) => {
    console.error('Failed to start server:', error);
  });

  serverProcess.on('exit', (code, signal) => {
    if (signal !== 'SIGTERM') {
      console.log(`Server process exited with code ${code} and signal ${signal}`);
    }
  });
}

// Track if this is the first build
let initialBuildTime = 0;

// Initial server start
// Wait a bit to ensure the initial build is complete
setTimeout(() => {
  if (fs.existsSync(mainJsPath)) {
    // Record the initial build time
    initialBuildTime = fs.statSync(mainJsPath).mtimeMs;
    startServer();
    
    // Start watching for changes after the initial server start
    setupWatcher();
  } else {
    console.error(`❌ Server entry point not found at ${mainJsPath}`);
    console.log('Make sure to run "rspack build --watch" first');
    process.exit(1);
  }
}, 1000);

// Setup file watcher after initial server start
function setupWatcher() {
  let debounceTimer;
  
  // Watch for changes in the dist directory
  fs.watch(distDir, { recursive: true }, (eventType, filename) => {
    // Debounce to avoid multiple restarts for the same build
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (filename && filename.endsWith('.js')) {
        // Check if this is a new build (not the initial one)
        const currentMtime = fs.statSync(path.join(distDir, filename)).mtimeMs;
        
        // Only restart if this is a new change (not the initial build)
        if (currentMtime > initialBuildTime) {
          console.log(`📦 Detected changes in ${filename}`);
          startServer();
          // Update the last build time
          initialBuildTime = currentMtime;
        }
      }
    }, 500); // 500ms debounce
  });
}

// Handle process termination
process.on('SIGINT', () => {
  if (serverProcess) {
    console.log('Shutting down server...');
    serverProcess.kill('SIGTERM');
  }
  process.exit(0);
});
