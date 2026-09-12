const { put, list, del } = require('@vercel/blob');
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

async function getLeadsFromBlobOrFile() {
  // 1) KV (Neon) primeiro - forte consistência
  try {
    const { kvGet } = require('./_db');
    const data = await kvGet('leads');
    if (Array.isArray(data) && data.length) return data;
  } catch {}
  // Novo modelo: cada lead é um arquivo em leads/<id>.json (append, sem race)
  // Mantém compat com legado leads.json único
  const tryFetch = async (url) => {
    try {
      const bustUrl = url + (url.includes('?') ? '&' : '?') + 't=' + Date.now();
      const resp = await fetch(bustUrl);
      if (resp.ok) {
        const text = await resp.text();
        try {
          const data = JSON.parse(text);
          return data;
        } catch {}
      }
    } catch (e) {
      console.warn('tryFetch falhou', url, e.message);
    }
    return null;
  };
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (token) {
      // 1) Tenta novo modelo: lista prefix leads/
      try {
        const blobs = await list({ prefix: 'leads/', token });
        if (blobs.blobs && blobs.blobs.length > 0) {
          // busca todos os leads individuais (limit 500 para não estourar tempo)
          const toFetch = blobs.blobs.slice(0, 500);
          const results = await Promise.all(toFetch.map(async b => {
            const data = await tryFetch(b.url);
            // cada arquivo contém um objeto lead
            if (data && typeof data === 'object' && !Array.isArray(data) && data.id) return data;
            if (Array.isArray(data)) return data; // compat se alguém gravou array
            return null;
          }));
          let leads = [];
          results.forEach(r => {
            if (!r) return;
            if (Array.isArray(r)) leads = leads.concat(r);
            else leads.push(r);
          });
          if (leads.length > 0) {
            // ordena por createdAt/id
            leads.sort((a,b) => (a.createdAt||'').localeCompare(b.createdAt||'') || (a.id||0)-(b.id||0));
            return leads;
          }
        }
      } catch (e) {
        console.warn('list leads/ falhou', e.message);
      }
      // 2) Fallback legado: leads.json único (para migração)
      const directUrl = 'https://obl32zedqvcafvwk.public.blob.vercel-storage.com/leads.json';
      let data = await tryFetch(directUrl);
      if (data && Array.isArray(data) && data.length) return data;
      try {
        const blobs = await list({ prefix: 'leads.json', token });
        const item = blobs.blobs?.find(b => b.pathname === 'leads.json');
        if (item?.url) {
          data = await tryFetch(item.url);
          if (data && Array.isArray(data)) return data;
        }
      } catch {}
    }
  } catch (e) {
    console.warn('Blob read leads falhou, fallback file', e.message);
  }
  // fallback /tmp (serverless) e arquivo local (dev)
  const tmpPath = path.join('/tmp', 'leads.json');
  try {
    if (fs.existsSync(tmpPath)) {
      const data = fs.readFileSync(tmpPath, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch {}
  // tenta /tmp leads/ prefix (fallback append)
  try {
    const tmpDir = path.join('/tmp', 'leads');
    if (fs.existsSync(tmpDir)) {
      const files = fs.readdirSync(tmpDir);
      let leads = [];
      files.slice(0, 500).forEach(f => {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(tmpDir, f), 'utf-8'));
          if (data && data.id) leads.push(data);
          else if (Array.isArray(data)) leads = leads.concat(data);
        } catch {}
      });
      if (leads.length) {
        leads.sort((a,b) => (a.createdAt||'').localeCompare(b.createdAt||'') || (a.id||0)-(b.id||0));
        return leads;
      }
    }
  } catch {}
  try {
    const filePath = path.join(process.cwd(), 'data', 'leads.json');
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

async function saveLeadAppend(lead) {
  // 1) Tenta KV primeiro (Neon) - forte consistência
  try {
    const { kvGet, kvSet } = require('./_db');
    const existing = await kvGet('leads');
    const arr = Array.isArray(existing) ? existing : [];
    arr.push(lead);
    if (arr.length > 5000) arr.splice(0, arr.length - 5000);
    const ok = await kvSet('leads', arr);
    if (ok) return { ok: true };
  } catch (e) {
    console.warn('KV saveLeadAppend falhou, tentando Blob', e.message);
  }
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  // 2) tenta Blob se token existir
  if (token) {
    try {
      const key = `leads/${lead.id}-${Math.random().toString(36).slice(2,6)}.json`;
      await put(key, JSON.stringify(lead), {
        access: 'public',
        contentType: 'application/json',
        addRandomSuffix: false,
        cacheControlMaxAge: 0,
        token
      });
      return { ok: true };
    } catch (e) {
      console.error('Erro ao salvar lead append no Blob (fallback /tmp)', e.message);
      // fallback para /tmp
    }
  }
  // 3) fallback /tmp (serverless) - garante que POST não dê 500 mesmo com Blob suspenso
  try {
    const tmpDir = path.join('/tmp', 'leads');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    const filePath = path.join(tmpDir, `${lead.id}-${Math.random().toString(36).slice(2,6)}.json`);
    fs.writeFileSync(filePath, JSON.stringify(lead), 'utf-8');
    // também mantém /tmp/leads.json agregado para compat
    try {
      const aggPath = path.join('/tmp', 'leads.json');
      let arr = [];
      if (fs.existsSync(aggPath)) {
        try { arr = JSON.parse(fs.readFileSync(aggPath, 'utf-8')); } catch {}
      }
      if (!Array.isArray(arr)) arr = [];
      arr.push(lead);
      if (arr.length > 5000) arr.splice(0, arr.length - 5000);
      fs.writeFileSync(aggPath, JSON.stringify(arr), 'utf-8');
    } catch {}
    return { ok: true };
  } catch (e) {
    console.error('Erro fallback /tmp leads', e.message);
    return { ok: false, error: e.message };
  }
}

async function clearAllLeads() {
  // 1) Limpa KV primeiro
  try {
    const { kvSet } = require('./_db');
    await kvSet('leads', []);
  } catch (e) {
    console.warn('clear KV leads falhou', e.message);
  }
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  // 2) tenta limpar Blob se token existir, mas não falha se não existir (fallback /tmp)
  if (token) {
    try {
      const blobs = await list({ prefix: 'leads', token });
      const urls = blobs.blobs?.map(b => b.url) || [];
      if (urls.length) {
        await del(urls, { token });
      }
      try {
        await put('leads.json', JSON.stringify([]), {
          access: 'public',
          contentType: 'application/json',
          addRandomSuffix: false,
          allowOverwrite: true,
          cacheControlMaxAge: 0,
          token
        });
      } catch {}
    } catch (e) {
      console.warn('clear Blob falhou, tentando /tmp', e.message);
    }
  }
  // 3) sempre limpa /tmp
  try {
    const tmpDir = path.join('/tmp', 'leads');
    if (fs.existsSync(tmpDir)) {
      fs.readdirSync(tmpDir).forEach(f => {
        try { fs.unlinkSync(path.join(tmpDir, f)); } catch {}
      });
    }
    const aggPath = path.join('/tmp', 'leads.json');
    if (fs.existsSync(aggPath)) fs.writeFileSync(aggPath, JSON.stringify([]), 'utf-8');
    // tenta limpar data/leads.json dev
    try {
      const filePath = path.join(process.cwd(), 'data', 'leads.json');
      if (fs.existsSync(filePath)) fs.writeFileSync(filePath, JSON.stringify([]), 'utf-8');
    } catch {}
    return { ok: true };
  } catch (e) {
    console.error('Erro ao limpar leads /tmp', e.message);
    return { ok: false, error: e.message };
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    if (!verifyAuth(req)) return res.status(401).json({ error: 'Não autorizado' });
    res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    const leads = await getLeadsFromBlobOrFile();
    return res.status(200).json(leads);
  }

  if (req.method === 'POST') {
    let body = req.body;
    if (!body || typeof body === 'string' || Buffer.isBuffer(body)) {
      if (Buffer.isBuffer(body)) {
        try { body = JSON.parse(body.toString('utf-8') || '{}'); } catch { body = {}; }
      } else {
        body = await new Promise(resolve => {
          let data = '';
          if (typeof body === 'string' && body) data = body;
          req.on('data', chunk => data += chunk);
          req.on('end', () => {
            try { resolve(JSON.parse(data || '{}')); } catch { resolve({}); }
          });
          if (req.readableEnded) {
            try { resolve(JSON.parse(data || '{}')); } catch { resolve({}); }
          }
        });
      }
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return res.status(400).json({ error: 'Body inválido' });
    }
    const novo = {
      id: Date.now(),
      ofertaId: body.ofertaId || body.viagemId || null,
      viagemId: body.viagemId || body.ofertaId || null,
      rota: body.rota || body.origem || 'WhatsApp Geral',
      datas: body.datas || body.data || '',
      preco: body.preco || '',
      nome: (body.nome || '').toString().slice(0, 80),
      telefone: (body.telefone || '').toString().slice(0, 20),
      assentos: body.assentos || '',
      qtd: body.qtd || 1,
      origem: body.origem || req.headers['referer'] || req.headers['origin'] || 'site',
      tipo: body.tipo || (body.ofertaId ? 'oferta' : 'whatsapp-geral'),
      createdAt: new Date().toISOString(),
      ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.headers['x-real-ip'] || ''
    };
    const result = await saveLeadAppend(novo);
    if (!result.ok) return res.status(500).json({ error: 'Falha ao salvar lead', detail: result.error });
    return res.status(201).json({ ok: true, id: novo.id });
  }

  if (req.method === 'DELETE') {
    if (!verifyAuth(req)) return res.status(401).json({ error: 'Não autorizado' });
    const result = await clearAllLeads();
    if (!result.ok) return res.status(500).json({ error: 'Falha ao limpar', detail: result.error });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
