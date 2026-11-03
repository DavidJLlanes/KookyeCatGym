/**
 * Rutas de ficheros públicos (iconos, imágenes y vídeos del catálogo, medios
 * del servidor) escritas como «/algo». Si la app vive en una subcarpeta
 * (p. ej. /gym/, con `base` de Vite), se les antepone esa subcarpeta.
 */
export function joinBase(base: string, url: string): string {
  const root = base.replace(/\/+$/, '');
  if (!root || !url.startsWith('/') || url.startsWith('//')) return url;
  if (url === root || url.startsWith(root + '/')) return url; // ya lleva la subcarpeta
  return root + url;
}

export const assetUrl = (url: string): string => joinBase(import.meta.env.BASE_URL ?? '/', url);
