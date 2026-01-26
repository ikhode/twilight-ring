/**
 * Module Recommender Service - LOCAL SEMANTIC ENGINE
 * Matches user requirements to system modules using local heuristics.
 */
export class ModuleRecommender {

    /**
     * Recommend modules based on user description - 100% Local Logic
     */
    async recommendModules(description: string, allModules: any[]): Promise<string[]> {
        // Use deterministic local keyword matching
        return this.keywordMatching(description, allModules);
    }

    private keywordMatching(query: string, allModules: any[]): string[] {
        // Simple "tensor-like" weighing
        const stopWords = ['de', 'el', 'la', 'los', 'las', 'un', 'una', 'y', 'o', 'para', 'en', 'con', 'necesito', 'quiero', 'sistema', 'modulo', 'software'];
        const cleanQuery = query.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(w => !stopWords.includes(w) && w.length > 2);

        // Semantic Map ("Lightweight Embedding")
        const semanticMap: Record<string, string[]> = {
            'dinero': ['finance', 'purchases'],
            'plata': ['finance', 'sales'],
            'pagos': ['finance', 'payroll'],
            'cobrar': ['sales', 'finance'],
            'vender': ['sales', 'pos', 'kiosk'],
            'cliente': ['crm', 'sales'],
            'empleado': ['hr', 'employees', 'payroll'],
            'personal': ['hr', 'employees'],
            'bodega': ['inventory', 'logistics'],
            'almacen': ['inventory'],
            'envio': ['logistics'],
            'camion': ['logistics'],
            'ruta': ['logistics'],
            'maquina': ['production', 'maintenance'],
            'fabrica': ['production'],
            'turno': ['production', 'hr'],
            'calidad': ['qa', 'production'],
            'nomina': ['payroll', 'hr'],
            'sueldo': ['payroll'],
            'asistencia': ['time_tracking', 'hr'],
            'documento': ['documents'],
            'archivo': ['documents'],
            'firma': ['documents'],
            'ticket': ['tickets', 'crm'],
            'soporte': ['tickets'],
            'ayuda': ['tickets']
        };

        const scores = new Map<string, number>();

        allModules.forEach(module => {
            let score = 0;
            const text = `${module.name} ${module.description} ${module.longDescription || ''} ${(module.tags || []).join(' ')}`.toLowerCase();

            cleanQuery.forEach(term => {
                // Direct Match
                if (text.includes(term)) score += 3;

                // Semantic Match
                if (semanticMap[term] && semanticMap[term].includes(module.id)) score += 5;

                // Fuzzy / Partial
                if (module.id.includes(term)) score += 4;
            });

            if (score > 0) {
                scores.set(module.id, score);
            }
        });

        // Debug fallback
        if (scores.size === 0) {
            console.log("[Recommender] No matches found for:", cleanQuery);
        }

        // Sort by score desc
        return Array.from(scores.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([id]) => id);
    }
}

export const moduleRecommender = new ModuleRecommender();
