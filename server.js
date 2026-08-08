const express = require('express');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const os = require('os');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'learning_notes_secret_2026';

// Render's filesystem is read-only except /tmp, so put DB there
const DB_DIR = path.join(os.tmpdir(), 'notes-data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}
const DB_PATH = path.join(DB_DIR, 'notes.db');

// ====== Middleware ======
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ====== Database Init ======
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    tags TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    word_count INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
  CREATE INDEX IF NOT EXISTS idx_notes_user ON notes(user_id);
`);

// ====== Auth Middleware ======
function auth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: '未登录' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    req.username = decoded.username;
    next();
  } catch(e) {
    return res.status(401).json({ error: '登录已过期，请重新登录' });
  }
}

// ====== Auth Routes ======
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: '用户名和密码不能为空' });
  if (username.length < 2) return res.status(400).json({ error: '用户名至少2个字符' });
  if (password.length < 4) return res.status(400).json({ error: '密码至少4个字符' });
  
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) return res.status(409).json({ error: '用户名已存在' });
  
  const hashed = bcrypt.hashSync(password, 10);
  const result = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run(username, hashed);
  
  const token = jwt.sign({ userId: result.lastInsertRowid, username }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, username, userId: result.lastInsertRowid });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: '用户名和密码不能为空' });
  
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) return res.status(401).json({ error: '用户名或密码错误' });
  
  if (!bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }
  
  const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, username: user.username, userId: user.id });
});

// ====== Note Routes ======
app.get('/api/notes', auth, (req, res) => {
  const notes = db.prepare('SELECT * FROM notes WHERE user_id = ? ORDER BY updated_at DESC').all(req.userId);
  const parsed = notes.map(n => ({ ...n, tags: n.tags ? JSON.parse(n.tags) : [] }));
  res.json(parsed);
});

app.post('/api/notes', auth, (req, res) => {
  const { id, title, content, tags, createdAt, updatedAt } = req.body;
  if (!id || !title) return res.status(400).json({ error: '缺少必填字段' });
  
  const tagsJson = JSON.stringify(tags || []);
  const wordCount = (content || '').length;
  
  db.prepare(`
    INSERT INTO notes (id, user_id, title, content, tags, created_at, updated_at, word_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      content = excluded.content,
      tags = excluded.tags,
      updated_at = excluded.updated_at,
      word_count = excluded.word_count
  `).run(id, req.userId, title, content || '', tagsJson, createdAt, updatedAt, wordCount);
  
  res.json({ success: true });
});

app.put('/api/notes/:id', auth, (req, res) => {
  const { title, content, tags, updatedAt } = req.body;
  const note = db.prepare('SELECT * FROM notes WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!note) return res.status(404).json({ error: '笔记不存在' });
  
  const tagsJson = JSON.stringify(tags || []);
  const wordCount = (content || '').length;
  
  db.prepare('UPDATE notes SET title = ?, content = ?, tags = ?, updated_at = ?, word_count = ? WHERE id = ? AND user_id = ?')
    .run(title || note.title, content || '', tagsJson, updatedAt || new Date().toISOString(), wordCount, req.params.id, req.userId);
  
  res.json({ success: true });
});

app.delete('/api/notes/:id', auth, (req, res) => {
  db.prepare('DELETE FROM notes WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.json({ success: true });
});

// ====== Serve Frontend ======
app.use(express.static(__dirname));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ====== Start ======
app.listen(PORT, '0.0.0.0', () => {
  console.log('Server running on port ' + PORT);
});
