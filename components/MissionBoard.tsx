
import React from 'react';
import { Mission } from '../types';

interface MissionBoardProps {
  missions: Mission[];
  onResolve: (sku: string) => void;
}

const MissionBoard: React.FC<MissionBoardProps> = ({ missions, onResolve }) => {
  const openMissions = missions.filter(m => m.status === 'OPEN');

  if (openMissions.length === 0) {
    return (
      <div className="border border-[#00ff41] border-dashed p-8 flex flex-col items-center justify-center opacity-30">
        <div className="text-2xl mb-2">SIN MISIONES</div>
        <div className="text-xs uppercase">Sincronización completa. Operación en orden.</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {openMissions.map((mission) => (
        <div key={mission.id} className="border-2 border-red-600 bg-red-900/10 p-4 relative animate-pulse">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-red-600 font-bold uppercase tracking-tighter">
              [{mission.type} #{mission.id.split('-')[1]}] 🚨
            </h3>
            <span className="bg-red-600 text-black px-2 py-0.5 text-xs font-bold">PRIORIDAD: {mission.priority}</span>
          </div>
          <div className="text-sm border-b border-red-600/30 pb-2 mb-2">
            <span className="opacity-70">ACTIVO:</span> {mission.asset_sku}
            <br />
            <span className="opacity-70">PROBLEMA:</span> {mission.message}
          </div>
          <div className="space-y-4">
            <div>
              <div className="text-xs font-bold text-red-400 mb-1">EVIDENCIA:</div>
              {mission.evidence.map((ev, i) => (
                <div key={i} className="text-xs opacity-80">&gt; {ev}</div>
              ))}
            </div>
            <div>
              <div className="text-xs font-bold text-red-400 mb-1">MISIÓN OPERATIVA:</div>
              {mission.tasks.map((task, i) => (
                <div key={i} className="text-xs opacity-80">{i + 1}. [{task.split(' ')[0]}] {task.split(' ').slice(1).join(' ')}</div>
              ))}
            </div>
          </div>
          <div className="mt-4 pt-2 border-t border-red-600/30">
            <button 
              onClick={() => onResolve(mission.asset_sku)}
              className="w-full bg-red-600 text-black font-bold py-1 hover:bg-red-500 transition-colors text-xs"
            >
              CERRAR MISIÓN (VERIFICAR {mission.asset_sku})
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MissionBoard;
