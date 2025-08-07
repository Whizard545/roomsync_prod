const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config();

const DATABASE_PATH = process.env.DATABASE_PATH || './database.db';

console.log('🗄️  Initializing database...');

const db = new Database(DATABASE_PATH);
db.pragma('journal_mode = WAL');

// Create schema
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

console.log('✅ Database schema created successfully');

// Create sample data
const sampleRooms = [
  { name: 'Переговорная 1', description: 'Малая переговорная комната', capacity: 4, equipment: 'Телевизор, доска' },
  { name: 'Переговорная 2', description: 'Большая переговорная комната', capacity: 8, equipment: 'Проектор, видеосвязь' },
  { name: 'Зал совещаний', description: 'Основной зал для больших встреч', capacity: 20, equipment: 'Проектор, микрофоны, видеосвязь' }
];

const insertRoom = db.prepare(`
  INSERT OR IGNORE INTO rooms (name, description, capacity, equipment)
  VALUES (?, ?, ?, ?)
`);

sampleRooms.forEach(room => {
  insertRoom.run(room.name, room.description, room.capacity, room.equipment);
});

console.log('✅ Sample rooms created');

db.close();
console.log('🎉 Database initialization complete!');
