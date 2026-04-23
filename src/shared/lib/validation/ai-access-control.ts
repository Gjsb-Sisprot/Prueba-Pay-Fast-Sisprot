/**
 * Control de acceso para funcionalidades de IA
 * 
 * Gestiona quién puede acceder al asistente IA basándose en su cédula.
 * 
 * @module shared/lib/validation/ai-access-control
 */

const AUTHORIZED_IDENTIFICATIONS = Object.freeze([
  "12339072", //Elisaul
  "28458411", //Freddy
  "25066218", //Yhossellyn
  "30800722", //Paola
  "15864394", //Thais
  "14943068", //Robert
  "27434628", //Diego
  "29808275", // Bryant
  "18221823", // Sandy
  "27434622", // Derwing
] as const);

/**
 * Normaliza una cédula eliminando el tipo de documento y espacios
 * 
 * @param identification - Cédula con o sin tipo de documento (ej: "V-12345678" o "12345678")
 * @returns Cédula normalizada sin tipo de documento ni espacios
 * 
 * @example
 * normalizeIdentification("V-12339072") // "12339072"
 * normalizeIdentification("v12339072")  // "12339072"
 * normalizeIdentification("12339072")   // "12339072"
 * normalizeIdentification("J-28458411") // "28458411"
 * normalizeIdentification("E28458411")  // "28458411"
 */
function normalizeIdentification(identification: string): string {
  // Eliminar espacios, guiones y convertir a mayúsculas
  const cleaned = identification.replace(/[\s-]/g, '').toUpperCase();
  
  // Eliminar el tipo de documento (V, E, J) si está presente al inicio
  const withoutDocType = cleaned.replace(/^[VEJ]/i, '');
  
  return withoutDocType;
}

/**
 * Verifica si una cédula tiene acceso al asistente IA
 * 
 * @param identification - Cédula del usuario (puede incluir tipo de documento)
 * @returns `true` si la cédula está autorizada, `false` en caso contrario
 * 
 * @example
 * canAccessAIAssistant("V-12339072")    // true
 * canAccessAIAssistant("v12339072")     // true
 * canAccessAIAssistant("12339072")      // true
 * canAccessAIAssistant("J28458411")     // true
 * canAccessAIAssistant("E-28458411")    // true
 * canAccessAIAssistant("V-99999999")    // false
 * canAccessAIAssistant("")              // false
 * canAccessAIAssistant(null)            // false
 * canAccessAIAssistant(undefined)       // false
 */
export function canAccessAIAssistant(identification: string | null | undefined): boolean {
  // Validar entrada
  if (!identification || typeof identification !== 'string') {
    return false;
  }

  // Normalizar la cédula recibida
  const normalizedInput = normalizeIdentification(identification);

  // Verificar si está en la lista de autorizados
  return AUTHORIZED_IDENTIFICATIONS.includes(normalizedInput as typeof AUTHORIZED_IDENTIFICATIONS[number]);
}

/**
 * Obtiene la lista de cédulas autorizadas (solo para debugging en desarrollo)
 * 
 * @returns Array de cédulas autorizadas (sin tipo de documento)
 * @deprecated Solo para uso en desarrollo, no usar en producción
 */
export function getAuthorizedIdentificationsDebug(): readonly string[] {
  if (process.env.NODE_ENV !== 'development') {
    console.warn('[AI Access Control] getAuthorizedIdentificationsDebug() no debe usarse en producción');
  }
  return AUTHORIZED_IDENTIFICATIONS;
}
