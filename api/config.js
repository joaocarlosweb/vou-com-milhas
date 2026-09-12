const { put, list } = require('@vercel/blob');
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

async function getConfigFromBlobOrFile() {
  const tryFetch = async (url) => {
    try {
      const bustUrl = url + (url.includes('?') ? '&' : '?') + 't=' + Date.now();
      const resp = await fetch(bustUrl);
      if (resp.ok) {
        const text = await resp.text();
        try { const data = JSON.parse(text); return data; } catch {}
      }
    } catch {}
    return null;
  };
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (token) {
      const directUrl = 'https://obl32zedqvcafvwk.public.blob.vercel-storage.com/config.json';
      let data = await tryFetch(directUrl);
      if (data && typeof data === 'object') return data;
      const blobs = await list({ prefix: 'config.json', token });
      const item = blobs.blobs?.find(b => b.pathname === 'config.json');
      if (item?.url) {
        data = await tryFetch(item.url);
        if (data) return data;
      }
    }
  } catch {}
  // fallback /tmp (serverless) e data/
  try {
    const tmpPath = path.join('/tmp', 'config.json');
    if (fs.existsSync(tmpPath)) {
      const data = fs.readFileSync(tmpPath, 'utf-8');
      return JSON.parse(data);
    }
  } catch {}
  try {
    const filePath = path.join(process.cwd(), 'data', 'config.json');
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    }
  } catch {}
  return { whatsapp: '5584998979071', nomeEmpresa: 'Vou com Milhas' };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
    const cfg = await getConfigFromBlobOrFile();
    return res.status(200).json(cfg);
  }

  if (req.method === 'POST') {
    if (!verifyAuth(req)) return res.status(401).json({ error: 'Não autorizado' });
    let body = req.body;
    if (!body || typeof body === 'string' || Buffer.isBuffer(body)) {
      if (Buffer.isBuffer(body)) {
        try { body = JSON.parse(body.toString('utf-8') || '{}'); } catch { body = {}; }
      } else {
        body = await new Promise(resolve => {
          let data = typeof body === 'string' && body ? body : '';
          req.on('data', chunk => data += chunk);
          req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch { resolve({}); } });
          if (req.readableEnded) try { resolve(JSON.parse(data || '{}')); } catch { resolve({}); }
        });
      }
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return res.status(400).json({ error: 'Body inválido' });
    const toSave = {
      whatsapp: (body.whatsapp || '').toString().replace(/\D/g, '') || '5584998979071',
      nomeEmpresa: (body.nomeEmpresa || body.nome || 'Vou com Milhas').toString().slice(0, 80)
    };
    let saved = false;
    let lastErr = null;
    try {
      const token = process.env.BLOB_READ_WRITE_TOKEN;
      if (token) {
        await put('config.json', JSON.stringify(toSave, null, 2), {
          access: 'public',
          contentType: 'application/json',
          addRandomSuffix: false,
          allowOverwrite: true,
          cacheControlMaxAge: 0,
          token
        });
        saved = true;
      }
    } catch (e) {
      console.error('Erro salvar config no Blob (fallback /tmp)', e.message);
      lastErr = e;
    }
    if (!saved) {
      try {
        const tmpPath = path.join('/tmp', 'config.json');
        fs.writeFileSync(tmpPath, JSON.stringify(toSave, null, 2), 'utf-8');
        try {
          const filePath = path.join(process.cwd(), 'data', 'config.json');
          fs.writeFileSync(filePath, JSON.stringify(toSave, null, 2), 'utf-8');
        } catch {}
        return res.status(200).json({ ok: true });
      } catch (e) {
        console.error('Erro fallback /tmp config', e);
        return res.status(500).json({ error: 'Falha ao salvar', detail: lastErr ? lastErr.message : String(e) });
      }
    }
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
