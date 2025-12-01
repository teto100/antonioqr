import { useState, useCallback } from 'react';

interface TypingEvent {
  timestamp: number;
  key: string;
  type: 'keydown' | 'keyup';
}

interface TypingAnalysis {
  wpm: number;
  avgPauseTime: number;
  longPauses: number;
  backspaces: number;
  totalTime: number;
  suspicious: boolean;
  cpm?: number;
  veryLongPauses?: number;
  shortPauses?: number;
  suspiciousReasons?: string[];
  charCount?: number;
  pauseCount?: number;
}

export const useTypingAnalysis = () => {
  const [events, setEvents] = useState<TypingEvent[]>([]);
  const [startTime, setStartTime] = useState<number | null>(null);

  const recordKeyEvent = useCallback((key: string, type: 'keydown' | 'keyup') => {
    const timestamp = Date.now();
    
    if (!startTime) {
      setStartTime(timestamp);
    }
    
    setEvents(prev => [...prev, { timestamp, key, type }]);
  }, [startTime]);

  const analyzeTyping = useCallback((text: string): TypingAnalysis => {
    if (!startTime || events.length === 0) {
      return {
        wpm: 0,
        avgPauseTime: 0,
        longPauses: 0,
        backspaces: 0,
        totalTime: 0,
        suspicious: false
      };
    }

    const totalTime = (Date.now() - startTime) / 1000 / 60; // minutos
    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
    const wpm = totalTime > 0 ? wordCount / totalTime : 0;

    // Analizar pausas entre teclas
    const keyDownEvents = events.filter(e => e.type === 'keydown');
    const pauses: number[] = [];
    
    for (let i = 1; i < keyDownEvents.length; i++) {
      const pause = keyDownEvents[i].timestamp - keyDownEvents[i-1].timestamp;
      pauses.push(pause);
    }

    const avgPauseTime = pauses.length > 0 ? pauses.reduce((a, b) => a + b, 0) / pauses.length : 0;
    const longPauses = pauses.filter(p => p > 3000).length; // Pausas >3 segundos
    const veryLongPauses = pauses.filter(p => p > 10000).length; // Pausas >10 segundos
    const backspaces = events.filter(e => e.key === 'Backspace').length;
    const shortPauses = pauses.filter(p => p < 100).length; // Pausas muy cortas
    
    // Calcular velocidad por carácter
    const charCount = text.length;
    const cpm = totalTime > 0 ? charCount / totalTime : 0; // caracteres por minuto
    
    // Detectar patrones sospechosos
    let suspiciousReasons: string[] = [];
    
    if (wpm > 150) suspiciousReasons.push('Velocidad extremadamente alta');
    else if (wpm > 100) suspiciousReasons.push('Velocidad muy alta');
    
    if (cpm > 600) suspiciousReasons.push('Caracteres por minuto muy alto');
    
    if (wpm > 80 && backspaces < 3) suspiciousReasons.push('Alta velocidad sin errores');
    
    if (veryLongPauses > 2) suspiciousReasons.push('Múltiples pausas muy largas (posible copia)');
    
    if (shortPauses > charCount * 0.8) suspiciousReasons.push('Escritura demasiado uniforme');
    
    if (avgPauseTime > 3000) suspiciousReasons.push('Pausas promedio muy largas');
    
    if (totalTime < 0.5 && charCount > 50) suspiciousReasons.push('Respuesta larga en tiempo muy corto');
    
    const suspicious = suspiciousReasons.length > 0;

    return {
      wpm: Math.round(wpm * 100) / 100,
      avgPauseTime: Math.round(avgPauseTime),
      longPauses,
      backspaces,
      totalTime: Math.round(totalTime * 60 * 100) / 100,
      suspicious,
      // Datos adicionales para análisis
      cpm: Math.round(cpm),
      veryLongPauses,
      shortPauses,
      suspiciousReasons,
      charCount,
      pauseCount: pauses.length
    };
  }, [events, startTime]);

  const reset = useCallback(() => {
    setEvents([]);
    setStartTime(null);
  }, []);

  return {
    recordKeyEvent,
    analyzeTyping,
    reset
  };
};