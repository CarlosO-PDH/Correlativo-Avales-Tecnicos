/**
 * auth.js - Autenticación JWT y Middleware
 * Descripción: Middleware para validar JWT tokens y manejo de autenticación
 * Uso: Protege endpoints con Bearer token validation
 */

const jwt = require('jsonwebtoken');

/**
 * Middleware: Validar JWT token en requests
 * Extrae token del header Authorization: Bearer <token>
 * Valida token y adjunta userId y rol al request
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      // Diferenciar entre expirado y inválido
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expirado' });
      }
      return res.status(403).json({ error: 'Token inválido' });
    }

    // Adjuntar usuario al request para uso en rutas
    req.user = user;
    next();
  });
}

/**
 * Middleware: Validar rol de usuario
 * Solo permite usuarios con rol "admin"
 */
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  if (req.user.rol !== 'admin') {
    return res.status(403).json({ error: 'Permiso denegado - se requiere rol admin' });
  }

  next();
}

/**
 * Generar Access Token (expiración corta: 15 minutos)
 */
function generateAccessToken(userId, email, rol) {
  return jwt.sign(
    { userId, email, rol },
    process.env.JWT_SECRET,
    { expiresIn: '15m' } // CAMBIO: Token expira en 15 minutos
  );
}

/**
 * Generar Refresh Token (expiración larga: 7 días)
 */
function generateRefreshToken(userId, email, rol) {
  return jwt.sign(
    { userId, email, rol },
    process.env.JWT_SECRET,
    { expiresIn: '7d' } // CAMBIO: Token expira en 7 días
  );
}

module.exports = {
  authenticateToken,
  requireAdmin,
  generateAccessToken,
  generateRefreshToken,
};
