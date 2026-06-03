import { create } from 'zustand';
import {
  AuthError,
  changePassword as libChangePassword,
  clearStoredToken,
  createToken,
  getProfileById,
  getStoredToken,
  login as libLogin,
  signup as libSignup,
  storeToken,
  updateProfile as libUpdateProfile,
  verifyToken,
  type AvatarChoice,
  type SignupInput,
  type UserProfile,
} from '@/lib/auth';

type AuthStatus = 'loading' | 'authed' | 'anon';
export type AuthModalMode = 'login' | 'signup' | 'profile' | 'password';

interface AuthState {
  status: AuthStatus;
  user: UserProfile | null;
  token: string | null;

  /** Centralized auth-modal control so any component (e.g. the annotate
   *  gate) can prompt sign-in. AccountButton renders the modal. */
  authModalMode: AuthModalMode | null;
  openAuthModal(mode: AuthModalMode): void;
  closeAuthModal(): void;

  /** Restore a session from the stored token on app boot. */
  hydrate(): Promise<void>;
  signup(input: SignupInput): Promise<void>;
  login(usernameOrEmail: string, password: string): Promise<void>;
  logout(): void;
  updateProfile(patch: { name?: string; avatar?: AvatarChoice }): Promise<void>;
  changePassword(currentPassword: string, newPassword: string): Promise<void>;
}

export const useAuth = create<AuthState>((set, get) => ({
  status: 'loading',
  user: null,
  token: null,
  authModalMode: null,

  openAuthModal: (mode) => set({ authModalMode: mode }),
  closeAuthModal: () => set({ authModalMode: null }),

  hydrate: async () => {
    const token = getStoredToken();
    if (!token) {
      set({ status: 'anon', user: null, token: null });
      return;
    }
    const payload = await verifyToken(token);
    if (!payload) {
      clearStoredToken();
      set({ status: 'anon', user: null, token: null });
      return;
    }
    const profile = getProfileById(payload.sub);
    if (!profile) {
      // Token valid but the account record is gone (e.g. storage cleared).
      clearStoredToken();
      set({ status: 'anon', user: null, token: null });
      return;
    }
    set({ status: 'authed', user: profile, token });
  },

  signup: async (input) => {
    const { token, profile } = await libSignup(input);
    storeToken(token);
    set({ status: 'authed', user: profile, token });
  },

  login: async (usernameOrEmail, password) => {
    const { token, profile } = await libLogin(usernameOrEmail, password);
    storeToken(token);
    set({ status: 'authed', user: profile, token });
  },

  logout: () => {
    clearStoredToken();
    set({ status: 'anon', user: null, token: null });
  },

  updateProfile: async (patch) => {
    const { user } = get();
    if (!user) throw new AuthError('Not signed in.');
    const next = libUpdateProfile(user.id, patch);
    // Refresh the token so its embedded username stays current.
    const token = await createToken(next);
    storeToken(token);
    set({ user: next, token });
  },

  changePassword: async (currentPassword, newPassword) => {
    const { user } = get();
    if (!user) throw new AuthError('Not signed in.');
    await libChangePassword(user.id, currentPassword, newPassword);
  },
}));
