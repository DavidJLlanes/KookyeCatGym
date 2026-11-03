import { BarChart2, Target} from 'lucide-react';
import { ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell } from 'recharts';


interface MuscleFocusCardProps {
  muscleFocusData: { name: string; value: number; color: string }[];
  /** Series completadas en total (para los porcentajes). */
  totalSetsLogged: number;
}

export default function MuscleFocusCard({ muscleFocusData, totalSetsLogged }: MuscleFocusCardProps) {
  return (
      <div className="lg:col-span-1 bg-slate-900 p-5 rounded-3xl border border-slate-800 shadow-xl space-y-4 flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-white text-base tracking-tight flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-400" />
            Enfoque Muscular (Histórico)
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Visualiza qué áreas están recibiendo mayor volumen de series completadas en tus entrenamientos.
          </p>
        </div>

        <div className="h-60 w-full mt-4 flex items-center justify-center">
          {totalSetsLogged > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={muscleFocusData} layout="vertical" margin={{ left: 10, right: 10, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#1e293b" />
                <XAxis type="number" stroke="#64748b" fontSize={10} />
                <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={10} width={65} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                  cursor={{ fill: '#0f172a' }}
                />
                <Bar dataKey="value" name="Series Completadas" radius={[0, 4, 4, 0]}>
                  {muscleFocusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center p-6 space-y-2">
              <BarChart2 className="h-8 w-8 text-slate-650 mx-auto" />
              <p className="text-slate-400 text-xs font-semibold">Falta registrar series para mostrar gráficos de enfoque.</p>
            </div>
          )}
        </div>

        {/* Quick list table of muscle groups sets */}
        <div className="space-y-1.5 pt-4 border-t border-slate-800">
          {muscleFocusData.map((item) => {
            const percentage = totalSetsLogged > 0 
              ? Math.round((item.value / totalSetsLogged) * 100) 
              : 0;

            return (
              <div key={item.name} className="flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-300">{item.name}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <span>{item.value} series</span>
                  <span className="text-[10px] bg-slate-950 border border-slate-800 px-1.5 py-0.5 rounded-md font-bold text-slate-500">
                    {percentage}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
  );
}
