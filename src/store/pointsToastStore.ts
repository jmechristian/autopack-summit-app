import { create } from 'zustand';

export type PointsToast = {
  id: number;
  delta: number;
  labels: string[];
};

type PointsToastState = {
  current: PointsToast | null;
  show: (delta: number, labels?: string[]) => void;
  dismiss: () => void;
};

let nextId = 1;

export const usePointsToastStore = create<PointsToastState>((set) => ({
  current: null,
  show: (delta, labels = []) => {
    if (delta <= 0) return;
    set({
      current: {
        id: nextId++,
        delta,
        labels: labels.filter(Boolean).slice(0, 2),
      },
    });
  },
  dismiss: () => set({ current: null }),
}));
