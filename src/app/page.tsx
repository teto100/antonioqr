'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ReCAPTCHA from 'react-google-recaptcha';
export default function Home() {
  const [dni, setDni] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const router = useRouter();

  const enableCaptcha = process.env.NEXT_PUBLIC_ENABLE_CAPTCHA === 'true';

  const handleInitClick = () => {
    if (dni.length !== 8 || !/^\d+$/.test(dni)) {
      setError('El DNI debe tener exactamente 8 dígitos');
      return;
    }

    if (enableCaptcha && !captchaToken) {
      setError('Por favor, complete el captcha');
      return;
    }

    setError('');
    setShowConfirm(true);
  };

  const validateDni = async () => {
    setLoading(true);
    setError('');
    setShowConfirm(false);

    try {
      const requestBody = { dni, captchaToken };
      
      const response = await fetch('/api/check-dni', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const result = await response.json();

      if (result.success) {
        // Generar token seguro
        const tokenResponse = await fetch('/api/generate-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dni, name: result.data.name })
        });
        
        const tokenResult = await tokenResponse.json();
        if (tokenResult.success) {
          router.push(`/test?token=${tokenResult.token}`);
        } else {
          setError('Error al generar acceso seguro');
        }
      } else {
        if (result.completed) {
          router.push(`/completed?dni=${dni}&name=${encodeURIComponent('Postulante')}`);
        } else {
          setError(result.error);
        }
      }
    } catch (error) {
      setError('Error al validar los datos. Intente nuevamente.');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Test de Conocimiento
          </h1>
          <p className="text-gray-600">
            Evaluación técnica
          </p>
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">Reglas importantes:</h2>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start">
              <span className="text-primary-500 mr-2">A)</span>
              Dispone de 20 minutos para completar las preguntas, si recargas o vuelves a entrar el tiempo seguirá corriendo.
            </li>
            <li className="flex items-start">
              <span className="text-primary-500 mr-2">B)</span>
              No está permitido utilizar ninguna ayuda (lo notaremos 🤓)
            </li>
            <li className="flex items-start">
              <span className="text-primary-500 mr-2">C)</span>
              El fin no es dar una respuesta amplia, sino validar conocimientos
            </li>
            <li className="flex items-start">
              <span className="text-primary-500 mr-2">D)</span>
              Al final se habilitará un caso práctico puedes entrar las veces que necesites una vez terminado la prueba.
            </li>
            
          </ul>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="dni" className="block text-sm font-medium text-gray-700 mb-2">
              Número de documento
            </label>
            <input
              type="text"
              id="dni"
              value={dni}
              onChange={(e) => setDni(e.target.value.replace(/\D/g, '').slice(0, 8))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="12345678"
              maxLength={8}
            />
          </div>

          {enableCaptcha && (
            <div className="flex justify-center">
              <ReCAPTCHA
                sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!}
                onChange={setCaptchaToken}
              />
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <button
            onClick={handleInitClick}
            disabled={loading || dni.length !== 8}
            className="w-full bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Validando...' : 'Iniciar'}
          </button>
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="text-center mb-6">
              <div className="text-4xl mb-4">⏰</div>
              <h3 className="text-xl font-bold mb-2 text-gray-900">¿Está seguro de iniciar?</h3>
              <p className="text-gray-600">
                Una vez que confirme, el tiempo comenzará a correr y tendrá <strong>20 minutos</strong> para completar el test.
              </p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={validateDni}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
              >
                {loading ? 'Iniciando...' : 'Sí, iniciar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}