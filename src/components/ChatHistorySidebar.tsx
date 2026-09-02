import { useState, useEffect, useRef, type ChangeEvent, type KeyboardEvent } from 'react';
import { Plus, MessageSquare, Trash2, Edit3, Check, X, Bot, Search, PanelLeftClose } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  loadConversations,
  saveConversation,
  deleteConversation,
  getCurrentUserId,
  getCurrentUserRole,
  formatConversationTime,
  type ChatConversation,
} from '@/lib/chatHistory';
import type { ChatMessage } from '@/data/mockData';

export interface ChatHistorySidebarProps {
  /** Currently active conversation ID (or null for a new chat) */
  activeConversationId: string | null;
  /** Called when a conversation is selected from the sidebar */
  onSelectConversation: (conversation: ChatConversation) => void;
  /** Called when the "New Chat" button is clicked */
  onNewChat: () => void;
  /** Called when the close-sidebar icon is clicked */
  onClose?: () => void;
  /** Called when a conversation is deleted */
  onConversationDeleted?: (conversationId: string) => void;
  /** Optional role override (defaults to current user role) */
  role?: 'student';
  /** Optional user ID override (defaults to current user ID) */
  userId?: string;
  /** Optional className for styling */
  className?: string;
}

export function ChatHistorySidebar({
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onClose,
  onConversationDeleted,
  role,
  userId,
  className,
}: ChatHistorySidebarProps) {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const currentUserId = userId ?? getCurrentUserId();
  const currentRole = role ?? getCurrentUserRole();

  // Load conversations on mount and when userId/role changes
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const data = await loadConversations();
        if (!cancelled) {
          setConversations(data);
        }
      } catch (err) {
        console.warn('[ChatHistorySidebar] Failed to load conversations:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [currentUserId, currentRole]);

  // Focus the edit input when editing starts
  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  useEffect(() => {
    if (isSearchActive && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchActive]);

  const handleSearchToggle = () => {
    setIsSearchActive((v) => !v);
    if (!isSearchActive) {
      setSearchQuery('');
    }
  };

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsSearchActive(false);
      setSearchQuery('');
    }
  };

  const handleSelect = (conversation: ChatConversation) => {
    onSelectConversation(conversation);
  };

  const handleNewChat = () => {
    onNewChat();
  };

  const startEditing = (conversation: ChatConversation) => {
    setEditingId(conversation.conversationId);
    setEditTitle(conversation.title);
  };

  const confirmEdit = async () => {
    if (!editingId) return;
    const trimmed = editTitle.trim() || 'New chat';
    const conversation = conversations.find(c => c.conversationId === editingId);
    if (conversation) {
      const updated: ChatConversation = { ...conversation, title: trimmed };
      await saveConversation(updated);
      setConversations(prev =>
        prev.map(c => (c.conversationId === editingId ? updated : c))
      );
    }
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
  };

  const handleDelete = async (conversation: ChatConversation) => {
    await deleteConversation(conversation.conversationId);
    setConversations(prev => prev.filter(c => c.conversationId !== conversation.conversationId));
    onConversationDeleted?.(conversation.conversationId);
    if (activeConversationId === conversation.conversationId) {
      onNewChat();
    }
    setDeleteConfirmId(null);
  };

  const sortedConversations = [...conversations].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  const uniqueSortedConversations = (() => {
    const seen = new Map<string, ChatConversation>();
    for (const conv of sortedConversations) {
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
  })();

  const filteredConversations = searchQuery
    ? uniqueSortedConversations.filter((c) =>
        c.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : uniqueSortedConversations;

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-neutral-50 border-r border-neutral-200 overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div className="p-3 border-b border-neutral-200 space-y-2">
        <div className="flex items-center gap-1">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close chat history"
              title="Close chat history"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-neutral-500 hover:bg-neutral-100 hover:text-primary-600 transition-colors"
            >
              <PanelLeftClose className="h-5 w-5" />
            </button>
          )}
          <button
            type="button"
            onClick={handleNewChat}
            aria-label="New chat"
            title="New chat"
            className={cn(
              'flex-1 grid place-items-center h-9 rounded-xl text-sm font-medium transition-all',
              activeConversationId === null
                ? 'bg-primary-600 text-white shadow-md'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            )}
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleSearchToggle}
            aria-label="Search chats"
            title="Search chats"
            className={cn(
              'grid h-9 w-9 shrink-0 place-items-center rounded-xl text-neutral-500 hover:bg-neutral-100 hover:text-primary-600 transition-colors',
              isSearchActive && 'bg-neutral-100 text-primary-600'
            )}
          >
            <Search className="h-4 w-4" />
          </button>
        </div>
        {isSearchActive && (
          <div className="relative">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search chats..."
              className="w-full h-9 pl-9 pr-3 text-sm rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          </div>
        )}
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto py-2">
        {loading ? (
          <div className="px-3 space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-neutral-200 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : sortedConversations.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-neutral-500">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 text-neutral-300" />
            <p>No chat history yet.</p>
            <p className="mt-1">Start a new conversation!</p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-neutral-500">
            <Search className="h-8 w-8 mx-auto mb-2 text-neutral-300" />
            <p>No matching chats found.</p>
            <p className="mt-1">Try a different search term.</p>
          </div>
        ) : (
          <div className="space-y-1 px-2">
            {filteredConversations.map((conversation) => {
              const isActive = conversation.conversationId === activeConversationId;
              const isEditing = editingId === conversation.conversationId;
              return (
                <div
                  key={conversation.conversationId}
                  className={cn(
                    'group relative rounded-xl transition-all',
                    isActive
                      ? 'bg-primary-100 border border-primary-200'
                      : 'hover:bg-neutral-100'
                  )}
                >
                  {isEditing ? (
                    <div className="p-3">
                      <input
                        ref={inputRef}
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') confirmEdit();
                          if (e.key === 'Escape') cancelEdit();
                        }}
                        className="w-full px-2 py-1.5 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary-400"
                      />
                      <div className="flex gap-1 mt-2">
                        <button
                          onClick={confirmEdit}
                          className="flex-1 flex items-center justify-center gap-1 text-xs py-1 rounded-lg bg-primary-600 text-white hover:bg-primary-700"
                        >
                          <Check className="h-3 w-3" /> Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="flex-1 flex items-center justify-center gap-1 text-xs py-1 rounded-lg bg-neutral-200 text-neutral-700 hover:bg-neutral-300"
                        >
                          <X className="h-3 w-3" /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => handleSelect(conversation)}
                        className="w-full text-left p-3 rounded-xl"
                      >
                        <div className="flex items-start gap-2.5">
                          <div className="grid place-items-center h-6 w-6 rounded-lg bg-primary-100 text-primary-600 shrink-0 mt-0.5">
                            <Bot className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p
                              className={cn(
                                'text-sm font-medium truncate',
                                isActive ? 'text-primary-800' : 'text-neutral-800'
                              )}
                              title={conversation.title}
                            >
                              {conversation.title}
                            </p>
                            <p className="text-xs text-neutral-500 mt-0.5">
                              {formatConversationTime(conversation.updatedAt) || 'Just now'}
                            </p>
                          </div>
                        </div>
                      </button>
                      {/* Hover actions */}
                      <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => startEditing(conversation)}
                          className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200 transition-colors"
                          title="Rename"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(conversation.conversationId)}
                          className="p-1 rounded-lg text-neutral-400 hover:text-error-600 hover:bg-error-50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
            onClick={() => setDeleteConfirmId(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 border border-neutral-200">
            <h3 className="font-display font-bold text-neutral-900 text-lg mb-2">
              Delete Chat?
            </h3>
            <p className="text-sm text-neutral-600 mb-4">
              This will permanently remove this conversation. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const conv = conversations.find(c => c.conversationId === deleteConfirmId);
                  if (conv) await handleDelete(conv);
                }}
                className="px-4 py-2 text-sm text-white bg-error-500 hover:bg-error-600 rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
