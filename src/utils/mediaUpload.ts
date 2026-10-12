// Prepara una foto o vídeo antes de subirlo: las fotos grandes del móvil se
// reducen a JPEG de 1600 px (de varios MB a unos cientos de KB); los GIF y los
// vídeos se suben tal cual, con un límite de 50 MB.

export const MEDIA_MAX_BYTES = 50 * 1024 * 1024;
const MAX_SIDE = 1600;

export interface PreparedUpload {
  blob: Blob;
  fileName: string;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer la imagen.'));
    };
    img.src = url;
  });
}

// Algunos Android entregan el archivo sin tipo: se deduce por la extensión
function mediaKind(file: File): 'image' | 'video' | 'heic' | null {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (/image\/hei[cf]/.test(file.type) || ext === 'heic' || ext === 'heif') return 'heic';
  if (file.type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) return 'image';
  if (file.type.startsWith('video/') || ['mp4', 'mov', 'webm', 'm4v'].includes(ext)) return 'video';
  return null;
}

export async function prepareMediaUpload(file: File): Promise<PreparedUpload> {
  const kind = mediaKind(file);
  if (!kind) {
    throw new Error('Elige una foto o un vídeo.');
  }

  if (kind === 'video' || file.type === 'image/gif') {
    if (file.size > MEDIA_MAX_BYTES) throw new Error('El archivo supera 50 MB. Recórtalo o grábalo más corto.');
    return { blob: file, fileName: file.name };
  }

  // HEIC (fotos de algunos móviles Samsung): si el navegador no sabe leerla, no
  // se puede convertir a JPEG aquí y el servidor no la admitiría tal cual.
  let img: HTMLImageElement;
  try {
    img = await loadImage(file);
  } catch {
    throw new Error(
      kind === 'heic'
        ? 'Esta foto está en formato HEIC y este navegador no puede abrirla. Hazla con el botón "Hacer foto" o cambia la cámara del móvil a formato JPEG ("Más compatible").'
        : 'No se pudo leer la imagen.'
    );
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  // Una HEIC legible se convierte siempre a JPEG (el servidor no admite HEIC)
  if (scale === 1 && file.size < 600 * 1024 && kind !== 'heic') {
    return { blob: file, fileName: file.name };
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);

  // JPEG y no WebP: Safari no sabe codificar WebP desde un canvas
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
  if (!blob) return { blob: file, fileName: file.name };
  return { blob, fileName: file.name.replace(/\.[^.]+$/, '') + '.jpg' };
}
