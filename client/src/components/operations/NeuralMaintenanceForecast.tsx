import { useEffect, useState } from "react";
import * as tf from "@tensorflow/tfjs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Brain, TrendingUp, AlertTriangle } from "lucide-react";
import { useTensorBridge } from "@/lib/cognitive/tensor-bridge";

/**
 * Component that uses TensorFlow.js to forecast maintenance needs based on local or tensor data.
 * Currently uses a mock model for demonstration.
 * @returns {JSX.Element} The rendered card component.
 */
export function NeuralMaintenanceForecast() {
    const [prediction, setPrediction] = useState<number | null>(null);
    const [training, setTraining] = useState(true);

    // Consume Global Tensor State (Future use)
    // const tensorBridge = useTensorBridge();

    useEffect(() => {
        /**
         * Runs the TensorFlow model to generate a prediction.
         */
        async function runModel() {
            setTraining(true);

            // If we have global tensor data, use it. Otherwise fall back to mock.
            // In a real app, 'inventory' tensor has [ItemId, Stock, Reorder].
            // We'll train a model to predict 'Reorder' based on 'Stock'.

            // Fallback training data (inventory not available in TensorState)
            const xs = tf.tensor2d([1, 2, 3, 4, 5], [5, 1]);
            const ys = tf.tensor2d([5, 6, 5, 7, 8], [5, 1]);

            // Define Model
            const model = tf.sequential();
            model.add(tf.layers.dense({ units: 1, inputShape: [1] }));
            model.compile({ loss: 'meanSquaredError', optimizer: 'sgd' });

            // Train
            await model.fit(xs, ys, { epochs: 50 });

            // Predict
            const output = model.predict(tf.tensor2d([6], [1, 1])) as tf.Tensor;
            const predictedValue = (await output.data())[0];

            setPrediction(Math.round(predictedValue));
            setTraining(false);

            // Only dispose if we created them locally (which is always the case now)
            xs.dispose();
            ys.dispose();
            output.dispose();
        }

        void runModel();
    }, []); // Removed 'inventory' from dependency array as it's not defined.

    return (
        <Card className="border-purple-500/20 bg-purple-500/5">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Brain className={`w-5 h-5 text-purple-500 ${training ? 'animate-pulse' : ''} `} />
                        <CardTitle className="text-base">Neural Forecast</CardTitle>
                    </div>
                    {prediction !== null && (
                        <div className="text-xs font-mono text-purple-400">
                            TENSOR: LOCAL
                        </div>
                    )}
                </div>
                <CardDescription>Predicción basada en Datos Locales</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-end justify-between">
                    <div>
                        {training ? (
                            <span className="text-2xl font-bold text-muted-foreground animate-pulse">Thinking...</span>
                        ) : (
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-bold text-white">{prediction}</span>
                                <span className="text-sm text-muted-foreground">unidades</span>
                            </div>
                        )}
                    </div>

                    {!training && (
                        <div className="flex flex-col items-end gap-1">
                            <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase flex items-center gap-1 ${prediction && prediction > 10 ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'} `}>
                                {prediction && prediction > 10 ? <AlertTriangle className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                                {prediction && prediction > 10 ? "CRITICAL" : "OPTIMAL"}
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
