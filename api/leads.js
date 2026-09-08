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

async function getLeadsFromBlobOrFile() {
  // tenta Blob primeiro - direct fetch com bust + list fallback
  const tryFetch = async (url) => {
    try {
      const bustUrl = url + (url.includes('?') ? '&' : '?') + 't=' + Date.now();
      const resp = await fetch(bustUrl);
      if (resp.ok) {
        const text = await resp.text();
        try {
          const data = JSON.parse(text);
          if (Array.isArray(data)) return data;
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
      // tenta URL direta conhecida (store_obl32ZeDQvcAfVwK) primeiro para evitar list cache
      const directUrl = 'https://obl32zedqvcafvwk.public.blob.vercel-storage.com/leads.json';
      let data = await tryFetch(directUrl);
      if (data) return data;
      // fallback list
      const blobs = await list({ prefix: 'leads.json', token });
      const item = blobs.blobs?.find(b => b.pathname === 'leads.json');
      if (item?.url) {
        data = await tryFetch(item.url);
        if (data) return data;
      }
    }
  } catch (e) {
    console.warn('Blob read leads falhou, fallback file', e.message);
  }
  // fallback arquivo local (dev)
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

async function saveLeads(leads) {
  const payload = JSON.stringify(leads, null, 2);
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      console.error('saveLeads: BLOB_READ_WRITE_TOKEN ausente');
      throw new Error('BLOB_READ_WRITE_TOKEN ausente');
    }
    await put('leads.json', payload, {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 0,
      token
    });
    // também tenta gravar local dev para debug, ignora erro em prod (read-only)
    try {
      const filePath = path.join(process.cwd(), 'data', 'leads.json');
      fs.writeFileSync(filePath, payload, 'utf-8');
    } catch {}
    return { ok: true };
  } catch (e) {
    console.error('Erro ao salvar leads no Blob', e.message, e);
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
    // POST público (cliente deslogado) - suporta JSON, Buffer (sendBeacon) e string
    let body = req.body;
    if (!body || typeof body === 'string' || Buffer.isBuffer(body)) {
      // Se for Buffer (sendBeacon), converte para string
      if (Buffer.isBuffer(body)) {
        try { body = JSON.parse(body.toString('utf-8') || '{}'); } catch { body = {}; }
      } else {
        body = await new Promise(resolve => {
          let data = '';
          // Se body já é string parcial, usa como inicial
          if (typeof body === 'string' && body) data = body;
          req.on('data', chunk => data += chunk);
          req.on('end', () => {
            try { resolve(JSON.parse(data || '{}')); } catch { resolve({}); }
          });
          // Se req já terminou (body vazio), resolve imediatamente
          if (req.readableEnded) {
            try { resolve(JSON.parse(data || '{}')); } catch { resolve({}); }
          }
        });
      }
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return res.status(400).json({ error: 'Body inválido' });
    }
    // validação mínima - agora ofertaId opcional para capturar cliques genéricos (header/floating)
    // Se não tem ofertaId, cria lead genérico com origem da URL/referer
    const leads = await getLeadsFromBlobOrFile();
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
    leads.push(novo);
    if (leads.length > 5000) leads.splice(0, leads.length - 5000);
    const result = await saveLeads(leads);
    if (!result.ok) return res.status(500).json({ error: 'Falha ao salvar lead', detail: result.error });
    return res.status(201).json({ ok: true, id: novo.id });
  }

  if (req.method === 'DELETE') {
    if (!verifyAuth(req)) return res.status(401).json({ error: 'Não autorizado' });
    const result = await saveLeads([]);
    if (!result.ok) return res.status(500).json({ error: 'Falha ao limpar', detail: result.error });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
