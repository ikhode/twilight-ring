import { es } from './es';

/**
 * Hook para usar traducciones en español
 * Uso: const t = useTranslation();
 *      <p>{t.common.loading}</p>
 */
export function useTranslation() {
    return es;
}

/**
 * Función helper para traducir
 * Uso directo sin hook
 */
export const t = es;
