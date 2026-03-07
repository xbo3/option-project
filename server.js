const express = require('express');
const multer = require('multer');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Railway 볼륨 또는 로컬
const dataDir = process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const uploadDir = path.join(dataDir, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// SQLite DB
const db = new Database(path.join(dataDir, 'option.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS sites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    image TEXT DEFAULT '',
    category TEXT DEFAULT 'casino',
    first_bonus REAL DEFAULT 0,
    reload_bonus REAL DEFAULT 0,
    cashback REAL DEFAULT 0,
    allin_bonus REAL DEFAULT 0,
    join_bonus INTEGER DEFAULT 0,
    rolling REAL DEFAULT 0,
    event_count INTEGER DEFAULT 0,
    insurance INTEGER DEFAULT 0,
    option_pkg INTEGER DEFAULT 0,
    rating REAL DEFAULT 0,
    reviews INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    link TEXT DEFAULT '',
    description TEXT DEFAULT '',
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now', '+9 hours'))
  )
`);

// data.json 마이그레이션 (최초 1회)
const oldDataFile = path.join(__dirname, 'data.json');
if (fs.existsSync(oldDataFile)) {
  try {
    const old = JSON.parse(fs.readFileSync(oldDataFile, 'utf8'));
    if (old.sites && old.sites.length > 0) {
      const existing = db.prepare('SELECT COUNT(*) as cnt FROM sites').get();
      if (existing.cnt === 0) {
        const insert = db.prepare(`INSERT INTO sites (name, image, category, first_bonus, reload_bonus, cashback, allin_bonus, join_bonus, rolling, event_count, insurance, option_pkg) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        for (const s of old.sites) {
          insert.run(s.name, s.image || '', s.category || 'casino', s.firstBonus || 0, s.reloadBonus || 0, s.cashback || 0, s.allinBonus || 0, s.joinBonus || 0, s.rolling || 0, s.eventCount || 0, s.insurance ? 1 : 0, s.option ? 1 : 0);
        }
        console.log(`Migrated ${old.sites.length} sites from data.json`);
      }
    }
  } catch (e) { console.log('data.json migration skip:', e.message); }
}

// 업로드 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static(uploadDir));

// === API ===

// 전체 목록
app.get('/api/sites', (req, res) => {
  const { category, active } = req.query;
  let sql = 'SELECT * FROM sites';
  const conditions = [];
  const params = [];

  if (category && category !== 'all') {
    conditions.push('category = ?');
    params.push(category);
  }
  if (active !== undefined) {
    conditions.push('active = ?');
    params.push(parseInt(active));
  }

  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY sort_order DESC, id DESC';

  const sites = db.prepare(sql).all(...params);
  res.json(sites.map(s => ({
    id: s.id,
    name: s.name,
    image: s.image,
    category: s.category,
    firstBonus: s.first_bonus,
    reloadBonus: s.reload_bonus,
    cashback: s.cashback,
    allinBonus: s.allin_bonus,
    joinBonus: s.join_bonus,
    rolling: s.rolling,
    eventCount: s.event_count,
    insurance: !!s.insurance,
    option: !!s.option_pkg,
    rating: s.rating,
    reviews: s.reviews,
    sortOrder: s.sort_order,
    link: s.link,
    description: s.description,
    active: !!s.active,
    createdAt: s.created_at
  })));
});

// 단건 조회
app.get('/api/sites/:id', (req, res) => {
  const site = db.prepare('SELECT * FROM sites WHERE id = ?').get(req.params.id);
  if (!site) return res.status(404).json({ error: 'not found' });
  res.json(site);
});

// 등록
app.post('/api/sites', upload.single('image'), (req, res) => {
  const b = req.body;
  const image = req.file ? '/uploads/' + req.file.filename : (b.image || '');
  const result = db.prepare(`
    INSERT INTO sites (name, image, category, first_bonus, reload_bonus, cashback, allin_bonus, join_bonus, rolling, event_count, insurance, option_pkg, sort_order, link, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    b.name || '', image, b.category || 'casino',
    parseFloat(b.firstBonus) || 0, parseFloat(b.reloadBonus) || 0,
    parseFloat(b.cashback) || 0, parseFloat(b.allinBonus) || 0,
    parseInt(b.joinBonus) || 0, parseFloat(b.rolling) || 0,
    parseInt(b.eventCount) || 0,
    b.insurance === 'true' || b.insurance === true ? 1 : 0,
    b.option === 'true' || b.option === true ? 1 : 0,
    parseInt(b.sortOrder) || 0, b.link || '', b.description || ''
  );
  res.json({ ok: true, id: result.lastInsertRowid });
});

// 수정
app.put('/api/sites/:id', upload.single('image'), (req, res) => {
  const b = req.body;
  const existing = db.prepare('SELECT * FROM sites WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'not found' });

  const image = req.file ? '/uploads/' + req.file.filename : (b.image !== undefined ? b.image : existing.image);

  db.prepare(`
    UPDATE sites SET name=?, image=?, category=?, first_bonus=?, reload_bonus=?, cashback=?, allin_bonus=?, join_bonus=?, rolling=?, event_count=?, insurance=?, option_pkg=?, sort_order=?, link=?, description=?, active=?
    WHERE id=?
  `).run(
    b.name || existing.name, image, b.category || existing.category,
    b.firstBonus !== undefined ? parseFloat(b.firstBonus) : existing.first_bonus,
    b.reloadBonus !== undefined ? parseFloat(b.reloadBonus) : existing.reload_bonus,
    b.cashback !== undefined ? parseFloat(b.cashback) : existing.cashback,
    b.allinBonus !== undefined ? parseFloat(b.allinBonus) : existing.allin_bonus,
    b.joinBonus !== undefined ? parseInt(b.joinBonus) : existing.join_bonus,
    b.rolling !== undefined ? parseFloat(b.rolling) : existing.rolling,
    b.eventCount !== undefined ? parseInt(b.eventCount) : existing.event_count,
    b.insurance === 'true' || b.insurance === true ? 1 : (b.insurance === 'false' || b.insurance === false ? 0 : existing.insurance),
    b.option === 'true' || b.option === true ? 1 : (b.option === 'false' || b.option === false ? 0 : existing.option_pkg),
    b.sortOrder !== undefined ? parseInt(b.sortOrder) : existing.sort_order,
    b.link !== undefined ? b.link : existing.link,
    b.description !== undefined ? b.description : existing.description,
    b.active !== undefined ? (b.active === 'true' || b.active === true ? 1 : 0) : existing.active,
    req.params.id
  );
  res.json({ ok: true });
});

// 삭제
app.delete('/api/sites/:id', (req, res) => {
  db.prepare('DELETE FROM sites WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// 순서 변경
app.post('/api/sites/reorder', (req, res) => {
  const { orders } = req.body;
  if (!Array.isArray(orders)) return res.status(400).json({ error: 'orders required' });
  const stmt = db.prepare('UPDATE sites SET sort_order = ? WHERE id = ?');
  const tx = db.transaction(() => {
    for (const o of orders) stmt.run(o.sortOrder, o.id);
  });
  tx();
  res.json({ ok: true });
});

app.listen(PORT, () => console.log('OPTION v4 running on port ' + PORT + ' | data: ' + dataDir));
