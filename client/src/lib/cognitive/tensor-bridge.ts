import * as tf from '@tensorflow/tfjs';
import { create } from 'zustand';

// Define the shape of our Tensor State
interface TensorState {
    sales: tf.Tensor2D | null;
    inventory: tf.Tensor2D | null;
    hr: tf.Tensor2D | null;

    // Actions to update tensors (usually called by data hooks)
    setSalesTensor: (data: number[][]) => void;
    setInventoryTensor: (data: number[][]) => void;
    setHRTensor: (data: number[][]) => void;

    // Utility to dispose to avoid memory leaks
    disposeAll: () => void;
}

export const useTensorBridge = create<TensorState>((set, get) => ({
    sales: null,
    inventory: null,
    hr: null,

    setSalesTensor: (data) => {
        const old = get().sales;
        if (old) old.dispose();

        try {
            // Check if data is valid for tensor creation
            if (!data || data.length === 0) {
                set({ sales: null });
                return;
            }
            set({ sales: tf.tensor2d(data) });
        } catch (e) {
            console.error("Failed to tensorize sales data", e);
        }
    },

    setInventoryTensor: (data) => {
        const old = get().inventory;
        if (old) old.dispose();

        try {
            if (!data || data.length === 0) {
                set({ inventory: null });
                return;
            }
            set({ inventory: tf.tensor2d(data) });
        } catch (e) {
            console.error("Failed to tensorize inventory data", e);
        }
    },

    setHRTensor: (data) => {
        const old = get().hr;
        if (old) old.dispose();

        try {
            if (!data || data.length === 0) {
                set({ hr: null });
                return;
            }
            set({ hr: tf.tensor2d(data) });
        } catch (e) {
            console.error("Failed to tensorize HR data", e);
        }
    },

    disposeAll: () => {
        get().sales?.dispose();
        get().inventory?.dispose();
        get().hr?.dispose();
        set({ sales: null, inventory: null, hr: null });
    }
}));
