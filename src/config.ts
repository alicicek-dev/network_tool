const queryParams = new URLSearchParams(window.location.search);
export const BACKEND_PORT = queryParams.get('port') || '3001';
export const API_BASE = `http://127.0.0.1:${BACKEND_PORT}`;
