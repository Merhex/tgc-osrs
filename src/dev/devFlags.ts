/** Development tools are available in dev builds, or in production with ?dev. */
export function devToolsEnabled(): boolean {
  if (typeof location === 'undefined') return false;
  return import.meta.env.DEV || new URLSearchParams(location.search).has('dev');
}

export function labRequested(): boolean {
  return devToolsEnabled() && new URLSearchParams(location.search).has('lab');
}
