import { ReactNode } from 'react';
import { Loader2, Sparkles } from 'lucide-react';

interface AiShellProps {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
  loading: boolean;
  error: string | null;
  meta?: { proveedor: string; modelo: string } | null;
}

/** Marco común de las herramientas de IA: título, estado de carga, error y aviso. */
export default function AiShell({ id, title, description, children, loading, error, meta }: AiShellProps) {
  return (
    <section id={id} className="bg-slate-900 p-5 rounded-3xl border border-slate-800 shadow-xl space-y-3">
      <div>
        <h3 className="font-black text-white text-sm flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-400" /> {title}
          <span className="text-[10px] font-bold bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded">IA</span>
        </h3>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      {children}
      {loading && <p className="text-xs text-slate-400 flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Pensando… puede tardar hasta un minuto.</p>}
      {error && <p role="alert" className="text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg p-2">{error}</p>}
      {meta && <p className="text-[10px] text-slate-600">Generado con {meta.proveedor} ({meta.modelo}). Cifras aproximadas; no es consejo médico ni dietético.</p>}
    </section>
  );
}
