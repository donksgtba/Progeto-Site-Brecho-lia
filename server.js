import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { LowSync } from 'lowdb';
import { JSONFileSync } from 'lowdb/node';
import multer from 'multer';
import fs from 'fs';
import sql from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Static (servindo da raiz do projeto, pois no GitHub os arquivos estão na raiz)
app.use(express.static(__dirname));
// Pasta de uploads
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
app.use('/uploads', express.static(uploadsDir));

// DB init (LowDB - JSON) - mantido apenas para settings locais
const adapter = new JSONFileSync(path.join(__dirname, 'lia_brecho.json'));
const db = new LowSync(adapter, { users: [], categories: [], products: [], settings: {} });
db.read();
db.data ||= {};
db.data.settings ||= {};

function getNextId(arr) {
  const max = arr.reduce((m, i) => Math.max(m, Number(i.id)||0), 0);
  return max + 1;
}

// Ensure Postgres schema and minimal seed
async function ensurePg() {
  // Create tables if not exists
  await sql`create table if not exists users (id serial primary key, email text unique not null, password_hash text not null, name text not null)`;
  await sql`create table if not exists categories (id serial primary key, name text unique not null)`;
  await sql`create table if not exists products (id serial primary key, name text not null, description text default '', category_id int not null references categories(id) on delete cascade, size text default '', color text default '', price_cents int not null, image_url text default '', created_at timestamptz default now())`;
  // Seed users
  const admin = await sql`select id from users where email = 'admin@liabrecho.com'`;
  if (admin.count === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    await sql`insert into users (email, password_hash, name) values ('admin@liabrecho.com', ${hash}, 'Admin')`;
  }
  const adminSimple = await sql`select id from users where email = 'admin'`;
  if (adminSimple.count === 0) {
    const hash2 = bcrypt.hashSync('admin', 10);
    await sql`insert into users (email, password_hash, name) values ('admin', ${hash2}, 'Admin')`;
  }
  const liah = await sql`select id from users where email = 'liah'`;
  if (liah.count === 0) {
    const hash3 = bcrypt.hashSync('liah123', 10);
    await sql`insert into users (email, password_hash, name) values ('liah', ${hash3}, 'Lia Cliente')`;
  }
  // Seed categories
  const catCount = await sql`select count(*)::int as c from categories`;
  if ((catCount[0]?.c ?? 0) === 0) {
    for (const name of ['Calças','Blusas','Vestidos','Sapatos','Acessórios']) {
      await sql`insert into categories (name) values (${name}) on conflict (name) do nothing`;
    }
  }
  // Persist local settings (still in JSON)
  db.data.settings.status ||= 'ativo';
  db.data.settings.support_whatsapp ||= '5564993081992';
  db.data.settings.owner_password ||= process.env.OWNER_PASSWORD || 'owner123';
  db.write();
}

await ensurePg();

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
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Dados inválidos' });
  const rows = await sql`select id, email, password_hash, name from users where email = ${email}`;
  const user = rows[0];
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
app.get('/api/categories', async (req, res) => {
  try {
    const rows = await sql/*sql*/`select id, name from categories order by name asc`;
    res.json(rows);
  } catch (e) {
    console.error('categories error', e);
    res.status(500).json({ error: 'Erro ao listar categorias' });
  }
});

app.post('/api/categories', authMiddleware, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });
  try {
    const [cat] = await sql`insert into categories (name) values (${name}) returning id, name`;
    res.json(cat);
  } catch (e) {
    if (String(e.message||'').includes('duplicate') || String(e.message||'').includes('unique')) {
      return res.status(400).json({ error: 'Categoria já existe' });
    }
    console.error('create category error', e);
    res.status(500).json({ error: 'Erro ao criar categoria' });
  }
});

// Products
app.get('/api/products', async (req, res) => {
  const { categoryId } = req.query;
  const rows = await sql`select p.*, c.name as category_name from products p join categories c on c.id = p.category_id where ${categoryId ? sql`p.category_id = ${categoryId}` : sql`true`} order by p.id desc`;
  res.json(rows);
});

app.post('/api/products', authMiddleware, async (req, res) => {
  const { name, description, category_id, size, color, price_cents, image_url } = req.body;
  if (!name || !category_id || !price_cents) return res.status(400).json({ error: 'Campos obrigatórios ausentes' });
  const [p] = await sql`insert into products (name, description, category_id, size, color, price_cents, image_url) values (${name}, ${description||''}, ${category_id}, ${size||''}, ${color||''}, ${price_cents}, ${image_url||''}) returning *`;
  res.json(p);
});

app.put('/api/products/:id', authMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  const { name, description, category_id, size, color, price_cents, image_url } = req.body;
  const [p] = await sql`update products set name = coalesce(${name}, name), description = coalesce(${description}, description), category_id = coalesce(${category_id}, category_id), size = coalesce(${size}, size), color = coalesce(${color}, color), price_cents = coalesce(${price_cents}, price_cents), image_url = coalesce(${image_url}, image_url) where id = ${id} returning *`;
  if (!p) return res.status(404).json({ error: 'Produto não encontrado' });
  res.json(p);
});

app.delete('/api/products/:id', authMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  const result = await sql`delete from products where id = ${id}`;
  res.json({ success: true });
});

// Healthcheck do banco
app.get('/api/health/db', async (req, res) => {
  try {
    const [r] = await sql/*sql*/`select now() as now`;
    res.json({ ok: true, now: r.now });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e.message||e) });
  }
});

// Upload de imagens (autenticado)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const name = `img_${Date.now()}${ext}`;
    cb(null, name);
  }
});
const upload = multer({ storage });

app.post('/api/upload', authMiddleware, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Arquivo não enviado' });
  const url = `/uploads/${req.file.filename}`;
  res.json({ url });
});

// Fallback to SPA-like pages
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/owner', (req, res) => {
  res.sendFile(path.join(__dirname, 'owner.html'));
});

// Home explícita
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`LIA BRECHÓ rodando em http://localhost:${PORT}`));
