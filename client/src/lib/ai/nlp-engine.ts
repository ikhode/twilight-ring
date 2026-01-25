import * as qna from '@tensorflow-models/qna';
import * as use from '@tensorflow-models/universal-sentence-encoder';
import * as tf from '@tensorflow/tfjs';
import { create } from 'zustand';

interface Answer {
    text: string;
    startIndex: number;
    endIndex: number;
    score: number;
}

export interface SemanticMatch {
    text: string;
    score: number;
}

interface NLPEngineState {
    // QnA (BERT)
    qnaModel: qna.QuestionAndAnswer | null;
    isQnALoading: boolean;
    loadQnAModel: () => Promise<void>;
    findAnswer: (context: string, question: string) => Promise<Answer[]>;

    // Semantic (USE)
    useModel: use.UniversalSentenceEncoder | null;
    isUSELoading: boolean;
    loadUSEModel: () => Promise<void>;
    findSemanticMatches: (query: string, candidates: string[]) => Promise<SemanticMatch[]>;
}

export const useNLPEngine = create<NLPEngineState>((set, get) => ({
    // --- BERT QnA ---
    qnaModel: null,
    isQnALoading: false,

    loadQnAModel: async () => {
        if (get().qnaModel || get().isQnALoading) return;

        set({ isQnALoading: true });
        try {
            console.log("🧠 Loading BERT Model...");
            const loadedModel = await qna.load();
            set({ qnaModel: loadedModel, isQnALoading: false });
            console.log("🧠 BERT Model Loaded!");
        } catch (error) {
            console.error("Failed to load QnA model:", error);
            set({ isQnALoading: false });
        }
    },

    findAnswer: async (context, question) => {
        const { qnaModel, loadQnAModel } = get();
        if (!qnaModel) { await loadQnAModel(); }

        const activeModel = get().qnaModel;
        if (!activeModel) return [];

        try {
            console.log("🤔 Analying question with BERT:", question);
            const answers = await activeModel.findAnswers(question, context);
            return answers.filter(a => a.score > 1) as Answer[];
        } catch (error) {
            console.error("NLP Inference Error:", error);
            return [];
        }
    },

    // --- Semantic Search (USE) ---
    useModel: null,
    isUSELoading: false,

    loadUSEModel: async () => {
        if (get().useModel || get().isUSELoading) return;

        set({ isUSELoading: true });
        try {
            console.log("🧠 Loading Universal Sentence Encoder...");
            const loadedModel = await use.load();
            set({ useModel: loadedModel, isUSELoading: false });
            console.log("🧠 USE Model Loaded!");
        } catch (error) {
            console.error("Failed to load USE model:", error);
            set({ isUSELoading: false });
        }
    },

    findSemanticMatches: async (query, candidates) => {
        const { useModel, loadUSEModel } = get();
        if (!useModel) { await loadUSEModel(); }

        const activeModel = get().useModel;
        if (!activeModel || candidates.length === 0) return [];

        try {
            // Embed query and candidates
            const embeddings = await activeModel.embed([query, ...candidates]);

            // Calculate cosine similarity (Dot product of normalized vectors)
            // embeddings shape: [1 + candidates.length, 512]
            const queryEmbedding = embeddings.slice([0, 0], [1]); // [1, 512]
            const candidateEmbeddings = embeddings.slice([1, 0], [candidates.length]); // [N, 512]

            // TFJS matrix multiplication for similarity
            const scores = tf.matMul(candidateEmbeddings, queryEmbedding, false, true).dataSync();

            // Combine with text and sort
            const results = candidates.map((text, i) => ({
                text,
                score: scores[i]
            }));

            // Memory cleanup (important for TFJS w/ WebGL)
            embeddings.dispose();
            queryEmbedding.dispose();
            candidateEmbeddings.dispose();

            return results.sort((a, b) => b.score - a.score);
        } catch (error) {
            console.error("Semantic Search Error:", error);
            return [];
        }
    }
}));
