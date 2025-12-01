// Patrones típicos de respuestas generadas por IA
export const AI_PATTERNS = {
  // Frases de inicio típicas de IA
  openings: [
    /^(como|en tanto|dado que|considerando que)/i,
    /^(es importante (mencionar|destacar|recordar|considerar))/i,
    /^(cabe (destacar|mencionar|señalar))/i,
    /^(vale la pena (mencionar|destacar))/i,
    /^(hay que tener en cuenta)/i,
    /^(para (responder|abordar|contestar))/i,
    /^(en el contexto de)/i,
    /^(desde el punto de vista)/i
  ],
  
  // Conectores excesivos
  connectors: [
    /(por otro lado|además|asimismo|por tanto|en consecuencia)/gi,
    /(no obstante|sin embargo|por el contrario)/gi,
    /(en primer lugar|en segundo lugar|finalmente)/gi,
    /(de manera similar|de igual forma|por consiguiente)/gi,
    /(en este sentido|en esta línea|bajo esta perspectiva)/gi
  ],
  
  // Estructuras muy formales
  formal: [
    /en (resumen|conclusión|síntesis)/i,
    /(dicho esto|habiendo dicho esto)/i,
    /(es fundamental|es crucial|es esencial)/i,
    /desde (mi|una) perspectiva/i,
    /(implementar|optimizar|eficiencia|metodología)/gi,
    /(paradigma|framework|arquitectura|escalabilidad)/gi,
    /(robustez|versatilidad|flexibilidad)/gi
  ],
  
  // Evasivas típicas de IA
  evasive: [
    /no puedo (proporcionar|dar|ofrecer)/i,
    /como (modelo de IA|asistente|sistema)/i,
    /no tengo acceso a/i,
    /depende del contexto/i
  ],
  
  // Patrones de estructura perfecta
  structure: [
    /\d+\.|^-|^\*/gm, // Listas numeradas o con viñetas
    /:\s*$/gm, // Líneas que terminan en dos puntos
    /^#{1,6}\s/gm // Encabezados markdown
  ]
};

export const analyzeAIPatterns = (text: string) => {
  let score = 0;
  const findings: string[] = [];
  
  // Verificar patrones
  Object.entries(AI_PATTERNS).forEach(([category, patterns]) => {
    patterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        score += matches.length * 10;
        findings.push(`${category}: "${matches[0]}"`);
      }
    });
  });
  
  // Análisis adicional
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim());
  
  // Respuestas muy largas (>150 palabras para pregunta simple)
  if (words.length > 150) {
    score += 20;
    findings.push('Respuesta excesivamente larga');
  }
  
  // Oraciones muy largas (promedio >20 palabras)
  const avgWordsPerSentence = words.length / sentences.length;
  if (avgWordsPerSentence > 20) {
    score += 15;
    findings.push('Oraciones muy largas');
  }
  
  // Vocabulario muy técnico/formal
  const formalWords = text.match(/\b(implementar|optimizar|eficiencia|metodología|paradigma|framework|arquitectura|escalabilidad|robustez|versatilidad)\b/gi);
  if (formalWords && formalWords.length > 2) {
    score += 20;
    findings.push('Vocabulario excesivamente técnico');
  }
  
  // Estructura muy perfecta
  const hasLists = /^\s*[\d\-\*]/.test(text);
  const hasColons = text.includes(':');
  const perfectStructure = hasLists && hasColons;
  if (perfectStructure) {
    score += 15;
    findings.push('Estructura demasiado perfecta');
  }
  
  // Diversidad léxica baja (vocabulario repetitivo)
  const uniqueWords = new Set(words.map(w => w.toLowerCase()));
  const lexicalDiversity = uniqueWords.size / words.length;
  if (lexicalDiversity < 0.5 && words.length > 50) {
    score += 10;
    findings.push('Vocabulario repetitivo');
  }
  
  return {
    score,
    probability: Math.min(score / 100, 1),
    findings,
    isLikelyAI: score > 25 // Umbral más bajo
  };
};