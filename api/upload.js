const jwt = require('jsonwebtoken');
const cookie = require('cookie');
const { put } = require('@vercel/blob');
const { rate } = require('./_rate');

function verifyAuth(req) {
  const cookies = cookie.parse(req.headers.cookie || '');
  const token = cookies.token;
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!token || !JWT_SECRET) return false;
  try { jwt.verify(token, JWT_SECRET); return true; } catch { return false; }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!verifyAuth(req)) return res.status(401).json({ error: 'Não autorizado' });
  if (!rate({ keyPrefix: 'upload', limit: 10, windowMs: 60_000, res })(req)) return;

  // espera multipart/form-data com campo 'file' ou JSON com dataURL
  let body = '';
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks);

  const contentType = req.headers['content-type'] || '';
  let buffer, filename = `oferta-${Date.now()}.jpg`, mime = 'image/jpeg';

  if (contentType.includes('multipart/form-data')) {
    return res.status(400).json({ error: 'Use JSON com dataURL: {dataUrl, filename}' });
  } else {
    try {
      const json = JSON.parse(raw.toString('utf-8'));
      const dataUrl = json.dataUrl;
      let rawName = json.filename || filename;
      // Sanitiza filename: só a-zA-Z0-9._- + uuid prefixo
      filename = String(rawName).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0,60) || `oferta-${Date.now()}.jpg`;
      if (!filename.match(/\.(jpg|jpeg|png|webp)$/i)) filename = filename.replace(/\.[^.]+$/, '') + '.jpg';
      filename = `${Date.now()}-${Math.random().toString(36).slice(2,6)}-${filename}`;
      if (!dataUrl || !dataUrl.startsWith('data:image/')) return res.status(400).json({ error: 'dataUrl inválido' });
      // Rejeita SVG com script
      if (dataUrl.includes('image/svg')) return res.status(400).json({ error: 'SVG não permitido' });
      const base64 = dataUrl.split(',')[1];
      buffer = Buffer.from(base64, 'base64');
      const match = dataUrl.match(/data:(image\/[^;]+);/);
      if (match) mime = match[1];
      // Valida magic bytes
      if (mime === 'image/jpeg' && buffer[0] !== 0xFF) return res.status(400).json({ error: 'JPEG inválido' });
      if (mime === 'image/png' && buffer[0] !== 0x89) return res.status(400).json({ error: 'PNG inválido' });
    } catch {
      return res.status(400).json({ error: 'JSON inválido. Envie {dataUrl}' });
    }
  }

  if (buffer.length > 5 * 1024 * 1024) return res.status(400).json({ error: 'Imagem >5MB' });

  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) return res.status(500).json({ error: 'BLOB_READ_WRITE_TOKEN não configurado' });

    const blob = await put(`ofertas/${filename}`, buffer, {
      access: 'public',
      contentType: mime,
      token
    });
    return res.status(200).json({ url: blob.url });
  } catch (e) {
    console.error('Upload falhou', e);
    return res.status(500).json({ error: 'Falha no upload', details: e.message });
  }
};
