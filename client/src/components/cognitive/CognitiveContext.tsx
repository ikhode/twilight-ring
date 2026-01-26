import * as React from "react";
import { useNLPEngine } from "@/lib/ai/nlp-engine";

interface Diagnostic {
    id: string;
    message: string;
    type: 'warning' | 'error' | 'info';
    source: string;
    fieldId?: string;
}

interface Prediction {
    fieldId: string;
    value: string;
    confidence: number;
    reason?: string;
}

interface CognitiveContextType {
    diagnostics: Diagnostic[];
    isAnalyzingForm: boolean;
    registerDiagnostic: (d: Diagnostic) => void;
    unregisterDiagnostic: (id: string) => void;

    // Predictive Filling
    values: Record<string, any>;
    predictions: Record<string, Prediction>;
    setValue: (id: string, val: any, semanticType?: string) => void;
    acceptPrediction: (fieldId: string) => void;

    // Holistic Audit
    requestHolisticDiagnostic: () => Promise<void>;
}

const CognitiveContext = React.createContext<CognitiveContextType | undefined>(undefined);

export function CognitiveProvider({ children }: { children: React.ReactNode }) {
    const [diagnostics, setDiagnostics] = React.useState<Diagnostic[]>([]);
    const [isAnalyzingForm, setIsAnalyzingForm] = React.useState(false);
    const [values, setValues] = React.useState<Record<string, any>>({});
    const [predictions, setPredictions] = React.useState<Record<string, Prediction>>({});
    const { findSemanticMatches, isUSELoading } = useNLPEngine();

    const registerDiagnostic = React.useCallback((d: Diagnostic) => {
        setDiagnostics(prev => {
            const exists = prev.find(item => item.id === d.id);
            if (exists) {
                if (exists.message === d.message && exists.type === d.type) return prev;
                return prev.map(item => item.id === d.id ? d : item);
            }
            return [...prev, d];
        });
    }, []);

    const unregisterDiagnostic = React.useCallback((id: string) => {
        setDiagnostics(prev => prev.filter(d => d.id !== id));
    }, []);

    const setValue = React.useCallback((id: string, val: any, semanticType?: string) => {
        setValues(prev => {
            if (prev[id] === val) return prev;
            return { ...prev, [id]: val };
        });
    }, []);

    const acceptPrediction = React.useCallback((fieldId: string) => {
        setPredictions(prev => {
            const newPreds = { ...prev };
            delete newPreds[fieldId];
            return newPreds;
        });
    }, []);

    const requestHolisticDiagnostic = React.useCallback(async () => {
        if (isUSELoading || isAnalyzingForm) return;

        setIsAnalyzingForm(true);
        // Simulate LLM Processing Delay for "Weight" and Perception
        await new Promise(r => setTimeout(r, 1200));

        const newDiagnostics: Diagnostic[] = [];
        const name = values['name'] || values['id-name'] || '';
        const category = values['category'] || '';
        const price = parseFloat(values['price'] || '0');
        const cost = parseFloat(values['cost'] || '0');

        // 1. Cross-Field Consistency Check (The "LLM" Logic)
        if (name && category) {
            const matches = await findSemanticMatches(name, [category]);
            if (matches[0] && matches[0].score < 0.45) {
                newDiagnostics.push({
                    id: 'holistic-category-mismatch',
                    message: `Discrepancia detectada: La descripción "${name}" no parece alinearse con la categoría "${category}".`,
                    type: 'warning',
                    source: 'Auditoría Holística',
                    fieldId: 'category'
                });
            }
        }

        if (price > 0 && cost > 0 && price < cost) {
            newDiagnostics.push({
                id: 'holistic-financial-error',
                message: `Inconsistencia Financiera: El precio de venta es menor al costo de adquisición. Transacción no rentable.`,
                type: 'error',
                source: 'Auditoría Financiera',
                fieldId: 'price'
            });
        }

        if (name.length > 0 && name.length < 5) {
            newDiagnostics.push({
                id: 'holistic-name-short',
                message: `Identificación ambigua: El nombre es demasiado corto para una indexación efectiva.`,
                type: 'info',
                source: 'Control de Calidad',
                fieldId: 'name'
            });
        }

        // Apply new diagnostics (clearing previous holistic ones)
        setDiagnostics(prev => [
            ...prev.filter(d => !d.id.startsWith('holistic-')),
            ...newDiagnostics
        ]);

        setIsAnalyzingForm(false);
    }, [values, isUSELoading, isAnalyzingForm, findSemanticMatches]);

    // Auto-trigger on activity timeout (2 seconds without changes)
    React.useEffect(() => {
        if (Object.keys(values).length === 0) return;

        const timer = setTimeout(() => {
            requestHolisticDiagnostic();
        }, 2500);

        return () => clearTimeout(timer);
    }, [values, requestHolisticDiagnostic]);

    const contextValue = React.useMemo(() => ({
        diagnostics,
        isAnalyzingForm,
        registerDiagnostic,
        unregisterDiagnostic,
        values,
        predictions,
        setValue,
        acceptPrediction,
        requestHolisticDiagnostic
    }), [diagnostics, isAnalyzingForm, registerDiagnostic, unregisterDiagnostic, values, predictions, setValue, acceptPrediction, requestHolisticDiagnostic]);

    return (
        <CognitiveContext.Provider value={contextValue}>
            {children}
        </CognitiveContext.Provider>
    );
}

export function useCognitiveDiagnostics() {
    const context = React.useContext(CognitiveContext);
    return context;
}
