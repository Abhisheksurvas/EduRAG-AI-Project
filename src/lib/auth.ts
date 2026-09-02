import type { Role } from '@/types';
import { roleUser } from '@/config/nav';
import { apiGet, apiPost } from './api';

export type AuthAccount = {
  userId?: string;
  role: Role;
  name: string;
  email: string;
  password: string;
  createdAt: string;
  details?: Record<string, string>;
};

const AUTH_STORAGE_KEY = 'edurag-auth-accounts';
const CURRENT_SESSION_KEY = 'edurag-current-account';

const demoAccounts: AuthAccount[] = [];

function readStoredAccounts(): AuthAccount[] {
  if (typeof window === 'undefined') {
    return demoAccounts;
  }

  const rawValue = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!rawValue) {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(demoAccounts));
    return demoAccounts;
  }

  try {
    const parsed = JSON.parse(rawValue) as AuthAccount[];
    return Array.isArray(parsed) ? parsed : demoAccounts;
  } catch {
    return demoAccounts;
  }
}

function writeStoredAccounts(accounts: AuthAccount[]) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(accounts));
}

function readStoredSession(): AuthAccount | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawValue = window.localStorage.getItem(CURRENT_SESSION_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as AuthAccount;
    if (!parsed || typeof parsed !== 'object' || typeof parsed.role !== 'string') {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function writeStoredSession(account: AuthAccount | null) {
  if (typeof window === 'undefined') {
    return;
  }

  if (!account) {
    window.localStorage.removeItem(CURRENT_SESSION_KEY);
    return;
  }

  window.localStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(account));
}

export async function syncAccountsFromBackend() {
  try {
    const backendAccounts = await apiGet<AuthAccount[]>('/api/auth');
    if (backendAccounts && Array.isArray(backendAccounts)) {
      writeStoredAccounts(backendAccounts);
    }
  } catch (err) {
    console.warn('[Auth Sync] Failed to sync accounts from backend:', err);
  }
}

export function getAccounts(): AuthAccount[] {
  return readStoredAccounts();
}

export function findAccount(role: Role, email: string): AuthAccount | undefined {
  const normalizedEmail = email.trim().toLowerCase();
  return getAccounts().find((account) => account.role === role && account.email.toLowerCase() === normalizedEmail);
}

export function saveAccount(account: Omit<AuthAccount, 'createdAt'>) {
  const accounts = getAccounts();
  const nextAccount: AuthAccount = { ...account, createdAt: new Date().toISOString() };
  const filteredAccounts = accounts.filter((existing) => !(existing.role === account.role && existing.email.toLowerCase() === account.email.toLowerCase()));
  writeStoredAccounts([...filteredAccounts, nextAccount]);

  // Sync to database
  apiPost('/api/auth', nextAccount).catch(console.warn);

  return nextAccount;
}

export function getCurrentAccount(): AuthAccount | null {
  return readStoredSession();
}

export function setCurrentAccount(account: AuthAccount | null) {
  writeStoredSession(account);
}

export function clearCurrentAccount() {
  writeStoredSession(null);
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem('edurag-auth-token');
  }
}

export function resetDemoAccounts() {
  writeStoredAccounts(demoAccounts);
  clearCurrentAccount();
}

