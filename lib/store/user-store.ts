import { create } from 'zustand';
import { User as FirebaseUser } from 'firebase/auth';
import { User as DbUser } from '@/types/schema';

interface UserState {
    user: FirebaseUser | null;
    dbUser: DbUser | null;
    isLoading: boolean;
    setUser: (user: FirebaseUser | null, dbUser: DbUser | null) => void;
    setLoading: (isLoading: boolean) => void;
    logout: () => void;
}

export const useUserStore = create<UserState>((set) => ({
    user: null,
    dbUser: null,
    isLoading: true,
    setUser: (user, dbUser) => set({ user, dbUser, isLoading: false }),
    setLoading: (isLoading) => set({ isLoading }),
    logout: () => set({ user: null, dbUser: null, isLoading: false }),
}));
