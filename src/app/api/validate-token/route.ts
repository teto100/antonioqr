import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ success: false, error: 'Token requerido' }, { status: 400 });
    }

    const tokenDoc = await adminDb.collection('access_tokens').doc(token).get();

    if (!tokenDoc.exists) {
      return NextResponse.json({ success: false, error: 'Token inválido' }, { status: 401 });
    }

    const tokenData = tokenDoc.data()!;

    // Verificar si el token ya fue usado
    if (tokenData.used) {
      return NextResponse.json({ success: false, error: 'Token ya utilizado' }, { status: 401 });
    }

    // Verificar si el token expiró
    if (new Date() > tokenData.expiresAt.toDate()) {
      return NextResponse.json({ success: false, error: 'Token expirado' }, { status: 401 });
    }

    // Marcar token como usado
    await adminDb.collection('access_tokens').doc(token).update({
      used: true,
      usedAt: FieldValue.serverTimestamp()
    });

    return NextResponse.json({ 
      success: true, 
      data: { 
        dni: tokenData.dni, 
        name: tokenData.name 
      } 
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
  }
}