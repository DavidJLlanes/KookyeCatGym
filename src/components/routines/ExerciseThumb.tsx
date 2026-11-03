import { Dumbbell} from 'lucide-react';
import { Exercise} from '../../types';
import { useLightbox } from '../../context/LightboxContext';
import { getStaticThumbUrl } from '../../utils/media';

function hasValidPhoto(ex?: Exercise) {
  return (
    !!ex?.imageUrl &&
    !ex.imageUrl.includes('placeholder') &&
    (ex.imageUrl.startsWith('http') || ex.imageUrl.startsWith('/'))
  );
}

// Miniatura de ejercicio: muestra la foto COMPLETA (nunca recortada) sin
// importar el tamaño/formato original de la imagen fuente. Ocupa 1/4 del
// ancho del contenedor en móvil (y un ancho fijo mayor en pantallas grandes).
export default function ExerciseThumb({ ex }: { ex?: Exercise }) {
  const { openLightbox } = useLightbox();
  return (
    <div className="w-1/4 sm:w-28 lg:w-32 shrink-0 aspect-square rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center">
      {hasValidPhoto(ex) ? (
        <img
          src={getStaticThumbUrl(ex!.imageUrl)}
          alt={ex!.name}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onClick={(e) => {
            e.stopPropagation();
            openLightbox(ex!.imageUrl, ex!.name, ex!.videoUrl);
          }}
          className="w-full h-full object-contain cursor-zoom-in"
        />
      ) : (
        <Dumbbell className="h-6 w-6 text-blue-400" />
      )}
    </div>
  );
}

