
import { useState } from 'react';
import { MessageSquare, X, Send, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAnalytics } from '@/lib/analytics';
import { useToast } from '@/hooks/use-toast';
import { captureMessage } from '@sentry/react';

export function FeedbackWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [feedback, setFeedback] = useState('');
    const [sentiment, setSentiment] = useState<'positive' | 'negative' | null>(null);
    const { track } = useAnalytics();
    const { toast } = useToast();

    const handleSubmit = async () => {
        if (!feedback && !sentiment) return;

        // Track internally
        await track({
            eventName: 'user_feedback',
            eventType: 'feature_used',
            properties: { sentiment, feedback }
        });

        // Send to Sentry as User Feedback
        if (feedback) {
            captureMessage(`User Feedback: ${feedback}`, {
                level: 'info',
                tags: { sentiment: sentiment || 'neutral', source: 'feedback_widget' },
                extra: { feedback }
            });
        }

        toast({ title: "Gracias por tu opinión", description: "Es muy valiosa para mejorar el sistema." });
        setIsOpen(false);
        setFeedback('');
        setSentiment(null);
    };

    return (
        <div className="fixed bottom-4 right-4 z-50">
            {!isOpen && (
                <Button
                    onClick={() => setIsOpen(true)}
                    className="rounded-full h-12 w-12 shadow-lg"
                    variant="default"
                >
                    <MessageSquare className="h-6 w-6" />
                </Button>
            )}

            {isOpen && (
                <Card className="w-80 shadow-2xl animate-in slide-in-from-bottom-5 fade-in duration-300">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">Tu Opinión</CardTitle>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsOpen(false)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex justify-center gap-4">
                            <Button
                                variant={sentiment === 'positive' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setSentiment('positive')}
                                className={sentiment === 'positive' ? 'bg-green-600 hover:bg-green-700' : ''}
                            >
                                <ThumbsUp className="mr-2 h-4 w-4" /> Bien
                            </Button>
                            <Button
                                variant={sentiment === 'negative' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setSentiment('negative')}
                                className={sentiment === 'negative' ? 'bg-red-600 hover:bg-red-700' : ''}
                            >
                                <ThumbsDown className="mr-2 h-4 w-4" /> Mal
                            </Button>
                        </div>

                        <Textarea
                            placeholder="¿Qué podemos mejorar?"
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            className="resize-none h-24 text-sm"
                        />

                        <Button onClick={handleSubmit} className="w-full" size="sm">
                            <Send className="mr-2 h-3 w-3" /> Enviar
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
