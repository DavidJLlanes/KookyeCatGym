import { TrendingUp, Dumbbell, Calendar, Flame, Clock, Timer} from 'lucide-react';
import StatTile from '../StatTile';
import { formatEsCompactKg } from '../../utils/number';

import type { useProgressStats } from '../../hooks/useProgressStats';

interface StatsBannerProps {
  stats: ReturnType<typeof useProgressStats>['stats'];
  timeStats: ReturnType<typeof useProgressStats>['timeStats'];
  formatDuration: (totalSeconds: number) => string;
}

export default function StatsBanner({ stats, timeStats, formatDuration }: StatsBannerProps) {
  return (
  <>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatTile id="stat-total-workouts" icon={Calendar} label="Entrenamientos" value={stats.totalWorkouts} />
      <StatTile id="stat-streak" icon={Flame} tone="bg-amber-950/50 text-amber-400 border-amber-500/20" label="Racha activa" value={`${stats.streak} días`} sub={`récord: ${stats.longestStreak} días`} />
      <StatTile id="stat-total-sets" icon={Dumbbell} label="Series completadas" value={stats.totalSetsLogged} />
      <StatTile id="stat-total-weight" icon={TrendingUp} tone="bg-emerald-950/50 text-emerald-400 border-emerald-500/20" label="Carga acumulada" value={formatEsCompactKg(stats.totalKgLifted)} />
    </div>

    {/* 1.5. Time Stats: Total / Semana / Hoy */}
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-lg flex items-center gap-3">
        <div className="p-3 bg-indigo-950/50 text-indigo-400 rounded-xl border border-indigo-500/20">
          <Timer className="h-5 w-5" />
        </div>
        <div>
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tiempo Total Entrenado</div>
          <div id="stat-time-total" className="text-xl font-black text-white">{formatDuration(timeStats.totalSeconds)}</div>
        </div>
      </div>

      <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-lg flex items-center gap-3">
        <div className="p-3 bg-blue-950/60 text-blue-400 rounded-xl border border-blue-500/20">
          <Clock className="h-5 w-5" />
        </div>
        <div>
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Esta Semana (Lun-Dom)</div>
          <div id="stat-time-week" className="text-xl font-black text-white">{formatDuration(timeStats.weekSeconds)}</div>
        </div>
      </div>

      <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-lg flex items-center gap-3">
        <div className="p-3 bg-emerald-950/50 text-emerald-400 rounded-xl border border-emerald-500/20">
          <Calendar className="h-5 w-5" />
        </div>
        <div>
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Hoy</div>
          <div id="stat-time-today" className="text-xl font-black text-white">{formatDuration(timeStats.todaySeconds)}</div>
        </div>
      </div>
    </div>
  </>
  );
}
