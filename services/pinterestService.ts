// services/pinterestService.ts

// URL del Proxy
const BASE_URL = "/api-pinterest/v5"; 

export interface RealPinData {
  id: string;
  link: string | null;
  title: string;
  alt_text: string | null;
  board_id: string;
  metrics: {
    impression_count: number;
    save_count: number;
    pin_click_count: number;
    outbound_click_count: number;
  }
}

const getToken = () => localStorage.getItem('ALFA_PINTEREST_TOKEN') || "";

const getDateRange = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 30); 
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0]
  };
};

// HELPER: Pausa artificial para engañar al rate-limiter
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const pinterestService = {
  // 1. Obtener métricas específicas de un PIN
  async fetchPinAnalytics(pinId: string): Promise<any> {
    const { startDate, endDate } = getDateRange();
    const url = `${BASE_URL}/pins/${pinId}/analytics?start_date=${startDate}&end_date=${endDate}&metric_types=IMPRESSION,SAVE,PIN_CLICK,OUTBOUND_CLICK`;

    try {
      const response = await fetch(url, {
        headers: { "Authorization": `Bearer ${getToken()}` }
      });
      
      if (response.status === 429) {
        console.warn("⚠️ RATE LIMIT ALCANZADO: Pausando...");
        return null; 
      }

      if (!response.ok) return null;
      return await response.json();
    } catch (e) {
      return null;
    }
  },

  // 2. Barrido Controlado (SECUENCIAL)
  async fetchAllPins(): Promise<RealPinData[]> {
    console.log("📡 INICIANDO EXTRACCIÓN REAL (MODO SEGURO)...");
    
    let allPins: RealPinData[] = [];
    let bookmark: string | null = null;
    let keepFetching = true;
    let totalProcessed = 0;
    const SAFETY_LIMIT = 50; // <--- FRENADA DE EMERGENCIA: Solo procesa los primeros 50 pines por ciclo mientras estás en Trial.

    try {
      while (keepFetching && totalProcessed < SAFETY_LIMIT) {
        let url = `${BASE_URL}/pins?page_size=25`; // Página pequeña
        if (bookmark) url += `&bookmark=${bookmark}`;

        const response = await fetch(url, {
          headers: { "Authorization": `Bearer ${getToken()}` }
        });

        if (response.status === 401) throw new Error("TOKEN_EXPIRED");
        if (!response.ok) throw new Error("API Error Lista");

        const data = await response.json();
        const rawItems = data.items || [];
        const enrichedPins: RealPinData[] = [];

        // BUCLE SECUENCIAL (Lento pero Seguro)
        for (const item of rawItems) {
            // Pausa de 300ms entre cada pin para no saturar
            await delay(300);

            const analytics = await pinterestService.fetchPinAnalytics(item.id);
            
            enrichedPins.push({
                id: item.id,
                link: item.link,
                title: item.title || "Sin Título",
                alt_text: item.alt_text,
                board_id: item.board_id,
                metrics: {
                    impression_count: analytics?.IMPRESSION || 0,
                    save_count: analytics?.SAVE || 0,
                    pin_click_count: analytics?.PIN_CLICK || 0,
                    outbound_click_count: analytics?.OUTBOUND_CLICK || 0
                }
            });
            
            // Log visual para ver progreso
            console.log(`... Pin ${item.id} escaneado. (Stats: ${analytics ? 'OK' : '0'})`);
        }

        allPins = [...allPins, ...enrichedPins];
        totalProcessed += rawItems.length;

        bookmark = data.bookmark;
        if (!bookmark) keepFetching = false;
      }

      if (totalProcessed >= SAFETY_LIMIT) {
          console.log("🛑 LIMITE DE SEGURIDAD ALCANZADO (Trial Mode).");
      }

      return allPins;

    } catch (error) {
      console.error("❌ FALLO:", error);
      throw error;
    }
  }
};