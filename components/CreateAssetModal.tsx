import React, { useState, useEffect } from 'react';
import { Asset, Artist, LifecycleStage, SourceStatus, OwnershipType, Rarity } from '../types';

interface CreateAssetModalProps {
  artists: Artist[];
  nextSku: string;
  onClose: () => void;
  onCreate: (asset: Asset) => void;
  onNewArtist: (name: string) => Promise<string>;
  initialPinId?: string; // Nuevo prop opcional
}

const CreateAssetModal: React.FC<CreateAssetModalProps> = ({ artists, nextSku, onClose, onCreate, onNewArtist, initialPinId }) => {
  const [displayName, setDisplayName] = useState('');
  const [selectedArtistId, setSelectedArtistId] = useState('');
  const [newArtistName, setNewArtistName] = useState('');
  const [isAddingNewArtist, setIsAddingNewArtist] = useState(false);
  
  // Estado local para pines
  const [pinInput, setPinInput] = useState(initialPinId || ''); // Si viene ID, úsalo
  const [pinsList, setPinsList] = useState<{ pin_id: string; impressions: number; saves: number; clicks: number; outbound_clicks: number }[]>([]);

  // Efecto para autollenar si se recibe un ID
  useEffect(() => {
    if (initialPinId) {
        setPinInput(initialPinId);
        // Opcional: Auto-agregar a la lista si quieres saltar el paso de darle al botón "Add"
        setPinsList([{ pin_id: initialPinId, impressions: 0, saves: 0, clicks: 0, outbound_clicks: 0 }]);
    }
  }, [initialPinId]);

  const handleAddPin = () => {
    if (pinInput.trim()) {
      setPinsList([...pinsList, { pin_id: pinInput.trim(), impressions: 0, saves: 0, clicks: 0, outbound_clicks: 0 }]);
      setPinInput('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let finalArtistId = selectedArtistId;

    if (isAddingNewArtist && newArtistName) {
        finalArtistId = await onNewArtist(newArtistName);
    }

    const newAsset: Asset = {
      sku_id: nextSku,
      display_name: displayName,
      parent_artist_ids: [finalArtistId],
      file_path_drive: '',
      source_status: SourceStatus.RAW,
      ownership_type: OwnershipType.OWNED,
      current_rarity: Rarity.COMMON,
      lifecycle_stage: LifecycleStage.INCUBATION,
      created_at: Date.now(),
      is_collection: false,
      pins: pinsList // Aquí van los pines (aunque tengan 0, App.tsx los rellenará)
    };

    onCreate(newAsset);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0a0a0a] border border-[#00ff41] p-6 w-full max-w-lg shadow-[0_0_30px_rgba(0,255,65,0.2)]">
        <h2 className="text-xl font-black text-[#00ff41] mb-6 uppercase italic">Registrar Nuevo Activo</h2>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-[10px] uppercase font-bold text-[#00ff41]/60">SKU (Auto)</label>
            <div className="text-white font-mono bg-white/5 p-2 border border-white/10">{nextSku}</div>
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-[#00ff41]/60">Nombre del Diseño</label>
            <input 
              autoFocus
              className="w-full bg-black border border-[#00ff41]/40 p-2 text-white focus:border-[#00ff41] outline-none"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Ej: Cyber Skull V2..."
            />
          </div>

          <div>
             <label className="text-[10px] uppercase font-bold text-[#00ff41]/60">Entidad Maestra</label>
             {!isAddingNewArtist ? (
               <div className="flex gap-2">
                 <select 
                   className="flex-1 bg-black border border-[#00ff41]/40 p-2 text-white"
                   value={selectedArtistId}
                   onChange={e => setSelectedArtistId(e.target.value)}
                 >
                   <option value="">Seleccionar Entidad...</option>
                   {artists.map(a => <option key={a.artist_id} value={a.artist_id}>{a.name}</option>)}
                 </select>
                 <button type="button" onClick={()=>setIsAddingNewArtist(true)} className="bg-[#00ff41]/20 text-[#00ff41] px-2 text-xs font-bold border border-[#00ff41]">+</button>
               </div>
             ) : (
               <div className="flex gap-2">
                 <input 
                    className="flex-1 bg-black border border-purple-500 p-2 text-white placeholder-purple-500/50"
                    placeholder="Nombre Nueva Entidad..."
                    value={newArtistName}
                    onChange={e => setNewArtistName(e.target.value)}
                 />
                 <button type="button" onClick={()=>setIsAddingNewArtist(false)} className="text-red-500 text-xs px-2">X</button>
               </div>
             )}
          </div>

          <div className="border-t border-white/10 pt-4 mt-2">
            <label className="text-[10px] uppercase font-bold text-[#00ff41]/60 mb-2 block">Pines Asociados (IDs)</label>
            <div className="flex gap-2 mb-2">
              <input 
                className="flex-1 bg-black border border-white/20 p-2 text-white text-xs font-mono"
                placeholder="ID de Pinterest..."
                value={pinInput}
                onChange={e => setPinInput(e.target.value)}
              />
              <button type="button" onClick={handleAddPin} className="bg-white/10 text-white px-4 font-bold border border-white/20 hover:bg-white/20">ADD</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {pinsList.map(p => (
                <span key={p.pin_id} className="text-[9px] bg-[#00ff41]/10 text-[#00ff41] px-2 py-1 border border-[#00ff41]/30">
                  {p.pin_id}
                </span>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-4 mt-6">
            <button type="button" onClick={onClose} className="text-white/40 hover:text-white text-xs font-bold uppercase">Cancelar</button>
            <button type="submit" className="bg-[#00ff41] text-black font-black uppercase px-6 py-2 hover:bg-white transition-all shadow-[0_0_15px_rgba(0,255,65,0.4)]">
              Registrar Asset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateAssetModal;