import { apiGet, apiPost, apiPut, apiDelete } from './api';
import { getCurrentAccount } from './auth';

function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = window.localStorage.getItem('edurag-auth-token');
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

import {
  getStudentProfile,
  studentCourses,
  students,
  documents,
  quizzes,
  quizQuestions,
  generatedNotes,
  type Course,
  type DocumentItem,
  type Quiz,
  type ChatMessage,
  type Notification,
  type Note,
} from '@/data/mockData';
import { normalizeTopic } from '@/lib/utils';

export type { Course, DocumentItem, Quiz, ChatMessage, Notification, Note };

function getUserId(): string {
  const account = getCurrentAccount();
  return account?.userId || account?.email || 'local-user';
}

function getUserRole(): string {
  const account = getCurrentAccount();
  return account?.role || 'student';
}

// ============ PROFILES ============

export async function fetchStudentProfile() {
  const data = await apiGet<any>('/api/profile/student');
  if (data) {
    return data;
  }
  return getStudentProfile();
}

export async function fetchStudentCourses(): Promise<Course[]> {
  const data = await apiGet<Course[]>('/api/courses/student');
  if (data && Array.isArray(data) && data.length > 0) {
    return data;
  }
  return studentCourses;
}

// ============ STUDENTS ============

export async function fetchStudents() {
  const data = await apiGet<any[]>('/api/students');
  if (data && Array.isArray(data) && data.length > 0) {
    return data;
  }
  return students;
}

// ============ DOCUMENTS / MATERIALS ============

export async function fetchDocuments() {
  const account = getCurrentAccount();
  const userId = account?.userId ?? '';
  const role = account?.role ?? 'student';
  const qs = userId
    ? `?userId=${encodeURIComponent(userId)}&role=${encodeURIComponent(role)}`
    : '';
  const data = await apiGet<any[]>(`/api/materials${qs}`);
  if (data && Array.isArray(data) && data.length > 0) {
    return data;
  }
  return documents;
}

// ============ QUIZZES ============

export async function fetchQuizzes() {
  const userId = getUserId();
  const data = await apiGet<any[]>(`/api/quizzes?accountId=${encodeURIComponent(userId)}`);
  if (data && Array.isArray(data) && data.length > 0) {
    return data;
  }
  // Fallback: load locally stored quizzes partitioned by account
  try {
    if (typeof window === 'undefined') return quizzes;
    const rawStored = window.localStorage.getItem(`edurag-quizzes-${userId}`);
    if (rawStored !== null) {
      const stored = JSON.parse(rawStored || '[]');
      if (Array.isArray(stored)) {
        const filtered = stored.filter((q: any) => q.accountId === userId || q.userId === userId);
        return filtered;
      }
    }
  } catch {
    // continue
  }
  return quizzes;
}

export async function fetchQuizQuestions(quizId?: string) {
  const userId = getUserId();
  const qs = quizId ? `?quizId=${encodeURIComponent(quizId)}&accountId=${encodeURIComponent(userId)}` : `?accountId=${encodeURIComponent(userId)}`;
  const data = await apiGet<any[]>(`/api/quiz-questions${qs}`);
  if (data && Array.isArray(data) && data.length > 0) {
    return data;
  }
  // Fallback: load locally stored quiz questions partitioned by account
  try {
    if (typeof window === 'undefined') {
      return quizId ? quizQuestions.filter((q: any) => q.quizId === quizId) : quizQuestions;
    }
    const rawStored = window.localStorage.getItem(`edurag-quiz-questions-${userId}`);
    if (rawStored !== null) {
      const stored = JSON.parse(rawStored || '[]');
      if (Array.isArray(stored)) {
        const list = stored.filter((q: any) => q.accountId === userId || q.userId === userId);
        if (quizId) {
          const matching = list.filter((q: any) => q.quizId === quizId);
          if (matching.length > 0) return matching;
        } else if (list.length > 0) {
          return list;
        }
      }
    }
  } catch {
    // continue
  }
  return quizId ? quizQuestions.filter((q: any) => q.quizId === quizId) : quizQuestions;
}

export async function fetchQuizResults() {
  const userId = getUserId();
  const data = await apiGet<any[]>(`/api/quiz-attempts?accountId=${encodeURIComponent(userId)}`);
  if (data && Array.isArray(data)) {
    return data;
  }
  // Fallback: load locally stored quiz attempts partitioned by account
  try {
    if (typeof window === 'undefined') return [];
    const stored = JSON.parse(window.localStorage.getItem(`edurag-quiz-attempts-${userId}`) || '[]');
    return Array.isArray(stored) ? stored.filter((a: any) => a.accountId === userId || a.userId === userId) : [];
  } catch {
    return [];
  }
}

// ============ NOTIFICATIONS ============

export async function fetchNotifications() {
  const data = await apiGet<any[]>('/api/notifications');
  if (data && Array.isArray(data)) {
    return data;
  }
  return [];
}

// ============ BOOKMARKS ============

export async function fetchBookmarks() {
  const data = await apiGet<any[]>('/api/bookmarks');
  if (data && Array.isArray(data)) {
    return data;
  }
  return [];
}

// ============ ANNOUNCEMENTS ============

export async function fetchAnnouncements() {
  const data = await apiGet<any[]>('/api/announcements');
  if (data && Array.isArray(data)) {
    return data;
  }
  return [];
}

// ============ CALENDAR EVENTS ============

export async function fetchCalendarEvents() {
  const data = await apiGet<any[]>('/api/calendar');
  if (data && Array.isArray(data)) {
    return data;
  }
  return [];
}

// ============ MESSAGES ============

export async function fetchMessages() {
  const data = await apiGet<any[]>('/api/messages');
  if (data && Array.isArray(data)) {
    return data;
  }
  return [];
}

// ============ MATERIALS (for notes) ============

export async function findMaterialsByTopic(topic: string): Promise<any[]> {
  const allMaterials = await fetchDocuments();
  const normalizedTopic = normalizeTopic(topic);

  const topicParts = normalizedTopic.toLowerCase().split(/[\s\-]+/);

  return allMaterials.filter((material: any) => {
    const materialName = (material.name || '').toLowerCase();
    const materialCourse = (material.course || '').toLowerCase();

    return topicParts.some(part =>
      part.length > 2 &&
      (materialName.includes(part) || materialCourse.includes(part))
    );
  });
}

// ============ NOTES ============

import { generateAcademicNotes, type NoteType } from './notesGeneratorKnowledge';

export async function fetchNotes() {
  const data = await apiGet<any[]>('/api/notes');
  if (data && Array.isArray(data) && data.length > 0) {
    return data;
  }
  // Fallback: check localStorage, otherwise supply pre-seeded academic notes
  try {
    if (typeof window !== 'undefined') {
      const stored = JSON.parse(window.localStorage.getItem('edurag-notes') || '[]');
      if (Array.isArray(stored) && stored.length > 0) {
        return stored;
      }
    }
  } catch {
    // continue
  }
  return generatedNotes;
}

export async function createNote(note: any): Promise<boolean> {
  const result = await apiPost('/api/notes', note);
  if (result) return true;
  // Fallback: save locally when backend is unavailable (e.g. no auth token)
  try {
    if (typeof window === 'undefined') return false;
    let notes = JSON.parse(window.localStorage.getItem('edurag-notes') || '[]');
    const userId = getUserId();
    const noteWithUserId = { ...note, userId, id: note.id || `note_${Date.now()}` };
    notes = notes.filter((n: any) => n.userId !== userId || n.id !== noteWithUserId.id);
    notes.push(noteWithUserId);
    window.localStorage.setItem('edurag-notes', JSON.stringify(notes));
    return true;
  } catch (err) {
    console.warn('[DataService] Failed to save note locally:', err);
    return false;
  }
}

export async function updateNote(note: any): Promise<boolean> {
  return apiPut('/api/notes', note);
}

export async function deleteNote(id: string): Promise<boolean> {
  try {
    if (typeof window !== 'undefined') {
      const stored = JSON.parse(window.localStorage.getItem('edurag-notes') || '[]');
      if (Array.isArray(stored)) {
        const filtered = stored.filter((n: any) => n.id !== id);
        window.localStorage.setItem('edurag-notes', JSON.stringify(filtered));
      }
    }
  } catch (err) {
    console.warn('[DataService] Failed to remove note from localStorage:', err);
  }
  return apiDelete('/api/notes', [id]);
}

export async function deleteAllNotes(ids?: string[]): Promise<boolean> {
  try {
    if (typeof window !== 'undefined') {
      if (ids && ids.length > 0) {
        const stored = JSON.parse(window.localStorage.getItem('edurag-notes') || '[]');
        if (Array.isArray(stored)) {
          const filtered = stored.filter((n: any) => !ids.includes(n.id));
          window.localStorage.setItem('edurag-notes', JSON.stringify(filtered));
        }
      } else {
        window.localStorage.removeItem('edurag-notes');
      }
    }
  } catch (err) {
    console.warn('[DataService] Failed to clear local notes:', err);
  }
  if (ids && ids.length > 0) {
    return apiDelete('/api/notes', ids);
  }
  return true;
}

export function generateClientFallbackNotes(topic: string, type: string, context?: string): { title: string; content: string } {
  const normType = (type || 'summary') as NoteType;
  return generateAcademicNotes(topic, normType, context);
}

export async function notifyDocumentSelected(id: string, name: string): Promise<boolean> {
  try {
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('edurag-auth-token') : null;
    const res = await fetch('http://localhost:8000/api/notes/select-document', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ id, name }),
    });
    return res.ok;
  } catch (err) {
    console.warn('[DataService] Document selection notify failed:', err);
    return false;
  }
}

export async function generateNotesService(params: {
  topic: string;
  type: string;
  materialIds?: string[];
  context?: string;
  documentName?: string;
  selectedDocumentName?: string;
}): Promise<{ success: boolean; content: string; title: string }> {
  const titles: Record<string, string> = {
    summary: 'Chapter Summary',
    keypoints: 'Key Points',
    definitions: 'Definitions & Terminology',
    formulas: 'Formula Sheet & Reference Guide',
  };
  const label = titles[params.type] || 'Study Notes';
  const cleanTopic = params.topic.trim();
  const cacheKey = `${cleanTopic.toLowerCase()}::${params.type}::${(params.materialIds || []).sort().join(',')}`;

  if (typeof window !== 'undefined' && (window as any).__notesClientCache?.has(cacheKey)) {
    return (window as any).__notesClientCache.get(cacheKey);
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 16000);
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('edurag-auth-token') : null;
    const res = await fetch('http://localhost:8000/api/notes/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(params),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      const rawContent = data?.content ? String(data.content).trim() : '';
      const isUnavailable =
        rawContent.toLowerCase().includes('the ai provider is currently unavailable') ||
        rawContent.toLowerCase().includes('your question is about') ||
        rawContent.toLowerCase().includes('not included in the local study knowledge base');

      if (rawContent && rawContent.length > 80 && !isUnavailable) {
        const result = {
          success: true,
          content: rawContent,
          title: data.header || data.title || `${label}: ${cleanTopic}`,
        };
        if (typeof window !== 'undefined') {
          if (!(window as any).__notesClientCache) (window as any).__notesClientCache = new Map();
          (window as any).__notesClientCache.set(cacheKey, result);
        }
        return result;
      }
    }
  } catch (err) {
    console.warn('[DataService] API notes generate took >12s or failed; using high-yield academic knowledge engine:', err);
  }

  // Fast, accurate, high-yield academic generation
  const generated = generateAcademicNotes(cleanTopic, (params.type || 'summary') as NoteType, params.context);
  const fallbackResult = {
    success: true,
    content: generated.content,
    title: generated.title || `${label}: ${cleanTopic}`,
  };
  if (typeof window !== 'undefined') {
    if (!(window as any).__notesClientCache) (window as any).__notesClientCache = new Map();
    (window as any).__notesClientCache.set(cacheKey, fallbackResult);
  }
  return fallbackResult;
}

export async function updateNotification(notification: any): Promise<boolean> {
  return apiPut('/api/notifications', notification);
}

export async function deleteNotification(id: string): Promise<boolean> {
  return apiDelete('/api/notifications', [id]);
}

export async function saveQuiz(quiz: any, quizQuestions: any[]): Promise<boolean> {
  const userId = getUserId();
  const quizRecord = {
    ...quiz,
    accountId: userId,
    userId,
    status: quiz.status || 'unattempted',
    createdAt: quiz.createdAt || new Date().toISOString(),
  };
  const questionsWithId = quizQuestions.map(q => ({
    ...q,
    quizId: quiz.id,
    accountId: userId,
    userId,
  }));

  const [quizSaved, batchSaved] = await Promise.all([
    apiPost('/api/quizzes', quizRecord),
    (async () => {
      if (questionsWithId.length === 0) return true;
      try {
        const token = typeof window !== 'undefined' ? window.localStorage.getItem('edurag-auth-token') : null;
        if (!token) return false;
        const res = await fetch('http://localhost:8000/api/quiz-questions/batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ questions: questionsWithId }),
        });
        return res.ok;
      } catch {
        return false;
      }
    })(),
  ]);

  if (quizSaved && batchSaved) return true;

  // Local storage fallback strictly partitioned by account ID
  try {
    if (typeof window === 'undefined') return false;
    let storedQuizzes = JSON.parse(window.localStorage.getItem(`edurag-quizzes-${userId}`) || '[]');
    storedQuizzes = storedQuizzes.filter((q: any) => q.id !== quiz.id);
    storedQuizzes.unshift(quizRecord);
    window.localStorage.setItem(`edurag-quizzes-${userId}`, JSON.stringify(storedQuizzes));

    let storedQs = JSON.parse(window.localStorage.getItem(`edurag-quiz-questions-${userId}`) || '[]');
    storedQs = storedQs.filter((q: any) => q.quizId !== quiz.id);
    storedQs.push(...questionsWithId);
    window.localStorage.setItem(`edurag-quiz-questions-${userId}`, JSON.stringify(storedQs));
    return true;
  } catch (err) {
    console.warn('[DataService] Failed to save quiz locally:', err);
    return false;
  }
}

export async function saveQuizResult(result: any): Promise<boolean> {
  const userId = getUserId();
  const attemptRecord = {
    ...result,
    accountId: userId,
    userId,
    completedAt: result.completedAt || new Date().toISOString(),
  };
  const saved = await apiPost('/api/quiz-attempts', attemptRecord);
  if (saved) return true;

  // Local storage fallback strictly partitioned by account ID
  try {
    if (typeof window === 'undefined') return false;
    let results = JSON.parse(window.localStorage.getItem(`edurag-quiz-attempts-${userId}`) || '[]');
    results = results.filter((r: any) => r.id !== result.id);
    results.unshift(attemptRecord);
    window.localStorage.setItem(`edurag-quiz-attempts-${userId}`, JSON.stringify(results));
    return true;
  } catch (err) {
    console.warn('[DataService] Failed to save quiz result locally:', err);
    return false;
  }
}

// ============ STATS ============

export async function fetchStats() {
  const data = await apiGet<any>('/api/stats');
  if (data) {
    return data;
  }
  return null;
}

// ============ ACTIVITY ============

export async function fetchActivity() {
  const data = await apiGet<any[]>('/api/activity');
  if (data && Array.isArray(data)) {
    return data;
  }
  return [];
}

// ============ CHAT ============

export async function sendChatMessage(payload: {
  question: string;
  userId?: string;
  role?: string;
  conversationId?: string;
  title?: string;
  name?: string;
  branch?: string;
  semester?: string;
  topic?: string;
  difficulty?: string;
  context?: string;
  selectedMaterialIds?: string[];
  responseMode?: 'materials' | 'ai' | 'both';
  history?: { role: string; content: string }[];
}): Promise<{
  success: boolean;
  answer: string;
  material_answer?: string;
  ai_answer?: string;
  sources: any[];
  attachments: any[];
  source_type?: string;
}> {
  const userId = payload.userId || getUserId();
  const role = payload.role || getUserRole();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 300_000);

  const res = await fetch('http://localhost:8000/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify({
      ...payload,
      userId,
      role,
      responseMode: payload.responseMode || 'both',
    }),
    signal: controller.signal,
  });
  clearTimeout(timeoutId);

  const data = await res.json();
  if (res.ok && data.success && data.answer) {
    return {
      success: true,
      answer: data.answer,
      material_answer: data.material_answer,
      ai_answer: data.ai_answer,
      sources: data.sources || [],
      attachments: data.attachments || [],
      source_type: data.source_type,
    };
  }
  throw new Error(data.error || 'Failed to fetch AI response');
}

// ============ MUTATION HELPERS ============

export async function createCourse(course: any): Promise<boolean> {
  return apiPost('/api/courses', course);
}

export async function updateCourse(course: any): Promise<boolean> {
  return apiPut('/api/courses', course);
}

export async function deleteCourse(id: string): Promise<boolean> {
  return apiDelete('/api/courses', [id]);
}

export async function createStudent(student: any): Promise<boolean> {
  return apiPost('/api/students', student);
}

export async function updateStudent(student: any): Promise<boolean> {
  return apiPut('/api/students', student);
}

export async function deleteStudent(id: string): Promise<boolean> {
  return apiDelete('/api/students', [id]);
}

export async function createQuiz(quiz: any): Promise<boolean> {
  return apiPost('/api/quizzes', quiz);
}

export async function updateQuiz(quiz: any): Promise<boolean> {
  return apiPut('/api/quizzes', quiz);
}

export async function deleteQuiz(id: string): Promise<boolean> {
  const userId = getUserId();
  // 1. Purge from local storage for current account
  try {
    if (typeof window !== 'undefined') {
      const removeMatching = (key: string, matches: (item: any) => boolean) => {
        const stored = JSON.parse(window.localStorage.getItem(key) || '[]');
        if (!Array.isArray(stored)) return false;
        const next = stored.filter(item => !matches(item));
        window.localStorage.setItem(key, JSON.stringify(next));
        return next.length !== stored.length;
      };

      removeMatching(`edurag-quizzes-${userId}`, quiz => quiz.id === id);
      removeMatching(`edurag-quiz-questions-${userId}`, question => question.quizId === id || question.id === id);
      removeMatching(`edurag-quiz-attempts-${userId}`, result => result.quizId === id || result.id === id);
      removeMatching('edurag-quizzes', quiz => quiz.id === id);
      removeMatching('edurag-quiz-questions', question => question.quizId === id || question.id === id);
      removeMatching('edurag-quiz-results', result => result.quizId === id || result.id === id);
    }
  } catch (error) {
    console.error('[DataService] Failed to clean quiz from local storage.', { id, error });
  }

  // 2. Permanently delete from MongoDB / backend database (scoped to current account)
  const deletedFromServer = await apiDelete(`/api/quizzes?accountId=${encodeURIComponent(userId)}`, [id]);
  return deletedFromServer;
}

export async function deleteAllUnattemptedQuizzes(): Promise<boolean> {
  const userId = getUserId();
  try {
    if (typeof window !== 'undefined') {
      const stored = JSON.parse(window.localStorage.getItem(`edurag-quizzes-${userId}`) || '[]');
      if (Array.isArray(stored)) {
        const remaining = stored.filter((q: any) => q.status === 'completed');
        window.localStorage.setItem(`edurag-quizzes-${userId}`, JSON.stringify(remaining));
      }
    }
  } catch (err) {
    console.warn('[DataService] Failed to clean unattempted quizzes locally:', err);
  }

  return apiDelete(`/api/quizzes?scope=unattempted&accountId=${encodeURIComponent(userId)}`, []);
}

export async function deleteAllQuizAttempts(): Promise<boolean> {
  const userId = getUserId();
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(`edurag-quiz-attempts-${userId}`);
      const stored = JSON.parse(window.localStorage.getItem(`edurag-quizzes-${userId}`) || '[]');
      if (Array.isArray(stored)) {
        const remaining = stored.filter((q: any) => q.status !== 'completed');
        window.localStorage.setItem(`edurag-quizzes-${userId}`, JSON.stringify(remaining));
      }
    }
  } catch (err) {
    console.warn('[DataService] Failed to clean quiz history locally:', err);
  }

  return apiDelete(`/api/quizzes?scope=history&accountId=${encodeURIComponent(userId)}`, []);
}

export async function deleteAllQuizzes(quizIds?: string[]): Promise<boolean> {
  return deleteAllUnattemptedQuizzes();
}

export async function createAnnouncement(announcement: any): Promise<boolean> {
  return apiPost('/api/announcements', announcement);
}

export async function updateAnnouncement(announcement: any): Promise<boolean> {
  return apiPut('/api/announcements', announcement);
}

export async function deleteAnnouncement(id: string): Promise<boolean> {
  return apiDelete('/api/announcements', [id]);
}

export async function uploadMaterial(material: any): Promise<any> {
  return apiPost('/api/materials/upload', material);
}
