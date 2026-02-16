/**
 * Nexus ERP Fiscal Validation - SAT (Mexico)
 */

/**
 * Validates a Mexican RFC (Registro Federal de Contribuyentes).
 * Supports both Persons (13 chars) and Companies (12 chars).
 */
export function validateRFC(rfc: string): boolean {
    if (!rfc) return false;
    const cleanRFC = rfc.trim().toUpperCase();

    // Generic Foreign RFC
    if (cleanRFC === 'XEXX010101000') return true;
    // Generic National RFC
    if (cleanRFC === 'XAXX010101000') return true;

    const personaMoralRegex = /^[A-Z&Ñ]{3}[0-9]{2}(0[1-9]|1[012])(0[1-9]|[12][0-9]|3[01])[A-Z0-9]{3}$/;
    const personaFisicaRegex = /^[A-Z&Ñ]{4}[0-9]{2}(0[1-9]|1[012])(0[1-9]|[12][0-9]|3[01])[A-Z0-9]{3}$/;

    return personaMoralRegex.test(cleanRFC) || personaFisicaRegex.test(cleanRFC);
}

/**
 * Validates a Mexican Zip Code (Codigo Postal).
 */
export function validateZipCode(zip: string): boolean {
    return /^[0-9]{5}$/.test(zip);
}
