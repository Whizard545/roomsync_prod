const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const Database = require('better-sqlite3');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const DATABASE_PATH = process.env.DATABASE_PATH || './database.db';
const UPLOAD_PATH = process.env.UPLOAD_PATH || './uploads';

// Initialize database
const db = new Database(DATABASE_PATH);
db.pragma('journal_mode = WAL');

// Initialize database schema
const initSchema = () => {
  const schema = `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      first_name TEXT,
      last_name TEXT,
      role TEXT DEFAULT 'user',
      is_active BOOLEAN DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      capacity INTEGER,
      equipment TEXT,
      location_x REAL,
      location_y REAL,
      is_active BOOLEAN DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      user_email TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      start_time DATETIME NOT NULL,
      end_time DATETIME NOT NULL,
      is_cancelled BOOLEAN DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (room_id) REFERENCES rooms (id),
      FOREIGN KEY (user_id) REFERENCES users (id)
    );

    CREATE TABLE IF NOT EXISTS office_maps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      file_url TEXT NOT NULL,
      is_active BOOLEAN DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      user_email TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      granted_by TEXT,
      granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    );
  `;
  
  db.exec(schema);
  
  // Create default admin user if not exists
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@company.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  
  const existingAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);
  if (!existingAdmin) {
    const hashedPassword = bcrypt.hashSync(adminPassword, 10);
    const result = db.prepare(`
      INSERT INTO users (email, password_hash, first_name, last_name, role)
      VALUES (?, ?, ?, ?, ?)
    `).run(adminEmail, hashedPassword, 'Admin', 'User', 'admin');
    
    // Add role entry
    db.prepare(`
      INSERT INTO user_roles (user_id, user_email, role, granted_by)
      VALUES (?, ?, ?, ?)
    `).run(result.lastInsertRowid, adminEmail, 'admin', 'system');
    
    console.log(`✓ Admin user created: ${adminEmail} / ${adminPassword}`);
  }
};

// Create uploads directory
if (!fs.existsSync(UPLOAD_PATH)) {
  fs.mkdirSync(UPLOAD_PATH, { recursive: true });
}

// Initialize schema
initSchema();

// Middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : true,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session management
app.use(session({
  store: new SQLiteStore({ db: 'sessions.db', dir: './database' }),
  secret: process.env.SESSION_SECRET || 'change-this-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_PATH);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `office-map-${timestamp}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Только изображения разрешены'));
    }
  }
});

// Authentication middleware
const authMiddleware = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.user = req.session.user;
  next();
};

// Admin middleware
const adminMiddleware = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email и пароль обязательны' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ? AND is_active = 1').get(email);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    // Store user in session
    req.session.user = {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role
    };

    res.json({
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, first_name, last_name } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email и пароль обязательны' });
    }

    // Check if user exists
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(409).json({ error: 'Пользователь с таким email уже существует' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const result = db.prepare(`
      INSERT INTO users (email, password_hash, first_name, last_name)
      VALUES (?, ?, ?, ?)
    `).run(email, hashedPassword, first_name, last_name);

    // Add default user role
    db.prepare(`
      INSERT INTO user_roles (user_id, user_email, role)
      VALUES (?, ?, ?)
    `).run(result.lastInsertRowid, email, 'user');

    res.status(201).json({ message: 'Пользователь создан успешно' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/users/me', authMiddleware, (req, res) => {
  res.json(req.user);
});

app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Could not log out' });
    }
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

// Rooms endpoints
app.get('/api/rooms', authMiddleware, (req, res) => {
  try {
    const rooms = db.prepare('SELECT * FROM rooms WHERE is_active = 1 ORDER BY name').all();
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

app.post('/api/rooms', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { name, description, capacity, equipment, location_x, location_y } = req.body;
    
    const result = db.prepare(`
      INSERT INTO rooms (name, description, capacity, equipment, location_x, location_y)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(name, description || null, capacity || null, equipment || null, location_x || null, location_y || null);

    res.status(201).json({ id: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// Bookings endpoints
app.get('/api/bookings', authMiddleware, (req, res) => {
  try {
    const bookings = db.prepare(`
      SELECT b.*, r.name as room_name 
      FROM bookings b 
      JOIN rooms r ON b.room_id = r.id 
      WHERE b.is_cancelled = 0 
      ORDER BY b.start_time
    `).all();
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

app.post('/api/bookings', authMiddleware, (req, res) => {
  try {
    const { room_id, title, description, start_time, end_time } = req.body;
    
    // Check for conflicts
    const conflicts = db.prepare(`
      SELECT id FROM bookings 
      WHERE room_id = ? AND is_cancelled = 0 
      AND ((start_time <= ? AND end_time > ?) OR (start_time < ? AND end_time >= ?))
    `).all(room_id, start_time, start_time, end_time, end_time);

    if (conflicts.length > 0) {
      return res.status(409).json({ error: 'Комната уже забронирована на это время' });
    }
    
    const result = db.prepare(`
      INSERT INTO bookings (room_id, user_id, user_email, title, description, start_time, end_time)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(room_id, req.user.id, req.user.email, title, description || null, start_time, end_time);

    res.status(201).json({ id: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// Office map endpoints
app.get('/api/office-map', authMiddleware, (req, res) => {
  try {
    const map = db.prepare('SELECT * FROM office_maps WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1').get();
    res.json(map || null);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch office map' });
  }
});

// Admin endpoints
app.get('/api/admin/check-access', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  res.json({ success: true });
});

app.get('/api/admin/stats', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE is_active = 1').get().count;
    const totalRooms = db.prepare('SELECT COUNT(*) as count FROM rooms WHERE is_active = 1').get().count;
    const totalBookings = db.prepare('SELECT COUNT(*) as count FROM bookings WHERE is_cancelled = 0').get().count;
    const activeBookingsToday = db.prepare(`
      SELECT COUNT(*) as count FROM bookings 
      WHERE is_cancelled = 0 AND DATE(start_time) = DATE('now')
    `).get().count;

    res.json({
      totalUsers,
      totalRooms,
      totalBookings,
      activeBookingsToday
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

app.get('/api/admin/users', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const users = db.prepare(`
      SELECT u.*, ur.role, ur.granted_by, ur.granted_at 
      FROM users u 
      LEFT JOIN user_roles ur ON u.id = ur.user_id 
      WHERE u.is_active = 1 
      ORDER BY u.created_at DESC
    `).all();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.post('/api/admin/users', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { email, role, password } = req.body;
    
    // Check if user exists
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(409).json({ error: 'Пользователь уже существует' });
    }

    const defaultPassword = password || 'password123';
    const hashedPassword = bcrypt.hashSync(defaultPassword, 10);
    
    const result = db.prepare(`
      INSERT INTO users (email, password_hash, role)
      VALUES (?, ?, ?)
    `).run(email, hashedPassword, role);

    // Add role entry
    db.prepare(`
      INSERT INTO user_roles (user_id, user_email, role, granted_by)
      VALUES (?, ?, ?, ?)
    `).run(result.lastInsertRowid, email, role, req.user.email);

    res.status(201).json({ id: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

app.put('/api/admin/users/role', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { userId, role } = req.body;
    
    db.prepare('UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(role, userId);
    db.prepare('UPDATE user_roles SET role = ?, granted_by = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?')
      .run(role, req.user.email, userId);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

app.get('/api/admin/rooms', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const rooms = db.prepare('SELECT * FROM rooms ORDER BY name').all();
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

app.post('/api/admin/rooms', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { name, description, capacity, equipment, location_x, location_y } = req.body;
    
    const result = db.prepare(`
      INSERT INTO rooms (name, description, capacity, equipment, location_x, location_y)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(name, description || null, capacity || null, equipment || null, location_x || null, location_y || null);

    res.status(201).json({ id: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create room' });
  }
});

app.delete('/api/admin/rooms/:id', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const roomId = req.params.id;
    
    // Check for active bookings
    const activeBookings = db.prepare(`
      SELECT id FROM bookings 
      WHERE room_id = ? AND is_cancelled = 0 AND datetime(end_time) > datetime('now')
    `).all(roomId);

    if (activeBookings.length > 0) {
      return res.status(409).json({ error: 'Нельзя удалить комнату с активными бронированиями' });
    }

    db.prepare('UPDATE rooms SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(roomId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete room' });
  }
});

app.get('/api/admin/office-map', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const map = db.prepare('SELECT * FROM office_maps WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1').get();
    res.json(map || null);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch office map' });
  }
});

app.post('/api/admin/office-map', authMiddleware, adminMiddleware, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не найден' });
    }

    // Deactivate previous maps
    db.prepare('UPDATE office_maps SET is_active = 0, updated_at = CURRENT_TIMESTAMP').run();

    // Create file URL
    const fileUrl = `/uploads/${req.file.filename}`;

    // Insert new map
    const result = db.prepare(`
      INSERT INTO office_maps (filename, original_name, file_url)
      VALUES (?, ?, ?)
    `).run(req.file.filename, req.file.originalname, fileUrl);

    res.status(201).json({ id: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload office map' });
  }
});

// Serve uploaded files
app.use('/uploads', express.static(UPLOAD_PATH));

// Serve built frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../dist/index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 RoomSync server running on port ${PORT}`);
  console.log(`📊 Database: ${DATABASE_PATH}`);
  console.log(`📁 Uploads: ${UPLOAD_PATH}`);
  console.log(`🔒 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⚡ Shutting down server...');
  db.close();
  process.exit(0);
});
