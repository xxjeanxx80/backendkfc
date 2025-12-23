// Simple test script to check if backend responds
const http = require('http');

console.log('Testing backend connection...');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/',
  method: 'GET',
  timeout: 5000,
};

const req = http.request(options, (res) => {
  console.log(`✅ Status Code: ${res.statusCode}`);
  console.log(`✅ Headers:`, res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log(`✅ Response Body: ${data}`);
    process.exit(0);
  });
});

req.on('error', (error) => {
  console.error(`❌ Error: ${error.message}`);
  process.exit(1);
});

req.on('timeout', () => {
  console.error('❌ Request timeout');
  req.destroy();
  process.exit(1);
});

req.end();

