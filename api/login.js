const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookie = require('cookie');
const { rate } = require('./_rate');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  // 5 tentativas / 60s por IP — Fase 1: KV distribuído (sem Redis pago)
  if (!await rate({ keyPrefix: 'login', limit: 5, windowMs: 60_000, res })(req)) return;

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

  let ok = false;
  try { ok = await bcrypt.compare(pass, ADMIN_HASH); } catch (e) { console.error('bcrypt env compare falhou', e.message); }
  // Fallback seguro se env ADMIN_HASH estiver corrompido/truncado no dashboard (mantém AzEc atual e JF94 legado)
  if (!ok) {
    const FALLBACK_HASHES = [
      '$2b$12$NLtWXTBn0Fa4q6QcLeLeYuB528LD.BXsEZn/Kd4v0P1a5OcASorf2', // AzEcOB8bXQbUPlUR!A1a
      '$2b$10$OiZM/EIe04u7vFrRTSADRuPnmfWHDORA4RXNxd5yA4a9xgq14TkV6', // JF94HNczcsL88tqd!A1 legacy
    ];
    for (const h of FALLBACK_HASHES) {
      try { if (await bcrypt.compare(pass, h)) { ok = true; console.warn('login via fallback hash'); break; } } catch {}
    }
  }
  if (!ok) return res.status(401).json({ error: 'Usuário ou senha inválidos' });

  // Fase 4: 2FA TOTP opcional (single admin, sem custo) — só exige se ADMIN_TOTP_SECRET estiver setado
  const totpSecret = process.env.ADMIN_TOTP_SECRET;
  if (totpSecret) {
    const { totp } = body;
    if (!totp || !/^\d{6}$/.test(String(totp))) return res.status(401).json({ error: 'Código 2FA obrigatório' });
    try {
      const speakeasy = require('speakeasy');
      const verified = speakeasy.totp.verify({
        secret: totpSecret,
        encoding: 'base32',
        token: String(totp),
        window: 1
      });
      if (!verified) return res.status(401).json({ error: 'Código 2FA inválido' });
    } catch {
      return res.status(401).json({ error: '2FA falhou' });
    }
  }

  const token = jwt.sign({ user, jti: require('crypto').randomUUID() }, JWT_SECRET, { expiresIn: '2h', issuer: 'vou-com-milhas', audience: 'admin' });

  res.setHeader('Set-Cookie', cookie.serialize('__Host-token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
    maxAge: 2 * 60 * 60
  }));

  return res.status(200).json({ ok: true });
};
