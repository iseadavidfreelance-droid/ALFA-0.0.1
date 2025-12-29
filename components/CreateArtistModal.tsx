import React, { useState } from 'react';
import { Artist, MarketTier } from '../types';

interface Props {
  onClose: () => void;
  onCreate: (artist: Artist) => void;
}

const CreateArtistModal: React.FC<Props> = ({ onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [marketTier, setMarketTier] = useState<MarketTier>(MarketTier.EMERGING);
  const [genres, setGenres] = useState('');
  const [boardUrl, setBoardUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    const newArtist: Artist = {
      artist_id: `ART-${Date.now()}`, // ID temporal o generado por BD
      name: name.toUpperCase().trim(),
      genres: genres.split(',').map(g => g.trim().toUpperCase()).filter(g => g),
      market_tier: marketTier,
      board_url: boardUrl || undefined
    };

    onCreate(newArtist);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in zoom-in duration-200">
      <div className="w-full max-w-lg bg-[#080808] border-2 border-purple-500 p-8 shadow-[0_0_80px_rgba(147,51,234,0.3)] font-mono relative overflow-hidden">
        
        <div className="flex justify-between items-center mb-10 border-b border-purple-500/30 pb-4">
          <h2 className="text-2xl font-black text-purple-400 uppercase tracking-tighter italic leading-none flex items-center gap-3">
             <span className="w-3 h-3 bg-purple-500 animate-pulse"></span>
             Nueva_Entidad_Maestra
          </h2>
          <div className="text-[10px] opacity-40 font-bold uppercase italic tracking-widest">Board_Genesis_v1</div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="space-y-2">
            <label className="text-[10px] opacity-60 uppercase font-black italic tracking-widest">Nombre_Entidad / Artista</label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="EJ: BAD BUNNY"
              className="w-full bg-black border border-purple-500/40 px-4 py-3 text-purple-400 focus:border-purple-500 outline-none text-sm font-bold uppercase italic shadow-[inset_0_0_10px_rgba(147,51,234,0.05)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <label className="text-[10px] opacity-60 uppercase font-black italic tracking-widest">Market_Tier</label>
                <select 
                    value={marketTier} 
                    onChange={e => setMarketTier(e.target.value as MarketTier)}
                    className="w-full bg-black border border-purple-500/40 px-4 py-3 text-purple-400 outline-none text-xs font-bold uppercase"
                >
                    {Object.values(MarketTier).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
            </div>
            <div className="space-y-2">
                <label className="text-[10px] opacity-60 uppercase font-black italic tracking-widest">Géneros (Sep. Comas)</label>
                <input
                  type="text"
                  value={genres}
                  onChange={(e) => setGenres(e.target.value)}
                  placeholder="TRAP, POP..."
                  className="w-full bg-black border border-purple-500/40 px-4 py-3 text-purple-400 outline-none text-xs font-bold uppercase"
                />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] opacity-60 uppercase font-black italic tracking-widest">Pinterest_Board_URL</label>
            <input
              type="text"
              value={boardUrl}
              onChange={(e) => setBoardUrl(e.target.value)}
              placeholder="https://pinterest.com/..."
              className="w-full bg-black border border-purple-500/40 px-4 py-3 text-purple-400 focus:border-purple-500 outline-none text-xs font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <button type="button" onClick={onClose} className="border border-white/20 py-4 text-[10px] font-black uppercase italic tracking-widest hover:bg-white/5 transition-all text-white">
              Cancelar
            </button>
            <button type="submit" className="bg-purple-600 text-white py-4 text-[10px] font-black uppercase italic tracking-widest hover:bg-white hover:text-purple-900 transition-all shadow-[0_0_25px_rgba(147,51,234,0.4)]">
              Registrar Nodo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateArtistModal;