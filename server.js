const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const dataFile = path.join(__dirname, 'data.json');
if (!fs.existsSync(dataFile)) fs.writeFileSync(dataFile, JSON.stringify({ sites: [] }));

function loadData() { return JSON.parse(fs.readFileSync(dataFile, 'utf8')); }
function saveData(d) { fs.writeFileSync(dataFile, JSON.stringify(d, null, 2)); }

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

app.use(express.json());
app.use(express.static('public'));

app.get('/api/sites', (req, res) => {
  const data = loadData();
  res.json(data.sites);
});

app.post('/api/sites', upload.single('image'), (req, res) => {
  const data = loadData();
  const site = {
    id: Date.now(),
    name: req.body.name || '',
    image: req.file ? '/uploads/' + req.file.filename : '',
    firstBonus: parseFloat(req.body.firstBonus) || 0,
    reloadBonus: parseFloat(req.body.reloadBonus) || 0,
    cashback: parseFloat(req.body.cashback) || 0,
    allinBonus: parseFloat(req.body.allinBonus) || 0,
    joinBonus: parseFloat(req.body.joinBonus) || 0,
    rolling: parseFloat(req.body.rolling) || 0,
    eventCount: parseInt(req.body.eventCount) || 0,
    category: req.body.category || 'casino',
    insurance: req.body.insurance === 'true',
    option: req.body.option === 'true',
    rating: 0,
    reviews: 0,
    createdAt: new Date().toISOString()
  };
  data.sites.push(site);
  saveData(data);
  res.json({ ok: true, site });
});

app.delete('/api/sites/:id', (req, res) => {
  const data = loadData();
  data.sites = data.sites.filter(s => s.id !== parseInt(req.params.id));
  saveData(data);
  res.json({ ok: true });
});

app.listen(PORT, () => console.log('OPTION running on port ' + PORT));