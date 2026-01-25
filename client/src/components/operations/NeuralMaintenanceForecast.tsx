import { useEffect, useState } from "react";
import * as tf from "@tensorflow/tfjs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Brain, TrendingUp, AlertTriangle } from "lucide-react";

export function NeuralMaintenanceForecast() {
    const [prediction, setPrediction] = useState<number | null>(null);
    const [training, setTraining] = useState(true);
    const [accuracy, setAccuracy] = useState<number>(0);

    // Mock Historical Data: Weeks (x) vs Maintenance Events (y)
    // Week 1: 5 events, Week 2: 6, Week 3: 5, Week 4: 7, Week 5: 8
    const data = {
        weeks: [1, 2, 3, 4, 5],
        events: [5, 6, 5, 7, 8]
    };

    useEffect(() => {
        async function runModel() {
            setTraining(true);

            // 1. Prepare Tensors
            const xs = tf.tensor2d(data.weeks, [5, 1]);
            const ys = tf.tensor2d(data.events, [5, 1]);

            // 2. Define Linear Regression Model
            const model = tf.sequential();
            model.add(tf.layers.dense({ units: 1, inputShape: [1] }));

            // 3. Compile
            model.compile({ loss: 'meanSquaredError', optimizer: 'sgd' });

            // 4. Train
            console.log("🧠 Training Neural Forecast Model...");
            await model.fit(xs, ys, { epochs: 250 }); // Fast training

            // 5. Predict Next Week (Week 6)
            const output = model.predict(tf.tensor2d([6], [1, 1])) as tf.Tensor;
            const predictedValue = (await output.data())[0];

            // 6. Cleanup
            xs.dispose();
            ys.dispose();
            output.dispose();

            setPrediction(Math.round(predictedValue));
            setAccuracy(0.85); // Simulated accuracy for UI
            setTraining(false);
            console.log("🧠 Forecast Complete:", predictedValue);
        }

        runModel();
    }, []);

    return (
        <Card className="border-purple-500/20 bg-purple-500/5">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Brain className={`w-5 h-5 text-purple-500 ${training ? 'animate-pulse' : ''}`} />
                        <CardTitle className="text-base">Neural Forecast</CardTitle>
                    </div>
                    {prediction !== null && (
                        <div className="text-xs font-mono text-purple-400">
                            TFJS v4.0
                        </div>
                    )}
                </div>
                <CardDescription>Predicción de carga de mantenimiento (Semana 6)</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-end justify-between">
                    <div>
                        {training ? (
                            <span className="text-2xl font-bold text-muted-foreground animate-pulse">Thinking...</span>
                        ) : (
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-bold text-white">{prediction}</span>
                                <span className="text-sm text-muted-foreground">eventos esperados</span>
                            </div>
                        )}
                    </div>

                    {!training && (
                        <div className="flex flex-col items-end gap-1">
                            <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase flex items-center gap-1 ${prediction && prediction > 7 ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                                {prediction && prediction > 7 ? <AlertTriangle className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                                {prediction && prediction > 7 ? "High Load" : "Stable"}
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
