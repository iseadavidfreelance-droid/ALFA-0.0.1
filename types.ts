
export enum SourceStatus {
  RAW = 'RAW',
  EXPORTED = 'EXPORTED',
  ZIPPED = 'ZIPPED'
}

export enum OwnershipType {
  OWNED = 'OWNED',
  COMMISSIONED = 'COMMISSIONED'
}

export enum Rarity {
  COMMON = 'COMMON',
  UNCOMMON = 'UNCOMMON',
  RARE = 'RARE',
  EPIC = 'EPIC',
  LEGENDARY = 'LEGENDARY'
}

export enum LifecycleStage {
  INCUBATION = 'INCUBATION',
  MONETIZATION = 'MONETIZATION',
  DOMAIN = 'DOMAIN'
}

export enum MarketTier {
  GLOBAL = 'GLOBAL',
  NICHE = 'NICHE',
  EMERGING = 'EMERGING'
}

export interface PinMetrics {
  pin_id: string;
  url: string;
  impressions: number;
  clicks: number;
  outbound_clicks: number;
  saves: number;
  velocity_score: number;
}

export interface Asset {
  sku_id: string;
  display_name: string;
  parent_artist_ids: string[];
  file_path_drive?: string; 
  source_status: SourceStatus;
  ownership_type: OwnershipType;
  current_rarity: Rarity;
  lifecycle_stage: LifecycleStage;
  created_at: number;
  is_collection: boolean;
  pins: PinMetrics[];
}

export interface AssetDestination {
  asset_sku: string;
  destination_type: 'PAYHIP' | 'FIVERR' | 'ETSY';
  url: string;
  status: 'ACTIVE' | 'BROKEN' | 'PENDING';
  views: number;
  sales: number;
  revenue_generated: number;
}

export interface Mission {
  id: string;
  type: 'URGENT_LEAK_FIX' | 'INTEGRITY_AUDIT' | 'API_SYNC_ERROR' | 'UNMAPPED_RESOURCE';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  asset_sku?: string;
  message: string;
  evidence: string[];
  tasks: string[];
  status: 'OPEN' | 'RESOLVED';
}

export interface Artist {
  artist_id: string;
  name: string;
  genres: string[];
  market_tier: MarketTier;
  board_url?: string;
}

export interface Transaction {
  trans_id: string;
  amount: number;
  source_type: 'PAYHIP_SALE' | 'CAPITAL_INJECTION' | 'CREDIT_CONSUMPTION' | 'MANUAL_ADJUSTMENT';
  related_id: string;
  date: number;
  credits_delta?: number;
}
