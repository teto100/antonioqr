'use client';

import { useSearchParams } from 'next/navigation';
import { useCopyProtection } from '@/hooks/useCopyProtection';

export default function CompletedPage() {
  const searchParams = useSearchParams();
  const dni = searchParams.get('dni');
  const name = searchParams.get('name');
  
  useCopyProtection();

  const casoPractico = `# Contexto de la Empresa

Eres el Líder Técnico de una FinTech en crecimiento. La empresa está lanzando un nuevo servicio de pagos en puntos de venta (POS) utilizando códigos QR. El servicio debe permitir que la aplicación móvil del usuario lea un código QR generado por el POS del comercio para iniciar y completar una transacción. Tener en cuenta que tenemos clientes en todo el Peru.

## El Reto: Nuevo Microservicio QR-Processor

Debes diseñar la arquitectura y el enfoque de implementación de un nuevo microservicio llamado QR-Processor que sea responsable de:

1. Recibir la solicitud de pago (el contenido del QR leído).
2. Validar que el código QR cumpla con el estándar EMVCo Merchant-Presented QR.
3. Validar reglas del comercio para evaluar si este habilitado para recibir pagos con QR
4. Comunicarse con otros sistemas internos y el gateway bancario.
5. Notificar al POS el estado del QR

## Tareas a Realizar

1) Debe diseñar el diagrama de flujo del proceso de Autorización de un pago
2) Debes diseñar el diagrama de componentes de la solución
3) Debes diseñar la arquitectura de carpetas y clases mínimas que utilizarías para realizar el proyecto utilizando los patrones de diseño y de arquitectura que consideres adecuado para este proyecto.`;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">¡Test Completado!</h1>
          <p className="text-gray-600">Postulante: {name ? decodeURIComponent(name) : 'N/A'}</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              ¡Respuestas enviadas exitosamente!
            </h2>
            <p className="text-gray-600">
              Sus respuestas han sido registradas correctamente en nuestro sistema.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              Siguiente paso: Caso Práctico
            </h3>
            <p className="text-blue-800">
              Las tareas del caso práctico que se muestran a continuación pueden ser enviadas 
              al contacto de gestión de talento en las próximas <strong>48 horas</strong>.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Caso Práctico</h2>
          <div className="prose max-w-none">
            <pre className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
              {casoPractico}
            </pre>
          </div>
        </div>

        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-900 mb-2">
            📧 Información de Contacto
          </h3>
          <p className="text-yellow-800">
            Para enviar su caso práctico o consultas, contacte al equipo de gestión de talento:
          </p>
          <ul className="mt-2 text-yellow-800">
            <li>• Email: ext_pdelgado@niubiz.com.pe</li>
            <li>• Plazo: 48 horas desde la finalización del test</li>
            <li>• Incluya su DNI: <strong>{dni}</strong> en el asunto del correo</li>
          </ul>
        </div>
      </main>
    </div>
  );
}