const { put, list } = require('@vercel/blob');
const jwt = require('jsonwebtoken');
const cookie = require('cookie');
const fs = require('fs');
const path = require('path');

function verifyAuth(req) {
  const cookies = cookie.parse(req.headers.cookie || '');
  const token = cookies['__Host-token'] || cookies.token;
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!token || !JWT_SECRET) return false;
  try { jwt.verify(token, JWT_SECRET, { issuer: 'vou-com-milhas', audience: 'admin' }); return true; } catch { return false; }
}

function setCors(req, res) {
  const origin = req.headers.origin;
  const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map(s=>s.trim()).filter(Boolean);
  const defaultAllowed = ['https://vou-com-milhas.vercel.app', 'https://www.vou-com-milhas.vercel.app'];
  const whitelist = allowed.length ? allowed : defaultAllowed;
  // permite sem origin (curl, server-side) ou se estiver na whitelist
  if (origin && whitelist.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  } else if (!origin) {
    // não seta ACAO para requisições sem origin (evita wildcard)
  }
  // para compat durante transição, se ALLOWED_ORIGINS=* libera (não recomendado produção)
  if (allowed.includes('*') && origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

async function getOfertasFromBlobOrFile() {
  // 1) tenta KV (Neon) primeiro - forte consistência, sem suspensão
  try {
    const { kvGet } = require('./_db');
    const data = await kvGet('ofertas');
    if (Array.isArray(data) && data.length) return data;
  } catch {}
  // 2) tenta Blob (global) - direct URL + list fallback, com cache bust
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
      console.warn('tryFetch ofertas falhou', url, e.message);
    }
    return null;
  };
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (token) {
      const directUrl = 'https://obl32zedqvcafvwk.public.blob.vercel-storage.com/ofertas.json';
      let data = await tryFetch(directUrl);
      if (data) return data;
      const blobs = await list({ prefix: 'ofertas.json', token });
      const item = blobs.blobs?.find(b => b.pathname === 'ofertas.json');
      if (item?.url) {
        data = await tryFetch(item.url);
        if (data) return data;
      }
    }
  } catch (e) {
    console.warn('Blob read ofertas falhou, fallback file', e.message);
  }
  // 3) fallback: tenta /tmp (serverless writable) e data/ofertas.json (dev/seed)
  const tmpPath = path.join('/tmp', 'ofertas.json');
  try {
    if (fs.existsSync(tmpPath)) {
      const data = fs.readFileSync(tmpPath, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch {}
  try {
    const filePath = path.join(process.cwd(), 'data', 'ofertas.json');
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
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
    // Sanitização Hobby: whitelist + limites + strip tags
    const allowedEmpresas = ['LATAM','Gol','Azul'];
    const allowedTipos = ['Econômica','Econômica Premium','Executiva','Primeira'];
    const esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    const strip = s => String(s||'').replace(/<[^>]*>/g,'').trim();
    const sanitizeImagem = (url) => {
      const s = String(url||'').trim().slice(0,2000);
      if (!s) return '';
      if (s.startsWith('https://')) {
        try { const u = new URL(s); if (u.protocol !== 'https:') return ''; return s; } catch { return ''; }
      }
      if (s.startsWith('data:image/') && s.includes(';base64,')) {
        if (s.length > 1500000) return '';
        if (s.includes('image/svg')) return '';
        return s;
      }
      return '';
    };
    body = body.slice(0, 100).map(o => ({
      id: Number(o.id) || Date.now(),
      origem: esc(strip(o.origem||'')).slice(0,40),
      destino: esc(strip(o.destino||'')).slice(0,40),
      aeroportoOrigem: String(o.aeroportoOrigem||'').replace(/[^A-Z]/g,'').slice(0,3).toUpperCase(),
      aeroportoDestino: String(o.aeroportoDestino||'').replace(/[^A-Z]/g,'').slice(0,3).toUpperCase(),
      datas: esc(strip(o.datas||'')).slice(0,40),
      dataInicio: String(o.dataInicio||'').slice(0,10),
      validadeAte: String(o.validadeAte||'').slice(0,10),
      preco: Math.min(99999, Math.max(0, Number(o.preco)||0)),
      precoAntigo: o.precoAntigo ? Math.min(99999, Math.max(0, Number(o.precoAntigo)||0)) : null,
      milhas: o.milhas ? Math.min(999999, Math.max(0, parseInt(o.milhas)||0)) : null,
      parcelas: o.parcelas ? Math.min(18, Math.max(1, parseInt(o.parcelas)||0)) : null,
      parcelasSemJuros: Math.min(18, Math.max(1, parseInt(o.parcelasSemJuros)||6)),
      acrescimoPorParcela: Math.min(10, Math.max(0, Number(o.acrescimoPorParcela)||0)),
      empresa: allowedEmpresas.includes(o.empresa) ? o.empresa : 'LATAM',
      tipo: allowedTipos.includes(o.tipo) ? o.tipo : 'Econômica',
      duracao: esc(strip(o.duracao||'')).slice(0,10),
      escalas: Math.min(2, Math.max(0, parseInt(o.escalas)||0)),
      bagagem: esc(String(o.bagagem||'10kg').slice(0,20)),
      imagem: sanitizeImagem(o.imagem),
      status: ['ativa','encerrada','pausada'].includes(o.status) ? o.status : 'ativa',
      destaque: !!o.destaque,
      vagasTexto: esc(strip(o.vagasTexto||'')).slice(0,40),
      descricao: esc(strip(o.descricao||'')).slice(0,300)
    }));

    // tenta salvar: 1) KV (Neon) 2) Blob 3) /tmp
    let saved = false;
    let lastErr = null;
    // 1) KV
    try {
      const { kvSet } = require('./_db');
      const ok = await kvSet('ofertas', body);
      if (ok) saved = true;
    } catch (e) {
      lastErr = e;
      console.warn('KV save ofertas falhou, tentando Blob', e.message);
    }
    // 2) Blob
    if (!saved) {
      try {
        const token = process.env.BLOB_READ_WRITE_TOKEN;
        if (token) {
          await put('ofertas.json', JSON.stringify(body, null, 2), {
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
        console.error('Erro ao salvar ofertas no Blob (fallback para /tmp)', e.message);
        lastErr = e;
      }
    }
    if (!saved) {
      // 3) fallback: /tmp (serverless) e data/ (dev)
      try {
        const tmpPath = path.join('/tmp', 'ofertas.json');
        fs.writeFileSync(tmpPath, JSON.stringify(body, null, 2), 'utf-8');
        try {
          const filePath = path.join(process.cwd(), 'data', 'ofertas.json');
          fs.writeFileSync(filePath, JSON.stringify(body, null, 2), 'utf-8');
        } catch {}
        saved = true;
      } catch (err) {
        console.error('Erro fallback /tmp ofertas', err);
        return res.status(500).json({ error: 'Falha ao salvar' });
      }
    }
    return res.status(200).json({ ok: true, count: body.length });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
