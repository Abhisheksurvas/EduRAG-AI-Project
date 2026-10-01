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
  /** Optional conversations array from parent to stay reactive */
  conversations?: ChatConversation[];
  /** Optional callback when conversations update */
  onConversationsChange?: (conversations: ChatConversation[]) => void;
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
  conversations: conversationsProp,
  onConversationsChange,
  onSelectConversation,
  onNewChat,
  onClose,
  onConversationDeleted,
  role,
  userId,
  className,
}: ChatHistorySidebarProps) {
  const [conversations, setConversations] = useState<ChatConversation[]>(conversationsProp || []);
  const [loading, setLoading] = useState(!conversationsProp || conversationsProp.length === 0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const currentUserId = userId ?? getCurrentUserId();
  const currentRole = role ?? getCurrentUserRole();

  // Sync external conversations if provided
  useEffect(() => {
    if (conversationsProp !== undefined) {
      setConversations(conversationsProp);
      setLoading(false);
    }
  }, [conversationsProp]);

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
      setConversations(prev => {
        const next = prev.map(c => (c.conversationId === editingId ? updated : c));
        onConversationsChange?.(next);
        return next;
      });
    }
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
  };

  const handleDelete = async (conversation: ChatConversation) => {
    await deleteConversation(conversation.conversationId);
    setConversations(prev => {
      const next = prev.filter(c => c.conversationId !== conversation.conversationId);
      onConversationsChange?.(next);
      return next;
    });
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
        'flex flex-col h-full bg-neutral-50 dark:bg-neutral-950 border-r border-neutral-200 dark:border-neutral-800 overflow-hidden',
        className
      )}
    >
      {/* Brand Header */}
      <div className="px-3 pt-3 pb-2 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="grid place-items-center h-8 w-8 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-sm shrink-0">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="font-display font-bold text-sm text-neutral-900 dark:text-neutral-100 leading-tight">
              EduRAG<span className="text-primary-600 dark:text-primary-400"> AI</span>
            </div>
            <div className="text-[10px] text-neutral-400 dark:text-neutral-500 font-medium leading-none">History</div>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close chat history"
            title="Close chat history"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/60 dark:hover:text-neutral-200 dark:hover:bg-neutral-800 transition-colors"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Header */}
      <div className="p-3 border-b border-neutral-200 dark:border-neutral-800 space-y-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleNewChat}
            aria-label="New chat"
            title="Start a new chat"
            className={cn(
              'flex-1 flex items-center justify-center gap-2 h-9 px-3 rounded-xl text-xs font-semibold transition-all shadow-xs',
              activeConversationId === null
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-800 border border-transparent dark:border-neutral-800'
            )}
          >
            <Plus className="h-4 w-4" />
            <span>New Chat</span>
          </button>
          <button
            type="button"
            onClick={handleSearchToggle}
            aria-label="Search chats"
            title="Search chats"
            className={cn(
              'grid h-9 w-9 shrink-0 place-items-center rounded-xl text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-primary-600 dark:hover:text-primary-400 transition-colors',
              isSearchActive && 'bg-neutral-100 dark:bg-neutral-800 text-primary-600 dark:text-primary-400'
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
              className="w-full h-9 pl-9 pr-3 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-400"
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
              <div key={i} className="h-12 bg-neutral-200 dark:bg-neutral-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-1 px-2">
            {/* Show Current Chat entry when starting a new chat */}
            {activeConversationId === null && !searchQuery && (
              <div className="group relative rounded-xl transition-all bg-primary-50 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-800/80 shadow-xs mb-1.5">
                <button
                  type="button"
                  onClick={handleNewChat}
                  className="w-full text-left p-2.5 rounded-xl"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="grid place-items-center h-6 w-6 rounded-lg bg-primary-600 text-white shrink-0 mt-0.5 shadow-xs">
                      <MessageSquare className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-primary-900 dark:text-primary-100 truncate">
                          New chat
                        </p>
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-primary-200/90 dark:bg-primary-900 text-primary-800 dark:text-primary-200">
                          Current
                        </span>
                      </div>
                      <p className="text-xs text-primary-600/90 dark:text-primary-400 mt-0.5">
                        Active session
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            )}

            {filteredConversations.length === 0 && activeConversationId !== null ? (
              <div className="px-4 py-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
                {searchQuery ? (
                  <>
                    <Search className="h-8 w-8 mx-auto mb-2 text-neutral-300 dark:text-neutral-700" />
                    <p>No matching chats found.</p>
                  </>
                ) : (
                  <>
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 text-neutral-300 dark:text-neutral-700" />
                    <p>No chat history yet.</p>
                  </>
                )}
              </div>
            ) : (
              filteredConversations.map((conversation) => {
                const isActive = conversation.conversationId === activeConversationId;
                const isEditing = editingId === conversation.conversationId;
                return (
                  <div
                    key={conversation.conversationId}
                    className={cn(
                      'group relative rounded-xl transition-all',
                      isActive
                        ? 'bg-primary-100/90 dark:bg-primary-950/60 border border-primary-200 dark:border-primary-800 shadow-xs'
                        : 'hover:bg-neutral-100 dark:hover:bg-neutral-900/80 border border-transparent'
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
                          className="w-full px-2 py-1.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-400"
                        />
                        <div className="flex gap-1 mt-2">
                          <button
                            onClick={confirmEdit}
                            className="flex-1 flex items-center justify-center gap-1 text-xs py-1 rounded-lg bg-primary-600 text-white hover:bg-primary-700 font-medium"
                          >
                            <Check className="h-3 w-3" /> Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="flex-1 flex items-center justify-center gap-1 text-xs py-1 rounded-lg bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-700 font-medium"
                          >
                            <X className="h-3 w-3" /> Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => handleSelect(conversation)}
                          className="w-full text-left p-2.5 rounded-xl"
                        >
                          <div className="flex items-start gap-2.5">
                            <div className={cn(
                              "grid place-items-center h-6 w-6 rounded-lg shrink-0 mt-0.5",
                              isActive
                                ? "bg-primary-600 text-white shadow-xs"
                                : "bg-primary-100 text-primary-600 dark:bg-primary-950/60 dark:text-primary-400"
                            )}>
                              <Bot className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <p
                                  className={cn(
                                    'text-sm truncate',
                                    isActive
                                      ? 'text-primary-900 dark:text-primary-100 font-semibold'
                                      : 'text-neutral-800 dark:text-neutral-100 font-medium'
                                  )}
                                  title={conversation.title}
                                >
                                  {conversation.title}
                                </p>
                                {isActive && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded-full font-bold bg-primary-200/90 dark:bg-primary-900 text-primary-800 dark:text-primary-200 shrink-0">
                                    Current
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                                {formatConversationTime(conversation.updatedAt) || 'Just now'}
                              </p>
                            </div>
                          </div>
                        </button>
                        {/* Hover actions */}
                        <div className="absolute top-1.5 right-1.5 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => startEditing(conversation)}
                            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-100 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
                            title="Rename"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(conversation.conversationId)}
                            className="p-1 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 dark:hover:text-rose-300 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </>
                    )}

                    {/* Delete confirmation modal/prompt */}
                    {deleteConfirmId === conversation.conversationId && (
                      <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl m-1">
                        <p className="text-xs text-rose-800 dark:text-rose-300 font-medium mb-2">Delete this conversation?</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDelete(conversation)}
                            className="flex-1 py-1 text-xs rounded-lg bg-rose-600 text-white font-medium hover:bg-rose-700"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="flex-1 py-1 text-xs rounded-lg bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-medium hover:bg-neutral-300"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
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
