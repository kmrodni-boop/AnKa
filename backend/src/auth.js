const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Demo-only secret. In a real deployment this must come from a secret store / env var.
const JWT_SECRET = process.env.JWT_SECRET || 'anka-demo-secret-do-not-use-in-production';
const TOKEN_TTL = '12h';

function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

function verifyPassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role, technician_id: user.technician_id || null, name: user.name },
    JWT_SECRET,
    { expiresIn: TOKEN_TTL }
  );
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Ikke innlogget' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Ugyldig eller utløpt sesjon' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Ikke tilgang' });
    }
    next();
  };
}

module.exports = { hashPassword, verifyPassword, signToken, requireAuth, requireRole };
