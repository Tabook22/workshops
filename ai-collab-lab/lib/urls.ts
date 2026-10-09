declare global {
  interface Window { __WORKSHOP_BASE_PATH__?: string; }
}

/** The VPS shell sets the prefix before loading React. Sites continues using /. */
export function appUrl(path: string): string {
  const prefix = typeof window === 'undefined' ? '' : (window.__WORKSHOP_BASE_PATH__ || '');
  return prefix.replace(/\/$/, '') + path;
}
