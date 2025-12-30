import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { GoogleGenAI } from "@google/genai";
import { supabase } from './services/supabaseClient';
import { pinterestService, RealPinData } from './services/pinterestService';
import { systemLog } from './services/eventLogger';

// --- TIPOS E INGENIERÍA ---
import { 
  Asset, AssetDestination, Mission, Rarity, 
  Artist, Transaction, MarketTier 
} from './types';
import { INITIAL_DESTINATIONS } from './constants';
import { 
  calculateRarityByPercentile, runIncubationEngine, 
  runLeakHunter, calculateAssetScore, runIntegrityCheck 
} from './services/logicEngines';

// --- COMPONENTES UI ---
import CLI from './components/CLI';
import MissionBoard from './components/MissionBoard';
import AssetDetailModal from './components/AssetDetailModal';
import EntityDetailModal from './components/EntityDetailModal';
import CreateAssetModal from './components/CreateAssetModal';
import CreateArtistModal from './components/CreateArtistModal';

const App: React.FC = () => {
  // --- ESTADO PRINCIPAL ---
  const [assets, setAssets] = useState<Asset[]>([]); 
  const [artists, setArtists] = useState<Artist[]>([]);
  const [destinations, setDestinations] = useState<AssetDestination[]>(INITIAL_DESTINATIONS); 
  const [missions, setMissions] = useState<Mission[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  // --- ESTADO DE SISTEMA ---
  const [globalCredits, setGlobalCredits] = useState(40);
  const [totalYield, setTotalYield] = useState(0);
  const [orphans, setOrphans] = useState<RealPinData[]>([]); 
  const [prefillPinId, setPrefillPinId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'PANEL' | 'INVENTARIO' | 'ARTISTAS' | 'FINANZAS' | 'AUDITORIA'>('PANEL');
  const [selectedAssetSku, setSelectedAssetSku] = useState<string | null>(null);
  const [selectedArtistId, setSelectedArtistId] = useState<string | null>(null);
  const [isCreateAssetModalOpen, setIsCreateAssetModalOpen] = useState(false);
  const [isCreateArtistModalOpen, setIsCreateArtistModalOpen] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // --- FILTROS ---
  const [invSearch, setInvSearch] = useState('');
  const [invSort, setInvSort] = useState<'SCORE' | 'OUTBOUND' | 'YIELD'>('SCORE');
  const [invRarityFilter, setInvRarityFilter] = useState<string>('ALL');
  
  // --- TERMINAL LOGS ---
  const [terminalLog, setTerminalLog] = useState<string[]>(['ALFA_OS v0.0.1 SYSTEM_BOOT...', 'KERNEL_READY.']);

  const log = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `<span class="opacity-50 mr-2">[${timestamp}]</span> ${msg}`;
    setTerminalLog(prev => [...prev.slice(-100), logEntry]);
  };

  useEffect(() => {
    const handleSystemLog = (e: any) => {
      const { message, type } = e.detail;
      let style = 'text-white';
      if (type === 'SUCCESS') style = 'text-[#00ff41] font-bold'; 
      if (type === 'ERROR') style = 'text-red-500 font-black';
      if (type === 'WARNING') style = 'text-yellow-500';
      log(`<span class="${style}">${message}</span>`);
    };
    window.addEventListener('ALFA_LOG_EVENT', handleSystemLog);
    return () => window.removeEventListener('ALFA_LOG_EVENT', handleSystemLog);
  }, []);

  // --- CARGA DE DATOS ---
  const fetchDatabase = async () => {
    try {
      const { data: dbAssets } = await supabase.from('assets').select('*');
      if (dbAssets) {
        setAssets(dbAssets.map((row: any) => ({ ...row, pins: row.metrics_json?.pins || [] })));
      }
      const { data: dbArtists } = await supabase.from('artists').select('*');
      if (dbArtists) setArtists(dbArtists);
      const { data: dbMissions } = await supabase.from('missions').select('*').eq('status', 'OPEN');
      if (dbMissions) setMissions(dbMissions);
      const { data: dbTrans } = await supabase.from('transactions').select('*');
      if (dbTrans) {
          setTransactions(dbTrans);
          setGlobalCredits(dbTrans.reduce((acc, t) => acc + (t.credits_delta || 0), 40));
          setTotalYield(dbTrans.reduce((acc, t) => acc + (t.source_type === 'CAPITAL_INJECTION' ? (t.amount || 0) : 0), 0));
      }
      systemLog('SINCRONIZACIÓN CON SUPABASE COMPLETADA', 'SUCCESS');
    } catch (err: any) {
      systemLog(`FALLO EN LA CARGA DE DATOS: ${err.message}`, 'ERROR');
    }
  };

  useEffect(() => {
    fetchDatabase();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // --- FASE DE EJECUCIÓN: ADOPCIÓN ASISTIDA (ATÓMICA) ---
  const handleCreateAsset = async (newAsset: Asset) => {
    try {
      // 1. Inyectar energía desde Orphans
      const aggregatePins = newAsset.pins.map(p => {
        const orphanMatch = orphans.find(o => o.id === p.pin_id);
        return orphanMatch ? {
            ...p,
            impressions: orphanMatch.metrics?.impression_count || 0,
            saves: orphanMatch.metrics?.save_count || 0,
            clicks: orphanMatch.metrics?.pin_click_count || 0,
            outbound_clicks: orphanMatch.metrics?.outbound_click_count || 0
        } : p;
      });

      const finalAsset = { ...newAsset, pins: aggregatePins };
      const { pins, ...rest } = finalAsset;

      // 2. Persistencia
      const { error } = await supabase.from('assets').insert({ ...rest, metrics_json: { pins } });
      if (error) throw error;

      // 3. Limpieza de Kernel y Misiones
      const pinIdsLinked = pins.map(p => p.pin_id);
      setOrphans(prev => prev.filter(o => !pinIdsLinked.includes(o.id)));

      const missionsToResolve = missions.filter(m => 
        m.type === 'UNMAPPED_RESOURCE' && pinIdsLinked.includes(m.id.replace('ORPHAN-', ''))
      );

      if (missionsToResolve.length > 0) {
        const ids = missionsToResolve.map(m => m.id);
        await supabase.from('missions').update({ status: 'RESOLVED' }).in('id', ids);
        setMissions(prev => prev.map(m => ids.includes(m.id) ? { ...m, status: 'RESOLVED' } : m));
      }

      setAssets(prev => [...prev, finalAsset]);

      // 4. Fase de Cierre: Verbalización CLI
      systemLog(`ASSET ${finalAsset.sku_id} VINCULADO EXITOSAMENTE A PIN ${pinIdsLinked.join(', ')}`, 'SUCCESS');

    } catch (err: any) {
      systemLog(`ERROR EN PROTOCOLO DE ADOPCIÓN: ${err.message}`, 'ERROR');
    } finally {
      setIsCreateAssetModalOpen(false);
      setPrefillPinId('');
    }
  };

  const handleUpdateAsset = async (sku: string, updates: Partial<Asset>, newDestinations?: AssetDestination[]) => {
    const dbUpdates: any = { ...updates };
    if (updates.pins) {
      dbUpdates.metrics_json = { pins: updates.pins };
      delete dbUpdates.pins;
    }
    const { error } = await supabase.from('assets').update(dbUpdates).eq('sku_id', sku);
    if (!error) {
      setAssets(prev => prev.map(a => a.sku_id === sku ? { ...a, ...updates } : a));
      if (newDestinations) setDestinations(prev => [...prev.filter(d => d.asset_sku !== sku), ...newDestinations]);
      systemLog(`REGISTRO ${sku} ACTUALIZADO`, 'SUCCESS');
    }
  };

  const executeCommand = async (rawCmd: string) => {
    const cleanCmd = rawCmd.trim();
    if (!cleanCmd) return;
    log(`<span class="text-[#00ff41] opacity-40">$ ${cleanCmd}</span>`);
    const parts = cleanCmd.split(' ');
    const verb = parts[0].toLowerCase();

    switch (verb) {
      case 'ciclo': runDailyCycle(); break;
      case 'token':
        if (parts[1]) {
          localStorage.setItem('ALFA_PINTEREST_TOKEN', parts[1]);
          systemLog('TOKEN DE ACCESO ACTUALIZADO EN BÓVEDA LOCAL', 'SUCCESS');
          setShowTokenModal(false);
        }
        break;
      case 'abonar':
        const usd = parseFloat(parts[1]);
        if (!isNaN(usd)) {
          const tx: Transaction = { trans_id: `TX-${Date.now()}`, amount: usd, source_type: 'CAPITAL_INJECTION', related_id: 'POOL', date: Date.now(), credits_delta: Math.floor(usd / 2) };
          await supabase.from('transactions').insert(tx);
          setTransactions(p => [...p, tx]);
          setGlobalCredits(p => p + tx.credits_delta!);
          setTotalYield(p => p + usd);
          systemLog(`INYECCIÓN DE CAPITAL: +$${usd}`, 'SUCCESS');
        }
        break;
      default: systemLog('COMANDO_NO_RECONOCIDO', 'WARNING');
    }
  };

  const runDailyCycle = useCallback(async () => {
    try {
        systemLog('INICIANDO CICLO DE INTEGRIDAD DIARIO...', 'SYSTEM');
        const realPins = await pinterestService.fetchAllPins();
        const integrity = runIntegrityCheck(assets, realPins);
        setOrphans(integrity.orphans);

        const updatedAssets = assets.map(asset => {
            const apiMetrics = integrity.mappedPins.get(asset.sku_id);
            return apiMetrics ? { ...asset, pins: apiMetrics } : asset;
        });

        const finalAssets = calculateRarityByPercentile(runIncubationEngine(updatedAssets), destinations);
        const leakMissions = runLeakHunter(finalAssets, destinations);
        
        if (integrity.missions.length > 0) await supabase.from('missions').upsert(integrity.missions);
        if (leakMissions.length > 0) await supabase.from('missions').upsert(leakMissions);

        setAssets(finalAssets);
        setMissions(prev => {
            const map = new Map(prev.map(m => [m.id, m]));
            [...integrity.missions, ...leakMissions].forEach(m => map.set(m.id, m));
            return Array.from(map.values());
        });
        systemLog('CICLO COMPLETADO: INTEGRIDAD VERIFICADA', 'SUCCESS');
    } catch (e: any) {
        if (e.message === 'TOKEN_EXPIRED') setShowTokenModal(true);
        systemLog(`FALLO CRÍTICO EN CICLO: ${e.message}`, 'ERROR');
    }
  }, [assets, destinations, missions]);

  const filteredInventory = useMemo(() => {
    return assets
      .filter(a => invSearch === '' || a.sku_id.includes(invSearch.toUpperCase()))
      .filter(a => invRarityFilter === 'ALL' || a.current_rarity === invRarityFilter)
      .sort((a, b) => {
        if (invSort === 'SCORE') return calculateAssetScore(b.pins) - calculateAssetScore(a.pins);
        return b.pins.reduce((acc, p) => acc + p.outbound_clicks, 0) - a.pins.reduce((acc, p) => acc + p.outbound_clicks, 0);
      });
  }, [assets, invSearch, invSort, invRarityFilter]);

  const auditOrphanList = useMemo(() => {
    return missions.filter(m => m.type === 'UNMAPPED_RESOURCE' && m.status === 'OPEN');
  }, [missions]);

  return (
    <div className="min-h-screen bg-[#050505] text-[#00ff41] font-mono flex flex-col p-4 gap-4 overflow-hidden">
      <header className="flex flex-col md:flex-row justify-between items-center border-b border-[#00ff41]/30 bg-black/50 p-4 gap-4">
        <div className="flex gap-8 items-center">
          <div className="flex flex-col">
            <span className="text-2xl font-black italic">ALFA_OS <span className="text-[10px] bg-[#00ff41] text-black px-1">0.0.1</span></span>
            <span className="text-[9px] opacity-50 uppercase tracking-widest">{currentTime.toLocaleTimeString()}</span>
          </div>
          <div className="grid grid-cols-5 gap-6 border-l border-white/10 pl-8 text-[10px]">
            <div><span className="block opacity-40 uppercase">Assets</span>{assets.length}</div>
            <div><span className="block opacity-40 uppercase">Pines</span>{assets.reduce((acc, a) => acc + a.pins.length, 0)}</div>
            <div className={auditOrphanList.length > 0 ? 'text-red-500 animate-pulse' : ''}><span className="block opacity-40 uppercase tracking-tighter">Huérfanos</span>{auditOrphanList.length}</div>
            <div><span className="block opacity-40 uppercase">Yield</span><span className="text-yellow-500">${totalYield.toFixed(0)}</span></div>
            <div><span className="block opacity-40 uppercase">Creds</span><span className="text-blue-400">{globalCredits}</span></div>
          </div>
        </div>
        <nav className="flex gap-1">
          {(['PANEL', 'INVENTARIO', 'ARTISTAS', 'FINANZAS', 'AUDITORIA'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-1 text-[9px] font-black border ${activeTab === tab ? 'bg-[#00ff41] text-black border-[#00ff41]' : 'border-[#00ff41]/20 opacity-50'}`}>
              {tab}
            </button>
          ))}
        </nav>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 overflow-hidden">
        <section className="lg:col-span-9 bg-black/40 border border-[#00ff41]/20 overflow-hidden relative">
          
          {activeTab === 'PANEL' && (
            <div className="p-6 h-full overflow-y-auto space-y-8">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 border border-white/5 bg-white/5">
                   <span className="text-[8px] opacity-40 block uppercase font-black">Score_Medio_Red</span>
                   <span className="text-2xl font-black">
                     {(assets.reduce((acc, a) => acc + calculateAssetScore(a.pins), 0) / (assets.length || 1)).toFixed(1)}
                   </span>
                </div>
              </div>
              <MissionBoard missions={missions.filter(m => m.type !== 'UNMAPPED_RESOURCE')} onResolve={(sku) => executeCommand(`verificar ${sku}`)} />
            </div>
          )}

          {activeTab === 'INVENTARIO' && (
            <div className="p-6 h-full flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <input type="text" placeholder="FILTRAR SKU..." className="bg-transparent border border-[#00ff41]/20 p-2 text-[10px] w-64 focus:border-[#00ff41] outline-none" onChange={e => setInvSearch(e.target.value)} />
                <button onClick={() => setIsCreateAssetModalOpen(true)} className="bg-[#00ff41] text-black px-4 py-1 text-[10px] font-black uppercase shadow-[0_0_10px_rgba(0,255,65,0.3)]">+ Nuevo Asset</button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-[10px] text-left border-collapse">
                  <thead className="opacity-40 border-b border-white/10 sticky top-0 bg-black z-10 font-black">
                    <tr><th className="p-2">SKU</th><th className="p-2">NOMBRE</th><th className="p-2 text-yellow-500">SCORE (AG)</th><th className="p-2 text-pink-500">FUENTES</th><th className="p-2">RANGO</th></tr>
                  </thead>
                  <tbody>
                    {filteredInventory.map(a => (
                      <tr key={a.sku_id} className="border-b border-white/5 hover:bg-[#00ff41]/5 cursor-pointer" onClick={() => setSelectedAssetSku(a.sku_id)}>
                        <td className="p-2 font-black text-[#00ff41]">{a.sku_id}</td>
                        <td className="p-2 opacity-60 font-bold">{a.display_name}</td>
                        <td className="p-2 text-yellow-500 font-black">{calculateAssetScore(a.pins).toFixed(0)}</td>
                        <td className="p-2 text-pink-500 font-bold">{a.pins.length} PINES</td>
                        <td className="p-2"><span className="bg-white/10 px-2 py-0.5 font-bold">{a.current_rarity}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'ARTISTAS' && (
            <div className="p-6 grid grid-cols-2 gap-4 overflow-y-auto h-full">
              {artists.map(art => {
                const artAssets = assets.filter(a => a.parent_artist_ids.includes(art.artist_id));
                const artScore = artAssets.reduce((acc, a) => acc + calculateAssetScore(a.pins), 0);
                return (
                  <div key={art.artist_id} className="p-4 border border-purple-500/20 bg-purple-500/5 flex justify-between items-center group hover:border-purple-500/50 transition-all cursor-pointer" onClick={() => setSelectedArtistId(art.artist_id)}>
                    <div>
                      <div className="font-black text-purple-400 uppercase tracking-tighter">{art.name}</div>
                      <div className="text-[8px] opacity-40 font-mono">{art.artist_id}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-black text-white">{artAssets.length} ASSETS</div>
                      <div className="text-[10px] text-pink-500 font-bold uppercase tracking-widest">Score: {artScore.toFixed(0)}</div>
                    </div>
                  </div>
                );
              })}
              <button onClick={() => setIsCreateArtistModalOpen(true)} className="border-2 border-dashed border-purple-500/20 text-purple-500 flex items-center justify-center text-[10px] font-black hover:bg-purple-500/10 transition-all"> + REGISTRAR NUEVA ENTIDAD </button>
            </div>
          )}

          {activeTab === 'FINANZAS' && (
            <div className="p-6 h-full overflow-y-auto space-y-6">
              <div className="grid grid-cols-2 gap-4">
                 <div className="p-6 bg-yellow-500/10 border border-yellow-500/30 text-right shadow-[inset_0_0_20px_rgba(234,179,8,0.05)]">
                    <span className="text-[10px] opacity-50 block uppercase font-black tracking-[0.2em] mb-2">Yield Pool Acumulado</span>
                    <span className="text-4xl font-black text-yellow-500 italic">${totalYield.toFixed(2)}</span>
                 </div>
                 <div className="p-6 bg-blue-500/10 border border-blue-500/30 text-right shadow-[inset_0_0_20px_rgba(59,130,246,0.05)]">
                    <span className="text-[10px] opacity-50 block uppercase font-black tracking-[0.2em] mb-2">Créditos Operativos</span>
                    <span className="text-4xl font-black text-blue-400 italic">{globalCredits}</span>
                 </div>
              </div>
              <div className="bg-black/40 border border-white/5 p-4">
                 <div className="text-[10px] opacity-40 mb-4 uppercase font-bold tracking-widest border-b border-white/10 pb-2 italic">Ledger de Transacciones Sincronizado</div>
                 <div className="space-y-1">
                   {transactions.slice().reverse().map(t => (
                     <div key={t.trans_id} className="flex justify-between text-[10px] border-b border-white/5 py-2 hover:bg-white/5 transition-all px-2">
                       <span className="opacity-40 font-mono text-[9px]">{new Date(t.date).toLocaleString()}</span>
                       <span className="font-black uppercase">{t.source_type}</span>
                       <span className={`font-black ${t.credits_delta! > 0 ? 'text-green-400' : 'text-red-400'}`}>{t.credits_delta! > 0 ? '+' : ''}{t.credits_delta} CRED</span>
                       <span className="text-yellow-500 font-bold">${t.amount.toFixed(2)}</span>
                     </div>
                   ))}
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'AUDITORIA' && (
            <div className="p-6 h-full flex flex-col gap-4">
              <div className="border-b border-red-500/30 pb-4">
                <h2 className="text-xl font-black text-red-500 italic uppercase tracking-tighter">Protocolo de Detección de Fugas</h2>
                <p className="text-[9px] opacity-50 font-bold uppercase tracking-[0.3em]">Kernel_Scan: Escaneando recursos sin contenedor asignado</p>
              </div>
              <div className="flex-1 overflow-y-auto border border-red-500/10 bg-red-950/5">
                <table className="w-full text-[10px] border-collapse">
                  <thead className="bg-red-500/10 text-red-500 font-black uppercase italic">
                    <tr><th className="p-3 text-left">Identificador Pin</th><th className="p-3 text-left">Evidencia Detectada</th><th className="p-3 text-right">Acción</th></tr>
                  </thead>
                  <tbody className="divide-y divide-red-950/20">
                    {auditOrphanList.length === 0 ? (
                      <tr><td colSpan={3} className="p-10 text-center text-red-500/20 italic font-black">KERNEL_CLEAN: SIN ANOMALÍAS EN EL ESCANEO ACTUAL.</td></tr>
                    ) : (
                      auditOrphanList.map(m => (
                        <tr key={m.id} className="hover:bg-red-500/5 transition-colors group">
                          <td className="p-3 font-mono font-bold text-red-400">{m.id.replace('ORPHAN-', '')}</td>
                          <td className="p-3 opacity-60 text-[9px] font-bold italic">{m.evidence.join(' // ')}</td>
                          <td className="p-3 text-right">
                            <button 
                              onClick={() => { setPrefillPinId(m.id.replace('ORPHAN-', '')); setIsCreateAssetModalOpen(true); }} 
                              className="bg-red-600 text-white px-4 py-1 text-[9px] font-black uppercase hover:bg-white hover:text-red-600 transition-all shadow-[0_0_10px_rgba(220,38,38,0.2)] italic"
                            >
                              Adoptar Recurso
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        <aside className="lg:col-span-3 h-full border border-[#00ff41]/20 bg-black/60 shadow-[inset_0_0_30px_rgba(0,0,0,0.5)]">
           <CLI onCommand={executeCommand} terminalLog={terminalLog} />
        </aside>
      </main>

      {/* MODALES INTEGRADOS CON EL KERNEL */}
      {selectedAssetSku && (
        <AssetDetailModal 
          asset={assets.find(a=>a.sku_id===selectedAssetSku)!} 
          destinations={destinations.filter(d=>d.asset_sku===selectedAssetSku)} 
          onClose={()=>setSelectedAssetSku(null)} 
          onAction={executeCommand} 
          onUpdate={handleUpdateAsset} 
        />
      )}
      
      {isCreateAssetModalOpen && (
        <CreateAssetModal 
          artists={artists} 
          nextSku={`SKU-${(assets.length+1).toString().padStart(5,'0')}`} 
          onClose={()=>setIsCreateAssetModalOpen(false)} 
          onCreate={handleCreateAsset} 
          onNewArtist={async (n) => {
             const id = `ART-${Date.now()}`;
             const { error } = await supabase.from('artists').insert({ artist_id: id, name: n, genres: [], market_tier: MarketTier.EMERGING });
             if(!error) setArtists(p => [...p, { artist_id: id, name: n, genres: [], market_tier: MarketTier.EMERGING }]);
             return id;
          }} 
          initialPinId={prefillPinId}
          orphans={orphans}
        />
      )}

      {isCreateArtistModalOpen && (
        <CreateArtistModal 
          onClose={()=>setIsCreateArtistModalOpen(false)} 
          onCreate={async (a) => { 
            const { error } = await supabase.from('artists').insert(a); 
            if(!error) {
              setArtists(p => [...p, a]); 
              systemLog(`ENTIDAD ${a.name} INMORTALIZADA`, 'SUCCESS');
            }
            setIsCreateArtistModalOpen(false); 
          }} 
        />
      )}

      {selectedArtistId && (
        <EntityDetailModal 
          artist={artists.find(a=>a.artist_id===selectedArtistId)!} 
          assets={assets.filter(a=>a.parent_artist_ids.includes(selectedArtistId))} 
          destinations={destinations} 
          onClose={()=>setSelectedArtistId(null)} 
          onUpdate={(id, updates) => {
            setArtists(p => p.map(a=>a.artist_id===id ? {...a, ...updates} : a));
            supabase.from('artists').update(updates).eq('artist_id', id).then();
          }} 
        />
      )}

      {showTokenModal && (
        <div className="fixed inset-0 z-[100] bg-red-950/90 backdrop-blur-lg flex items-center justify-center p-4">
          <div className="bg-black border-4 border-red-600 p-8 w-full max-w-lg shadow-[0_0_50px_rgba(220,38,38,0.5)]">
            <h2 className="text-3xl font-black text-red-500 mb-4 italic uppercase tracking-tighter leading-none">⚠️ Alerta de Protocolo: Token Requerido</h2>
            <p className="text-red-500/60 text-[10px] uppercase font-bold mb-6 tracking-widest">Se requiere actualización de llave para continuar con la agregación de red.</p>
            <input 
              type="text" 
              autoFocus 
              placeholder="Inyectar Token..."
              className="w-full bg-red-900/20 border border-red-500 p-4 text-white font-mono focus:outline-none" 
              onKeyDown={e => e.key === 'Enter' && executeCommand(`token ${(e.target as HTMLInputElement).value}`)} 
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default App;