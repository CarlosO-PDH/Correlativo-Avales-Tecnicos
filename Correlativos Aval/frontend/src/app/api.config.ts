/**
 * api.config.ts - Configuración dinámica de API
 * Descripción: Selecciona el apiBaseUrl según el ambiente
 * Uso: Inyectar en servicios para llamadas al API
 */

import { environment } from './environments/environment';

/**
 * CAMBIO: Config del API que se adapta al entorno
 * En desarrollo: localhost:3000
 * En staging: localhost:3000 (o host de staging)
 * En producción: https://domain.duckdns.org
 */
export const apiConfig = {
  baseUrl: environment.apiBaseUrl,
  timeout: environment.apiTimeout,
  environment: environment.environment,
};

// CAMBIO: Exportar para uso directo en servicios
export const API_BASE_URL = apiConfig.baseUrl;
export const ENVIRONMENT = apiConfig.environment;
