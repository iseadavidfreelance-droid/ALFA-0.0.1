
import { 
  Asset, 
  Rarity, 
  LifecycleStage, 
  SourceStatus, 
  OwnershipType, 
  AssetDestination,
  Artist,
  MarketTier
} from './types';

export const INITIAL_ARTISTS: Artist[] = [
  { artist_id: 'ART-01', name: 'Anuel AA', genres: ['Trap', 'Reggaeton'], market_tier: MarketTier.GLOBAL, board_url: 'https://pinterest.com/alfa_os/anuel-aa/' },
  { artist_id: 'ART-05', name: 'Linkin Park', genres: ['Rock', 'Nu Metal'], market_tier: MarketTier.GLOBAL, board_url: 'https://pinterest.com/alfa_os/linkin-park/' }
];

export const INITIAL_ASSETS: Asset[] = [
  {
    sku_id: 'SKU-00045',
    display_name: 'ANUEL TOUR 2025 V1',
    parent_artist_ids: ['ART-01'],
    file_path_drive: 'https://drive.google.com/drive/folders/anuel-045',
    source_status: SourceStatus.ZIPPED,
    ownership_type: OwnershipType.OWNED,
    current_rarity: Rarity.LEGENDARY,
    lifecycle_stage: LifecycleStage.MONETIZATION,
    created_at: Date.now() - (40 * 24 * 60 * 60 * 1000),
    is_collection: false,
    pins: [
      { pin_id: '99887766', url: 'https://pinterest.com/pin/99887766', impressions: 5000, clicks: 200, outbound_clicks: 15, saves: 40, velocity_score: 1200 }
    ]
  },
  {
    sku_id: 'SKU-00102',
    display_name: 'LINKIN PARK CHROME LOGO',
    parent_artist_ids: ['ART-05'],
    file_path_drive: undefined, 
    source_status: SourceStatus.EXPORTED,
    ownership_type: OwnershipType.COMMISSIONED,
    current_rarity: Rarity.EPIC,
    lifecycle_stage: LifecycleStage.INCUBATION,
    created_at: Date.now() - (10 * 24 * 60 * 60 * 1000),
    is_collection: false,
    pins: []
  }
];

export const INITIAL_DESTINATIONS: AssetDestination[] = [
  {
    asset_sku: 'SKU-00045',
    destination_type: 'PAYHIP',
    url: 'https://payhip.com/b/example',
    status: 'ACTIVE',
    views: 450,
    sales: 12,
    revenue_generated: 450.50
  }
];

export const COMMAND_HELP = `
<span class="text-blue-400 font-bold underline">SINTAXIS TÁCTICA ALFA_OS:</span>

<span class="text-yellow-400 font-bold">LECTURA Y DIAGNÓSTICO:</span>
  <span class="text-white">rastrear fugas</span>        : Motor de Detección de Fugas (Cap 3.2).
  <span class="text-white">ver estado [SKU]</span>       : Expediente técnico completo del activo.
  <span class="text-white">analizar [SKU]</span>         : Inferencia de IA Gemini sobre el activo.

<span class="text-red-400 font-bold">EJECUCIÓN TÁCTICA:</span>
  <span class="text-white">sembrar</span>                : Inicia protocolo de inducción de nuevo activo.
  <span class="text-white">verificar [SKU]</span>        : Ping de resolución y cierre de misiones.
  <span class="text-white">ciclo</span>                  : Ejecución de scripts diarios (04:00 AM SIM).

<span class="text-green-400 font-bold">GESTIÓN DE CRÉDITOS:</span>
  <span class="text-white">abonar [USD]</span>            : Inyecta capital y suma créditos ($2=1).
  <span class="text-white">consumir [N]</span>           : Resta N créditos del saldo global (Diseños entregados).
  <span class="text-white">ajustar [N]</span>            : Ajuste manual del contador de créditos (+ o -).
`;
