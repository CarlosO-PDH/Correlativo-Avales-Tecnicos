// ambiente de producción - Oracle VM + DuckDNS
export const environment = {
  production: true,
  environment: 'production',
  apiBaseUrl: 'https://yourdomain.duckdns.org/api',
  apiTimeout: 30000,
  tokenStorage: 'localStorage', // En prod usamos localStorage con expiración
};
