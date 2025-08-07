const fs = require('fs');
require('dotenv').config();

const DATABASE_PATH = process.env.DATABASE_PATH || './database.db';
const backupFile = process.argv[2];

if (!backupFile) {
  console.error('❌ Please provide backup file path');
  console.log('Usage: npm run db:restore backup-file.db');
  process.exit(1);
}

try {
  console.log('🔄 Restoring database from backup...');
  
  if (!fs.existsSync(backupFile)) {
    console.error('❌ Backup file not found:', backupFile);
    process.exit(1);
  }
  
  // Create backup of current database if it exists
  if (fs.existsSync(DATABASE_PATH)) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const currentBackup = `${DATABASE_PATH}.backup-${timestamp}`;
    fs.copyFileSync(DATABASE_PATH, currentBackup);
    console.log(`📦 Current database backed up to: ${currentBackup}`);
  }
  
  fs.copyFileSync(backupFile, DATABASE_PATH);
  
  console.log(`✅ Database restored successfully from: ${backupFile}`);
  console.log(`📊 Size: ${(fs.statSync(DATABASE_PATH).size / 1024).toFixed(2)} KB`);
} catch (error) {
  console.error('❌ Error restoring database:', error.message);
  process.exit(1);
}
