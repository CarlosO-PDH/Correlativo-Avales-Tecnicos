// ambiente de staging - pruebas pre-producción
export const environment = {
  production: false,
  environment: 'staging',
  apiBaseUrl: 'http://localhost:3000/api', // Cambia según tu host staging
  apiTimeout: 30000,
  tokenStorage: 'sessionStorage',
};
