const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookie = require('cookie');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body = '';
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    body = req.body;
  } else {
    body = await new Promise(resolve => {
      let data = '';
      req.on('data', chunk => data += chunk);
      req.on('end', () => {
        try { resolve(JSON.parse(data || '{}')); } catch { resolve({}); }
      });
    });
  }

  const { user, pass } = body;
  const ADMIN_USER = process.env.ADMIN_USER || 'admin';
  const ADMIN_HASH = process.env.ADMIN_HASH;
  const JWT_SECRET = process.env.JWT_SECRET;

  if (!ADMIN_HASH || !JWT_SECRET) {
    console.error('Missing ADMIN_HASH or JWT_SECRET env');
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  if (user !== ADMIN_USER) {
    return res.status(401).json({ error: 'Usuário ou senha inválidos' });
  }

  const ok = await bcrypt.compare(pass, ADMIN_HASH);
  if (!ok) return res.status(401).json({ error: 'Usuário ou senha inválidos' });

  const token = jwt.sign({ user }, JWT_SECRET, { expiresIn: '8h' });

  res.setHeader('Set-Cookie', cookie.serialize('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 8 * 60 * 60
  }));

  return res.status(200).json({ ok: true });
};
