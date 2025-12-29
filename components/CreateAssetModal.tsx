
import React, { useState } from 'react';
import { Artist, Asset, SourceStatus, OwnershipType, Rarity, LifecycleStage, MarketTier } from '../types';

interface Props {
  artists: Artist[];
  nextSku: string;
  onClose: () => void;
  onCreate: (asset: Asset) => void;
  onNewArtist: (name: string) => string;
}

const CreateAssetModal: React.FC<Props> = ({ artists, nextSku, onClose, onCreate, onNewArtist }) => {
  const [displayName, setDisplayName] = useState('');
  const [selectedArtist, setSelectedArtist] = useState(artists[0]?.artist_id || '');
  const [driveLink, setDriveLink] = useState('');
  const [ownership, setOwnership] = useState<OwnershipType>(OwnershipType.OWNED);
  
  const [isCreatingArtist, setIsCreatingArtist] = useState(false);
  const [newArtistName, setNewArtistName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName) return;

    let finalArtistId = selectedArtist;
    
    // Inyectar nuevo artista si se solicita
    if (isCreatingArtist && newArtistName) {
      finalArtistId = onNewArtist(newArtistName.trim().toUpperCase());
    }

    const newAsset: Asset = {
      sku_id: nextSku,
      display_name: displayName.toUpperCase().trim(),
      parent_artist_ids: finalArtistId ? [finalArtistId] : [],
      file_path_drive: driveLink || undefined,
      source_status: SourceStatus.RAW,
      ownership_type: ownership,
      current_rarity: Rarity.COMMON,
      lifecycle_stage: LifecycleStage.INCUBATION,
      created_at: Date.now(),
      is_collection: false,
      pins: []
    };

    onCreate(newAsset);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in zoom-in duration-200">
      <div className="w-full max-w-lg bg-[#080808] border-2 border-[#00ff41] p-8 shadow-[0_0_80px_rgba(0,255,65,0.3)] font-mono relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#00ff41]/5 -mr-16 -mt-16 rounded-full blur-3xl"></div>
        
        <div className="flex justify-between items-center mb-10 border-b border-[#00ff41]/30 pb-4">
          <h2 className="text-2xl font-black text-[#00ff41] uppercase tracking-tighter italic leading-none flex items-center gap-3">
             <span className="w-3 h-3 bg-[#00ff41] animate-ping"></span>
             Inducción_Semilla: {nextSku}
          </h2>
          <div className="text-[10px] opacity-40 font-bold uppercase italic tracking-widest">Protocol_Siembra_v1</div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="space-y-2">
            <label className="text-[10px] opacity-60 uppercase font-black italic tracking-widest flex justify-between">
               <span>Display_Name</span>
               <span className="text-red-500 font-black tracking-normal">[REQUERIDO]</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="EJ: ANUEL AA CHROME EDITION"
              className="w-full bg-black border border-[#00ff41]/40 px-4 py-3 text-[#00ff41] focus:border-[#00ff41] outline-none text-sm font-bold uppercase italic shadow-[inset_0_0_10px_rgba(0,255,65,0.05)]"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[10px] opacity-60 uppercase font-black italic tracking-widest">Entidad_Tablero_Asociado</label>
              <button 
                type="button" 
                onClick={() => setIsCreatingArtist(!isCreatingArtist)}
                className="text-[9px] text-[#00ff41] underline uppercase italic opacity-60 hover:opacity-100 transition-all"
              >
                {isCreatingArtist ? "[Usar Board Existente]" : "[Inyectar Nueva Entidad]"}
              </button>
            </div>
            
            {isCreatingArtist ? (
              <div className="animate-in slide-in-from-top-2 duration-300">
                <input
                  type="text"
                  required
                  value={newArtistName}
                  onChange={(e) => setNewArtistName(e.target.value)}
                  placeholder="NOMBRE DE LA NUEVA ENTIDAD / TABLERO"
                  className="w-full bg-black border border-purple-500/40 px-4 py-3 text-purple-400 focus:border-purple-500 outline-none text-sm font-bold uppercase italic shadow-[inset_0_0_10px_rgba(147,51,234,0.05)]"
                />
                <p className="text-[8px] mt-1 text-purple-400/60 uppercase italic">Se registrará como un nuevo Nodo de Tablero global.</p>
              </div>
            ) : (
              <select
                required
                value={selectedArtist}
                onChange={(e) => setSelectedArtist(e.target.value)}
                className="w-full bg-black border border-[#00ff41]/40 px-4 py-3 text-[#00ff41] focus:border-[#00ff41] outline-none text-sm font-bold appearance-none cursor-pointer italic shadow-[inset_0_0_10px_rgba(0,255,65,0.05)]"
              >
                <option value="" disabled>SELECCIONE TABLERO</option>
                {artists.map(artist => (
                  <option key={artist.artist_id} value={artist.artist_id}>{artist.name}</option>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] opacity-60 uppercase font-black italic tracking-widest">Drive_Cloud_Anchor</label>
            <input
              type="text"
              value={driveLink}
              onChange={(e) => setDriveLink(e.target.value)}
              placeholder="https://drive.google.com/..."
              className="w-full bg-black border border-[#00ff41]/40 px-4 py-3 text-blue-400 focus:border-[#00ff41] outline-none text-sm font-mono shadow-[inset_0_0_10px_rgba(0,255,65,0.05)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="border border-white/20 py-4 text-[10px] font-black uppercase italic tracking-widest hover:bg-white/5 transition-all"
            >
              Abortar
            </button>
            <button
              type="submit"
              className="bg-[#00ff41] text-black py-4 text-[10px] font-black uppercase italic tracking-widest hover:bg-white transition-all shadow-[0_0_25px_rgba(0,255,65,0.4)]"
            >
              Validar y Sembrar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateAssetModal;
