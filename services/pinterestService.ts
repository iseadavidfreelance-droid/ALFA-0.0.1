// services/pinterestService.ts

// URL del Proxy que configuramos en Vite
const BASE_URL = "/api-pinterest/v5"; 

export interface RealPinData {
  id: string;
  link: string | null;
  title: string;
  alt_text: string | null;
  board_id: string;
  metrics?: {
    impression_count: number;
    save_count: number;
    pin_click_count: number;
    outbound_click_count: number;
  }
}

// Helper para obtener token dinámico
const getToken = () => localStorage.getItem('ALFA_PINTEREST_TOKEN') || "";

export const pinterestService = {
  // BARRIDO PROFUNDO (Deep Scan) con Paginación
  async fetchAllPins(): Promise<RealPinData[]> {
    console.log("📡 INICIANDO BARRIDO PROFUNDO DE PINTEREST...");
    
    let allPins: RealPinData[] = [];
    let bookmark: string | null = null;
    let keepFetching = true;

    try {
      while (keepFetching) {
        // Construir URL con paginación
        let url = `${BASE_URL}/pins?page_size=100`;
        if (bookmark) url += `&bookmark=${bookmark}`;

        const response = await fetch(url, {
          headers: {
            "Authorization": `Bearer ${getToken()}`,
            "Content-Type": "application/json"
          }
        });

        if (response.status === 401) {
          throw new Error("TOKEN_EXPIRED"); // Señal para la UI
        }

        if (!response.ok) {
          const err = await response.json();
          throw new Error(`Error API Pinterest: ${err.message || response.statusText}`);
        }

        const data = await response.json();
        
        // Mapear datos
        const pagePins = data.items.map((item: any) => ({
          id: item.id,
          link: item.link,
          title: item.title,
          alt_text: item.alt_text,
          board_id: item.board_id,
          metrics: item.metrics || { impression_count: 0, save_count: 0, pin_click_count: 0, outbound_click_count: 0 } 
        }));

        allPins = [...allPins, ...pagePins];
        console.log(`... Paquete recibido: ${pagePins.length} pines. Total: ${allPins.length}`);

        // Verificar si hay más páginas
        bookmark = data.bookmark;
        if (!bookmark) {
          keepFetching = false;
        }
      }

      return allPins;

    } catch (error) {
      console.error("❌ FALLO PINTEREST:", error);
      throw error;
    }
  },

  async fetchBoards() {
     // Implementación similar si se requiere en el futuro
     return [];
  }
};