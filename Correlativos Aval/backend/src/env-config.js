/**
 * env-config.js - Configuración de Entorno
 * Descripción: Detecta y configura variables según ENVIRONMENT (development/staging/production)
 * Uso: Diferencia comportamiento de app por entorno
 */

require('dotenv').config();

// CAMBIO: Detectar ENVIRONMENT desde .env o variable global
const ENVIRONMENT = process.env.ENVIRONMENT || 'development';

console.log(`📍 Ambiente: ${ENVIRONMENT.toUpperCase()}`);

// Configuración por entorno
const envConfig = {
  development: {
    environment: 'development',
    nodeEnv: 'development',
    port: process.env.PORT || 3000,
    host: process.env.HOST || '0.0.0.0',
    jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
    bcryptRounds: process.env.BCRYPT_ROUNDS || 10,
    dbPath: process.env.DB_PATH || './database/avales.db',
    corsOrigin: '*', // Allow all origins in dev
    logLevel: 'verbose',
    cors: {
      origin: '*',
      credentials: true,
    },
  },

  staging: {
    environment: 'staging',
    nodeEnv: 'staging',
    port: process.env.PORT || 3000,
    host: process.env.HOST || 'localhost',
    jwtSecret: process.env.JWT_SECRET || 'staging-secret-128-chars-min-required',
    bcryptRounds: process.env.BCRYPT_ROUNDS || 12,
    dbPath: process.env.DB_PATH || '/data/avales.db',
    corsOrigin: 'http://localhost:*', // Local testing only
    logLevel: 'normal',
    cors: {
      origin: /localhost/,
      credentials: true,
    },
  },

  production: {
    environment: 'production',
    nodeEnv: 'production',
    port: process.env.PORT || 3000,
    host: process.env.HOST || 'localhost',
    jwtSecret: process.env.JWT_SECRET, // REQUIRED in production
    bcryptRounds: process.env.BCRYPT_ROUNDS || 12,
    dbPath: process.env.DB_PATH || '/data/avales.db',
    corsOrigin: process.env.CORS_ORIGIN || 'https://yourdomain.duckdns.org',
    logLevel: 'error', // Only errors in prod
    cors: {
      origin: process.env.CORS_ORIGIN || 'https://yourdomain.duckdns.org',
      credentials: true,
    },
  },
};

// CAMBIO: Validar que ENVIRONMENT existe en config
const config = envConfig[ENVIRONMENT];

if (!config) {
  console.error(`❌ ENVIRONMENT no válido: ${ENVIRONMENT}`);
  console.error(`Opciones válidas: ${Object.keys(envConfig).join(', ')}`);
  process.exit(1);
}

// CAMBIO: Validaciones por entorno
if (ENVIRONMENT === 'production') {
  if (!process.env.JWT_SECRET) {
    console.error('❌ JWT_SECRET es requerido en production');
    process.exit(1);
  }
  if (!process.env.CORS_ORIGIN) {
    console.warn('⚠️  CORS_ORIGIN no definido, usando default inseguro');
  }
}

// CAMBIO: Log de configuración según nivel
if (config.logLevel !== 'error') {
  console.log(`✅ Configuración cargada para ${ENVIRONMENT}`);
  console.log(`  - Port: ${config.port}`);
  console.log(`  - CORS Origin: ${config.corsOrigin}`);
  console.log(`  - DB Path: ${config.dbPath}`);
}

module.exports = config;
