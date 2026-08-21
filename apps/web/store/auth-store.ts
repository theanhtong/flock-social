'use client';

import { create } from 'zustand';
import { toast } from 'sonner';
import { apiClient, ApiError } from '@/lib/api-client';

export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  isVerified?: boolean;
  role?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isLoginModalOpen: boolean;
  isRegisterModalOpen: boolean;
  isGoogleModalOpen: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setIsLoading: (loading: boolean) => void;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  openRegisterModal: () => void;
  closeRegisterModal: () => void;
  openGoogleModal: () => void;
  closeGoogleModal: () => void;
  closeAllModals: () => void;
  
  // API Async Actions
  initAuth: () => Promise<void>;
  login: (credentials: { identifier: string; password: string }) => Promise<void>;
  register: (data: { username: string; email: string; password: string; displayName: string }) => Promise<void>;
  sendVerification: (email: string) => Promise<void>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  googleAuth: (idToken: string, userInfo?: any) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  isLoginModalOpen: false,
  isRegisterModalOpen: false,
  isGoogleModalOpen: false,

  setUser: (user) => set({ user }),
  setToken: (token) => set({ token }),
  setIsLoading: (isLoading) => set({ isLoading }),

  openLoginModal: () => set({ isLoginModalOpen: true, isRegisterModalOpen: false, isGoogleModalOpen: false }),
  closeLoginModal: () => set({ isLoginModalOpen: false }),
  openRegisterModal: () => set({ isRegisterModalOpen: true, isLoginModalOpen: false, isGoogleModalOpen: false }),
  closeRegisterModal: () => set({ isRegisterModalOpen: false }),
  openGoogleModal: () => set({ isGoogleModalOpen: true, isLoginModalOpen: false, isRegisterModalOpen: false }),
  closeGoogleModal: () => set({ isGoogleModalOpen: false }),
  closeAllModals: () => set({ isLoginModalOpen: false, isRegisterModalOpen: false, isGoogleModalOpen: false }),

  initAuth: async () => {
    try {
      const res = await apiClient.post('/auth/refresh');
      if (res.accessToken) {
        set({ token: res.accessToken, user: res.user || null });
      }
    } catch (err) {
      // Refresh token absent or expired, reset state
      set({ token: null, user: null });
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (credentials) => {
    try {
      const res = await apiClient.post('/auth/login', credentials);
      set({ token: res.accessToken, user: res.user || null });
      get().closeAllModals();
      toast.success('Login successful!');
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : 'Login failed';
      toast.error(msg);
      throw err;
    }
  },

  register: async (data) => {
    try {
      await apiClient.post('/auth/register', data);
      toast.success('Account created! Verification code sent to email.');
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : 'Registration failed';
      toast.error(msg);
      throw err;
    }
  },

  sendVerification: async (email) => {
    try {
      await apiClient.post('/auth/send-verification', { email });
      toast.info('Verification OTP code sent to your email.');
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : 'Failed to send verification code';
      toast.error(msg);
      throw err;
    }
  },

  verifyEmail: async (email, code) => {
    try {
      await apiClient.post('/auth/verify-email', { email, code });
      toast.success('Email verified successfully! You can now log in.');
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : 'Invalid or expired OTP code';
      toast.error(msg);
      throw err;
    }
  },

  googleAuth: async (idToken, userInfo) => {
    try {
      const res = await apiClient.post('/auth/google', { idToken, userInfo });
      set({ token: res.accessToken, user: res.user || null });
      get().closeAllModals();
      toast.success('Google login successful!');
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : 'Google login failed';
      toast.error(msg);
      throw err;
    }
  },

  logout: async () => {
    const { token } = get();
    try {
      if (token) {
        await apiClient.post('/auth/logout', undefined, { token });
      }
    } catch (err) {
      // Ignore logout errors
    } finally {
      set({ user: null, token: null, isLoginModalOpen: false, isRegisterModalOpen: false });
      toast.info('Logged out successfully');
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
  },
}));
