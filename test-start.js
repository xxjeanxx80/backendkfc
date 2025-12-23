// Simple test script to check if backend can start
const { exec } = require('child_process');
const path = require('path');

console.log('Testing backend start...');
console.log('Current directory:', __dirname);

// Try to start backend and capture output
const child = exec('node dist/main.js', {
  cwd: __dirname,
  env: {
    ...process.env,
    NODE_ENV: 'development'
  }
}, (error, stdout, stderr) => {
  if (error) {
    console.error('Error:', error);
    return;
  }
  console.log('stdout:', stdout);
  console.error('stderr:', stderr);
});

child.stdout.on('data', (data) => {
  console.log(`stdout: ${data}`);
});

child.stderr.on('data', (data) => {
  console.error(`stderr: ${data}`);
});

child.on('close', (code) => {
  console.log(`Process exited with code ${code}`);
});

// Kill after 10 seconds
setTimeout(() => {
  child.kill();
  process.exit(0);
}, 10000);

