import { create } from 'zustand';

interface RestrictionInfo {
    status: 'suspended' | 'banned';
    reason: string | null;
    expiresAt: string | null;
}

interface RestrictionStore {
    restriction: RestrictionInfo | null;
    setRestriction: (info: RestrictionInfo | null) => void;
}

export const useRestrictionStore = create<RestrictionStore>((set) => ({
    restriction: null,
    setRestriction: (info) => set({ restriction: info }),
}));