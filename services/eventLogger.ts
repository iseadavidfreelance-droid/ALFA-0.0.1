// services/eventLogger.ts

// Tipos de mensajes para darle color automático
export type LogType = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'SYSTEM';

// La función que usarán tus servicios para "hablar"
export const systemLog = (message: string, type: LogType = 'INFO') => {
  // Disparamos un evento personalizado que App.tsx escuchará
  const event = new CustomEvent('ALFA_LOG_EVENT', {
    detail: { message, type }
  });
  window.dispatchEvent(event);
};