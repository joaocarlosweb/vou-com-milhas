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

async function getEmpresaFromBlobOrFile() {
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
    const { kvGet } = require('./_db');
    const data = await kvGet('empresa');
    if (data && typeof data === 'object' && Object.keys(data).length) return data;
  } catch {}
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (token) {
      const directUrl = 'https://obl32zedqvcafvwk.public.blob.vercel-storage.com/empresa.json';
      let data = await tryFetch(directUrl);
      if (data && typeof data === 'object') return data;
      const blobs = await list({ prefix: 'empresa.json', token });
      const item = blobs.blobs?.find(b => b.pathname === 'empresa.json');
      if (item?.url) {
        data = await tryFetch(item.url);
        if (data) return data;
      }
    }
  } catch {}
  try {
    const tmpPath = path.join('/tmp', 'empresa.json');
    if (fs.existsSync(tmpPath)) {
      const data = fs.readFileSync(tmpPath, 'utf-8');
      return JSON.parse(data);
    }
  } catch {}
  try {
    const filePath = path.join(process.cwd(), 'data', 'empresa.json');
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    }
  } catch {}
  return {};
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
    const emp = await getEmpresaFromBlobOrFile();
    return res.status(200).json(emp);
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
    // Whitelist e sanitização (Hobby) — evita mass assignment e XSS
    const esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    const strip = s => String(s||'').replace(/<[^>]*>/g, '').trim();
    const clean = {
      nome: esc(strip(body.nome||'')).slice(0,80) || 'Vou com Milhas',
      slogan: esc(strip(body.slogan||'')).slice(0,120),
      instagram: (()=>{ const v=String(body.instagram||'').trim().slice(0,30); return /^@?[\w._]{1,30}$/.test(v) ? (v.startsWith('@')?v:'@'+v.replace(/^@/,'')).slice(0,30) : '@vou_com_milhas'; })(),
      sobre: esc(strip(body.sobre||'')).slice(0,500),
      canalLink: esc(String(body.canalLink||body.instagramUrl||'').slice(0,200)),
      cnpj: esc(String(body.cnpj||'').slice(0,20)),
      anos: esc(String(body.anos||'').slice(0,10)),
      horario: esc(String(body.horario||'').slice(0,30)),
      endereco: esc(String(body.endereco||'').slice(0,100)),
    };
    // diferenciais/depoimentos: filtra e escapa
    if (Array.isArray(body.diferenciais)) {
      clean.diferenciais = body.diferenciais.slice(0,3).map(d=>({
        titulo: esc(strip(d.titulo||'')).slice(0,40),
        desc: esc(strip(d.desc||'')).slice(0,120),
        icon: String(d.icon||'').replace(/[^a-z-]/g,'').slice(0,20) || 'check'
      }));
    }
    if (Array.isArray(body.depoimentos)) {
      clean.depoimentos = body.depoimentos.slice(0,3).map(d=>({
        texto: esc(strip(d.texto||'')).slice(0,200),
        nome: esc(strip(d.nome||'')).slice(0,40),
        nota: Math.min(5, Math.max(1, parseInt(d.nota)||5))
      }));
    }
    if (body.instagramUrl) clean.instagramUrl = esc(String(body.instagramUrl).slice(0,200));
    body = clean;
    let saved = false;
    let lastErr = null;
    try {
      const { kvSet } = require('./_db');
      const ok = await kvSet('empresa', body);
      if (ok) saved = true;
    } catch (e) {
      lastErr = e;
      console.warn('KV save empresa falhou, tentando Blob', e.message);
    }
    if (!saved) {
      try {
        const token = process.env.BLOB_READ_WRITE_TOKEN;
        if (token) {
          await put('empresa.json', JSON.stringify(body, null, 2), {
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
        console.error('Erro salvar empresa no Blob (fallback /tmp)', e.message);
        lastErr = e;
      }
    }
    if (!saved) {
      try {
        const tmpPath = path.join('/tmp', 'empresa.json');
        fs.writeFileSync(tmpPath, JSON.stringify(body, null, 2), 'utf-8');
        try {
          const filePath = path.join(process.cwd(), 'data', 'empresa.json');
          fs.writeFileSync(filePath, JSON.stringify(body, null, 2), 'utf-8');
        } catch {}
        return res.status(200).json({ ok: true });
      } catch (e) {
        console.error('Erro fallback /tmp empresa', e);
        return res.status(500).json({ error: 'Falha ao salvar', detail: lastErr ? lastErr.message : String(e) });
      }
    }
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
