
import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// HTTPS options
const options = {
  key: fs.readFileSync(path.join(__dirname, '../key.pem')),
  cert: fs.readFileSync(path.join(__dirname, '../cert.pem'))
};

// Middleware
app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Explicitly handle preflight requests
app.options('*', cors());
app.use(express.json());

// Initialize SQLite database
const db = new sqlite3.Database(path.join(__dirname, 'lathe_data.db'));

// Create tables
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS storage (
    key TEXT PRIMARY KEY,
    value TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

// Routes
app.post('/api/storage', (req, res) => {
    const { key, value } = req.body;
    db.run(
        'INSERT OR REPLACE INTO storage (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)', [key, value],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ success: true });
        }
    );
});

app.get('/api/storage/keys', (req, res) => {
    const { prefix } = req.query;
    let query = 'SELECT key FROM storage';
    let params = [];
    if (prefix) {
        query += ' WHERE key LIKE ?';
        params.push(`${prefix}%`);
    }
    console.log('Query:', query, 'Params:', params); // Debug log
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        console.log('Found rows:', rows); // Debug log
        const keys = rows.map(row => row.key);
        console.log('Returning keys:', keys); // Debug log
        res.json({ keys });
    });
});

app.get('/api/storage/:key', (req, res) => {
    const { key } = req.params;
    db.get('SELECT value FROM storage WHERE key = ?', [key], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ value: row ? row.value : null });
    });
});

app.delete('/api/storage/:key', (req, res) => {
    const { key } = req.params;
    db.run('DELETE FROM storage WHERE key = ?', [key], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ success: true });
    });
});

// Start HTTPS server
https.createServer(options, app).listen(PORT, '0.0.0.0', () => {
    console.log(`HTTPS Server running on port ${PORT}`);
    console.log(`Local access: https://localhost:${PORT}`);
    console.log(`Network access: https://192.168.0.121:${PORT}`);
});