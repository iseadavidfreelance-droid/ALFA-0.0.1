import { Asset, AssetDestination, Mission, LifecycleStage, PinMetrics } from '../types';
import { RealPinData } from './pinterestService';

// --- MOTOR DE INTEGRIDAD: EL CLASIFICADOR ---
export const runIntegrityCheck = (
  dbAssets: Asset[], 
  realPins: RealPinData[]
): { missions: Mission[], mappedPins: Map<string, PinMetrics[]>, orphans: RealPinData[] } => {
  
  const missions: Mission[] = [];
  const mappedPins = new Map<string, PinMetrics[]>(); 
  const orphans: RealPinData[] = []; // [NUEVO] Aquí guardamos los objetos para la UI

  // 1. Mapa de Identidad
  const registeredPinIds = new Set<string>();
  dbAssets.forEach(asset => {
    if (!mappedPins.has(asset.sku_id)) mappedPins.set(asset.sku_id, []);
    asset.pins.forEach(p => registeredPinIds.add(p.pin_id));
  });

  // 2. Escaneo de Realidad
  realPins.forEach(realPin => {
    // CASO A: Registrado (Actualizar métricas)
    if (registeredPinIds.has(realPin.id)) {
      const ownerAsset = dbAssets.find(a => a.pins.some(p => p.pin_id === realPin.id));
      if (ownerAsset) {
        const currentList = mappedPins.get(ownerAsset.sku_id) || [];
        currentList.push({
          pin_id: realPin.id,
          url: `https://pinterest.com/pin/${realPin.id}`,
          impressions: realPin.metrics?.impression_count || 0,
          clicks: realPin.metrics?.pin_click_count || 0,
          outbound_clicks: realPin.metrics?.outbound_click_count || 0,
          saves: realPin.metrics?.save_count || 0,
          velocity_score: (realPin.metrics?.impression_count || 0) * 0.1 
        });
        mappedPins.set(ownerAsset.sku_id, currentList);
      }
    } 
    // CASO B: Huérfano (Materia Prima)
    else {
      orphans.push(realPin); // Guardamos el objeto real
      
      missions.push({
        id: `ORPHAN-${realPin.id}`,
        type: 'UNMAPPED_RESOURCE',
        priority: 'HIGH',
        asset_sku: 'UNKNOWN',
        message: `Activo Huérfano: ${realPin.id}`,
        evidence: [`Título: ${realPin.title || 'N/A'}`, `Board: ${realPin.board_id}`],
        tasks: ['RECLAMAR EN AUDITORIA'],
        status: 'OPEN',
        created_at: Date.now()
      });
    }
  });

  return { missions, mappedPins, orphans }; // Devolvemos orphans a la App
};

// --- RESTO DE MOTORES (MANTENER IGUAL) ---
export const runIncubationEngine = (assets: Asset[]): Asset[] => {
  const THRESHOLD_DAYS = 30;
  const now = Date.now();
  return assets.map(asset => {
    if (asset.lifecycle_stage !== LifecycleStage.INCUBATION) return asset;
    const ageInDays = (now - asset.created_at) / (1000 * 60 * 60 * 24);
    const totalScore = calculateAssetScore(asset.pins);
    if (totalScore >= 1000) return { ...asset, lifecycle_stage: LifecycleStage.MONETIZATION };
    if (ageInDays >= THRESHOLD_DAYS && totalScore > 100) return { ...asset, lifecycle_stage: LifecycleStage.MONETIZATION };
    return asset;
  });
};

export const runLeakHunter = (assets: Asset[], destinations: AssetDestination[]): Mission[] => {
  const missions: Mission[] = [];
  assets.forEach(asset => {
    const totalOutbound = asset.pins.reduce((acc, p) => acc + p.outbound_clicks, 0);
    const hasPayhip = destinations.some(d => d.asset_sku === asset.sku_id && d.status === 'ACTIVE');
    if (totalOutbound >= 10 && !hasPayhip) {
      missions.push({
        id: `LEAK-${asset.sku_id}`,
        type: 'URGENT_LEAK_FIX',
        priority: 'HIGH',
        asset_sku: asset.sku_id,
        message: `Fuga Crítica: ${totalOutbound} clics sin monetizar.`,
        evidence: [`Outbound: ${totalOutbound}`],
        tasks: [`Crear producto Payhip`, `Vincular nodo`],
        status: 'OPEN',
        created_at: Date.now()
      });
    }
  });
  return missions;
};

export const runLinkHealthCheck = (destinations: AssetDestination[]) => {
    return { updatedDestinations: destinations, missions: [] };
};

export const calculateAssetScore = (pins: any[]) => {
  if (!pins) return 0;
  return pins.reduce((acc, p) => acc + (p.impressions * 0.05) + (p.clicks * 2) + (p.outbound_clicks * 10), 0);
};

export const calculateRarityByPercentile = (assets: Asset[]) => assets;