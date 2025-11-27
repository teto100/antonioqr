import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { checkRateLimit, checkDniBlocked, blockDni } from '@/lib/rate-limiter';

export async function POST(request: NextRequest) {
  try {
    const { dni, captchaToken } = await request.json();
    const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

    // Rate limiting por IP
    const rateLimitResult = checkRateLimit(clientIP);
    if (!rateLimitResult.allowed) {
      const resetTime = rateLimitResult.resetTime ? new Date(rateLimitResult.resetTime).toISOString() : 'unknown';
      return NextResponse.json({ 
        success: false, 
        error: `Demasiadas solicitudes. Intente después de: ${resetTime}` 
      }, { status: 429 });
    }

    if (!dni || dni.length !== 8 || !/^\d+$/.test(dni)) {
      return NextResponse.json({ success: false, error: 'DNI inválido' }, { status: 400 });
    }

    // Verificar caché de DNIs bloqueados (evita consulta a BD)
    if (checkDniBlocked(dni)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Límite de intentos superado. Contacte al equipo de talento.' 
      }, { status: 403 });
    }

    // Verificar captcha si está habilitado
    if (process.env.NEXT_PUBLIC_ENABLE_CAPTCHA === 'true') {
      if (!captchaToken) {
        return NextResponse.json({ success: false, error: 'Captcha requerido' }, { status: 400 });
      }

      const verifyResponse = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${captchaToken}`,
      });

      const verifyData = await verifyResponse.json();
      if (!verifyData.success) {
        return NextResponse.json({ success: false, error: 'Captcha inválido' }, { status: 400 });
      }
    }

    // Verificar intentos previos
    const maxAttempts = parseInt(process.env.MAX_ATTEMPTS || '3');
    const attemptsSnapshot = await adminDb.collection('attempts')
      .where('dni', '==', dni)
      .get();
    
    if (attemptsSnapshot.size >= maxAttempts) {
      // Bloquear DNI en caché por 1 hora
      blockDni(dni, 60);
      return NextResponse.json({ 
        success: false, 
        error: 'Límite de intentos superado. Contacte al equipo de talento.' 
      }, { status: 403 });
    }

    // Verificar si ya completó el test (revisar responses)
    const responseDoc = await adminDb.collection('responses').doc(dni).get();

    if (responseDoc.exists) {
      return NextResponse.json({ 
        success: false, 
        error: 'Ya completaste la prueba, espera los resultados.',
        completed: true
      }, { status: 403 });
    }

    // Verificar si DNI existe
    const postulanteSnapshot = await adminDb.collection('postulante')
      .where('dni', '==', dni)
      .get();

    if (postulanteSnapshot.empty) {
      // Registrar intento fallido
      await adminDb.collection('attempts').add({
        dni,
        timestamp: FieldValue.serverTimestamp(),
        ip: clientIP,
        success: false
      });
      
      return NextResponse.json({ success: false, error: 'DNI no encontrado' }, { status: 404 });
    }

    // Registrar intento exitoso
    await adminDb.collection('attempts').add({
      dni,
      timestamp: FieldValue.serverTimestamp(),
      ip: clientIP,
      success: true
    });

    const postulante = postulanteSnapshot.docs[0].data();
    
    return NextResponse.json({ 
      success: true, 
      data: { name: postulante.name || 'Postulante' }
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
  }
}