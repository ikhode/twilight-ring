import { create } from 'zustand';
import * as tf from '@tensorflow/tfjs';

export interface TensorState {
    salesTensor: tf.Tensor | null;
    inventoryTensor: tf.Tensor | null;
    purchasesTensor: tf.Tensor | null;

    setSalesTensor: (data: any[]) => void;
    setInventoryTensor: (data: any[]) => void;
    setPurchasesTensor: (data: any[]) => void;

    getTensor: (name: string) => tf.Tensor | null;
}

export const useTensorBridge = create<TensorState>((set, get) => ({
    salesTensor: null,
    inventoryTensor: null,
    purchasesTensor: null,

    setSalesTensor: (data) => {
        // Assume data is [Time, Value, ...]
        if (!data || data.length === 0) return;

        // Clean up old tensor
        const old = get().salesTensor;
        if (old) old.dispose();

        const tensor = tf.tensor2d(data);
        set({ salesTensor: tensor });
    },

    setInventoryTensor: (data) => {
        const old = get().inventoryTensor;
        if (old) old.dispose();

        const tensor = tf.tensor2d(data);
        set({ inventoryTensor: tensor });
    },

    setPurchasesTensor: (data) => {
        const old = get().purchasesTensor;
        if (old) old.dispose();

        const tensor = tf.tensor2d(data);
        set({ purchasesTensor: tensor });
    },

    getTensor: (name) => {
        const s = get();
        if (name === 'sales') return s.salesTensor;
        if (name === 'inventory') return s.inventoryTensor;
        if (name === 'purchases') return s.purchasesTensor;
        return null;
    }
}));

// Export a singleton-like access for non-hook usage if needed, 
// strictly speaking regular zustand usage is enough.
export const tensorBridge = {
    getState: useTensorBridge.getState,
    subscribe: useTensorBridge.subscribe
};
