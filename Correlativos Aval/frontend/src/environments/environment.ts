// ambiente de desarrollo - localhost
export const environment = {
  production: false,
  environment: 'development',
  apiBaseUrl: 'http://localhost:3000/api',
  apiTimeout: 30000,
  tokenStorage: 'sessionStorage', // Usar sessionStorage en dev para seguridad
};
