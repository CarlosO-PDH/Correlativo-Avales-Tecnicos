/**
 * auth-routes.js - Rutas de Autenticación
 * Descripción: Endpoints POST /auth/login y POST /auth/refresh
 * Uso: Usuario inicia sesión y obtiene tokens JWT
 */

const express = require('express');
const bcrypt = require('bcrypt');
const { generateAccessToken, generateRefreshToken } = require('./auth');
const { db } = require('./db');

const router = express.Router();

/**
 * POST /auth/login
 * Descripción: Autentica usuario con email y password
 * Body: { email, password }
 * Response: { accessToken, refreshToken, expiresIn }
 */
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    // Validar que email y password fueron proporcionados
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y password son requeridos' });
    }

    // CAMBIO: Buscar usuario por email en BD
    const usuario = db.prepare('SELECT * FROM usuarios WHERE email = ? AND activo = 1').get(email);

    if (!usuario) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // CAMBIO: Verificar password con bcrypt
    const passwordValido = bcrypt.compareSync(password, usuario.password_hash);

    if (!passwordValido) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // CAMBIO: Generar tokens
    const accessToken = generateAccessToken(usuario.id, usuario.email, usuario.rol);
    const refreshToken = generateRefreshToken(usuario.id, usuario.email, usuario.rol);

    // CAMBIO: Retornar tokens al cliente
    res.json({
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutos en segundos
      rol: usuario.rol,
    });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * POST /auth/refresh
 * Descripción: Refresca access token usando refresh token
 * Body: { refreshToken }
 * Response: { accessToken, expiresIn }
 */
router.post('/refresh', (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token requerido' });
    }

    // CAMBIO: Verificar refresh token
    const jwt = require('jsonwebtoken');
    
    jwt.verify(refreshToken, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({ error: 'Refresh token inválido o expirado' });
      }

      // CAMBIO: Generar nuevo access token
      const newAccessToken = generateAccessToken(user.userId, user.email, user.rol);

      res.json({
        accessToken: newAccessToken,
        expiresIn: 900, // 15 minutos
      });
    });
  } catch (err) {
    console.error('Error en refresh:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
