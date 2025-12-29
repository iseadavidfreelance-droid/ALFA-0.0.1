import React, { useState, useEffect, useRef } from 'react';

interface CLIProps {
  onCommand: (command: string) => void;
  terminalLog: string[];
}

const CLI: React.FC<CLIProps> = ({ onCommand, terminalLog }) => {
  const [input, setInput] = useState('');
  const logEndRef = useRef<HTMLDivElement>(null);
  
  // Referencia al contenedor para auto-scroll
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onCommand(input);
    setInput('');
  };

  // Auto-scroll al final cuando llega un nuevo log
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [terminalLog]);

  return (
    <div className="bg-black border-2 border-[#00ff41] h-full flex flex-col font-mono text-xs shadow-[inset_0_0_20px_rgba(0,255,65,0.1)] overflow-hidden">
      {/* HEADER FIJO */}
      <div className="p-2 bg-[#00ff41]/10 border-b border-[#00ff41]/20 flex justify-between items-center shrink-0">
        <span className="text-[10px] font-black italic">KERNEL_LOG_STREAM</span>
        <div className="flex gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00ff41] animate-pulse"></span>
            <span className="text-[10px] opacity-60">LIVE</span>
        </div>
      </div>
      
      {/* LOG SCROLLABLE (Altura flexible pero contenida) */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar min-h-0"
      >
        <div className="text-[#00ff41]/30 italic mb-4 text-[10px]">
          System initialized...<br/>
          Listening to port 3000...<br/>
          Secure connection established.
        </div>
        // Dentro de components/CLI.tsx
{terminalLog.map((line, i) => (
  <div key={i} className="leading-tight break-words font-mono text-[11px] animate-in fade-in duration-75">
    {/* ELIMINAMOS EL SPAN DE LA FECHA AQUÍ PORQUE YA VIENE EN 'line' DESDE App.tsx */}
    <span dangerouslySetInnerHTML={{ __html: line }} />
  </div>
))}
        <div ref={logEndRef} />
      </div>
      
      {/* INPUT FIJO (Siempre abajo) */}
      <form onSubmit={handleSubmit} className="p-2 border-t border-[#00ff41]/20 bg-black shrink-0 flex items-center">
        <span className="text-[#00ff41] mr-2 font-bold select-none">{'>'}</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="bg-transparent border-none outline-none flex-1 text-[#00ff41] font-bold placeholder:opacity-20 h-8"
          autoFocus
          placeholder="Comando..."
        />
      </form>
    </div>
  );
};

export default CLI;