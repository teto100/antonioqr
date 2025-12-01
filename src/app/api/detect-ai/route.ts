import { NextRequest, NextResponse } from 'next/server';
import { analyzeAIPatterns } from '@/lib/ai-detector';

async function detectAIContent(text: string) {
  const patternAnalysis = analyzeAIPatterns(text);
  
  const words = text.split(/\s+/);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim());
  const avgWordsPerSentence = words.length / sentences.length;
  
  const uniqueWords = new Set(words.map(w => w.toLowerCase()));
  const lexicalDiversity = uniqueWords.size / words.length;
  
  const hasListStructure = /^\d+\.|^-|^\*/.test(text.trim());
  const hasSubheadings = /^#{1,6}\s/.test(text);
  const tooStructured = hasListStructure && hasSubheadings;
  
  let finalScore = patternAnalysis.score;
  
  if (avgWordsPerSentence > 20) finalScore += 10;
  if (lexicalDiversity < 0.4) finalScore += 15;
  if (tooStructured) finalScore += 20;
  if (text.length > 500 && sentences.length < 5) finalScore += 15;
  
  return {
    aiProbability: Math.min(finalScore / 100, 1),
    confidence: finalScore > 50 ? 'high' : finalScore > 25 ? 'medium' : 'low',
    details: {
      patternAnalysis,
      avgWordsPerSentence,
      lexicalDiversity,
      tooStructured,
      finalScore
    }
  };
}

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();
    
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Texto requerido' },
        { status: 400 }
      );
    }
    
    const result = await detectAIContent(text);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error en detección de IA:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}