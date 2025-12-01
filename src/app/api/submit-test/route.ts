import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { analyzeAIPatterns } from '@/lib/ai-detector';

export async function POST(request: NextRequest) {
  try {
    const { dni, name, answers, timeExpired, completionTime, sessionId, aiDetectionResults } = await request.json();
    
    if (!dni || !name || !answers || !Array.isArray(answers)) {

      return NextResponse.json({ success: false, error: 'Datos incompletos' }, { status: 400 });
    }

    // Validar integridad del array de respuestas
    const maxLength = parseInt(process.env.MAX_ANSWER_LENGTH || '200');
    const totalQuestions = parseInt(process.env.TOTAL_QUESTIONS || '7');
    
    if (answers.length !== totalQuestions) {

      return NextResponse.json({ success: false, error: 'Número incorrecto de respuestas' }, { status: 400 });
    }
    
    // Validar longitud de cada respuesta
    for (let i = 0; i < answers.length; i++) {
      if (typeof answers[i] !== 'string' || answers[i].length > maxLength) {

        return NextResponse.json({ success: false, error: `Respuesta ${i + 1} inválida` }, { status: 400 });
      }
    }

    // Verificar que todas las respuestas estén completas (si no expiró el tiempo)
    if (!timeExpired && answers.some(answer => !answer || answer.trim().length === 0)) {
      return NextResponse.json({ success: false, error: 'Todas las respuestas son requeridas' }, { status: 400 });
    }

    // Usar transacción para evitar duplicados
    const responseRef = adminDb.collection('responses').doc(dni);
    const allowResubmit = process.env.ALLOW_RESUBMIT === 'true';
    
    try {
      await adminDb.runTransaction(async (transaction) => {
        const existingDoc = await transaction.get(responseRef);
        
        if (existingDoc.exists && !allowResubmit) {
          throw new Error('Ya envió sus respuestas');
        }
        
        // Analizar IA en el servidor como backup
        const serverAiAnalysis = answers.map((answer: string) => {
          if (answer && answer.length > 50) {
            return analyzeAIPatterns(answer);
          }
          return null;
        });
        
        // Calcular interpretación final
        const highRiskCount = serverAiAnalysis.filter((result: any) => result?.probability > 0.6).length;
        const moderateRiskCount = serverAiAnalysis.filter((result: any) => result?.probability > 0.4 && result?.probability <= 0.6).length;
        const totalAnswers = answers.length;
        
        let finalInterpretation = "BAJO_RIESGO";
        let riskLevel = "low";
        let description = "Respuestas parecen auténticas";
        
        if (highRiskCount >= totalAnswers * 0.5) {
          finalInterpretation = "CRITICO";
          riskLevel = "critical";
          description = `${highRiskCount}/${totalAnswers} respuestas con alta probabilidad de IA. Uso extensivo sospechoso.`;
        } else if (highRiskCount >= totalAnswers * 0.2) {
          finalInterpretation = "ALTO_RIESGO";
          riskLevel = "high";
          description = `${highRiskCount}/${totalAnswers} respuestas con alta probabilidad de IA. Uso significativo.`;
        } else if (highRiskCount > 0 || moderateRiskCount >= totalAnswers * 0.3) {
          finalInterpretation = "MODERADO";
          riskLevel = "moderate";
          description = `${highRiskCount} respuestas de alto riesgo, ${moderateRiskCount} de riesgo moderado. Posible uso ocasional.`;
        }
        
        // Crear o actualizar respuesta con DNI como ID del documento
        transaction.set(responseRef, {
          dni,
          name,
          answers,
          submittedAt: FieldValue.serverTimestamp(),
          timeExpired: timeExpired || false,
          completionTime: completionTime || 0,
          sessionId,
          // Análisis de IA (oculto para el postulante)
          aiAnalysis: {
            clientResults: aiDetectionResults || [],
            serverResults: serverAiAnalysis,
            overallSuspicious: serverAiAnalysis.some((result: any) => result?.isLikelyAI),
            highRiskAnswers: highRiskCount,
            moderateRiskAnswers: moderateRiskCount,
            totalAnswers,
            analyzedAt: FieldValue.serverTimestamp(),
            // Interpretación final
            finalAssessment: {
              interpretation: finalInterpretation,
              riskLevel,
              description,
              recommendation: finalInterpretation === "CRITICO" ? "Rechazar - Uso extensivo de IA" :
                            finalInterpretation === "ALTO_RIESGO" ? "Revisar manualmente - Uso significativo de IA" :
                            finalInterpretation === "MODERADO" ? "Considerar entrevista adicional" :
                            "Aprobar - Sin indicios significativos de IA"
            }
          },
          ...(existingDoc.exists ? { resubmitted: true, previousSubmissions: (existingDoc.data()?.previousSubmissions || 0) + 1 } : {})
        });
        
        // Marcar sesión como completada
        if (sessionId) {
          const sessionRef = adminDb.collection('test_sessions').doc(sessionId);
          transaction.update(sessionRef, {
            completed: true,
            completedAt: FieldValue.serverTimestamp()
          });
        }
      });
    } catch (error: any) {
      if (error.message === 'Ya envió sus respuestas') {
        return NextResponse.json({ success: false, error: 'Ya envió sus respuestas' }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
  }
}