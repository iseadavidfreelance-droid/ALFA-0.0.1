
import { PinMetrics } from '../types';

// Tipos de datos que simulan la respuesta de la API de Pinterest
export interface PinterestPin {
  id: string;
  link: string;
  title: string;
  description: string;
  media: {
    image_cover_url: string;
  };
}

export interface PinterestPinAnalytics {
  pin_id: string;
  summary_metrics: {
    IMPRESSION: number;
    OUTBOUND_CLICK: number;
    PIN_CLICK: number;
    SAVE: number;
  }
}

// "Base de datos" simulada de pines en la cuenta de Pinterest.
// El sistema buscará SKUs en el título para el mapeo automático.
const mockPins: PinterestPin[] = [
  {
    id: 'PIN-ID-001',
    link: 'https://www.pinterest.com/pin/1/',
    title: 'ANUEL TOUR 2025 V1 [SKU-00045]',
    description: 'Diseño exclusivo para la gira de Anuel AA. #anuel #trap #design',
    media: { image_cover_url: `https://picsum.photos/seed/pin1/400/600` }
  },
  {
    id: 'PIN-ID-002',
    link: 'https://www.pinterest.com/pin/2/',
    title: 'Flyer ANUEL REAL HASTA LA MUERTE [SKU-00045]',
    description: 'Concepto visual para RHLM.',
    media: { image_cover_url: `https://picsum.photos/seed/pin2/400/600` }
  },
  {
    id: 'PIN-ID-003',
    link: 'https://www.pinterest.com/pin/3/',
    title: 'LINKIN PARK CHROME LOGO [SKU-00102]',
    description: 'Logo cromado para Linkin Park. #linkinpark #rock #logo',
    media: { image_cover_url: `https://picsum.photos/seed/pin3/400/600` }
  },
  {
    id: 'PIN-ID-004',
    link: 'https://www.pinterest.com/pin/4/',
    title: 'Concepto portada Meteora 25 Aniversario',
    description: 'Un diseño no asociado a un SKU, permanecerá en el limbo de Pinterest.',
    media: { image_cover_url: `https://picsum.photos/seed/pin4/400/600` }
  },
];

// Simula el endpoint GET /v5/pins
export const fetchUserPins = async (): Promise<PinterestPin[]> => {
  console.log('PINTEREST_API_SIM: GET /v5/pins');
  await new Promise(res => setTimeout(res, 800)); // Simular latencia de red
  return JSON.parse(JSON.stringify(mockPins)); // Devuelve una copia para evitar mutaciones
};

// Simula el endpoint GET /v5/pins/analytics
export const fetchPinAnalytics = async (pinIds: string[]): Promise<PinterestPinAnalytics[]> => {
  console.log(`PINTEREST_API_SIM: GET /v5/pins/analytics for ${pinIds.length} pins`);
  await new Promise(res => setTimeout(res, 1200)); // Simular latencia de red

  const analytics: PinterestPinAnalytics[] = pinIds.map(id => ({
    pin_id: id,
    summary_metrics: {
      IMPRESSION: Math.floor(Math.random() * 20000) + 500,
      OUTBOUND_CLICK: Math.floor(Math.random() * 100) + 5,
      PIN_CLICK: Math.floor(Math.random() * 800) + 50,
      SAVE: Math.floor(Math.random() * 200) + 10,
    }
  }));

  return analytics;
};

// Función de utilidad para transformar la data de la API a nuestro modelo interno
export const transformToPinMetrics = (pin: PinterestPin, analytics: PinterestPinAnalytics): PinMetrics => {
  const metrics = analytics.summary_metrics;
  const velocity_score = (metrics.IMPRESSION * 0.05) + (metrics.PIN_CLICK * 2) + (metrics.OUTBOUND_CLICK * 10) + (metrics.SAVE * 5);

  return {
    pin_id: pin.id,
    url: pin.link,
    impressions: metrics.IMPRESSION,
    clicks: metrics.PIN_CLICK,
    outbound_clicks: metrics.OUTBOUND_CLICK,
    saves: metrics.SAVE,
    velocity_score: parseFloat(velocity_score.toFixed(2))
  };
};
