import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  try {
    const { dni, action, sessionId } = await request.json();

    if (action === 'start') {
      // Usar transacción para evitar sesiones duplicadas
      let result;
      
      await adminDb.runTransaction(async (transaction) => {
        // Verificar si ya existe una sesión activa
        const sessionSnapshot = await transaction.get(
          adminDb.collection('test_sessions')
            .where('dni', '==', dni)
            .where('completed', '==', false)
        );

        if (!sessionSnapshot.empty) {
          const session = sessionSnapshot.docs[0].data();
          const startTime = session.startTime.toDate();
          const testDuration = parseInt(process.env.TEST_DURATION_MINUTES || '10') * 60;
          const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
          const remaining = Math.max(0, testDuration - elapsed);

          result = { 
            success: true, 
            sessionId: sessionSnapshot.docs[0].id,
            timeRemaining: remaining,
            startTime: startTime.toISOString()
          };
          return;
        }

        // Crear nueva sesión
        const sessionRef = adminDb.collection('test_sessions').doc();
        transaction.set(sessionRef, {
          dni,
          startTime: FieldValue.serverTimestamp(),
          completed: false,
          createdAt: FieldValue.serverTimestamp()
        });

        const testDuration = parseInt(process.env.TEST_DURATION_MINUTES || '10') * 60;
        result = { 
          success: true, 
          sessionId: sessionRef.id,
          timeRemaining: testDuration,
          startTime: new Date().toISOString()
        };
      });

      return NextResponse.json(result);
    }

    if (action === 'check') {
      if (!sessionId) {
        return NextResponse.json({ success: false, error: 'SessionId requerido' }, { status: 400 });
      }
      
      const sessionDoc = await adminDb.collection('test_sessions').doc(sessionId).get();
      
      if (!sessionDoc.exists) {
        return NextResponse.json({ success: false, error: 'Sesión no encontrada' }, { status: 404 });
      }

      const session = sessionDoc.data()!;
      const startTime = session.startTime.toDate();
      const testDuration = parseInt(process.env.TEST_DURATION_MINUTES || '10') * 60;
      const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
      const remaining = Math.max(0, testDuration - elapsed);

      return NextResponse.json({ 
        success: true, 
        timeRemaining: remaining,
        completed: session.completed
      });
    }

    return NextResponse.json({ success: false, error: 'Acción inválida' }, { status: 400 });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
  }
}