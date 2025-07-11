import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(
    import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
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

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});