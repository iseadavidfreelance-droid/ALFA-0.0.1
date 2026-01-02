
import { Asset, AssetDestination, Mission, LifecycleStage, Rarity } from '../types';

/**
 * CAPÍTULO 3.1: Motor de Incubación (The Timekeeper)
 */
export const runIncubationEngine = (assets: Asset[]): Asset[] => {
  const THRESHOLD_DAYS = 30;
  const THRESHOLD_SCORE = 500; // Umbral de score para madurez prematura
  const now = Date.now();

  return assets.map(asset => {
    if (asset.lifecycle_stage !== LifecycleStage.INCUBATION) return asset;

    const ageInDays = (now - asset.created_at) / (1000 * 60 * 60 * 24);
    const totalScore = asset.pins.reduce((acc, p) => acc + p.velocity_score, 0);

    // Madurez por tiempo o por rendimiento explosivo
    if (ageInDays >= THRESHOLD_DAYS || totalScore >= THRESHOLD_SCORE) {
      return {
        ...asset,
        lifecycle_stage: LifecycleStage.MONETIZATION,
      };
    }
    return asset;
  });
};

/**
 * CAPÍTULO 3.2: Motor de Detección de Fugas (The Leak Hunter)
 */
export const runLeakHunter = (
  assets: Asset[], 
  destinations: AssetDestination[]
): Mission[] => {
  const missions: Mission[] = [];
  
  assets.forEach(asset => {
    const totalOutbound = asset.pins.reduce((acc, p) => acc + p.outbound_clicks, 0);
    const hasPayhip = destinations.some(d => d.asset_sku === asset.sku_id && d.status === 'ACTIVE');

    // Fuga crítica: Muchos clicks salientes pero sin link de compra
    if (totalOutbound >= 10 && !hasPayhip) {
      missions.push({
        id: `LEAK-${asset.sku_id}`,
        type: 'URGENT_LEAK_FIX',
        priority: 'HIGH',
        asset_sku: asset.sku_id,
        message: `Fuga Crítica: ${totalOutbound} Intenciones de compra detectadas sin Nodo de Pago.`,
        evidence: [
          `Outbound_Clicks: ${totalOutbound}`,
          `Status: NO_CAPTURED_FLOW`
        ],
        tasks: [
          `VINCULAR SKU a producto Payhip`,
          `PARCHAR link en Pinterest Board`,
          `EJECUTAR verificar ${asset.sku_id}`
        ],
        status: 'OPEN'
      });
    }

    // Detección de Orfandad (Asset sin Pines)
    if (asset.pins.length === 0 && asset.lifecycle_stage !== LifecycleStage.INCUBATION) {
      missions.push({
        id: `ORPHAN-${asset.sku_id}`,
        type: 'UNMAPPED_RESOURCE',
        priority: 'MEDIUM',
        asset_sku: asset.sku_id,
        message: `Activo Huérfano: Registrado en sistema pero sin presencia en Pinterest Boards.`,
        evidence: [`Causa: Falta de propagación algorítmica`],
        tasks: [`Generar 3 pines base`, `Asociar a Board de Artista`],
        status: 'OPEN'
      });
    }
  });

  return missions;
};

/**
 * CAPÍTULO 3.3: Motor de Score Ponderado (The Pulse)
 * Fórmula: (Imp * 0.05) + (Clicks * 2) + (Outbound * 10)
 */
export const calculateAssetScore = (pins: any[]) => {
  return pins.reduce((acc, p) => {
    return acc + (p.impressions * 0.05) + (p.clicks * 2) + (p.outbound_clicks * 10);
  }, 0);
};

export const calculateRarityByPercentile = (assets: Asset[]): Asset[] => {
  if (assets.length === 0) return [];

  const sorted = [...assets].sort((a, b) => {
    const scoreA = calculateAssetScore(a.pins);
    const scoreB = calculateAssetScore(b.pins);
    return scoreB - scoreA;
  });

  const total = sorted.length;

  return assets.map(asset => {
    const rank = sorted.findIndex(a => a.sku_id === asset.sku_id) + 1;
    const percentile = (rank / total) * 100;
    
    let newRarity = Rarity.COMMON;
    if (percentile <= 2) newRarity = Rarity.LEGENDARY; 
    else if (percentile <= 10) newRarity = Rarity.EPIC;  
    else if (percentile <= 25) newRarity = Rarity.RARE; 
    else if (percentile <= 50) newRarity = Rarity.UNCOMMON; 

    return { ...asset, current_rarity: newRarity };
  });
};

export const runLinkHealthCheck = (destinations: AssetDestination[]): { updatedDestinations: AssetDestination[], missions: Mission[] } => {
  const missions: Mission[] = [];
  const updatedDestinations = destinations.map(dest => {
    const isNowBroken = Math.random() < 0.03; // 3% de fallo simulado
    if (isNowBroken && dest.status === 'ACTIVE') {
      missions.push({
        id: `FAIL-${dest.asset_sku}`,
        type: 'API_SYNC_ERROR',
        priority: 'HIGH',
        asset_sku: dest.asset_sku,
        message: `Heartbeat detectó fallo en Nodo ${dest.destination_type}.`,
        evidence: [`URL: ${dest.url}`, `Error: 404 NOT FOUND`],
        tasks: [`Verificar enlace Payhip`, `Actualizar metadatos del destino`],
        status: 'OPEN'
      });
      return { ...dest, status: 'BROKEN' as const };
    }
    return dest;
  });

  return { updatedDestinations, missions };
};
