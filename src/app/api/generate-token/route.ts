import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { dni, name } = await request.json();

    if (!dni || !name) {
      return NextResponse.json({ success: false, error: 'Datos incompletos' }, { status: 400 });
    }

    // Generar token seguro
    const token = crypto.randomBytes(32).toString('hex');
    // Token dura la duración del test + 1 minuto de margen
    const testDuration = parseInt(process.env.TEST_DURATION_MINUTES || '10');
    const tokenDuration = (testDuration + 1) * 60 * 1000;
    const expiresAt = new Date(Date.now() + tokenDuration);

    // Guardar token en base de datos
    await adminDb.collection('access_tokens').doc(token).set({
      dni,
      name,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt,
      used: false
    });

    return NextResponse.json({ success: true, token });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
  }
}