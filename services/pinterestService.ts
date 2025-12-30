// services/pinterestService.ts

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
  end.setDate(end.getDate() - 3); // Mantenemos -3 días por seguridad de datos
  
  const start = new Date();
  start.setDate(start.getDate() - 33); 
  
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0]
  };
};

export const pinterestService = {

  // 1. OBTENER SOLO LOS PINES 'TOP PERFORMERS'
  async fetchTopPinsAnalytics(): Promise<RealPinData[]> {
    console.log("📡 SOLICITANDO INTELIGENCIA (TOP PINS)...");
    const { startDate, endDate } = getDateRange();
    
    // Sort by IMPRESSION para asegurar que traemos los gigantes primero
    const url = `${BASE_URL}/user_account/analytics/top_pins?start_date=${startDate}&end_date=${endDate}&sort_by=IMPRESSION&page_size=50&metric_types=IMPRESSION,SAVE,PIN_CLICK,OUTBOUND_CLICK`;

    try {
      const response = await fetch(url, { headers: { "Authorization": `Bearer ${getToken()}` } });
      if (!response.ok) return [];

      const data = await response.json();
      const rawList = data.pins || data.items || [];

      // Mapeo blindado
      return rawList.map((item: any) => ({
        id: String(item.pin_id || item.id),
        title: item.title || "Top Performer",
        link: null, 
        board_id: "TOP_TIER", 
        alt_text: null,
        metrics: {
            impression_count: Number(item.metrics?.IMPRESSION || item.metrics?.impression_count || 0),
            save_count: Number(item.metrics?.SAVE || item.metrics?.save_count || 0),
            pin_click_count: Number(item.metrics?.PIN_CLICK || item.metrics?.pin_click_count || 0),
            outbound_click_count: Number(item.metrics?.OUTBOUND_CLICK || item.metrics?.outbound_click_count || 0)
        }
      }));

    } catch (e) {
      console.error("❌ FALLO EN INTELIGENCIA:", e);
      return [];
    }
  },

  // 2. BARRIDO DE INVENTARIO (Ahora sí lo activamos)
  async fetchInventoryScan(): Promise<RealPinData[]> {
    console.log("📡 ESCANEANDO COLA LARGA...");
    let allPins: RealPinData[] = [];
    let bookmark: string | null = null;
    let keepFetching = true;
    const SAFETY_LIMIT = 100; // Subimos un poco el límite
    let totalProcessed = 0;

    try {
      while (keepFetching && totalProcessed < SAFETY_LIMIT) {
        let url = `${BASE_URL}/pins?page_size=50`; 
        if (bookmark) url += `&bookmark=${bookmark}`;

        const response = await fetch(url, { headers: { "Authorization": `Bearer ${getToken()}` } });
        if (!response.ok) break;

        const data = await response.json();
        const rawItems = data.items || [];

        const basicPins: RealPinData[] = rawItems.map((item: any) => ({
            id: String(item.id),
            link: item.link,
            title: item.title || "Sin Título",
            alt_text: item.alt_text,
            board_id: item.board_id,
            metrics: { impression_count: 0, save_count: 0, pin_click_count: 0, outbound_click_count: 0 }
        }));

        allPins = [...allPins, ...basicPins];
        totalProcessed += rawItems.length;
        bookmark = data.bookmark;
        if (!bookmark) keepFetching = false;
        
        await new Promise(r => setTimeout(r, 100)); 
      }
      return allPins;
    } catch (error) {
      return [];
    }
  },

  // 3. FUSIÓN REAL
  async fetchAllPins(): Promise<RealPinData[]> {
      const topPins = await this.fetchTopPinsAnalytics();
      const inventory = await this.fetchInventoryScan();

      const pinMap = new Map<string, RealPinData>();

      // A. Inventario base
      inventory.forEach(p => pinMap.set(p.id, p));

      // B. Top Pins reales (Sobrescriben con datos ricos)
      topPins.forEach(tp => {
          const existing = pinMap.get(tp.id);
          // Fusión inteligente: Mantiene link/titulo del inventario si existe, pero usa métricas del TopPin
          pinMap.set(tp.id, { 
              ...tp, 
              link: existing?.link || tp.link, 
              title: existing?.title !== "Sin Título" ? existing?.title || tp.title : tp.title 
          });
      });

      const finalArray = Array.from(pinMap.values());
      console.log(`✅ FUSIÓN COMPLETADA: ${finalArray.length} activos.`);
      return finalArray;
  }
};