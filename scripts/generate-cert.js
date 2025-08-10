const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Create certs directory if it doesn't exist
const certsDir = path.join(__dirname, '..', 'certs');
if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir);
}

// Generate self-signed certificate using OpenSSL
try {
  console.log('Generating self-signed certificate for api.local...');
  
  const keyPath = path.join(certsDir, 'api.local.key');
  const certPath = path.join(certsDir, 'api.local.crt');
  
  // Generate private key
  execSync(`openssl genrsa -out "${keyPath}" 2048`, { stdio: 'inherit' });
  
  // Generate certificate
  execSync(`openssl req -new -x509 -key "${keyPath}" -out "${certPath}" -days 365 -subj "/C=US/ST=Dev/L=Dev/O=IronLogic/CN=api.local"`, { stdio: 'inherit' });
  
  console.log('✅ Certificate generated successfully!');
  console.log(`Key: ${keyPath}`);
  console.log(`Cert: ${certPath}`);
  
} catch (error) {
  console.error('❌ Error generating certificate:', error.message);
  console.log('\nNote: This requires OpenSSL to be installed on your system.');
  console.log('On macOS: brew install openssl');
  console.log('On Ubuntu: apt-get install openssl');
}