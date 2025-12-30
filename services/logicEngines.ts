import { Asset, AssetDestination, Mission, LifecycleStage, PinMetrics } from '../types';
import { RealPinData } from './pinterestService'; 

export const runIntegrityCheck = (
  dbAssets: Asset[], 
  realPins: RealPinData[]
): { missions: Mission[], mappedPins: Map<string, PinMetrics[]>, orphans: RealPinData[] } => {
  
  const missions: Mission[] = [];
  const mappedPins = new Map<string, PinMetrics[]>(); 
  const orphans: RealPinData[] = [];

  const registeredPinIds = new Set<string>();
  dbAssets.forEach(asset => {
    if (!mappedPins.has(asset.sku_id)) mappedPins.set(asset.sku_id, []);
    asset.pins.forEach(p => registeredPinIds.add(p.pin_id));
  });

  realPins.forEach(realPin => {
    const imp = realPin.metrics?.impression_count || 0;
    const save = realPin.metrics?.save_count || 0;
    const out = realPin.metrics?.outbound_click_count || 0;
    const clicks = realPin.metrics?.pin_click_count || 0;
    
    const score = Math.floor((imp * 0.05) + (save * 2) + (clicks * 5) + (out * 10));

    if (registeredPinIds.has(realPin.id)) {
      const ownerAsset = dbAssets.find(a => a.pins.some(p => p.pin_id === realPin.id));
      if (ownerAsset) {
        const currentList = mappedPins.get(ownerAsset.sku_id) || [];
        currentList.push({
          pin_id: realPin.id,
          url: `https://pinterest.com/pin/${realPin.id}`,
          impressions: imp,
          clicks: clicks,
          outbound_clicks: out,
          saves: save,
          velocity_score: score
        });
        mappedPins.set(ownerAsset.sku_id, currentList);
      }
    } 
    else {
      orphans.push(realPin);
      
      // Filtro flexible: Muestra si tiene score > 0 OR es top tier OR es un test
      const isWorthy = score > 0 || realPin.board_id === 'TOP_TIER' || realPin.id.includes('TEST');

      if (isWorthy) {
          missions.push({
            id: `ORPHAN-${realPin.id}`,
            type: 'UNMAPPED_RESOURCE',
            priority: score > 100 ? 'HIGH' : 'MEDIUM', 
            asset_sku: 'UNKNOWN',
            message: `Activo Detectado: ${realPin.title || realPin.id}`,
            evidence: [
                `SCORE:${score}`,
                `IMP:${imp}`,
                `SAVE:${save}`,
                `OUT:${out}`,
                `Título: ${realPin.title || 'N/A'}`
            ],
            tasks: ['RECLAMAR EN AUDITORIA'],
            status: 'OPEN',
            created_at: Date.now()
          });
      }
    }
  });

  return { missions, mappedPins, orphans };
};

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
        message: `Fuga de Tráfico: ${totalOutbound} clics perdidos.`,
        evidence: [`Outbound: ${totalOutbound}`],
        tasks: [`Vincular link de pago`],
        status: 'OPEN',
        created_at: Date.now()
      });
    }
  });
  return missions;
};

export const calculateAssetScore = (pins: any[], revenue: number = 0) => {
  if (!pins) return 0;
  const trafficScore = pins.reduce((acc, p) => acc + (p.impressions * 0.05) + (p.clicks * 2) + (p.outbound_clicks * 10), 0);
  return trafficScore + (revenue * 20);
};

export const calculateRarityByPercentile = (assets: Asset[], destinations: AssetDestination[]) => {
  return assets; 
};