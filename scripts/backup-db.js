const fs = require('fs');
const path = require('path');
require('dotenv').config();

const DATABASE_PATH = process.env.DATABASE_PATH || './database.db';
const BACKUP_DIR = './backups';

// Create backup directory if it doesn't exist
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = path.join(BACKUP_DIR, `roomsync-backup-${timestamp}.db`);

try {
  console.log('📦 Creating database backup...');
  
  if (!fs.existsSync(DATABASE_PATH)) {
    console.error('❌ Database file not found:', DATABASE_PATH);
    process.exit(1);
  }
  
  fs.copyFileSync(DATABASE_PATH, backupPath);
  
  console.log(`✅ Backup created successfully: ${backupPath}`);
  console.log(`📊 Size: ${(fs.statSync(backupPath).size / 1024).toFixed(2)} KB`);
} catch (error) {
  console.error('❌ Error creating backup:', error.message);
  process.exit(1);
}
