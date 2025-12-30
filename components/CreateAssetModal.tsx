import React, { useState, useEffect, useMemo } from 'react';
import { Asset, Artist, SourceStatus, OwnershipType, Rarity, PinMetrics, MarketTier } from '../types';
import { RealPinData } from '../services/pinterestService';

interface CreateAssetModalProps {
  artists: Artist[];
  nextSku: string;
  onClose: () => void;
  onCreate: (asset: Asset) => void;
  onNewArtist: (name: string) => Promise<string>;
  initialPinId?: string;
  orphans: RealPinData[];
}

const CreateAssetModal: React.FC<CreateAssetModalProps> = ({ 
  artists, nextSku, onClose, onCreate, onNewArtist, initialPinId, orphans 
}) => {
  const [displayName, setDisplayName] = useState('');
  const [selectedArtistId, setSelectedArtistId] = useState('');
  const [newArtistName, setNewArtistName] = useState('');
  const [isAddingNewArtist, setIsAddingNewArtist] = useState(false);
  
  const [pinInput, setPinInput] = useState(initialPinId || '');
  const [pinsList, setPinsList] = useState<PinMetrics[]>([]);

  const orphanMatch = useMemo(() => {
    return orphans.find(o => o.id === pinInput.trim());
  }, [pinInput, orphans]);

  useEffect(() => {
    if (initialPinId) {
      setPinInput(initialPinId);
      const match = orphans.find(o => o.id === initialPinId);
      if (match) {
        if (match.note && !displayName) setDisplayName(match.note.substring(0, 30));
        
        const newPin: PinMetrics = {
          pin_id: match.id,
          url: match.url || '',
          impressions: match.metrics?.impression_count || 0,
          saves: match.metrics?.save_count || 0,
          clicks: match.metrics?.pin_click_count || 0,
          outbound_clicks: match.metrics?.outbound_click_count || 0,
          velocity_score: 0
        };
        setPinsList([newPin]);
      }
    }
  }, [initialPinId, orphans]);

  const handleAddPin = () => {
    if (!pinInput.trim()) return;

    const newPin: PinMetrics = orphanMatch ? {
      pin_id: orphanMatch.id,
      url: orphanMatch.url || '',
      impressions: orphanMatch.metrics?.impression_count || 0,
      saves: orphanMatch.metrics?.save_count || 0,
      clicks: orphanMatch.metrics?.pin_click_count || 0,
      outbound_clicks: orphanMatch.metrics?.outbound_click_count || 0,
      velocity_score: 0
    } : {
      pin_id: pinInput.trim(),
      url: '',
      impressions: 0,
      saves: 0,
      clicks: 0,
      outbound_clicks: 0,
      velocity_score: 0
    };

    setPinsList(prev => [...prev, newPin]);
    setPinInput('');
    if (orphanMatch?.note && !displayName) setDisplayName(orphanMatch.note.substring(0, 30));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let finalArtistId = selectedArtistId;
    if (isAddingNewArtist && newArtistName) {
        finalArtistId = await onNewArtist(newArtistName);
    }

    const newAsset: Asset = {
      sku_id: nextSku,
      display_name: displayName || `ASSET_${nextSku}`,
      parent_artist_ids: [finalArtistId],
      file_path_drive: '',
      source_status: SourceStatus.RAW,
      ownership_type: OwnershipType.OWNED,
      current_rarity: Rarity.COMMON,
      lifecycle_stage: (0 as any), // Cast temporal si da error de Enum
      created_at: Date.now(),
      is_collection: false,
      pins: pinsList 
    };

    onCreate(newAsset);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#0a0a0a] border border-[#00ff41] p-6 w-full max-w-lg shadow-[0_0_30px_rgba(0,255,65,0.2)]">
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-xl font-black text-[#00ff41] uppercase italic">Adopción de Recurso</h2>
          <div className="text-[9px] bg-[#00ff41] text-black px-2 font-black uppercase">Kernel_Link_Active</div>
        </div>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase font-bold text-[#00ff41]/60">ID SKU</label>
              <div className="text-white font-mono bg-white/5 p-2 border border-white/10 text-xs">{nextSku}</div>
            </div>
            <div>
               <label className="text-[10px] uppercase font-bold text-[#00ff41]/60">Protocolo</label>
               <div className="text-[#00ff41] font-mono bg-[#00ff41]/5 p-2 border border-[#00ff41]/20 text-xs italic">INCUBACIÓN</div>
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-[#00ff41]/60">Etiqueta Identificadora</label>
            <input 
              autoFocus
              className="w-full bg-black border border-[#00ff41]/40 p-2 text-white focus:border-[#00ff41] outline-none text-sm"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Ej: Neon Cyber Mask..."
            />
          </div>

          <div>
             <label className="text-[10px] uppercase font-bold text-[#00ff41]/60">Asignación de Entidad</label>
             {!isAddingNewArtist ? (
               <div className="flex gap-2">
                 <select 
                   className="flex-1 bg-black border border-[#00ff41]/40 p-2 text-white text-xs"
                   value={selectedArtistId}
                   onChange={e => setSelectedArtistId(e.target.value)}
                 >
                   <option value="">SELECCIONAR ENTIDAD...</option>
                   {artists.map(a => <option key={a.artist_id} value={a.artist_id}>{a.name}</option>)}
                 </select>
                 <button type="button" onClick={()=>setIsAddingNewArtist(true)} className="bg-[#00ff41]/20 text-[#00ff41] px-3 text-xs font-bold border border-[#00ff41]">+</button>
               </div>
             ) : (
               <div className="flex gap-2">
                 <input 
                    className="flex-1 bg-black border border-purple-500 p-2 text-white placeholder-purple-500/50 text-xs"
                    placeholder="NOMBRE NUEVA ENTIDAD..."
                    value={newArtistName}
                    onChange={e => setNewArtistName(e.target.value)}
                 />
                 <button type="button" onClick={()=>setIsAddingNewArtist(false)} className="text-red-500 text-xs px-2 font-bold">X</button>
               </div>
             )}
          </div>

          <div className="border-t border-white/10 pt-4 mt-2">
            <div className="flex justify-between items-center mb-2">
               <label className="text-[10px] uppercase font-bold text-[#00ff41]/60">Sincronización de Pines</label>
               {orphanMatch && <span className="text-[8px] text-[#00ff41] animate-pulse font-black uppercase">! Evidencia Detectada</span>}
            </div>
            <div className="flex gap-2 mb-2">
              <input 
                className={`flex-1 bg-black border ${orphanMatch ? 'border-[#00ff41]' : 'border-white/20'} p-2 text-white text-xs font-mono`}
                placeholder="PIN_ID..."
                value={pinInput}
                onChange={e => setPinInput(e.target.value)}
              />
              <button 
                type="button" 
                onClick={handleAddPin} 
                className={`${orphanMatch ? 'bg-[#00ff41] text-black' : 'bg-white/10 text-white'} px-4 font-black text-[10px] transition-all`}
              >
                {orphanMatch ? 'ADOPTAR' : 'AÑADIR'}
              </button>
            </div>
            <div className="flex flex-wrap gap-2 max-h-[80px] overflow-y-auto">
              {pinsList.map(p => (
                <div key={p.pin_id} className="flex flex-col bg-[#00ff41]/5 border border-[#00ff41]/30 p-1 min-w-[100px]">
                   <span className="text-[8px] text-[#00ff41] font-mono">{p.pin_id}</span>
                   <span className="text-[7px] opacity-40 uppercase">Sync_Ok</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-4 mt-6">
            <button type="button" onClick={onClose} className="text-white/40 hover:text-white text-[10px] font-black uppercase">Abortar</button>
            <button type="submit" className="bg-[#00ff41] text-black font-black uppercase px-8 py-3 hover:bg-white transition-all text-xs italic">
              Confirmar Registro
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateAssetModal;