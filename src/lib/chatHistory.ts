import { apiGet, apiPost, apiDelete } from './api';
import type { ChatMessage } from '@/data/mockData';

export type ChatConversation = {
  conversationId: string;
  userId: string;
  role: 'student';
  title: string;
  messages: ChatMessage[];
  updatedAt: string;
};

const CHAT_HISTORY_STORAGE_KEY = 'edurag-chat-history';

/**
 * Get the current user's ID from the auth session.
 * Falls back to a deterministic local ID if no session exists.
 */
export function getCurrentUserId(): string {
  try {
    const raw = window.localStorage.getItem('edurag-current-account');
    if (raw) {
      const account = JSON.parse(raw);
      if (account && account.userId) {
        return account.userId;
      }
      if (account && account.email && account.role) {
        return `usr_${account.email.replace('@', '_').replace('.', '_')}_${account.role}`;
      }
    }
  } catch {
    // fall through
  }
  return 'local-user';
}

export function getCurrentUserRole(): 'student' {
  try {
    const raw = window.localStorage.getItem('edurag-current-account');
    if (raw) {
      const account = JSON.parse(raw);
      if (account && account.role === 'student') {
        return account.role;
      }
    }
  } catch {
    // fall through
  }
  return 'student';
}

/**
 * Load all conversations for the current user from the backend (MongoDB).
 * Falls back to localStorage if the backend is unavailable.
 */
export async function loadConversations(): Promise<ChatConversation[]> {
  const userId = getCurrentUserId();
  const role = getCurrentUserRole();

  let backendConversations: ChatConversation[] = [];
  try {
    const data = await apiGet<{ success: boolean; conversations: ChatConversation[] }>(
      `/api/chat/history?userId=${encodeURIComponent(userId)}&role=${encodeURIComponent(role)}`
    );
    if (data && data.success && Array.isArray(data.conversations)) {
      backendConversations = deduplicateConversations(data.conversations);
    }
  } catch (err) {
    console.warn('[ChatHistory] Failed to load from backend, using localStorage:', err);
  }

  // Load the local cache (this is the only persistent store for sessions that
  // have no backend JWT, e.g. demo accounts whose writes never reach MongoDB).
  let localConversations: ChatConversation[] = [];
  try {
    const stored = window.localStorage.getItem(CHAT_HISTORY_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as ChatConversation[];
      if (Array.isArray(parsed)) {
        localConversations = deduplicateConversations(parsed);
      }
    }
  } catch {
    // ignore
  }

  // Merge backend + local by conversationId. Backend entries win on conflict,
  // but local-only conversations are always preserved — an empty (or failed)
  // backend response must NEVER wipe history that only exists locally.
  const byId = new Map<string, ChatConversation>();
  for (const conv of localConversations) {
    if (conv.conversationId) byId.set(conv.conversationId, conv);
  }
  for (const conv of backendConversations) {
    if (conv.conversationId) byId.set(conv.conversationId, conv);
  }
  const merged = Array.from(byId.values());

  // Only rewrite the cache when we actually have something to store, so we
  // never replace a populated cache with an empty one.
  if (merged.length > 0) {
    window.localStorage.setItem(CHAT_HISTORY_STORAGE_KEY, JSON.stringify(merged));
  }
  return merged;
}

/**
 * Save a conversation to the backend (MongoDB) and localStorage cache.
 */
export async function saveConversation(conversation: ChatConversation): Promise<ChatConversation> {
  const payload = {
    conversationId: conversation.conversationId,
    userId: conversation.userId,
    role: conversation.role,
    title: conversation.title,
    messages: conversation.messages,
    updatedAt: conversation.updatedAt,
  };

  try {
    await apiPost('/api/chat/history', payload);
  } catch (err) {
    console.warn('[ChatHistory] Failed to save to backend, using localStorage:', err);
  }

  // Always update localStorage cache
  try {
    const existing = await loadConversationsFromCache();
    const filtered = existing.filter(c => c.conversationId !== conversation.conversationId);
    const updated = [conversation, ...filtered];
    window.localStorage.setItem(CHAT_HISTORY_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }

  return conversation;
}

/**
 * Delete a conversation from the backend (MongoDB) and localStorage cache.
 */
export async function deleteConversation(conversationId: string): Promise<boolean> {
  const userId = getCurrentUserId();

  try {
    await apiDelete(`/api/chat/history/${conversationId}`, [conversationId]);
  } catch (err) {
    console.warn('[ChatHistory] Failed to delete from backend:', err);
  }

  // Always update localStorage cache
  try {
    const existing = await loadConversationsFromCache();
    const filtered = existing.filter(c => c.conversationId !== conversationId);
    window.localStorage.setItem(CHAT_HISTORY_STORAGE_KEY, JSON.stringify(filtered));
  } catch {
    // ignore
  }

  return true;
}

/**
 * Load conversations from localStorage cache only (no network).
 */
async function loadConversationsFromCache(): Promise<ChatConversation[]> {
  try {
    const stored = window.localStorage.getItem(CHAT_HISTORY_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as ChatConversation[];
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return [];
}

/**
 * Generate a title for a conversation based on the first user message.
 */
export function generateConversationTitle(messages: ChatMessage[]): string {
  const firstUserMsg = messages.find(m => m.role === 'user');
  if (firstUserMsg && firstUserMsg.content) {
    return firstUserMsg.content.slice(0, 50).replace(/\n/g, ' ').trim() || 'New chat';
  }
  return 'New chat';
}

/**
 * Format a timestamp for display in the sidebar.
 */
export function formatConversationTime(updatedAt: string): string {
  try {
    const date = new Date(updatedAt);
    if (Number.isNaN(date.getTime())) return '';
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

function deduplicateConversations(conversations: ChatConversation[]): ChatConversation[] {
  const seen = new Map<string, ChatConversation>();
  for (const conv of conversations) {
    const cid = conv.conversationId;
    if (!cid) continue;
    const existing = seen.get(cid);
    if (!existing) {
      seen.set(cid, conv);
    } else {
      const existingTime = new Date(existing.updatedAt).getTime();
      const currentTime = new Date(conv.updatedAt).getTime();
      if (currentTime > existingTime) {
        seen.set(cid, conv);
      }
    }
  }
  return Array.from(seen.values());
}
