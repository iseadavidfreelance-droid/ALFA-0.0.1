
import React, { useState } from 'react';
import { Artist, Asset, AssetDestination } from '../types';
import { calculateAssetScore } from '../services/logicEngines';

interface Props {
  artist: Artist;
  assets: Asset[];
  destinations: AssetDestination[];
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Artist>) => void;
}

const EntityDetailModal: React.FC<Props> = ({ artist, assets, destinations, onClose, onUpdate }) => {
  const [boardUrl, setBoardUrl] = useState(artist.board_url || '');

  const totalImpressions = assets.reduce((acc, a) => acc + a.pins.reduce((p, c) => p + c.impressions, 0), 0);
  const totalClicks = assets.reduce((acc, a) => acc + a.pins.reduce((p, c) => p + c.clicks, 0), 0);
  const totalOutbound = assets.reduce((acc, a) => acc + a.pins.reduce((p, c) => p + c.outbound_clicks, 0), 0);
  const totalSaves = assets.reduce((acc, a) => acc + a.pins.reduce((p, c) => p + c.saves, 0), 0);
  const totalRevenue = destinations.filter(d => assets.some(a => a.sku_id === d.asset_sku)).reduce((acc, d) => acc + d.revenue_generated, 0);
  const totalScore = assets.reduce((acc, a) => acc + calculateAssetScore(a.pins), 0);

  const handleSave = () => {
    onUpdate(artist.artist_id, { board_url: boardUrl });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 animate-in fade-in backdrop-blur-sm">
      <div className="w-full max-w-5xl bg-[#080808] border-2 border-purple-500 p-8 shadow-[0_0_100px_rgba(147,51,234,0.3)] font-mono flex flex-col max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-start border-b border-purple-500/40 pb-6 mb-8 relative">
          <div>
            <h2 className="text-4xl font-black text-purple-400 italic tracking-tighter leading-none">{artist.name}</h2>
            <div className="text-[10px] opacity-60 font-black uppercase mt-2 tracking-[0.4em]">ENTIDAD_MASTER_NODE // {artist.artist_id}</div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleSave} className="bg-purple-600 text-white px-8 py-2 text-xs font-black uppercase italic shadow-lg hover:bg-white hover:text-black transition-all">Sincronizar_Nodo</button>
            <button onClick={onClose} className="border border-white/20 text-white/40 px-8 py-2 text-xs font-black uppercase italic hover:text-white transition-all">Cerrar</button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 overflow-y-auto custom-scrollbar pr-4">
          <div className="lg:col-span-2 space-y-8">
            <section className="bg-white/5 p-8 border border-white/10 space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 text-[60px] opacity-5 font-black uppercase italic leading-none select-none">ATTENTION</div>
              <h3 className="text-xs text-purple-400 font-black uppercase border-b border-purple-500/20 pb-2 tracking-[0.2em]">Métricas_Consolidadas_de_Nodo</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="bg-black/40 p-4 border border-white/5 flex flex-col items-center justify-center text-center">
                  <div className="text-[8px] opacity-40 uppercase font-black mb-2">Alcance_Imp</div>
                  <div className="text-2xl font-black">{totalImpressions.toLocaleString()}</div>
                </div>
                <div className="bg-black/40 p-4 border border-white/5 flex flex-col items-center justify-center text-center">
                  <div className="text-[8px] opacity-40 uppercase font-black mb-2">Score_Impact</div>
                  <div className="text-2xl font-black text-purple-400">{totalScore.toFixed(0)}</div>
                </div>
                <div className="bg-black/40 p-4 border border-white/5 flex flex-col items-center justify-center text-center">
                  <div className="text-[8px] opacity-40 uppercase font-black mb-2">Clicks_Int</div>
                  <div className="text-2xl font-black text-pink-500">{totalClicks}</div>
                </div>
                <div className="bg-black/40 p-4 border border-white/5 flex flex-col items-center justify-center text-center">
                  <div className="text-[8px] opacity-40 uppercase font-black mb-2">Outbound_Int</div>
                  <div className="text-2xl font-black text-red-500">{totalOutbound}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="bg-purple-900/10 p-4 border border-purple-500/20">
                    <span className="text-[8px] opacity-40 uppercase font-black block mb-1">Guardados_Colección</span>
                    <span className="text-xl font-black text-purple-300">{totalSaves}</span>
                 </div>
                 <div className="bg-purple-900/10 p-4 border border-purple-500/20">
                    <span className="text-[8px] opacity-40 uppercase font-black block mb-1">Ratio_Eficiencia_Score</span>
                    <span className="text-xl font-black text-purple-300">{(totalScore / (assets.length || 1)).toFixed(1)} P/A</span>
                 </div>
              </div>
            </section>
            
            <section className="bg-yellow-500/5 p-8 border border-yellow-500/20 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 text-[60px] opacity-5 font-black uppercase italic leading-none select-none">YIELD</div>
               <h3 className="text-xs text-yellow-500 font-black uppercase border-b border-yellow-500/20 pb-2 tracking-[0.2em]">Rendimiento_Económico_Payhip</h3>
               <div className="flex justify-between items-end py-6">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] opacity-40 uppercase font-black">Yield_Bruto_Entidad</span>
                    <span className="text-6xl font-black text-yellow-500 tracking-tighter">${totalRevenue.toFixed(2)}</span>
                  </div>
                  <div className="text-right flex flex-col gap-2">
                    <div className="flex flex-col">
                      <span className="text-[8px] opacity-40 uppercase font-black">CTR_Conversion_Real</span>
                      <span className="text-2xl font-black text-yellow-200">{totalOutbound > 0 ? ((totalRevenue / (totalOutbound * 15)) * 100).toFixed(2) : '0.00'}%</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[8px] opacity-40 uppercase font-black">Yield_per_Asset</span>
                      <span className="text-xl font-black text-yellow-100">${(totalRevenue / (assets.length || 1)).toFixed(2)}</span>
                    </div>
                  </div>
               </div>
            </section>
          </div>

          <div className="space-y-6">
            <div className="bg-white/5 p-6 border border-white/10 space-y-6">
               <div className="flex flex-col gap-2">
                  <label className="text-[10px] opacity-40 uppercase font-black italic tracking-widest">Pinterest_Board_Node_Link</label>
                  <input 
                    type="text" 
                    value={boardUrl} 
                    onChange={e=>setBoardUrl(e.target.value)} 
                    className="bg-black border border-purple-500/40 p-4 text-xs text-pink-500 outline-none focus:border-pink-500 font-mono shadow-[inset_0_0_10px_rgba(236,72,153,0.1)]"
                    placeholder="Vincular nodo de Pinterest..."
                  />
                  <p className="text-[8px] opacity-40 uppercase italic leading-relaxed">Este enlace sincroniza el motor de inteligencia con el board algorítmico de Pinterest para esta ENTIDAD.</p>
               </div>
               
               <div className="flex flex-col gap-2">
                  <label className="text-[10px] opacity-40 uppercase font-black italic tracking-widest">Tier_de_Mercado_y_Género</label>
                  <div className="text-xs font-black p-4 bg-black/40 border border-white/5 text-purple-400 uppercase">{artist.market_tier} // {artist.genres.join(' | ')}</div>
               </div>
            </div>

            <div className="bg-black border border-white/10 p-5 h-[350px] flex flex-col">
              <h4 className="text-[10px] opacity-40 font-black uppercase mb-4 border-b border-white/10 pb-2">Inventario_de_Assets_Sincronizados ({assets.length})</h4>
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                {assets.sort((a,b)=>calculateAssetScore(b.pins)-calculateAssetScore(a.pins)).map(a => (
                  <div key={a.sku_id} className="flex justify-between p-3 bg-white/5 text-[10px] hover:bg-purple-500/10 transition-all border-l-2 border-purple-500/30 group">
                    <div className="flex flex-col">
                      <span className="font-black text-[#00ff41]">{a.sku_id}</span>
                      <span className="opacity-60 text-[8px] truncate max-w-[120px] italic">{a.display_name}</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-yellow-500 font-black">{calculateAssetScore(a.pins).toFixed(0)}</span>
                      <span className="text-[7px] opacity-40 uppercase font-black">{a.current_rarity}</span>
                    </div>
                  </div>
                ))}
                {assets.length === 0 && <div className="text-center py-10 opacity-20 italic">No hay assets vinculados a esta entidad.</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EntityDetailModal;
