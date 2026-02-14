import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

sqlite3.verbose();

const DB_PATH = path.join(__dirname, '../../sqlite_data/app.db');

const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Failed to connect to SQLite:', err.message);
  } else {
    console.log('Connected to SQLite database.');
  }
});

export const initDB = () => {
  const schemaPath = path.join(__dirname, './schema.sql');

  if (!fs.existsSync(schemaPath)) {
    throw new Error('schema.sql not found.');
  }

  const schema = fs.readFileSync(schemaPath, 'utf-8');

  db.exec(schema, (err) => {
    if (err) {
      console.error('❌ Failed to initialize schema:', err.message);
    } else {
      console.log('✅ Database schema initialized.');
    }
  });
};
