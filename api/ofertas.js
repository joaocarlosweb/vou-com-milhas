const { put, head } = require('@vercel/blob');
const jwt = require('jsonwebtoken');
const cookie = require('cookie');
const fs = require('fs');
const path = require('path');

function verifyAuth(req) {
  const cookies = cookie.parse(req.headers.cookie || '');
  const token = cookies.token;
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!token || !JWT_SECRET) return false;
  try { jwt.verify(token, JWT_SECRET); return true; } catch { return false; }
}

async function getOfertasFromBlobOrFile() {
  // tenta Blob primeiro
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (token) {
      // Vercel Blob não tem list direto sem client, tentamos fetch do arquivo público se existir
      // Fallback: lê do arquivo local data/ofertas.json
    }
  } catch {}
  // fallback arquivo local
  try {
    const filePath = path.join(process.cwd(), 'data', 'ofertas.json');
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const ofertas = await getOfertasFromBlobOrFile();
    return res.status(200).json(ofertas);
  }

  // POST/PUT/DELETE precisam auth
  if (!verifyAuth(req)) return res.status(401).json({ error: 'Não autorizado' });

  if (req.method === 'POST' || req.method === 'PUT') {
    let body = req.body;
    if (!body || typeof body === 'string') {
      body = await new Promise(resolve => {
        let data = '';
        req.on('data', chunk => data += chunk);
        req.on('end', () => {
          try { resolve(JSON.parse(data || '[]')); } catch { resolve([]); }
        });
      });
    }
    if (!Array.isArray(body)) return res.status(400).json({ error: 'Esperado array de ofertas' });

    // tenta salvar no Blob se token existir, senão tenta fs (só funciona em dev)
    try {
      const token = process.env.BLOB_READ_WRITE_TOKEN;
      if (token) {
        await put('ofertas.json', JSON.stringify(body, null, 2), {
          access: 'public',
          contentType: 'application/json',
          addRandomSuffix: false,
          allowOverwrite: true,
          token
        });
      } else {
        // dev: escreve local
        const filePath = path.join(process.cwd(), 'data', 'ofertas.json');
        fs.writeFileSync(filePath, JSON.stringify(body, null, 2), 'utf-8');
      }
    } catch (e) {
      console.error('Erro ao salvar ofertas', e);
      // tenta fs fallback
      try {
        const filePath = path.join(process.cwd(), 'data', 'ofertas.json');
        fs.writeFileSync(filePath, JSON.stringify(body, null, 2), 'utf-8');
      } catch (err) {
        return res.status(500).json({ error: 'Falha ao salvar' });
      }
    }
    return res.status(200).json({ ok: true, count: body.length });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
