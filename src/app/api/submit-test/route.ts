import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  try {
    const { dni, name, answers, timeExpired, completionTime, sessionId } = await request.json();
    
    console.log('=== SUBMIT TEST API ===');
    console.log('DNI:', dni);
    console.log('Name:', name);
    console.log('Answers:', answers);
    console.log('Time expired:', timeExpired);
    console.log('Session ID:', sessionId);
    console.log('Answers count:', answers?.length);
    console.log('Non-empty answers:', answers?.filter((a: string) => a && a.trim().length > 0).length);

    if (!dni || !name || !answers || !Array.isArray(answers)) {
      console.log('ERROR: Datos incompletos');
      return NextResponse.json({ success: false, error: 'Datos incompletos' }, { status: 400 });
    }

    // Validar integridad del array de respuestas
    const maxLength = parseInt(process.env.MAX_ANSWER_LENGTH || '200');
    const totalQuestions = parseInt(process.env.TOTAL_QUESTIONS || '7');
    
    if (answers.length !== totalQuestions) {
      console.log('ERROR: Número incorrecto de respuestas');
      return NextResponse.json({ success: false, error: 'Número incorrecto de respuestas' }, { status: 400 });
    }
    
    // Validar longitud de cada respuesta
    for (let i = 0; i < answers.length; i++) {
      if (typeof answers[i] !== 'string' || answers[i].length > maxLength) {
        console.log(`ERROR: Respuesta ${i + 1} inválida`);
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
        
        // Crear o actualizar respuesta con DNI como ID del documento
        transaction.set(responseRef, {
          dni,
          name,
          answers,
          submittedAt: FieldValue.serverTimestamp(),
          timeExpired: timeExpired || false,
          completionTime: completionTime || 0,
          sessionId,
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