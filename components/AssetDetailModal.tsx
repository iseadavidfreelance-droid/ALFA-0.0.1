
import React, { useState } from 'react';
import { Asset, AssetDestination, LifecycleStage, PinMetrics } from '../types';

interface Props {
  asset: Asset;
  destinations: AssetDestination[];
  onClose: () => void;
  onAction: (cmd: string) => void;
  onUpdate: (sku: string, updates: Partial<Asset>, newDestinations?: AssetDestination[]) => void;
}

const AssetDetailModal: React.FC<Props> = ({ asset, destinations, onClose, onAction, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editDriveLink, setEditDriveLink] = useState(asset.file_path_drive || '');
  const [payhipLink, setPayhipLink] = useState(destinations.find(d => d.destination_type === 'PAYHIP')?.url || '');
  
  const totalScore = asset.pins.reduce((acc, p) => acc + p.velocity_score, 0);
  const totalOutbound = asset.pins.reduce((acc, p) => acc + p.outbound_clicks, 0);
  const totalRevenue = destinations.reduce((acc, d) => acc + d.revenue_generated, 0);
  const totalSales = destinations.reduce((acc, d) => acc + d.sales, 0);
  const totalViews = destinations.reduce((acc, d) => acc + d.views, 0);

  const handleSave = () => {
    const updatedDests = [...destinations];
    const payhipIdx = updatedDests.findIndex(d => d.destination_type === 'PAYHIP');
    if (payhipLink) {
      if (payhipIdx > -1) updatedDests[payhipIdx] = { ...updatedDests[payhipIdx], url: payhipLink, status: 'ACTIVE' };
      else updatedDests.push({ asset_sku: asset.sku_id, destination_type: 'PAYHIP', url: payhipLink, status: 'ACTIVE', views: 0, sales: 0, revenue_generated: 0 });
    }
    onUpdate(asset.sku_id, { file_path_drive: editDriveLink }, updatedDests);
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-[#080808] border-2 border-[#00ff41] p-8 shadow-[0_0_80px_rgba(0,255,65,0.2)] font-mono flex flex-col max-h-[90vh] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-[#00ff41]/5 -mr-20 -mt-20 rounded-full blur-3xl"></div>
        
        <div className="flex justify-between items-start border-b border-[#00ff41]/40 pb-6 mb-8 relative z-10">
          <div>
            <h2 className="text-3xl font-black text-[#00ff41] italic tracking-tighter leading-none">{asset.sku_id}</h2>
            <div className="text-[10px] opacity-60 font-black uppercase mt-1 tracking-widest tracking-[0.3em]">{asset.display_name} // {asset.current_rarity}</div>
          </div>
          <div className="flex gap-2">
            {!isEditing ? (
              <button onClick={() => setIsEditing(true)} className="border border-[#00ff41] text-[#00ff41] px-6 py-2 text-xs font-black uppercase italic hover:bg-[#00ff41] hover:text-black transition-all">EDITAR_NODO</button>
            ) : (
              <button onClick={handleSave} className="bg-[#00ff41] text-black px-6 py-2 text-xs font-black uppercase italic">Sincronizar_Kernel</button>
            )}
            <button onClick={onClose} className="border border-white/20 text-white/40 px-6 py-2 text-xs font-black uppercase italic hover:text-white transition-all">Cerrar</button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 overflow-y-auto custom-scrollbar pr-2 relative z-10">
          <div className="space-y-6">
            <section className="bg-white/5 p-6 border border-white/10 relative overflow-hidden">
              <div className="absolute bottom-0 right-0 p-2 text-[40px] opacity-5 font-black uppercase italic">PULSE</div>
              <h3 className="text-[10px] text-pink-500 font-black uppercase mb-4 tracking-tighter italic border-b border-pink-500/20 pb-1">Métricas_Tácticas_Pinterest</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center bg-black/40 p-3 border border-white/5">
                  <div className="text-[8px] opacity-40 uppercase font-black mb-1">Outbound_Flow</div>
                  <div className="text-2xl font-black text-pink-500">{totalOutbound}</div>
                </div>
                <div className="text-center bg-black/40 p-3 border border-white/5">
                  <div className="text-[8px] opacity-40 uppercase font-black mb-1">Attention_Score</div>
                  <div className="text-2xl font-black text-yellow-500">{totalScore.toFixed(0)}</div>
                </div>
                <div className="text-center bg-black/40 p-3 border border-white/5">
                  <div className="text-[8px] opacity-40 uppercase font-black mb-1">Impressions</div>
                  <div className="text-lg font-black">{asset.pins.reduce((a,b)=>a+b.impressions,0).toLocaleString()}</div>
                </div>
                <div className="text-center bg-black/40 p-3 border border-white/5">
                  <div className="text-[8px] opacity-40 uppercase font-black mb-1">Status_Ciclo</div>
                  <div className="text-lg font-black uppercase">{asset.lifecycle_stage}</div>
                </div>
              </div>
            </section>
            
            <section className="bg-yellow-500/5 p-6 border border-yellow-500/20 relative overflow-hidden">
              <div className="absolute bottom-0 right-0 p-2 text-[40px] opacity-5 font-black uppercase italic">YIELD</div>
              <h3 className="text-[10px] text-yellow-500 font-black uppercase mb-4 tracking-tighter italic border-b border-yellow-500/20 pb-1">Retorno_Financiero_Asset</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center bg-black/40 p-3 border border-white/5">
                  <div className="text-[8px] opacity-40 uppercase font-black">Sales</div>
                  <div className="text-lg font-black">{totalSales}</div>
                </div>
                <div className="text-center bg-black/40 p-3 border border-white/5">
                  <div className="text-[8px] opacity-40 uppercase font-black">Node_Views</div>
                  <div className="text-lg font-black">{totalViews}</div>
                </div>
                <div className="text-center bg-black/40 p-3 border border-white/5">
                  <div className="text-[8px] opacity-40 uppercase font-black">Total_Yield</div>
                  <div className="text-lg font-black text-yellow-500">${totalRevenue.toFixed(0)}</div>
                </div>
              </div>
            </section>
          </div>

          <div className="space-y-6">
             <div className="bg-white/5 p-6 border border-white/10 space-y-6">
               <div className="flex flex-col gap-2">
                  <label className="text-[10px] opacity-40 uppercase font-black italic tracking-widest">Drive_Source_Path</label>
                  {isEditing ? (
                    <input type="text" value={editDriveLink} onChange={e=>setEditDriveLink(e.target.value)} className="bg-black border border-blue-500/40 p-3 text-xs text-blue-400 outline-none focus:border-blue-400 font-mono"/>
                  ) : (
                    <div className="text-xs text-blue-400 truncate bg-black/40 p-3 border border-white/5 font-mono">{asset.file_path_drive || 'NOT_LINKED_VULNERABLE'}</div>
                  )}
               </div>
               <div className="flex flex-col gap-2">
                  <label className="text-[10px] opacity-40 uppercase font-black italic tracking-widest">Monetization_Node_Node</label>
                  {isEditing ? (
                    <input type="text" value={payhipLink} onChange={e=>setPayhipLink(e.target.value)} className="bg-black border border-yellow-500/40 p-3 text-xs text-yellow-500 outline-none focus:border-yellow-500 font-mono"/>
                  ) : (
                    <div className="text-xs text-yellow-500 truncate bg-black/40 p-3 border border-white/5 font-mono">{payhipLink || 'NO_PAYMENT_NODE_DETECTED'}</div>
                  )}
               </div>
             </div>
             
             <div className="pt-4 space-y-4">
               <button onClick={() => onAction(`analizar ${asset.sku_id}`)} className="w-full bg-purple-600/20 border border-purple-600 text-purple-400 py-5 font-black text-xs uppercase italic hover:bg-purple-600 hover:text-white shadow-xl transition-all">INFERENCIA_IA_RENTABILIDAD</button>
               <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => onAction(`verificar ${asset.sku_id}`)} className="bg-green-600/20 border border-green-600 text-green-500 py-3 text-[10px] font-black uppercase italic hover:bg-green-600 hover:text-white transition-all">Validar_SKU</button>
                  <button onClick={() => window.open(asset.pins[0]?.url)} className="bg-pink-600/20 border border-pink-600 text-pink-500 py-3 text-[10px] font-black uppercase italic hover:bg-pink-600 hover:text-white transition-all">Pines_Board</button>
               </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssetDetailModal;
