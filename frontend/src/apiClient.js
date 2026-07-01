import { getToken, clearSession } from './session';

// Alle komponenter kaller fetch('/api/...') direkte. Vi patcher global fetch én
// gang slik at innloggingstoken alltid følger med, uten å måtte endre hvert kall.
const originalFetch = window.fetch.bind(window);

window.fetch = (input, init = {}) => {
  const url = typeof input === 'string' ? input : input.url;
  const isApiCall = typeof url === 'string' && url.startsWith('/api');
  const isLoginCall = url === '/api/auth/login';

  if (isApiCall && !isLoginCall) {
    const token = getToken();
    if (token) {
      init = { ...init, headers: { ...(init.headers || {}), Authorization: `Bearer ${token}` } };
    }
  }

  return originalFetch(input, init).then(res => {
    if (res.status === 401 && isApiCall && !isLoginCall) {
      clearSession();
      window.dispatchEvent(new Event('anka:unauthorized'));
    }
    return res;
  });
};
