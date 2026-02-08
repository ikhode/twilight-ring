/**
 * Validadores y utilidades para el cumplimiento de normativas en México
 * RFC, CURP y Protección de Datos Personales (LFPDPPP)
 */

/**
 * Regex para RFC (México)
 * Soporta Personas Morales (12 carac) y Personas Físicas (13 carac)
 */
export const RFC_REGEX = /^([A-ZÑ&]{3,4}) ?(?:- ?)?(\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])) ?(?:- ?)?([A-Z\d]{2})([A\d])$/;

/**
 * Regex para CURP (México)
 */
export const CURP_REGEX = /^[A-Z]{1}[AEIOU]{1}[A-Z]{2}[0-9]{2}(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])[HM][A-Z]{2}[B-DF-HJ-NP-TV-Z]{3}[A-Z0-9][0-9]$/;

/**
 * Validador de RFC sencillo
 */
export function isValidRFC(rfc: string): boolean {
    return RFC_REGEX.test(rfc.toUpperCase());
}

/**
 * Validador de CURP sencillo
 */
export function isValidCURP(curp: string): boolean {
    return CURP_REGEX.test(curp.toUpperCase());
}

/**
 * Enmascara datos personales sensibles (PII) para logs y auditoría
 * Cumplimiento con LFPDPPP
 */
export function maskPII(value: string | null | undefined, type: 'email' | 'phone' | 'name' | 'rfc'): string {
    if (!value) return '';

    switch (type) {
        case 'email':
            const [local, domain] = value.split('@');
            if (!domain) return '***@***';
            return `${local.substring(0, 2)}***@${domain}`;
        case 'phone':
            return `***-***-${value.slice(-4)}`;
        case 'rfc':
        case 'name':
            return `${value.substring(0, 3)}***`;
        default:
            return '***';
    }
}

/**
 * Limpia un objeto de datos sensibles antes de loguear
 */
export function sanitizeForLog(data: any): any {
    const sensitiveKeys = ['password', 'token', 'secret', 'rfc', 'curp', 'nss', 'faceEmbedding'];
    const sanitized = { ...data };

    for (const key of Object.keys(sanitized)) {
        if (sensitiveKeys.some(s => key.toLowerCase().includes(s))) {
            sanitized[key] = '***MASKED***';
        } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
            sanitized[key] = sanitizeForLog(sanitized[key]);
        }
    }

    return sanitized;
}
