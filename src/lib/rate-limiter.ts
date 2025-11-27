// Rate limiter en memoria para prevenir DoS
const ipRequests = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(ip: string): { allowed: boolean; resetTime?: number } {
  const maxRequests = parseInt(process.env.RATE_LIMIT_REQUESTS || '10');
  const windowMinutes = parseInt(process.env.RATE_LIMIT_WINDOW_MINUTES || '5');
  const windowMs = windowMinutes * 60 * 1000;
  const now = Date.now();

  // Limpiar entradas expiradas
  Array.from(ipRequests.entries()).forEach(([key, value]) => {
    if (now > value.resetTime) {
      ipRequests.delete(key);
    }
  });

  const current = ipRequests.get(ip);
  
  if (!current) {
    // Primera request de esta IP
    ipRequests.set(ip, { count: 1, resetTime: now + windowMs });
    return { allowed: true };
  }

  if (now > current.resetTime) {
    // Ventana expirada, resetear
    ipRequests.set(ip, { count: 1, resetTime: now + windowMs });
    return { allowed: true };
  }

  if (current.count >= maxRequests) {
    // Límite superado
    return { allowed: false, resetTime: current.resetTime };
  }

  // Incrementar contador
  current.count++;
  return { allowed: true };
}

// Caché para DNIs que ya superaron el límite de intentos
const blockedDnis = new Map<string, number>();

export function checkDniBlocked(dni: string): boolean {
  const blockedUntil = blockedDnis.get(dni);
  if (!blockedUntil) return false;
  
  if (Date.now() > blockedUntil) {
    blockedDnis.delete(dni);
    return false;
  }
  
  return true;
}

export function blockDni(dni: string, durationMinutes: number = 60): void {
  const blockedUntil = Date.now() + (durationMinutes * 60 * 1000);
  blockedDnis.set(dni, blockedUntil);
}