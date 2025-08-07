const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
require('dotenv').config();

const DATABASE_PATH = process.env.DATABASE_PATH || './database.db';
const email = process.argv[2];
const password = process.argv[3] || 'admin123';

if (!email) {
  console.error('❌ Please provide email address');
  console.log('Usage: npm run admin:create your-email@company.com [password]');
  process.exit(1);
}

console.log('👤 Creating admin user...');

const db = new Database(DATABASE_PATH);

try {
  // Check if user already exists
  const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  
  if (existingUser) {
    console.log('⚡ Updating existing user to admin...');
    
    // Update user to admin
    db.prepare('UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?')
      .run('admin', email);
    
    // Update or create role entry
    const existingRole = db.prepare('SELECT id FROM user_roles WHERE user_id = ?').get(existingUser.id);
    if (existingRole) {
      db.prepare('UPDATE user_roles SET role = ?, granted_by = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?')
        .run('admin', 'system', existingUser.id);
    } else {
      db.prepare('INSERT INTO user_roles (user_id, user_email, role, granted_by) VALUES (?, ?, ?, ?)')
        .run(existingUser.id, email, 'admin', 'system');
    }
    
    console.log(`✅ User ${email} updated to admin`);
  } else {
    console.log('➕ Creating new admin user...');
    
    const hashedPassword = bcrypt.hashSync(password, 10);
    
    const result = db.prepare(`
      INSERT INTO users (email, password_hash, first_name, last_name, role)
      VALUES (?, ?, ?, ?, ?)
    `).run(email, hashedPassword, 'Admin', 'User', 'admin');
    
    // Add role entry
    db.prepare(`
      INSERT INTO user_roles (user_id, user_email, role, granted_by)
      VALUES (?, ?, ?, ?)
    `).run(result.lastInsertRowid, email, 'admin', 'system');
    
    console.log(`✅ Admin user created successfully!`);
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Password: ${password}`);
    console.log(`⚠️  Please change the password after first login`);
  }
} catch (error) {
  console.error('❌ Error creating admin user:', error.message);
  process.exit(1);
} finally {
  db.close();
}
