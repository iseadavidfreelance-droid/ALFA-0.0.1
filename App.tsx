
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Asset, 
  AssetDestination, 
  Mission, 
  LifecycleStage,
  SourceStatus,
  OwnershipType,
  Rarity,
  Artist,
  Transaction,
  MarketTier
} from './types';
import { 
  INITIAL_ASSETS, 
  INITIAL_DESTINATIONS, 
  INITIAL_ARTISTS,
  COMMAND_HELP 
} from './constants';
import { 
  calculateRarityByPercentile, 
  runIncubationEngine, 
  runLeakHunter,
  runLinkHealthCheck,
  calculateAssetScore
} from './services/logicEngines';
import CLI from './components/CLI';
import MissionBoard from './components/MissionBoard';
import AssetDetailModal from './components/AssetDetailModal';
import EntityDetailModal from './components/EntityDetailModal';
import CreateAssetModal from './components/CreateAssetModal';
import { GoogleGenAI } from "@google/genai";

const App: React.FC = () => {
  // DB State
  const [assets, setAssets] = useState<Asset[]>(INITIAL_ASSETS);
  const [destinations, setDestinations] = useState<AssetDestination[]>(INITIAL_DESTINATIONS);
  const [artists, setArtists] = useState<Artist[]>(INITIAL_ARTISTS);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [globalCredits, setGlobalCredits] = useState(40);
  const [totalYield, setTotalYield] = useState(() => INITIAL_DESTINATIONS.reduce((a,b) => a + b.revenue_generated, 0));
  
  // UI State
  const [activeTab, setActiveTab] = useState<'PANEL' | 'INVENTARIO' | 'ARTISTAS' | 'FINANZAS' | 'AUDITORIA'>('PANEL');
  const [selectedAssetSku, setSelectedAssetSku] = useState<string | null>(null);
  const [selectedArtistId, setSelectedArtistId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Filters for Archive
  const [invSearch, setInvSearch] = useState('');
  const [invSort, setInvSort] = useState<'SCORE' | 'OUTBOUND' | 'YIELD'>('SCORE');
  const [invRarityFilter, setInvRarityFilter] = useState<string>('ALL');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const log = (msg: string) => setTerminalLog(prev => [...prev.slice(-100), msg]);
  const [terminalLog, setTerminalLog] = useState<string[]>(['ALFA_OS v0.0.1 SYSTEM_READY', 'KERNEL_LINK_ACTIVE']);

  const executeCommand = async (rawCmd: string) => {
    const cleanCmd = rawCmd.trim();
    if (!cleanCmd) return;
    log(`<span class="text-[#00ff41] opacity-40">$ ${cleanCmd}</span>`);
    const parts = cleanCmd.split(' ');
    const verb = parts[0].toLowerCase();

    switch (verb) {
      case 'abonar':
        const usd = parseFloat(parts[1]);
        if (!isNaN(usd)) {
          const creds = Math.floor(usd / 2);
          setGlobalCredits(p => p + creds);
          setTotalYield(p => p + usd);
          setTransactions(p => [...p, { trans_id: `TX-${Date.now()}`, amount: usd, source_type: 'CAPITAL_INJECTION', related_id: 'POOL', date: Date.now(), credits_delta: creds }]);
          log(`<span class="text-green-400">INYECCIÓN CAPITAL: +$${usd} AL YIELD. +${creds} CRÉDITOS ASIGNADOS.</span>`);
        }
        break;
      case 'consumir':
        const n = parseInt(parts[1]);
        if (!isNaN(n)) {
          setGlobalCredits(p => Math.max(0, p - n));
          setTransactions(p => [...p, { trans_id: `TX-${Date.now()}`, amount: 0, source_type: 'CREDIT_CONSUMPTION', related_id: 'ENTREGA', date: Date.now(), credits_delta: -n }]);
          log(`<span class="text-red-400">CRÉDITOS CONSUMIDOS POR ENTREGA: -${n}.</span>`);
        }
        break;
      case 'verificar':
        const target = parts[1]?.toUpperCase();
        setMissions(prev => prev.map(m => m.asset_sku === target ? { ...m, status: 'RESOLVED' } : m));
        log(`<span class="text-green-400">SKU ${target} VALIDADO EXITOSAMENTE.</span>`);
        break;
      case 'analizar':
        const sku = parts[1]?.toUpperCase();
        log(`<span class="text-purple-400">IA_KERNEL ANALIZANDO SKU ${sku}...</span>`);
        try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Analiza este SKU de diseño: ${sku}. Sugiere optimización de rentabilidad.`,
            config: { systemInstruction: "Eres ALFA_OS. Responde en español, tono ultra-técnico." }
          });
          log(`<div class="bg-purple-900/10 p-2 border border-purple-500/30 text-[10px] text-purple-400">${response.text}</div>`);
        } catch(e) { log('IA_FAILURE'); }
        break;
      case 'ciclo':
        runDailyCycle();
        break;
      default: log('COMANDO_NO_RECONOCIDO');
    }
  };

  const runDailyCycle = useCallback(() => {
    log(`<span class="text-yellow-500 font-bold">[CICLO] SINCRO GLOBAL EN PROCESO...</span>`);
    setAssets(prev => prev.map(a => ({
      ...a,
      pins: a.pins.map(p => {
        const newImp = p.impressions + Math.floor(Math.random() * 500);
        const newClks = p.clicks + Math.floor(Math.random() * 20);
        const newOut = p.outbound_clicks + Math.floor(Math.random() * 5);
        return {
          ...p,
          impressions: newImp,
          clicks: newClks,
          outbound_clicks: newOut,
          velocity_score: (newImp * 0.05) + (newClks * 2) + (newOut * 10)
        };
      })
    })));

    const { updatedDestinations, missions: heartbeatMissions } = runLinkHealthCheck(destinations);
    setDestinations(updatedDestinations);
    
    setAssets(prev => {
      const matured = runIncubationEngine(prev);
      return calculateRarityByPercentile(matured);
    });

    const leakMissions = runLeakHunter(assets, destinations);
    setMissions(prev => {
      const existingIds = new Set(prev.map(m => m.id));
      const allNew = [...heartbeatMissions, ...leakMissions];
      return [...prev, ...allNew.filter(m => !existingIds.has(m.id))];
    });

    log(`<span class="text-green-500 font-bold">[OK] CICLO FINALIZADO.</span>`);
  }, [assets, destinations]);

  const filteredInventory = useMemo(() => {
    let list = [...assets];
    if (invSearch) {
      const s = invSearch.toUpperCase();
      list = list.filter(a => a.sku_id.includes(s) || a.display_name.includes(s));
    }
    if (invRarityFilter !== 'ALL') {
      list = list.filter(a => a.current_rarity === invRarityFilter);
    }
    
    list.sort((a, b) => {
      if (invSort === 'SCORE') return calculateAssetScore(b.pins) - calculateAssetScore(a.pins);
      if (invSort === 'YIELD') {
        const yA = destinations.filter(d=>d.asset_sku===a.sku_id).reduce((acc,d)=>acc+d.revenue_generated,0);
        const yB = destinations.filter(d=>d.asset_sku===b.sku_id).reduce((acc,d)=>acc+d.revenue_generated,0);
        return yB - yA;
      }
      return b.pins.reduce((acc,p)=>acc+p.outbound_clicks,0) - a.pins.reduce((acc,p)=>acc+p.outbound_clicks,0);
    });
    return list;
  }, [assets, invSearch, invSort, invRarityFilter, destinations]);

  const selectedAsset = useMemo(() => 
    assets.find(a => a.sku_id === selectedAssetSku) || null,
  [assets, selectedAssetSku]);

  return (
    <div className="min-h-screen bg-[#050505] text-[#00ff41] font-mono flex flex-col p-4 gap-4 crt-flicker selection:bg-[#00ff41] selection:text-black">
      
      {/* HEADER PANÓPTICO */}
      <header className="flex flex-col md:flex-row justify-between items-center border-b border-[#00ff41]/40 bg-[#00ff41]/5 p-4 gap-4 relative overflow-hidden">
        <div className="flex gap-8 items-center">
          <div className="flex flex-col">
            <span className="text-2xl font-black italic tracking-tighter">ALFA_OS <span className="text-[9px] bg-[#00ff41] text-black px-1 not-italic ml-2">v0.0.1</span></span>
            <span className="text-[10px] opacity-60 uppercase font-bold tracking-[0.2em]">{currentTime.toLocaleTimeString()}</span>
          </div>
          <div className="grid grid-cols-5 gap-4 border-l border-[#00ff41]/20 pl-8">
            <div className="flex flex-col"><span className="text-[7px] opacity-40 uppercase font-black">ASSETS</span><span className="text-xs font-black">{assets.length}</span></div>
            <div className="flex flex-col"><span className="text-[7px] opacity-40 uppercase font-black">ENTIDADES</span><span className="text-xs font-black">{artists.length}</span></div>
            <div className="flex flex-col"><span className="text-[7px] opacity-40 uppercase font-black">NODOS</span><span className="text-xs font-black text-yellow-500">{destinations.length}</span></div>
            <div className="flex flex-col"><span className="text-[7px] opacity-40 uppercase font-black">PINES</span><span className="text-xs font-black text-pink-500">{assets.reduce((a,b)=>a+b.pins.length,0)}</span></div>
            <div className="flex flex-col"><span className="text-[7px] opacity-40 uppercase font-black">POOL_CREDS</span><span className={`text-xs font-black ${globalCredits === 0 ? 'text-red-500 animate-pulse' : 'text-blue-400'}`}>{globalCredits}</span></div>
          </div>
        </div>

        <nav className="flex gap-1 bg-black/60 p-1 border border-[#00ff41]/20">
          {(['PANEL', 'INVENTARIO', 'ARTISTAS', 'FINANZAS', 'AUDITORIA'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-1 text-[9px] font-black border ${activeTab === tab ? 'bg-[#00ff41] text-black border-[#00ff41]' : 'border-transparent opacity-40'} uppercase transition-all`}>
              {tab}
            </button>
          ))}
        </nav>

        <div className="flex gap-8 border-l border-[#00ff41]/20 pl-8">
          <div className="flex flex-col items-end"><span className="text-[7px] opacity-40 uppercase font-black">Yield_Global</span><span className="text-xl font-black text-yellow-500">${totalYield.toFixed(0)}</span></div>
        </div>
      </header>

      {/* VIEWPORT */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 overflow-hidden">
        <section className="lg:col-span-9 flex flex-col border border-[#00ff41]/20 bg-black/40 overflow-hidden relative">
          
          {activeTab === 'PANEL' && (
            <div className="p-6 h-full overflow-y-auto custom-scrollbar flex flex-col gap-10 animate-in fade-in">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase italic border-l-4 border-[#00ff41] pl-3 py-1 bg-[#00ff41]/5">Vectores_Elite_Assets</h3>
                  <div className="grid grid-cols-1 gap-2">
                    {assets.sort((a,b)=>calculateAssetScore(b.pins)-calculateAssetScore(a.pins)).slice(0,5).map((a, i) => (
                      <div key={a.sku_id} className="bg-white/5 border-l border-[#00ff41]/30 p-3 flex justify-between items-center cursor-pointer hover:bg-[#00ff41]/10 transition-all" onClick={() => setSelectedAssetSku(a.sku_id)}>
                        <span className="text-[10px] font-black">{i+1}. {a.sku_id}</span>
                        <div className="flex gap-4 items-center">
                          <span className="text-[10px] text-pink-500 font-bold">{a.pins.reduce((acc,p)=>acc+p.outbound_clicks,0)} CLKS</span>
                          <span className="text-[10px] text-yellow-500 font-black">{calculateAssetScore(a.pins).toFixed(0)} PTS</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase italic border-l-4 border-purple-500 pl-3 py-1 bg-purple-500/5">Entidades_Board_Attention</h3>
                  <div className="grid grid-cols-1 gap-2">
                    {artists.slice(0,5).map((art, i) => (
                      <div key={art.artist_id} className="bg-white/5 border-l border-purple-400/30 p-3 flex justify-between items-center cursor-pointer hover:bg-purple-500/10" onClick={() => setSelectedArtistId(art.artist_id)}>
                        <span className="text-[10px] font-black">{i+1}. {art.name}</span>
                        <span className="text-[8px] opacity-40 uppercase font-black">{art.market_tier}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-6">
                <div className="bg-white/5 border border-white/10 p-4"><div className="text-[8px] opacity-40 font-black uppercase">Misiones_Abiertas</div><div className="text-2xl font-black text-red-500">{missions.filter(m=>m.status==='OPEN').length}</div></div>
                <div className="bg-white/5 border border-white/10 p-4"><div className="text-[8px] opacity-40 font-black uppercase">Legendaries</div><div className="text-2xl font-black text-yellow-500">{assets.filter(a=>a.current_rarity===Rarity.LEGENDARY).length}</div></div>
                <div className="bg-white/5 border border-white/10 p-4"><div className="text-[8px] opacity-40 font-black uppercase">Pool_Credits</div><div className="text-2xl font-black text-blue-400">{globalCredits}</div></div>
              </div>
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase italic border-l-4 border-red-600 pl-3 py-1 bg-red-600/5">Protocolo_de_Detección_de_Fugas</h3>
                <MissionBoard missions={missions} onResolve={(sku) => executeCommand(`verificar ${sku}`)} />
              </div>
            </div>
          )}

          {activeTab === 'INVENTARIO' && (
            <div className="p-6 h-full overflow-y-auto custom-scrollbar flex flex-col gap-6">
              <div className="flex justify-between items-center border-b border-[#00ff41]/20 pb-4">
                 <h2 className="text-xl font-black uppercase italic tracking-tighter">Archivo_Maestro_Archivo_Digital</h2>
                 <div className="flex gap-2">
                    <input type="text" placeholder="BUSCAR SKU/NOMBRE..." className="bg-black border border-[#00ff41]/40 px-3 py-1 text-[10px] w-48" value={invSearch} onChange={e=>setInvSearch(e.target.value)} />
                    <select className="bg-black border border-[#00ff41]/40 px-3 py-1 text-[10px]" onChange={e=>setInvSort(e.target.value as any)}>
                      <option value="SCORE">SCORE</option>
                      <option value="OUTBOUND">OUTBOUND</option>
                      <option value="YIELD">YIELD</option>
                    </select>
                    <select className="bg-black border border-[#00ff41]/40 px-3 py-1 text-[10px]" onChange={e=>setInvRarityFilter(e.target.value)}>
                      <option value="ALL">TODAS_RARIDADES</option>
                      {Object.values(Rarity).map(r=><option key={r} value={r}>{r}</option>)}
                    </select>
                 </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-left text-[10px] uppercase border-collapse">
                  <thead className="opacity-40 sticky top-0 bg-[#050505] z-10">
                    <tr><th className="p-2 border-b border-white/5">SKU</th><th className="p-2 border-b border-white/5">Display_Name</th><th className="p-2 border-b border-white/5">Score</th><th className="p-2 border-b border-white/5">Outbound</th><th className="p-2 border-b border-white/5">Yield</th><th className="p-2 border-b border-white/5">LIFECYCLE</th></tr>
                  </thead>
                  <tbody>
                    {filteredInventory.map(a => (
                      <tr key={a.sku_id} className="hover:bg-[#00ff41]/10 cursor-pointer transition-all border-b border-white/5" onClick={() => setSelectedAssetSku(a.sku_id)}>
                        <td className="p-2 font-black text-[#00ff41]">{a.sku_id}</td>
                        <td className="p-2 opacity-80 font-bold">{a.display_name}</td>
                        <td className="p-2 text-yellow-500 font-black">{calculateAssetScore(a.pins).toFixed(0)}</td>
                        <td className="p-2 text-pink-500 font-bold">{a.pins.reduce((acc,p)=>acc+p.outbound_clicks,0)}</td>
                        <td className="p-2 text-green-400 font-black">${destinations.filter(d=>d.asset_sku===a.sku_id).reduce((x,y)=>x+y.revenue_generated,0).toFixed(0)}</td>
                        <td className="p-2"><span className="text-[8px] bg-white/10 px-1 font-bold">{a.lifecycle_stage}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'ARTISTAS' && (
            <div className="p-6 h-full overflow-y-auto custom-scrollbar flex flex-col gap-6">
              <div className="flex justify-between items-center border-b border-purple-500/20 pb-4">
                <h2 className="text-xl font-black uppercase italic tracking-tighter">Entidades_Maestras_Nodos</h2>
                <button onClick={() => setIsCreateModalOpen(true)} className="bg-purple-600 text-white text-[9px] font-black px-4 py-1 uppercase italic">+ Nueva_Entidad</button>
              </div>
              <div className="flex flex-col gap-2">
                {artists.map(art => {
                  const artAssets = assets.filter(a => a.parent_artist_ids.includes(art.artist_id));
                  const totalYieldArt = destinations.filter(d => artAssets.some(aa=>aa.sku_id === d.asset_sku)).reduce((x,y)=>x+y.revenue_generated,0);
                  const totalScoreArt = artAssets.reduce((x,y)=>x+calculateAssetScore(y.pins),0);
                  return (
                    <div key={art.artist_id} className="bg-white/5 p-4 border border-white/5 hover:border-purple-500/50 flex justify-between items-center cursor-pointer group transition-all" onClick={() => setSelectedArtistId(art.artist_id)}>
                      <div className="flex flex-col">
                        <span className="text-sm font-black group-hover:text-purple-400">{art.name}</span>
                        <span className="text-[8px] opacity-40 uppercase tracking-widest">{art.artist_id} // {art.market_tier}</span>
                      </div>
                      <div className="flex gap-10 text-[10px] font-bold">
                         <div className="text-right"><span className="block opacity-40 text-[7px] uppercase">Assets</span>{artAssets.length}</div>
                         <div className="text-right text-pink-500"><span className="block opacity-40 text-[7px] uppercase">Attention_Score</span>{totalScoreArt.toFixed(0)}</div>
                         <div className="text-right text-yellow-500"><span className="block opacity-40 text-[7px] uppercase">Yield_Gen</span>${totalYieldArt.toFixed(0)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'FINANZAS' && (
            <div className="p-6 h-full overflow-y-auto custom-scrollbar flex flex-col gap-10">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-[#00ff41]/20 pb-6 gap-6">
                <div>
                  <h2 className="text-3xl font-black uppercase italic tracking-tighter leading-none">Ledger_Global_ERP_Capital</h2>
                  <p className="text-[10px] opacity-40 mt-2 font-black uppercase italic tracking-widest tracking-[0.3em]">Gestión de Yield y Pool de Créditos ($2/Crédito)</p>
                </div>
                <div className="flex gap-4">
                  <div className="bg-yellow-500/10 border border-yellow-500/40 p-5 text-right">
                    <div className="text-[8px] opacity-60 uppercase font-black">Yield_Total_Pool</div>
                    <div className="text-3xl font-black text-yellow-500">${totalYield.toFixed(0)}</div>
                  </div>
                  <div className="bg-blue-400/10 border border-blue-400/40 p-5 text-right">
                    <div className="text-[8px] opacity-60 uppercase font-black">Créditos_Pool</div>
                    <div className="text-3xl font-black text-blue-400">{globalCredits}</div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white/5 border border-white/10 p-6 flex flex-col gap-6">
                   <h3 className="text-xs font-black uppercase italic border-l-2 border-[#00ff41] pl-3 py-1">Inyectar_Capital_Operativo</h3>
                   <div className="flex flex-col gap-3">
                      <label className="text-[10px] opacity-40 font-black uppercase">Monto USD (Inyección de capitalización)</label>
                      <div className="flex gap-2">
                        <input type="number" id="cashInput" placeholder="0.00" className="bg-black border border-white/20 p-4 flex-1 text-yellow-500 font-black text-xl outline-none focus:border-[#00ff41]" />
                        <button onClick={() => {
                          const val = (document.getElementById('cashInput') as HTMLInputElement).value;
                          if (val) executeCommand(`abonar ${val}`);
                        }} className="bg-[#00ff41] text-black px-10 font-black uppercase italic text-xs hover:bg-white transition-all shadow-lg">Inyectar</button>
                      </div>
                   </div>
                </div>
                <div className="bg-white/5 border border-white/10 p-6 flex flex-col gap-6">
                   <h3 className="text-xs font-black uppercase italic border-l-2 border-red-500 pl-3 py-1">Consumo_por_Entrega</h3>
                   <div className="flex flex-col gap-3">
                      <label className="text-[10px] opacity-40 font-black uppercase">Cantidad de créditos (Diseños liquidados)</label>
                      <div className="flex gap-2">
                        <input type="number" id="consumeInput" placeholder="0" className="bg-black border border-white/20 p-4 flex-1 text-red-500 font-black text-xl outline-none focus:border-red-500" />
                        <button onClick={() => {
                          const val = (document.getElementById('consumeInput') as HTMLInputElement).value;
                          if (val) executeCommand(`consumir ${val}`);
                        }} className="bg-red-600 text-white px-10 font-black uppercase italic text-xs hover:bg-red-500 transition-all shadow-lg">Entregar</button>
                      </div>
                   </div>
                </div>
              </div>
              <div className="bg-black/40 border border-white/5 p-4 flex-1">
                 <h3 className="text-[10px] opacity-40 uppercase font-black mb-4 border-b border-white/10 pb-2">Registro_Sincronizado_de_Movimientos</h3>
                 <div className="h-[300px] overflow-y-auto custom-scrollbar">
                    <table className="w-full text-[10px] uppercase text-left">
                      <thead className="opacity-40 font-bold border-b border-white/5">
                        <tr>
                          <th className="p-2">Fecha_Timestamp</th>
                          <th className="p-2">Fuente_Nodo</th>
                          <th className="p-2">Monto_USD</th>
                          <th className="p-2">Delta_Cred</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...transactions].reverse().map(tx => (
                          <tr key={tx.trans_id} className="border-b border-white/5 hover:bg-white/5 transition-all">
                            <td className="p-2 font-mono">{new Date(tx.date).toLocaleString()}</td>
                            <td className="p-2 font-black">{tx.source_type}</td>
                            <td className="p-2 text-yellow-500 font-black">${tx.amount.toFixed(2)}</td>
                            <td className={`p-2 font-black ${tx.credits_delta && tx.credits_delta > 0 ? 'text-green-400' : 'text-red-400'}`}>{tx.credits_delta ? `${tx.credits_delta > 0 ? '+' : ''}${tx.credits_delta}` : '--'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'AUDITORIA' && (
             <div className="p-6 h-full overflow-y-auto custom-scrollbar flex flex-col gap-10">
               <div className="border-b-2 border-red-600/40 pb-6 mb-4">
                 <h2 className="text-3xl font-black text-red-500 uppercase italic tracking-tighter leading-none">Salud_del_Kernel_Integridad</h2>
                 <p className="text-[10px] opacity-40 uppercase tracking-widest mt-2 font-bold font-mono tracking-[0.4em]">Audit_Scan_Mode: DEEP // Panóptico Expandido</p>
               </div>
               
               <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
                 {[
                   {l:'RAW_FILES',v:assets.filter(a=>a.source_status===SourceStatus.RAW).length, c:'text-white'},
                   {l:'EXPORTED',v:assets.filter(a=>a.source_status===SourceStatus.EXPORTED).length, c:'text-[#00ff41]'},
                   {l:'ZIPPED',v:assets.filter(a=>a.source_status===SourceStatus.ZIPPED).length, c:'text-yellow-500'},
                   {l:'INCUBACIÓN',v:assets.filter(a=>a.lifecycle_stage===LifecycleStage.INCUBATION).length, c:'text-blue-400'},
                   {l:'MONETIZACIÓN',v:assets.filter(a=>a.lifecycle_stage===LifecycleStage.MONETIZATION).length, c:'text-green-500'},
                   {l:'ORPHANS',v:assets.filter(a=>a.pins.length===0).length, c:'text-red-600 animate-pulse font-black'}
                 ].map(s=>(
                   <div key={s.l} className="bg-white/5 p-4 border border-white/10 flex flex-col items-center">
                     <span className="text-[8px] opacity-40 font-black mb-1">{s.l}</span>
                     <span className={`text-2xl font-black ${s.c}`}>{s.v}</span>
                   </div>
                 ))}
               </div>

               <div className="space-y-4">
                 <h3 className="text-xs font-black uppercase italic border-l-4 border-red-500 pl-3 py-1 bg-red-600/5">Seguimiento_de_Incubación_Activa</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {assets.filter(a=>a.lifecycle_stage===LifecycleStage.INCUBATION).map(a => {
                     const score = calculateAssetScore(a.pins);
                     const progress = Math.min(100, (score / 500) * 100);
                     return (
                       <div key={a.sku_id} className="bg-black border border-white/10 p-4 space-y-3 cursor-pointer hover:border-blue-400/50 transition-all" onClick={() => setSelectedAssetSku(a.sku_id)}>
                         <div className="flex justify-between items-center text-[10px]">
                           <span className="font-black text-blue-400">{a.sku_id}</span>
                           <span className="opacity-40 uppercase font-black">Progreso a Madurez: {progress.toFixed(0)}%</span>
                         </div>
                         <div className="w-full h-1 bg-white/5"><div className="h-full bg-blue-400 transition-all shadow-[0_0_10px_rgba(96,165,250,0.5)]" style={{width:`${progress}%`}}></div></div>
                         <div className="flex justify-between text-[8px] opacity-60 uppercase font-black italic">
                           <span>Score: {score.toFixed(0)} / 500</span>
                           <span>Edad: {Math.floor((Date.now() - a.created_at) / (1000*60*60*24))} Días</span>
                         </div>
                       </div>
                     );
                   })}
                 </div>
               </div>
             </div>
          )}
        </section>

        <aside className="lg:col-span-3 flex flex-col h-full border border-[#00ff41]/20 shadow-[inset_0_0_20px_rgba(0,255,65,0.05)] bg-black/60 overflow-hidden relative">
           <CLI onCommand={executeCommand} terminalLog={terminalLog} />
        </aside>
      </main>

      {/* OVERLAYS */}
      {selectedAsset && (
        <AssetDetailModal 
          asset={selectedAsset} 
          destinations={destinations.filter(d=>d.asset_sku===selectedAssetSku)} 
          onClose={()=>setSelectedAssetSku(null)} 
          onAction={executeCommand} 
          onUpdate={(sku, u, d) => {
            setAssets(p => p.map(a=>a.sku_id===sku?{...a,...u}:a));
            if(d) setDestinations(p => [...p.filter(x=>x.asset_sku!==sku), ...d]);
            setSelectedAssetSku(null);
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
          }}
        />
      )}

      {isCreateModalOpen && (
        <CreateAssetModal 
          artists={artists} 
          nextSku={`SKU-${(assets.length+1).toString().padStart(5,'0')}`} 
          onClose={()=>setIsCreateModalOpen(false)} 
          onCreate={a=>{setAssets(p=>[...p,a]); setIsCreateModalOpen(false);}} 
          onNewArtist={n=>{const id=`ART-${Date.now()}`; setArtists(p=>[...p,{artist_id:id,name:n,genres:[],market_tier:MarketTier.EMERGING}]); return id;}} 
        />
      )}
    </div>
  );
};

export default App;
