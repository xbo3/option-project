const express = require('express');
const multer = require('multer');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'option-community-2026-secret';

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

// users 테이블
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT DEFAULT '',
    role TEXT DEFAULT 'user',
    created_at TEXT DEFAULT (datetime('now', '+9 hours'))
  )
`);

// sites 확장 컬럼 (기존 DB 호환)
const addCol = (table, col, type) => {
  try { db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`); } catch {}
};
addCol('sites', 'user_id', 'INTEGER DEFAULT 0');
addCol('sites', 'mobile_image', "TEXT DEFAULT ''");
addCol('sites', 'method_image', "TEXT DEFAULT ''");
addCol('sites', 'every_bonus', 'REAL DEFAULT 0');
addCol('sites', 'exchange_bonus', 'REAL DEFAULT 0');
addCol('sites', 'rolling_sports', 'REAL DEFAULT 0');
addCol('sites', 'rolling_casino', 'REAL DEFAULT 0');
addCol('sites', 'rolling_slot', 'REAL DEFAULT 0');
addCol('sites', 'first_bonus_on', 'INTEGER DEFAULT 0');
addCol('sites', 'reload_bonus_on', 'INTEGER DEFAULT 0');
addCol('sites', 'allin_bonus_on', 'INTEGER DEFAULT 0');
addCol('sites', 'join_bonus_on', 'INTEGER DEFAULT 0');
addCol('sites', 'every_bonus_on', 'INTEGER DEFAULT 0');
addCol('sites', 'exchange_bonus_on', 'INTEGER DEFAULT 0');
addCol('sites', 'status', "TEXT DEFAULT 'pending'");

// 간단 JWT + 해시
function sha256(s) { return crypto.createHash('sha256').update(s).digest('hex'); }
function makeToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 24 * 60 * 60 * 1000 })).toString('base64url');
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(header + '.' + body).digest('base64url');
  return header + '.' + body + '.' + sig;
}
function verifyToken(token) {
  try {
    const [header, body, sig] = token.split('.');
    const expected = crypto.createHmac('sha256', JWT_SECRET).update(header + '.' + body).digest('base64url');
    if (sig !== expected) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch { return null; }
}

// 인증 미들웨어
function auth(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  const user = verifyToken(token);
  if (!user) return res.status(401).json({ error: '로그인 필요' });
  req.user = user;
  next();
}
function adminAuth(req, res, next) {
  auth(req, res, () => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: '권한 없음' });
    next();
  });
}

// 초기 어드민 생성
(function initAdmin() {
  const existing = db.prepare("SELECT id FROM users WHERE role = 'admin'").get();
  if (!existing) {
    db.prepare('INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)').run(
      'admin', sha256('admin2026@@'), '관리자', 'admin'
    );
    console.log('초기 어드민 생성: admin / admin2026@@');
  }
})();

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
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static(uploadDir));

// 업체등록용 이미지 2개
const siteUpload = upload.fields([
  { name: 'mobileImage', maxCount: 1 },
  { name: 'methodImage', maxCount: 1 }
]);

// ===== 인증 API =====
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?').get(username, sha256(password));
  if (!user) return res.status(401).json({ error: '아이디/비밀번호 확인' });
  const token = makeToken({ id: user.id, username: user.username, name: user.name, role: user.role });
  res.json({ ok: true, token, user: { id: user.id, username: user.username, name: user.name, role: user.role } });
});

app.get('/api/auth/me', auth, (req, res) => {
  res.json({ ok: true, user: req.user });
});

app.post('/api/auth/register', (req, res) => {
  const { username, password, name } = req.body;
  if (!username || !password) return res.status(400).json({ error: '아이디/비밀번호 필수' });
  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (exists) return res.status(409).json({ error: '이미 존재하는 아이디' });
  const result = db.prepare('INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)').run(
    username, sha256(password), name || username, 'user'
  );
  const user = { id: result.lastInsertRowid, username, name: name || username, role: 'user' };
  const token = makeToken(user);
  res.json({ ok: true, token, user });
});

// ===== 사이트(업체) API =====

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

// 업체 등록 (로그인 필요)
app.post('/api/sites', auth, siteUpload, (req, res) => {
  const b = req.body;
  const mobileImage = req.files?.mobileImage?.[0] ? '/uploads/' + req.files.mobileImage[0].filename : '';
  const methodImage = req.files?.methodImage?.[0] ? '/uploads/' + req.files.methodImage[0].filename : '';
  const image = mobileImage || (b.image || '');
  const result = db.prepare(`
    INSERT INTO sites (name, image, mobile_image, method_image, category,
      first_bonus, first_bonus_on, reload_bonus, reload_bonus_on,
      allin_bonus, allin_bonus_on, join_bonus, join_bonus_on,
      every_bonus, every_bonus_on, exchange_bonus, exchange_bonus_on,
      rolling_sports, rolling_casino, rolling_slot, rolling,
      cashback, event_count, insurance, option_pkg, sort_order, link, description,
      user_id, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    b.name || '', image, mobileImage, methodImage, b.category || 'casino',
    b.firstBonusOn === 'true' ? (parseFloat(b.firstBonus) || 0) : 0, b.firstBonusOn === 'true' ? 1 : 0,
    b.reloadBonusOn === 'true' ? (parseFloat(b.reloadBonus) || 0) : 0, b.reloadBonusOn === 'true' ? 1 : 0,
    b.allinBonusOn === 'true' ? (parseFloat(b.allinBonus) || 0) : 0, b.allinBonusOn === 'true' ? 1 : 0,
    b.joinBonusOn === 'true' ? (parseFloat(b.joinBonus) || 0) : 0, b.joinBonusOn === 'true' ? 1 : 0,
    b.everyBonusOn === 'true' ? (parseFloat(b.everyBonus) || 0) : 0, b.everyBonusOn === 'true' ? 1 : 0,
    b.exchangeBonusOn === 'true' ? (parseFloat(b.exchangeBonus) || 0) : 0, b.exchangeBonusOn === 'true' ? 1 : 0,
    parseFloat(b.rollingSports) || 0, parseFloat(b.rollingCasino) || 0, parseFloat(b.rollingSlot) || 0,
    parseFloat(b.rolling) || 0,
    parseFloat(b.cashback) || 0, parseInt(b.eventCount) || 0,
    b.insurance === 'true' ? 1 : 0, b.option === 'true' ? 1 : 0,
    parseInt(b.sortOrder) || 0, b.link || '', b.description || '',
    req.user.id, 'pending'
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

// 업체 승인 (어드민만)
app.put('/api/sites/:id/approve', adminAuth, (req, res) => {
  const site = db.prepare('SELECT id FROM sites WHERE id = ?').get(req.params.id);
  if (!site) return res.status(404).json({ error: '업체 없음' });
  db.prepare("UPDATE sites SET status = 'approved' WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// 어드민: 유저 관리
app.get('/api/admin/users', adminAuth, (req, res) => {
  const users = db.prepare('SELECT id, username, name, role, created_at FROM users').all();
  res.json(users);
});

app.listen(PORT, () => console.log('OPTION v5 running on port ' + PORT + ' | data: ' + dataDir));
