import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { LowSync } from 'lowdb';
import { JSONFileSync } from 'lowdb/node';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Static
app.use(express.static(path.join(__dirname, 'public')));

// DB init (LowDB - JSON)
const adapter = new JSONFileSync(path.join(__dirname, 'lia_brecho.json'));
const db = new LowSync(adapter, { users: [], categories: [], products: [], settings: {} });
db.read();
// Garante estrutura mesmo se o arquivo existir sem todas as chaves
db.data ||= {};
db.data.users ||= [];
db.data.categories ||= [];
db.data.products ||= [];
db.data.settings ||= {};

function getNextId(arr) {
  const max = arr.reduce((m, i) => Math.max(m, Number(i.id)||0), 0);
  return max + 1;
}

// Seed admin and basic categories if empty
(function seed() {
  const { users, categories, products } = db.data;
  db.data.settings.status ||= 'ativo'; // ativo | trial | inadimplente | vitalicio
  db.data.settings.support_whatsapp ||= '5564993081992'; // E.164 sem +
  db.data.settings.owner_password ||= process.env.OWNER_PASSWORD || 'owner123';
  const admin = users.find(u => u.email === 'admin@liabrecho.com');
  if (!admin) {
    const hash = bcrypt.hashSync('admin123', 10);
    users.push({ id: getNextId(users), email: 'admin@liabrecho.com', password_hash: hash, name: 'Admin' });
  }
  // Admin alternativo solicitado: email 'admin' e senha 'admin'
  const adminSimple = users.find(u => u.email === 'admin');
  if (!adminSimple) {
    const hash2 = bcrypt.hashSync('admin', 10);
    users.push({ id: getNextId(users), email: 'admin', password_hash: hash2, name: 'Admin' });
  }
  if (categories.length === 0) {
    ['Calças', 'Blusas', 'Vestidos', 'Sapatos', 'Acessórios'].forEach(name => {
      categories.push({ id: getNextId(categories), name });
    });
  }
  if (products.length === 0) {
    const byName = n => categories.find(c => c.name === n)?.id;
    const items = [
      { name: 'Calça Bege', description: 'Tamanho M', category_id: byName('Calças'), size: 'M', color: 'Bege', price_cents: 5000, image_url: '' },
      { name: 'Calça Jeans', description: 'Tamanho G', category_id: byName('Calças'), size: 'G', color: 'Azul', price_cents: 6000, image_url: '' },
      { name: 'Blusa Rosa', description: 'Tamanho P', category_id: byName('Blusas'), size: 'P', color: 'Rosa', price_cents: 3000, image_url: '' },
      { name: 'Vestido Creme', description: 'Tamanho M', category_id: byName('Vestidos'), size: 'M', color: 'Creme', price_cents: 8000, image_url: '' },
      { name: 'Sapatilha Marrom', description: 'Sapatos', category_id: byName('Sapatos'), size: '37', color: 'Marrom', price_cents: 9000, image_url: '' },
      { name: 'Bolsa Palha', description: 'Acessórios', category_id: byName('Acessórios'), size: 'Único', color: 'Palha', price_cents: 7000, image_url: '' },
    ];
    items.forEach(it => products.push({ id: getNextId(products), created_at: new Date().toISOString(), ...it }));
  }
  db.write();
})();

const JWT_SECRET = 'lia-brecho-secret';
const OWNER_SECRET = 'lia-brecho-owner';

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Não autenticado' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

function ownerAuth(req, res, next){
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Não autenticado (owner)' });
  try {
    const payload = jwt.verify(token, OWNER_SECRET);
    req.owner = payload;
    next();
  } catch(e){
    return res.status(401).json({ error: 'Token inválido (owner)' });
  }
}

// Auth
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Dados inválidos' });
  const user = db.data.users.find(u => u.email === email);
  if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });
  const ok = bcrypt.compareSync(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Credenciais inválidas' });
  const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
});

// Owner auth (programador)
app.post('/api/owner/login', (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Senha é obrigatória' });
  if (password !== db.data.settings.owner_password) return res.status(401).json({ error: 'Senha inválida' });
  const token = jwt.sign({ role: 'owner' }, OWNER_SECRET, { expiresIn: '12h' });
  res.json({ token });
});

// Settings
app.get('/api/settings', (req, res) => {
  const { status, support_whatsapp } = db.data.settings;
  res.json({ status, support_whatsapp });
});
app.put('/api/settings', ownerAuth, (req, res) => {
  const { status, support_whatsapp, owner_password } = req.body;
  if (status) db.data.settings.status = status;
  if (support_whatsapp) db.data.settings.support_whatsapp = support_whatsapp.replace(/\D/g,'');
  if (owner_password) db.data.settings.owner_password = owner_password;
  db.write();
  const { status: s, support_whatsapp: w } = db.data.settings;
  res.json({ status: s, support_whatsapp: w });
});

// Categories
app.get('/api/categories', (req, res) => {
  const rows = [...db.data.categories].sort((a,b)=> a.name.localeCompare(b.name));
  res.json(rows);
});

app.post('/api/categories', authMiddleware, (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });
  if (db.data.categories.find(c => c.name.toLowerCase() === name.toLowerCase())) {
    return res.status(400).json({ error: 'Categoria já existe' });
  }
  const cat = { id: getNextId(db.data.categories), name };
  db.data.categories.push(cat);
  db.write();
  res.json(cat);
});

// Products
app.get('/api/products', (req, res) => {
  const { categoryId } = req.query;
  let rows = db.data.products;
  if (categoryId) rows = rows.filter(p => Number(p.category_id) === Number(categoryId));
  rows = rows
    .slice()
    .sort((a,b)=> Number(b.id)-Number(a.id))
    .map(p => ({ ...p, category_name: db.data.categories.find(c => c.id === p.category_id)?.name }));
  res.json(rows);
});

app.post('/api/products', authMiddleware, (req, res) => {
  const { name, description, category_id, size, color, price_cents, image_url } = req.body;
  if (!name || !category_id || !price_cents) return res.status(400).json({ error: 'Campos obrigatórios ausentes' });
  const product = { id: getNextId(db.data.products), name, description: description||'', category_id: Number(category_id), size: size||'', color: color||'', price_cents: Number(price_cents), image_url: image_url||'', created_at: new Date().toISOString() };
  db.data.products.push(product);
  db.write();
  res.json(product);
});

app.put('/api/products/:id', authMiddleware, (req, res) => {
  const id = Number(req.params.id);
  const p = db.data.products.find(x => x.id === id);
  if (!p) return res.status(404).json({ error: 'Produto não encontrado' });
  const { name, description, category_id, size, color, price_cents, image_url } = req.body;
  p.name = name ?? p.name;
  p.description = description ?? p.description;
  p.category_id = Number(category_id ?? p.category_id);
  p.size = size ?? p.size;
  p.color = color ?? p.color;
  p.price_cents = Number(price_cents ?? p.price_cents);
  p.image_url = image_url ?? p.image_url;
  db.write();
  res.json(p);
});

app.delete('/api/products/:id', authMiddleware, (req, res) => {
  const id = Number(req.params.id);
  const before = db.data.products.length;
  db.data.products = db.data.products.filter(p => p.id !== id);
  db.write();
  res.json({ success: true, removed: before - db.data.products.length });
});

// Fallback to SPA-like pages
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/owner', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'owner.html'));
});

// Home explícita
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`LIA BRECHÓ rodando em http://localhost:${PORT}`));
