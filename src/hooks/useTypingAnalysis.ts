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
    const wpm = wordCount / totalTime;

    // Analizar pausas entre teclas
    const keyDownEvents = events.filter(e => e.type === 'keydown');
    const pauses: number[] = [];
    
    for (let i = 1; i < keyDownEvents.length; i++) {
      const pause = keyDownEvents[i].timestamp - keyDownEvents[i-1].timestamp;
      pauses.push(pause);
    }

    const avgPauseTime = pauses.reduce((a, b) => a + b, 0) / pauses.length;
    const longPauses = pauses.filter(p => p > 3000).length; // Pausas >3 segundos
    const backspaces = events.filter(e => e.key === 'Backspace').length;

    // Detectar patrones sospechosos
    const suspicious = 
      wpm > 120 || // Muy rápido
      longPauses > 3 || // Muchas pausas largas (pensando/copiando)
      (wpm > 80 && backspaces < 5) || // Rápido sin errores
      avgPauseTime > 2000; // Pausas muy largas en promedio

    return {
      wpm,
      avgPauseTime,
      longPauses,
      backspaces,
      totalTime: totalTime * 60,
      suspicious
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