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
  type Course,
  type DocumentItem,
  type Quiz,
  type ChatMessage,
  type Notification,
  type Note,
} from '@/data/mockData';

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
  const data = await apiGet<any[]>('/api/quizzes');
  if (data && Array.isArray(data)) {
    return data;
  }
  return [];
}

export async function fetchQuizQuestions() {
  const data = await apiGet<any[]>('/api/quiz-questions');
  if (data && Array.isArray(data)) {
    return data;
  }
  return [];
}

export async function fetchQuizResults() {
  const data = await apiGet<any[]>('/api/quiz-results');
  if (data && Array.isArray(data)) {
    return data;
  }
  return [];
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

// ============ NOTES ============

export async function fetchNotes() {
  const data = await apiGet<any[]>('/api/notes');
  if (data && Array.isArray(data)) {
    return data;
  }
  return [];
}

export async function createNote(note: any): Promise<boolean> {
  return apiPost('/api/notes', note);
}

export async function updateNote(note: any): Promise<boolean> {
  return apiPut('/api/notes', note);
}

export async function deleteNote(id: string): Promise<boolean> {
  return apiDelete('/api/notes', [id]);
}

export async function updateNotification(notification: any): Promise<boolean> {
  return apiPut('/api/notifications', notification);
}

export async function deleteNotification(id: string): Promise<boolean> {
  return apiDelete('/api/notifications', [id]);
}

export async function saveQuiz(quiz: any, quizQuestions: any[]): Promise<boolean> {
  const quizSaved = await apiPost('/api/quizzes', quiz);
  if (!quizSaved) return false;
  for (const question of quizQuestions) {
    if (!await apiPost('/api/quiz-questions', { ...question, quizId: quiz.id })) {
      return false;
    }
  }
  return true;
}

export async function saveQuizResult(result: any): Promise<boolean> {
  return apiPost('/api/quiz-results', result);
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
  });

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
  return apiDelete('/api/quizzes', [id]);
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
