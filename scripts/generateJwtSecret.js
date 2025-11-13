import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generate a cryptographically secure random JWT secret
 * @param {number} length - Length of the secret (default: 64)
 * @returns {string} - Random JWT secret
 */
const generateJwtSecret = (length = 64) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Update .env file with new JWT secret
 */
const updateEnvFile = (newSecret) => {
  const envPath = path.join(__dirname, '..', '.env');
  
  try {
    // Read current .env file
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Find and replace JWT_SECRET line
    const jwtSecretRegex = /JWT_SECRET=.*/;
    const newJwtSecretLine = `JWT_SECRET=${newSecret}`;
    
    if (envContent.match(jwtSecretRegex)) {
      envContent = envContent.replace(jwtSecretRegex, newJwtSecretLine);
      console.log('✅ Found existing JWT_SECRET - Updating...');
    } else {
      // If JWT_SECRET doesn't exist, add it after NODE_ENV
      const lines = envContent.split('\n');
      const nodeEnvIndex = lines.findIndex(line => line.startsWith('NODE_ENV='));
      
      if (nodeEnvIndex !== -1) {
        lines.splice(nodeEnvIndex + 1, 0, '', `# JWT Secret (Generated: ${new Date().toLocaleString()})`, newJwtSecretLine, 'JWT_EXPIRE=7d');
        envContent = lines.join('\n');
        console.log('✅ Added new JWT_SECRET to .env file');
      }
    }
    
    // Write back to .env file
    fs.writeFileSync(envPath, envContent, 'utf8');
    return true;
  } catch (error) {
    console.error('❌ Error updating .env file:', error.message);
    return false;
  }
};

// Main execution
const main = () => {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  🔐 JWT Secret Generator');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  
  // Generate multiple secrets for different security levels
  const secret32 = generateJwtSecret(16);  // 32 characters (hex)
  const secret64 = generateJwtSecret(32);  // 64 characters (hex)
  const secret128 = generateJwtSecret(64); // 128 characters (hex) - RECOMMENDED
  
  console.log('📋 Generated JWT Secrets:');
  console.log('');
  console.log('1️⃣  Basic (32 characters):');
  console.log(`    ${secret32}`);
  console.log('');
  console.log('2️⃣  Standard (64 characters):');
  console.log(`    ${secret64}`);
  console.log('');
  console.log('3️⃣  Strong (128 characters) - ⭐ RECOMMENDED:');
  console.log(`    ${secret128}`);
  console.log('');
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  📝 Updating .env file...');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  
  // Use the strongest secret (128 characters)
  const success = updateEnvFile(secret128);
  
  if (success) {
    console.log('✅ SUCCESS! .env file updated with new JWT_SECRET');
    console.log('');
    console.log('🔒 Your new JWT Secret (128 characters):');
    console.log(`   ${secret128}`);
    console.log('');
    console.log('📌 Security Tips:');
    console.log('   • NEVER commit .env file to Git');
    console.log('   • Keep this secret safe and confidential');
    console.log('   • Change it regularly in production');
    console.log('   • Use different secrets for dev/staging/production');
    console.log('');
    console.log('🎯 Next Steps:');
    console.log('   1. Restart your backend server');
    console.log('   2. All existing JWT tokens will be invalidated');
    console.log('   3. Users will need to login again');
    console.log('');
  } else {
    console.log('❌ FAILED to update .env file');
    console.log('');
    console.log('📝 Manual Update Required:');
    console.log('   Copy this secret and paste it in your .env file:');
    console.log('');
    console.log(`   JWT_SECRET=${secret128}`);
    console.log('');
  }
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
};

// Run the generator
main();
