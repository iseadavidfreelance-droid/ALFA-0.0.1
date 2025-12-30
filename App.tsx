import { pinterestService, RealPinData } from './services/pinterestService';
import { runIntegrityCheck } from './services/logicEngines';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Asset, 
  AssetDestination, 
  Mission, 
  Rarity,
  Artist,
  Transaction,
  MarketTier
} from './types';
import { 
  INITIAL_DESTINATIONS
} from './constants';
import { 
  calculateRarityByPercentile, 
  runIncubationEngine, 
  runLeakHunter,
  calculateAssetScore
} from './services/logicEngines';
import CLI from './components/CLI';
import MissionBoard from './components/MissionBoard';
import AssetDetailModal from './components/AssetDetailModal';
import EntityDetailModal from './components/EntityDetailModal';
import CreateAssetModal from './components/CreateAssetModal';
import CreateArtistModal from './components/CreateArtistModal';
import { GoogleGenAI } from "@google/genai";
import { supabase } from './services/supabaseClient';

const App: React.FC = () => {
  // ESTADO DB
  const [assets, setAssets] = useState<Asset[]>([]); 
  const [artists, setArtists] = useState<Artist[]>([]);
  const [destinations, setDestinations] = useState<AssetDestination[]>(INITIAL_DESTINATIONS); 
  
  // UI State
  const [missions, setMissions] = useState<Mission[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [globalCredits, setGlobalCredits] = useState(40);
  const [totalYield, setTotalYield] = useState(0);
  
  // Mantenemos orphans para la ingesta en vivo
  const [orphans, setOrphans] = useState<RealPinData[]>([]); 

  const [activeTab, setActiveTab] = useState<'PANEL' | 'INVENTARIO' | 'ARTISTAS' | 'FINANZAS' | 'AUDITORIA'>('PANEL');
  const [selectedAssetSku, setSelectedAssetSku] = useState<string | null>(null);
  const [selectedArtistId, setSelectedArtistId] = useState<string | null>(null);
  
  const [isCreateAssetModalOpen, setIsCreateAssetModalOpen] = useState(false);
  const [isCreateArtistModalOpen, setIsCreateArtistModalOpen] = useState(false);
  
  // ESTADO DE ALERTA DE TOKEN
  const [showTokenModal, setShowTokenModal] = useState(false);
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [invSearch, setInvSearch] = useState('');
  const [invSort, setInvSort] = useState<'SCORE' | 'OUTBOUND' | 'YIELD'>('SCORE');
  const [invRarityFilter, setInvRarityFilter] = useState<string>('ALL');
  
  // LOGS CON HISTORIAL
  const [terminalLog, setTerminalLog] = useState<string[]>(['ALFA_OS v0.0.1 SYSTEM_BOOT...', 'CONECTANDO A CEREBRO SUPABASE...']);

  const log = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `<span class="opacity-50 mr-2">[${timestamp}]</span> ${msg}`;
    setTerminalLog(prev => [...prev.slice(-100), logEntry]);
  };

  // Listener Global del Sistema de Radio
  useEffect(() => {
    const handleSystemLog = (e: any) => {
      const { message, type } = e.detail;
      
      let style = 'text-white';
      if (type === 'SUCCESS') style = 'text-[#00ff41] font-bold'; 
      if (type === 'WARNING') style = 'text-yellow-500';
      if (type === 'ERROR') style = 'text-red-500 font-black bg-red-900/20';
      if (type === 'SYSTEM') style = 'text-blue-400 italic';

      log(`<span class="${style}">${message}</span>`);
    };

    window.addEventListener('ALFA_LOG_EVENT', handleSystemLog);
    return () => window.removeEventListener('ALFA_LOG_EVENT', handleSystemLog);
  }, []);

  // --- CARGA INICIAL DE DATOS (READ) ---
  const fetchDatabase = async () => {
    try {
      const { data: dbAssets, error: assetError } = await supabase.from('assets').select('*');
      if (assetError) throw assetError;
      
      if (dbAssets) {
        const mappedAssets: Asset[] = dbAssets.map((row: any) => ({
           ...row,
           pins: row.metrics_json?.pins || []
         }));
         setAssets(mappedAssets);
      }

      const { data: dbArtists } = await supabase.from('artists').select('*');
      if (dbArtists) setArtists(dbArtists);

      const { data: dbMissions } = await supabase.from('missions').select('*').eq('status', 'OPEN');
      if (dbMissions) setMissions(dbMissions);

      const { data: dbTrans } = await supabase.from('transactions').select('*');
      if (dbTrans) {
          setTransactions(dbTrans);
          const totalC = dbTrans.reduce((acc, t) => acc + (t.credits_delta || 0), 40); 
          setGlobalCredits(totalC);
          const totalY = dbTrans.reduce((acc, t) => acc + (t.source_type === 'CAPITAL_INJECTION' ? (t.amount || 0) : 0), 0);
          setTotalYield(totalY);
      }
      log(`<span class="text-green-400">SINCRONIZACIÓN TOTAL: ASSETS, MISIONES Y LEDGER CARGADOS.</span>`);
    } catch (err: any) {
      console.error("Error DB:", err);
      log(`<span class="text-red-500">FALLO DE CONEXIÓN BD: ${err.message}</span>`);
    }
  };

  useEffect(() => {
    fetchDatabase();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // --- MANEJADORES DE ESCRITURA (WRITE) ---
  const handleCreateAsset = async (newAsset: Asset) => {
    setAssets(prev => [...prev, newAsset]);
    
    const { pins, ...rest } = newAsset;
    const dbPayload = {
      ...rest,
      metrics_json: { pins: pins } 
    };

    const { error } = await supabase.from('assets').insert(dbPayload);
    if (!error) {
      log(`<span class="text-green-400">ASSET ${newAsset.sku_id} REGISTRADO EN NUBE.</span>`);
      if (newAsset.pins.length > 0) {
          const pinId = newAsset.pins[0].pin_id;
          setOrphans(prev => prev.filter(o => o.id !== pinId));
          const missionId = `ORPHAN-${pinId}`;
          
          // ACTUALIZACIÓN ROBUSTA DE MISIONES
          setMissions(prev => {
             const updated = prev.map(m => m.id === missionId ? {...m, status: 'RESOLVED' as const} : m);
             return updated;
          });
          await supabase.from('missions').update({ status: 'RESOLVED' }).eq('id', missionId);
      }
    }
    setIsCreateAssetModalOpen(false);
  };

  const handleCreateArtist = async (newArtist: Artist) => {
    setArtists(prev => [...prev, newArtist]);
    const { error } = await supabase.from('artists').insert(newArtist);
    if (!error) log(`<span class="text-purple-400">ENTIDAD ${newArtist.name} INMORTALIZADA EN DB.</span>`);
    setIsCreateArtistModalOpen(false);
  };

  const handleUpdateAsset = async (sku: string, updates: Partial<Asset>, newDestinations?: AssetDestination[]) => {
    setAssets(prev => prev.map(a => a.sku_id === sku ? { ...a, ...updates } : a));
    
    if (newDestinations) {
        setDestinations(prev => [...prev.filter(x => x.asset_sku !== sku), ...newDestinations]);
    }

    const dbUpdates: any = { ...updates };
    if (updates.pins) {
      dbUpdates.metrics_json = { pins: updates.pins };
      delete dbUpdates.pins; 
    }
    await supabase.from('assets').update(dbUpdates).eq('sku_id', sku);
    log(`<span class="text-blue-400">CAMBIOS EN ${sku} CONFIRMADOS.</span>`);
  };

  const executeCommand = async (rawCmd: string) => {
    const cleanCmd = rawCmd.trim();
    if (!cleanCmd) return;

    if (cleanCmd.startsWith('token ')) {
        const newToken = cleanCmd.split(' ')[1];
        if (newToken) {
            localStorage.setItem('ALFA_PINTEREST_TOKEN', newToken);
            log('<span class="text-green-400 font-bold">LLAVE DE ACCESO (TOKEN) ACTUALIZADA EN BÓVEDA LOCAL.</span>');
            setShowTokenModal(false);
        }
        return;
    }

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
          const newTx: Transaction = { trans_id: `TX-${Date.now()}`, amount: usd, source_type: 'CAPITAL_INJECTION', related_id: 'POOL', date: Date.now(), credits_delta: creds };
          setTransactions(p => [...p, newTx]);
          await supabase.from('transactions').insert(newTx); 
          log(`<span class="text-green-400">INYECCIÓN CAPITAL: +$${usd} AL YIELD. GUARDADO EN LEDGER.</span>`);
        }
        break;

      case 'consumir':
        const n = parseInt(parts[1]);
        if (!isNaN(n)) {
          setGlobalCredits(p => Math.max(0, p - n));
          const newTx: Transaction = { trans_id: `TX-${Date.now()}`, amount: 0, source_type: 'CREDIT_CONSUMPTION', related_id: 'ENTREGA', date: Date.now(), credits_delta: -n };
          setTransactions(p => [...p, newTx]);
          await supabase.from('transactions').insert(newTx); 
          log(`<span class="text-red-400">CRÉDITOS CONSUMIDOS POR ENTREGA: -${n}. REGISTRADO.</span>`);
        }
        break;

      case 'verificar':
        const target = parts[1]?.toUpperCase();
        setMissions(prev => {
            const updated = prev.map(m => m.asset_sku === target ? { ...m, status: 'RESOLVED' as const } : m);
            // Sync con DB para la misión cerrada
            const closed = updated.find(m => m.asset_sku === target && m.status === 'RESOLVED');
            if(closed) supabase.from('missions').update({ status: 'RESOLVED' }).eq('id', closed.id).then();
            return updated;
        });
        log(`<span class="text-green-400">SKU ${target} VALIDADO EXITOSAMENTE.</span>`);
        break;

      case 'analizar':
        const sku = parts[1]?.toUpperCase();
        log(`<span class="text-purple-400">IA_KERNEL ANALIZANDO SKU ${sku}...</span>`);
        try {
          const apiKey = process.env.GEMINI_API_KEY; 
          if (!apiKey) throw new Error("API Key no configurada");
          
          const ai = new GoogleGenAI({ apiKey });
          const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash', 
            contents: `Analiza este SKU de diseño: ${sku}. Sugiere optimización de rentabilidad.`,
            config: { systemInstruction: "Eres ALFA_OS. Responde en español, tono ultra-técnico." }
          });
          log(`<div class="bg-purple-900/10 p-2 border border-purple-500/30 text-[10px] text-purple-400">${response.text}</div>`);
        } catch(e) { log('IA_FAILURE: REVISAR API KEY'); }
        break;

      case 'ciclo':
        runDailyCycle();
        break;
        
      default: log('COMANDO_NO_RECONOCIDO. ESCRIBE "AYUDA".');
    }
  };

  const runDailyCycle = useCallback(async () => {
    try {
        log(`<span class="text-blue-400">INICIANDO CICLO DIARIO...</span>`);

        // 1. Obtener Datos Reales de Pinterest
        const realPins = await pinterestService.fetchAllPins();
        
        // 2. Ejecutar Motor de Integridad
        const integrityResult = runIntegrityCheck(assets, realPins);
        
        setOrphans(integrityResult.orphans);

        // 3. Actualizar Assets con métricas reales
        let processedAssets = assets.map(a => {
            const newMetrics = integrityResult.mappedPins.get(a.sku_id);
            return newMetrics ? { ...a, pins: newMetrics } : a;
        });

        // 4. Persistencia de Misiones (Integridad)
        const newMissions = integrityResult.missions;
        if (newMissions.length > 0) {
            const { error } = await supabase.from('missions').upsert(newMissions);
            if (error) console.error("Error DB Misiones:", error);
            log(`<span class="text-red-500 font-bold">ALERTA: ${newMissions.length} ANOMALÍAS REGISTRADAS EN BD.</span>`);
        } else {
            log(`<span class="text-green-500">INTEGRIDAD DE RED: 100% (Sin nuevos huérfanos).</span>`);
        }

        // 5. Motores Lógicos
        const maturedAssets = runIncubationEngine(processedAssets);
        const finalAssets = calculateRarityByPercentile(maturedAssets, destinations);
        const leakMissions = runLeakHunter(finalAssets, destinations);

        if (leakMissions.length > 0) {
             await supabase.from('missions').upsert(leakMissions);
        }

        // 6. [SNAPSHOTS] Historial de Métricas
        const timestampISO = new Date().toISOString(); 
        const snapshots: any[] = []; 

        finalAssets.forEach(asset => {
            asset.pins.forEach(pin => {
                snapshots.push({
                    asset_sku: asset.sku_id,
                    pin_id: pin.pin_id,
                    recorded_at: timestampISO,
                    impressions: pin.impressions,
                    saves: pin.saves,
                    clicks: pin.clicks,
                    outbound_clicks: pin.outbound_clicks
                });
            });
        });

        if (snapshots.length > 0) {
           const { error: snapError } = await supabase.from('pin_snapshots').insert(snapshots);
           if (snapError) console.error("Error guardando historial:", snapError);
           log(`<span class="text-yellow-500">HISTORIAL: ${snapshots.length} registros guardados en DB.</span>`);
        }

        // 7. ACTUALIZACIÓN DE ESTADO FINAL (CORREGIDA PARA SOBRESCRIBIR)
        setAssets(finalAssets);
        
        // ⚠️ CORRECCIÓN CLAVE: Usamos un Mapa para asegurar que las misiones NUEVAS
        // con datos actualizados (SCORE, etc.) sobrescriban a las viejas en memoria.
        setMissions(prev => {
            const missionMap = new Map(prev.map(m => [m.id, m]));
            
            // Inyectamos las nuevas (Integridad + Fugas) sobre las viejas
            [...newMissions, ...leakMissions].forEach(m => {
                missionMap.set(m.id, m);
            });
            
            return Array.from(missionMap.values());
        });

        log(`<span class="text-green-500 font-bold">[OK] SINCRONIZACIÓN COMPLETADA. TABLERO ACTUALIZADO.</span>`);

    } catch (error: any) {
        if (error.message === 'TOKEN_EXPIRED') {
            log(`<span class="text-red-600 font-black bg-red-900/20 blink">!!! ALERTA: CREDENCIAL PINTEREST CADUCADA !!!</span>`);
            setShowTokenModal(true);
        } else {
            console.error(error);
            log(`<span class="text-red-500">FALLO CRÍTICO EN CICLO: ${error.message}</span>`);
        }
    }
  }, [assets, destinations]);

  // --- RENDERS ---
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

  const selectedAsset = useMemo(() => assets.find(a => a.sku_id === selectedAssetSku) || null, [assets, selectedAssetSku]);

  // LISTA DE AUDITORÍA (Ordenada por SCORE real extraído del texto)
  const auditOrphanList = useMemo(() => {
      return missions
        .filter(m => m.type === 'UNMAPPED_RESOURCE' && m.status === 'OPEN')
        .sort((a,b) => {
            const getScore = (m: Mission) => {
                const line = m.evidence.find(s => s.startsWith('SCORE:'));
                return line ? parseInt(line.split(':')[1]) : 0;
            };
            return getScore(b) - getScore(a); // Mayor score arriba
        });
  }, [missions]);

  const parseEvidence = (evidence: string[]) => {
      const stats = { imp: 0, save: 0, out: 0, score: 0 };
      if (!evidence) return stats;
      evidence.forEach(s => {
          if (s.startsWith('SCORE:')) stats.score = parseInt(s.split(':')[1]) || 0;
          if (s.startsWith('IMP:')) stats.imp = parseInt(s.split(':')[1]) || 0;
          if (s.startsWith('SAVE:')) stats.save = parseInt(s.split(':')[1]) || 0;
          if (s.startsWith('OUT:')) stats.out = parseInt(s.split(':')[1]) || 0;
      });
      return stats;
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#00ff41] font-mono flex flex-col p-4 gap-4 relative overflow-hidden">
      <header className="flex flex-col md:flex-row justify-between items-center border-b border-[#00ff41]/40 bg-[#00ff41]/5 p-4 gap-4">
        <div className="flex gap-8 items-center">
          <div className="flex flex-col">
            <span className="text-2xl font-black italic tracking-tighter">ALFA_OS <span className="text-[9px] bg-[#00ff41] text-black px-1 not-italic ml-2">v0.0.1</span></span>
            <span className="text-[10px] opacity-60 uppercase font-bold tracking-[0.2em]">{currentTime.toLocaleTimeString()}</span>
          </div>
          <div className="grid grid-cols-5 gap-4 border-l border-[#00ff41]/20 pl-8">
            <div className="flex flex-col"><span className="text-[7px] opacity-40 uppercase font-black">ASSETS</span><span className="text-xs font-black">{assets.length}</span></div>
            <div className="flex flex-col"><span className="text-[7px] opacity-40 uppercase font-black">ENTIDADES</span><span className="text-xs font-black">{artists.length}</span></div>
            <div className="flex flex-col"><span className="text-[7px] opacity-40 uppercase font-black">HUÉRFANOS</span><span className={`text-xs font-black ${auditOrphanList.length > 0 ? 'text-red-500 animate-pulse' : 'text-white'}`}>{auditOrphanList.length}</span></div>
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

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 overflow-hidden">
        <section className="lg:col-span-9 flex flex-col border border-[#00ff41]/20 bg-black/40 overflow-hidden relative">
          
          {activeTab === 'PANEL' && (
            <div className="p-6 h-full overflow-y-auto custom-scrollbar flex flex-col gap-10">
              <div className="grid grid-cols-3 gap-6">
                <div className="bg-white/5 border border-white/10 p-4"><div className="text-[8px] opacity-40 font-black uppercase">Misiones_Abiertas</div><div className="text-2xl font-black text-red-500">{missions.filter(m=>m.status==='OPEN').length}</div></div>
                <div className="bg-white/5 border border-white/10 p-4"><div className="text-[8px] opacity-40 font-black uppercase">Legendaries</div><div className="text-2xl font-black text-yellow-500">{assets.filter(a=>a.current_rarity===Rarity.LEGENDARY).length}</div></div>
                <div className="bg-white/5 border border-white/10 p-4"><div className="text-[8px] opacity-40 font-black uppercase">Pool_Credits</div><div className="text-2xl font-black text-blue-400">{globalCredits}</div></div>
              </div>
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase italic border-l-4 border-red-600 pl-3 py-1 bg-red-600/5">Protocolo_de_Detección_de_Fugas</h3>
                <MissionBoard missions={missions.filter(m => m.type !== 'UNMAPPED_RESOURCE')} onResolve={(sku) => executeCommand(`verificar ${sku}`)} />
              </div>
            </div>
          )}

          {activeTab === 'INVENTARIO' && (
            <div className="p-6 h-full overflow-y-auto custom-scrollbar flex flex-col gap-6">
              <div className="flex justify-between items-center border-b border-[#00ff41]/20 pb-4">
                 <h2 className="text-xl font-black uppercase italic tracking-tighter">Archivo_Maestro</h2>
                 <button onClick={() => setIsCreateAssetModalOpen(true)} className="bg-[#00ff41] text-black text-[9px] font-black px-4 py-1 uppercase italic hover:bg-white transition-all">+ Nuevo_Asset</button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-left text-[10px] uppercase border-collapse">
                  <thead className="opacity-40 sticky top-0 bg-[#050505] z-10">
                    <tr><th className="p-2">SKU</th><th className="p-2">Name</th><th className="p-2">Score</th><th className="p-2">Outbound</th><th className="p-2">LIFECYCLE</th></tr>
                  </thead>
                  <tbody>
                    {filteredInventory.map(a => (
                      <tr key={a.sku_id} className="hover:bg-[#00ff41]/10 cursor-pointer border-b border-white/5" onClick={() => setSelectedAssetSku(a.sku_id)}>
                        <td className="p-2 font-black text-[#00ff41]">{a.sku_id}</td>
                        <td className="p-2 opacity-80">{a.display_name}</td>
                        <td className="p-2 text-yellow-500 font-black">{calculateAssetScore(a.pins).toFixed(0)}</td>
                        <td className="p-2 text-pink-500 font-bold">{a.pins.reduce((acc,p)=>acc+p.outbound_clicks,0)}</td>
                        <td className="p-2"><span className="text-[8px] bg-white/10 px-1 font-bold">{a.lifecycle_stage}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {activeTab === 'AUDITORIA' && (
             <div className="p-6 h-full overflow-y-auto custom-scrollbar flex flex-col gap-10">
               <div className="border-b-2 border-red-600/40 pb-6 mb-4">
                 <h2 className="text-3xl font-black text-red-500 uppercase italic tracking-tighter leading-none">Salud_del_Kernel_Integridad</h2>
                 <p className="text-[10px] opacity-40 uppercase tracking-widest mt-2 font-bold font-mono tracking-[0.4em]">Audit_Scan_Mode: DEEP // Panóptico Expandido</p>
               </div>
               
               <div className="bg-red-900/5 border border-red-600/50 p-0 flex flex-col h-[500px]">
                  <div className="flex justify-between items-center p-4 bg-red-900/20 border-b border-red-600/30">
                      <h3 className="text-sm font-black text-red-500 uppercase">Cola de Procesamiento de Huérfanos</h3>
                      <div className="text-[10px] font-mono text-red-400">{auditOrphanList.length} EVENTOS PENDIENTES</div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto custom-scrollbar">
                      <table className="w-full text-left text-[10px] uppercase font-mono">
                          <thead className="bg-black sticky top-0 text-red-600/60 font-black">
                              <tr>
                                  <th className="p-3 border-b border-red-900/30">ID PIN</th>
                                  <th className="p-3 border-b border-red-900/30">MÉTRICAS CAPTURADAS (DB)</th>
                                  <th className="p-3 border-b border-red-900/30 text-right">ACCIÓN</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-red-900/20">
                              {auditOrphanList.length === 0 ? (
                                  <tr><td colSpan={3} className="p-10 text-center text-red-500/30 italic">SIN ANOMALÍAS REGISTRADAS. EJECUTE 'CICLO'.</td></tr>
                              ) : (
                                  auditOrphanList.map(m => {
                                      const stats = parseEvidence(m.evidence);
                                      const pinId = m.id.replace('ORPHAN-', '');

                                      return (
                                        <tr key={m.id} className="hover:bg-red-500/10 transition-colors group">
                                            <td className="p-3 text-red-400 font-bold">{pinId}</td>
                                            <td className="p-3">
                                                <div className="flex items-center gap-2 mb-1">
                                                   <span className="text-yellow-500 font-black text-xs">SCORE: {stats.score}</span>
                                                   <span className="text-[9px] text-white opacity-50">{m.message}</span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2 text-[9px] opacity-70 font-mono">
                                                   <div><span className="text-red-400">IMP:</span> {stats.imp}</div>
                                                   <div><span className="text-blue-400">SAVE:</span> {stats.save}</div>
                                                   <div><span className="text-green-400">OUT:</span> {stats.out}</div>
                                                </div>
                                            </td>
                                            <td className="p-3 text-right">
                                                <button 
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(pinId); 
                                                        setIsCreateAssetModalOpen(true);
                                                    }}
                                                    className="border border-red-500 text-red-500 px-4 py-2 font-black text-[9px] hover:bg-red-600 hover:text-white transition-all shadow-[0_0_10px_rgba(220,38,38,0.2)]"
                                                >
                                                    RECLAMAR
                                                </button>
                                            </td>
                                        </tr>
                                      );
                                  })
                              )}
                          </tbody>
                      </table>
                  </div>
               </div>
             </div>
          )}
          
          {/* ... (Resto de pestañas ARTISTAS y FINANZAS se mantienen igual) ... */}
          {activeTab === 'ARTISTAS' && (
             <div className="p-6 h-full overflow-y-auto custom-scrollbar flex flex-col gap-6">
               <div className="flex justify-between items-center border-b border-purple-500/20 pb-4">
                 <h2 className="text-xl font-black uppercase italic tracking-tighter">Entidades_Maestras</h2>
                 <button onClick={() => setIsCreateArtistModalOpen(true)} className="bg-purple-600 text-white text-[9px] font-black px-4 py-1 uppercase italic hover:bg-purple-500 shadow-[0_0_15px_rgba(147,51,234,0.4)]">
                     + Nueva_Entidad
                 </button>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {artists.map(art => {
                   const artAssets = assets.filter(a => a.parent_artist_ids.includes(art.artist_id));
                   const totalScoreArt = artAssets.reduce((x,y)=>x+calculateAssetScore(y.pins),0);
                   return (
                     <div key={art.artist_id} className="bg-white/5 p-4 border border-white/5 hover:border-purple-500/50 flex justify-between items-center cursor-pointer group transition-all" onClick={() => setSelectedArtistId(art.artist_id)}>
                       <div className="flex flex-col">
                         <span className="text-sm font-black group-hover:text-purple-400">{art.name}</span>
                         <span className="text-[8px] opacity-40 uppercase tracking-widest">{art.artist_id} // {art.market_tier}</span>
                       </div>
                       <div className="flex gap-4 text-[10px] font-bold">
                           <div className="text-right"><span className="block opacity-40 text-[7px] uppercase">Assets</span>{artAssets.length}</div>
                           <div className="text-right text-pink-500"><span className="block opacity-40 text-[7px] uppercase">Score</span>{totalScoreArt.toFixed(0)}</div>
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
                   <h2 className="text-3xl font-black uppercase italic tracking-tighter leading-none">Ledger_Global_ERP</h2>
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
               
               <div className="bg-black/40 border border-white/5 p-4 flex-1">
                  <h3 className="text-[10px] opacity-40 uppercase font-black mb-4 border-b border-white/10 pb-2">Registro_Sincronizado</h3>
                  <div className="h-[300px] overflow-y-auto custom-scrollbar">
                     <table className="w-full text-[10px] uppercase text-left">
                       <thead className="opacity-40 font-bold border-b border-white/5">
                         <tr>
                           <th className="p-2">Fecha</th>
                           <th className="p-2">Fuente</th>
                           <th className="p-2">Monto</th>
                           <th className="p-2">Delta</th>
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
        </section>

        <aside className="lg:col-span-3 flex flex-col h-full border border-[#00ff41]/20 bg-black/60 overflow-hidden relative">
           <CLI onCommand={executeCommand} terminalLog={terminalLog} />
        </aside>
      </main>

      {selectedAsset && (
        <AssetDetailModal 
          asset={selectedAsset} 
          destinations={destinations.filter(d=>d.asset_sku===selectedAssetSku)} 
          onClose={()=>setSelectedAssetSku(null)} 
          onAction={executeCommand} 
          onUpdate={handleUpdateAsset} 
        />
      )}
      
      {selectedArtistId && (
        <EntityDetailModal 
          artist={artists.find(a=>a.artist_id===selectedArtistId)!} 
          assets={assets.filter(a=>a.parent_artist_ids.includes(selectedArtistId))}
          destinations={destinations}
          onClose={()=>setSelectedArtistId(null)}
          onUpdate={(id, updates) => setArtists(p => p.map(a=>a.artist_id===id ? {...a, ...updates} : a))} 
        />
      )}

      {isCreateAssetModalOpen && (
        <CreateAssetModal 
          artists={artists} 
          nextSku={`SKU-${(assets.length+1).toString().padStart(5,'0')}`} 
          onClose={()=>setIsCreateAssetModalOpen(false)} 
          onCreate={handleCreateAsset} 
          onNewArtist={n=>{const id=`ART-${Date.now()}`; handleCreateArtist({artist_id:id,name:n,genres:[],market_tier:MarketTier.EMERGING}); return id;}} 
        />
      )}

      {isCreateArtistModalOpen && <CreateArtistModal onClose={()=>setIsCreateArtistModalOpen(false)} onCreate={handleCreateArtist} />}

      {showTokenModal && (
        <div className="fixed inset-0 z-[100] bg-red-950/90 backdrop-blur-lg flex items-center justify-center p-4">
            <div className="bg-black border-4 border-red-600 p-8 w-full max-w-2xl relative">
                <h2 className="text-3xl font-black text-red-500 mb-4">⚠️ PROTOCOLO DE SEGURIDAD</h2>
                <input type="text" autoFocus placeholder="Token..." className="w-full bg-red-900/20 border border-red-500 p-4 text-white" onKeyDown={(e) => {if (e.key === 'Enter') executeCommand(`token ${(e.target as HTMLInputElement).value}`)}} />
            </div>
        </div>
      )}
    </div>
  );
};

export default App;