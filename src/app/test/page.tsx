'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTypingAnalysis } from '@/hooks/useTypingAnalysis';
const questions = [
  "¿Qué servicio de AWS (ej. AWS Lambda, AWS Fargate, EC2) usaría para alojar el QR-Processor y por qué? Justifique su elección en términos de escalabilidad y costo por transacción.",
  "¿Qué base de datos de AWS (ej. DynamoDB, Aurora RDS) elegiría para manejar el estado transaccional (ID del QR, expiración, estado del pago) y por qué? Justifique su elección en función de la alta concurrencia esperada en un sistema de pagos.",
  "¿Si el pago requiere notificar a tres sistemas internos (Inventario, Fidelización, Contabilidad), ¿qué servicio de messaging de AWS (SQS, SNS) usaría para desacoplar estos sistemas del flujo de pago principal?",
  "Sabiendo que el microservicio se desarrollará en Java, ¿qué framework (ej. Spring Boot, Quarkus, Micronaut) recomendaría para construir el QR-Processor y por qué? Su elección debe considerar el entorno de AWS que eligió en la pregunta A.",
  "El código QR debe ser validado por el servicio. ¿Cuáles son los dos puntos de datos críticos que debe contener un QR EMVCo para iniciar un pago? ¿Qué mecanismo de seguridad clave usaría el QR-Processor para asegurar la integridad y autenticidad del código leído (es decir, que no haya sido manipulado)?",
  "Si el servicio externo del gateway bancario está temporalmente caído o inaccesible, ¿qué patrón de integración y qué servicio de AWS usaría para evitar la pérdida de la transacción y asegurar su procesamiento posterior (el patrón de reintento)?",
  "Al ser un servicio crítico de pago, ¿qué estrategia de despliegue (ej. Blue/Green, Canary) implementaría para las nuevas versiones del QR-Processor? Describa brevemente el proceso y la métrica de monitoreo más importante que usaría para tomar la decisión de rollout total."
];

export default function TestPage() {
  const [answers, setAnswers] = useState<string[]>(new Array(questions.length).fill(''));
  const testDurationSeconds = parseInt(process.env.NEXT_PUBLIC_TEST_DURATION_MINUTES || '10') * 60;
  const [timeLeft, setTimeLeft] = useState(testDurationSeconds);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showPasteAlert, setShowPasteAlert] = useState(false);
  const [devToolsOpen, setDevToolsOpen] = useState(false);
  const [showTimeExpired, setShowTimeExpired] = useState(false);
  const [aiDetectionResults, setAiDetectionResults] = useState<any[]>([]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { recordKeyEvent, analyzeTyping, reset } = useTypingAnalysis();

  const token = searchParams.get('token');
  const [dni, setDniState] = useState<string | null>(null);
  const [name, setNameState] = useState<string | null>(null);
  const [tokenValidated, setTokenValidated] = useState(false);

  // Validar token al cargar
  useEffect(() => {
    if (!token) {
      router.push('/');
      return;
    }

    const validateToken = async () => {
      try {
        const response = await fetch('/api/validate-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });

        const result = await response.json();
        
        if (result.success) {
          setDniState(result.data.dni);
          setNameState(result.data.name);
          setTokenValidated(true);
        } else {
          router.push('/');
          return;
        }
      } catch (error) {
        router.push('/');
        return;
      }
    };

    validateToken();
  }, [token, router]);

  useEffect(() => {
    if (!tokenValidated || !dni || !name) {
      return;
    }

    // Cargar respuestas guardadas
    const savedAnswers = localStorage.getItem(`test_answers_${dni}`);
    if (savedAnswers) {
      try {
        const parsedAnswers = JSON.parse(savedAnswers);
        if (Array.isArray(parsedAnswers) && parsedAnswers.length === questions.length) {
          setAnswers(parsedAnswers);
        }
      } catch (error) {
        console.error('Error loading saved answers:', error);
      }
    }

    // Inicializar sesión
    const initSession = async () => {
      try {
        const response = await fetch('/api/test-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dni, action: 'start' })
        });
        
        const result = await response.json();
        if (result.success) {
          setSessionId(result.sessionId);
          setTimeLeft(result.timeRemaining);
          
          if (result.timeRemaining === 0) {
            handleSubmit(true);
            return;
          }
          
          // Iniciar timer solo después de obtener sessionId
          const timer = setInterval(async () => {
            try {
              const checkResponse = await fetch('/api/test-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: result.sessionId, action: 'check' })
              });
              
              const checkResult = await checkResponse.json();
              if (checkResult.success) {
                setTimeLeft(checkResult.timeRemaining);
                
                if (checkResult.timeRemaining === 0 || checkResult.completed) {
                  clearInterval(timer);
                  handleSubmit(true);
                }
              }
            } catch (error) {
              console.error('Error verificando sesión:', error);
            }
          }, 1000);
          
          // Cleanup function para el timer
          return () => clearInterval(timer);
        }
      } catch (error) {
        console.error('Error iniciando sesión:', error);
      }
    };

    initSession();
  }, [dni, name, router, tokenValidated]);

  useEffect(() => {
    if (!sessionId) return;

    const timer = setInterval(async () => {
      try {
        const response = await fetch('/api/test-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, action: 'check' })
        });
        
        const result = await response.json();
        if (result.success) {
          setTimeLeft(result.timeRemaining);
          
          if (result.timeRemaining === 0 || result.completed) {
            handleSubmit(true);
          }
        }
      } catch (error) {
        console.error('Error verificando sesión:', error);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [sessionId]);





  useEffect(() => {
    // Solo detectar herramientas de desarrollador si está habilitado
    if (process.env.NEXT_PUBLIC_ENABLE_DEVTOOLS_DETECTION !== 'true') {
      return;
    }

    const detectDevTools = () => {
      const threshold = 160;
      if (window.outerHeight - window.innerHeight > threshold || 
          window.outerWidth - window.innerWidth > threshold) {
        setDevToolsOpen(true);
      } else {
        setDevToolsOpen(false);
      }
    };

    const interval = setInterval(detectDevTools, 1000);
    window.addEventListener('resize', detectDevTools);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', detectDevTools);
    };
  }, []);



  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerChange = async (index: number, value: string) => {
    if (value.length > 200) return;
    const newAnswers = [...answers];
    newAnswers[index] = value;
    setAnswers(newAnswers);
    
    // Guardar en localStorage
    if (dni) {
      localStorage.setItem(`test_answers_${dni}`, JSON.stringify(newAnswers));
    }
    
    // Análisis de IA silencioso (sin mostrar al postulante)
    if (value.trim().length > 10) {
      try {
        const response = await fetch('/api/detect-ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: value })
        });
        
        const result = await response.json();
        
        const newResults = [...aiDetectionResults];
        newResults[index] = {
          ...result,
          typingAnalysis: analyzeTyping(value)
        };
        setAiDetectionResults(newResults);
      } catch (error) {
        // Error silencioso
      }
    } else {
      const newResults = [...aiDetectionResults];
      newResults[index] = {
        aiProbability: 0,
        confidence: 'low',
        details: { finalScore: 0 },
        typingAnalysis: analyzeTyping(value)
      };
      setAiDetectionResults(newResults);
    }
    
    // Detectar IA si la respuesta tiene contenido
    if (value.trim().length > 10) {
      try {
        const response = await fetch('/api/detect-ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: value })
        });
        
        const result = await response.json();
        
        const newResults = [...aiDetectionResults];
        newResults[index] = {
          ...result,
          typingAnalysis: analyzeTyping(value)
        };
        setAiDetectionResults(newResults);
      } catch (error) {
        // Error detectando IA
      }
    } else {
      // Respuesta muy corta o vacía
      const newResults = [...aiDetectionResults];
      newResults[index] = {
        aiProbability: 0,
        confidence: 'low',
        details: { finalScore: 0 },
        typingAnalysis: analyzeTyping(value)
      };
      setAiDetectionResults(newResults);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    setShowPasteAlert(true);
    setTimeout(() => setShowPasteAlert(false), 3000);
  };

  const handleSubmit = async (timeExpired = false) => {

    
    if (timeExpired) {

      
      // Verificar si hay respuestas en localStorage
      const savedAnswers = localStorage.getItem(`test_answers_${dni}`);
      let finalAnswers = answers;
      
      if (savedAnswers) {
        try {
          const parsedSaved = JSON.parse(savedAnswers);

          finalAnswers = parsedSaved;
        } catch (error) {
          console.error('Error parsing saved answers:', error);
        }
      }
      

      
      // Enviar respuestas ANTES de mostrar el popup
      const submitData = {
        dni,
        name,
        answers: finalAnswers,
        timeExpired: true,
        completionTime: testDurationSeconds - timeLeft,
        sessionId,
        aiDetectionResults
      };
      

      
      try {
        const response = await fetch('/api/submit-test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submitData)
        });
        
        const result = await response.json();

        
        if (result.success) {
          // Limpiar localStorage solo si se guardó exitosamente
          localStorage.removeItem(`test_answers_${dni}`);
        } else {
          console.error('Submit failed:', result.error);
        }
      } catch (error) {
        console.error('Error submitting expired test:', error);
      }
      
      // Mostrar popup DESPUÉS de enviar
      setShowTimeExpired(true);
      
      setTimeout(() => {
        router.push('/');
      }, 5000);
      return;
    }
    
    if (!timeExpired) {
      const allFilled = answers.every(answer => answer.trim().length > 0);
      if (!allFilled) {
        setError('Debe completar todas las respuestas antes de enviar.');
        return;
      }

      if (!showConfirm) {
        setError('');
        setShowConfirm(true);
        return;
      }
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/submit-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dni,
          name,
          answers,
          timeExpired,
          completionTime: testDurationSeconds - timeLeft,
          sessionId,
          aiDetectionResults
        })
      });

      const result = await response.json();

      if (result.success) {
        // Limpiar respuestas guardadas al enviar exitosamente
        localStorage.removeItem(`test_answers_${dni}`);
        router.push(`/completed?dni=${dni}&name=${encodeURIComponent(name!)}`);
      } else {
        setError(result.error || 'Error al enviar las respuestas');
        setSubmitting(false);
      }
    } catch (error) {
      console.error('Error submitting:', error);
      setError('Error al enviar las respuestas. Intente nuevamente.');
      setSubmitting(false);
    }
  };


  
  if (!tokenValidated || !dni || !name) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Validando acceso...</div>
      </div>
    );
  }
  

  
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Test de Conocimiento</h1>
            <p className="text-gray-600">Postulante: {decodeURIComponent(name || '')}</p>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-mono ${timeLeft < (testDurationSeconds * 0.2) ? 'text-red-600' : 'text-gray-900'}`}>
              {formatTime(timeLeft)}
            </div>
            <p className="text-sm text-gray-500">Tiempo restante</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 pt-8">
        <div className="space-y-8">
          {questions.map((question, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Pregunta {index + 1}
              </h3>
              <p className="text-gray-700 mb-4">{question}</p>
              <textarea
                value={answers[index]}
                onChange={(e) => handleAnswerChange(index, e.target.value)}
                onPaste={handlePaste}
                onKeyDown={(e) => recordKeyEvent(e.key, 'keydown')}
                onKeyUp={(e) => recordKeyEvent(e.key, 'keyup')}
                onKeyDown={(e) => recordKeyEvent(e.key, 'keydown')}
                onKeyUp={(e) => recordKeyEvent(e.key, 'keyup')}
                className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent no-paste"
                placeholder="Escriba su respuesta aquí... (máx. 200 caracteres)"
                disabled={submitting}
                data-no-copy="true"
                maxLength={200}
              />
            </div>
          ))}
        </div>

        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          </div>
        )}

        <div className="mt-8 flex justify-center">
          <button
            onClick={() => handleSubmit()}
            disabled={submitting}
            className="bg-primary-600 text-white px-8 py-3 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {submitting ? 'Enviando...' : 'Enviar Respuestas'}
          </button>
        </div>
      </main>

      {devToolsOpen && (
        <div className="fixed inset-0 bg-red-600 text-white flex items-center justify-center z-50">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">⚠️ Herramientas de desarrollador detectadas</h2>
            <p>Cierre las herramientas de desarrollador para continuar</p>
          </div>
        </div>
      )}

      {showTimeExpired && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full text-center">
            <div className="text-6xl mb-4">⏰</div>
            <h3 className="text-xl font-bold mb-4 text-gray-900">Tiempo vencido</h3>
            <p className="text-gray-600 mb-6">
              No te preocupes, las respuestas que llegaste a responder fueron guardadas.
            </p>
            <button
              onClick={() => router.push('/')}
              className="bg-primary-600 text-white px-6 py-3 rounded-md hover:bg-primary-700"
            >
              Volver al inicio
            </button>
          </div>
        </div>
      )}

      {showPasteAlert && (
        <div className="fixed top-4 right-4 bg-red-500 text-white px-6 py-4 rounded-lg shadow-lg z-50 animate-bounce">
          <div className="flex items-center space-x-2">
            <span>No está permitido pegar texto. Debe escribir sus respuestas</span>
            <span>🏴☠️</span>
          </div>
        </div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Confirmar envío</h3>
            <p className="text-gray-600 mb-6">
              ¿Está seguro de enviar sus respuestas? Una vez enviadas no podrá editarlas.
            </p>
            <div className="flex space-x-4">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleSubmit()}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );


}