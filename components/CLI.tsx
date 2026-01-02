
import React, { useState, useEffect, useRef } from 'react';

interface CLIProps {
  onCommand: (command: string) => void;
  terminalLog: string[];
}

const CLI: React.FC<CLIProps> = ({ onCommand, terminalLog }) => {
  const [input, setInput] = useState('');
  const logEndRef = useRef<HTMLDivElement>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onCommand(input);
    setInput('');
  };

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [terminalLog]);

  return (
    <div className="bg-black border-2 border-[#00ff41] p-4 h-full flex flex-col font-mono text-xs shadow-[inset_0_0_20px_rgba(0,255,65,0.1)]">
      <div className="text-[10px] text-[#00ff41]/40 border-b border-[#00ff41]/20 pb-2 mb-4 flex justify-between uppercase italic">
        <span>INTELLIGENCE_KERNEL_ALPHA_0.0.1</span>
        <span>${new Date().getFullYear()}</span>
      </div>
      
      <div 
        ref={logContainerRef}
        className="flex-1 overflow-y-auto mb-4 space-y-2 custom-scrollbar pr-2"
      >
        <div className="text-[#00ff41]/40 italic mb-4">Ingrese 'ayuda' para ver los protocolos de comando.</div>
        {terminalLog.map((line, i) => (
          <div key={i} className="leading-relaxed animate-in fade-in slide-in-from-left-2 duration-300">
            <span dangerouslySetInnerHTML={{ __html: line }} />
          </div>
        ))}
        <div ref={logEndRef} />
      </div>
      
      <form onSubmit={handleSubmit} className="flex border-t border-[#00ff41]/20 pt-4 items-center">
        <span className="text-[#00ff41] mr-3 font-bold">OPERADOR@ALFA_OS:></span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="bg-transparent border-none outline-none flex-1 text-[#00ff41] caret-[#00ff41] font-bold placeholder:opacity-20"
          autoFocus
          placeholder="Esperando instrucciones..."
        />
      </form>
    </div>
  );
};

export default CLI;
