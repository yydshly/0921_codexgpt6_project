/** Resolve canonical preset paths without changing portable project data. */
export function assetUrl(source, base = import.meta.env?.BASE_URL || '/') {
  if (typeof source !== 'string' || !source.startsWith('/assets/')) return source;
  return `${base.endsWith('/') ? base : base + '/'}${source.slice(1)}`;
}
