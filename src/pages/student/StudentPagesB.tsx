import { useState, useEffect, useRef, useCallback } from 'react';
import {
  HelpCircle, Clock, CheckCircle2, XCircle, ChevronRight, ArrowRight,
  Star, RefreshCw, Calendar, Download,
  BarChart3, TrendingUp, TrendingDown, Bell, Bookmark, FileText,
  Bot, StickyNote, User, Mail, GraduationCap, Award, Lock, Camera,
  Check, AlertCircle, ChevronLeft, Target, Pencil, Sparkles, Plus, X, LoaderCircle, Trash2, AlertTriangle, Play, Eye,
} from 'lucide-react';
import { Card, CardHeader, CardBody, Badge, Button, Progress, StatCard, Avatar, EmptyState, SectionHeader, ToastContainer, ConfirmDialog, type ToastData } from '@/components/ui';
import { cn } from '@/lib/utils';
import {
  loadConversations,
  saveConversation,
  getCurrentUserId,
  getCurrentUserRole,
  generateConversationTitle,
  type ChatConversation,
} from '@/lib/chatHistory';
import {
  fetchQuizzes,
  fetchQuizQuestions,
  fetchQuizResults,
  fetchNotifications,
  updateNotification,
  deleteNotification,
  fetchBookmarks,
  fetchStudentCourses,
  fetchStudentProfile,
  fetchStats,
  saveQuiz,
  saveQuizResult,
  updateQuiz,
  deleteQuiz,
  deleteAllQuizzes,
  deleteAllUnattemptedQuizzes,
  deleteAllQuizAttempts,
} from '@/lib/dataService';
import {
  suggestedQuestions,
  type ChatMessage,
  quizzes as defaultQuizzes,
  quizQuestions as defaultQuizQuestions,
} from '@/data/mockData';

function extractJsonBlock(text: string): string | null {
  const trimmed = text.trim();

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const arrayStart = trimmed.indexOf('[');
  const objectStart = trimmed.indexOf('{');
  const start = arrayStart >= 0 && (objectStart < 0 || arrayStart < objectStart) ? arrayStart : objectStart;
  if (start < 0) return null;

  const open = trimmed[start];
  const close = open === '[' ? ']' : '}';
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < trimmed.length; i += 1) {
    const char = trimmed[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (char === open) depth += 1;
    if (char === close) {
      depth -= 1;
      if (depth === 0) {
        return trimmed.slice(start, i + 1);
      }
    }
  }

  return null;
}

function safeJsonParse(text: string): any[] | null {
  const parseCandidate = (candidate: string): any[] | null => {
    try {
      const parsed = JSON.parse(candidate);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed.questions)) return parsed.questions;
        if (Array.isArray(parsed.quiz)) return parsed.quiz;
        if (Array.isArray(parsed.items)) return parsed.items;
        if (parsed.question && Array.isArray(parsed.options)) return [parsed];
      }
      return null;
    } catch {
      return null;
    }
  };

  const direct = parseCandidate(text.trim());
  if (direct) return direct;

  const extracted = extractJsonBlock(text);
  if (!extracted) return null;

  return parseCandidate(extracted);
}

/* ============ QUIZ CENTER ============ */
export function StudentQuizzes() {
  const [view, setView] = useState<'list' | 'preview' | 'take' | 'results'>('list');
  const [activeQuiz, setActiveQuiz] = useState(0);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [quizList, setQuizList] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [allQuestions, setAllQuestions] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [genTopic, setGenTopic] = useState('');
  const [genCount, setGenCount] = useState<number | string>('');
  const [genDifficulty, setGenDifficulty] = useState('');
  const [genTime, setGenTime] = useState<string>('');
  const [genQuestionType, setGenQuestionType] = useState<'MCQ' | 'MSQ' | 'NAT'>('MCQ');
  const [isGenerating, setIsGenerating] = useState(false);
  const [genElapsed, setGenElapsed] = useState(0);
  const [generatedQuiz, setGeneratedQuiz] = useState<{
    title: string;
    questions: any[];
    sourceName?: string;
    isDocumentBased: boolean;
    difficulty: string;
    duration?: number;
    createdAt?: string;
    createdDate?: string;
    questionType?: 'MCQ' | 'MSQ' | 'NAT';
  } | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<{ id: string; name: string; size: number; ready: boolean }[]>([]);
  const [indexedMaterials, setIndexedMaterials] = useState<{ id: string; name: string; status?: string }[]>([]);
  const [selectedIndexedId, setSelectedIndexedId] = useState<string>('all');
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [attemptedQuizzes, setAttemptedQuizzes] = useState<Set<string>>(new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteAllUnattemptedConfirmOpen, setDeleteAllUnattemptedConfirmOpen] = useState(false);
  const [deleteAllHistoryConfirmOpen, setDeleteAllHistoryConfirmOpen] = useState(false);
  const [deletingQuizId, setDeletingQuizId] = useState<string | null>(null);
  const [isDeletingQuiz, setIsDeletingQuiz] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pushToast = useCallback((message: string, tone: ToastData['tone']) => {
    const id = `quiz-toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts(prev => [...prev, { id, message, tone }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const handleDeleteQuiz = async (id: string) => {
    setDeletingQuizId(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteQuiz = async () => {
    if (!deletingQuizId) return;
    const idToDelete = deletingQuizId;
    setIsDeletingQuiz(true);
    try {
      const success = await deleteQuiz(idToDelete);
      setQuizList(prev => prev.filter(q => q.id !== idToDelete));
      setQuestions(prev => prev.filter(question => question.quizId !== idToDelete && question.id !== idToDelete));
      setAllQuestions(prev => prev.filter(question => question.quizId !== idToDelete && question.id !== idToDelete));
      setResults(prev => prev.filter(r => r.quizId !== idToDelete && r.id !== idToDelete));
      setAttemptedQuizzes(current => {
        const next = new Set(current);
        next.delete(idToDelete);
        return next;
      });
      setDeleteConfirmOpen(false);
      setDeletingQuizId(null);
      if (success) {
        pushToast('Quiz deleted successfully.', 'success');
      } else {
        pushToast('Quiz deleted locally.', 'warning');
      }
    } catch (error) {
      console.error('[Quiz] Error while deleting quiz.', { quizId: idToDelete, error });
      pushToast('Failed to delete quiz.', 'error');
    } finally {
      setIsDeletingQuiz(false);
    }
  };

  const confirmDeleteAllUnattempted = async () => {
    try {
      const success = await deleteAllUnattemptedQuizzes();
      setDeleteAllUnattemptedConfirmOpen(false);
      setQuizList(prev => prev.filter(q => q.status === 'completed' || attemptedQuizzes.has(q.id)));
      setGeneratedQuiz(null);
      if (success) {
        pushToast('All unattempted quizzes deleted successfully.', 'success');
      } else {
        pushToast('All unattempted quizzes deleted locally.', 'warning');
      }
    } catch (error) {
      console.error('[Quiz] Error while deleting unattempted quizzes.', error);
      setDeleteAllUnattemptedConfirmOpen(false);
      pushToast('Failed to delete unattempted quizzes.', 'error');
    }
  };

  const confirmDeleteAllHistory = async () => {
    try {
      const success = await deleteAllQuizAttempts();
      setDeleteAllHistoryConfirmOpen(false);
      setQuizList(prev => prev.filter(q => q.status !== 'completed' && !attemptedQuizzes.has(q.id)));
      setResults([]);
      setAttemptedQuizzes(new Set());
      if (success) {
        pushToast('Quiz history cleared successfully.', 'success');
      } else {
        pushToast('Quiz history cleared locally.', 'warning');
      }
    } catch (error) {
      console.error('[Quiz] Error while clearing quiz history.', error);
      setDeleteAllHistoryConfirmOpen(false);
      pushToast('Failed to clear quiz history.', 'error');
    }
  };

  // Helper to extract or resolve questions for any given quiz
  const resolveQuizQuestions = useCallback((quiz: any): any[] => {
    if (!quiz) return [];
    // 1. Direct array of question objects on the quiz
    if (Array.isArray(quiz.questions) && quiz.questions.length > 0 && typeof quiz.questions[0] === 'object') {
      return quiz.questions;
    }
    if (Array.isArray(quiz.questionList) && quiz.questionList.length > 0) {
      return quiz.questionList;
    }
    // 2. Questions in state (allQuestions / questions)
    const stateMatches = allQuestions.filter(q => q.quizId === quiz.id || q.quizId === String(quiz.id));
    if (stateMatches.length > 0) return stateMatches;
    // 3. Fallback from defaultQuizQuestions
    const defaultMatches = defaultQuizQuestions.filter(q => q.quizId === quiz.id || q.quizId === String(quiz.id));
    if (defaultMatches.length > 0) return defaultMatches;
    return [];
  }, [allQuestions]);

  const getQuizQuestionCount = useCallback((quiz: any): number => {
    if (typeof quiz.questionCount === 'number' && quiz.questionCount > 0) return quiz.questionCount;
    if (typeof quiz.questions === 'number' && quiz.questions > 0) return quiz.questions;
    if (Array.isArray(quiz.questions) && quiz.questions.length > 0) return quiz.questions.length;
    const qs = resolveQuizQuestions(quiz);
    if (qs.length > 0) return qs.length;
    return 5;
  }, [resolveQuizQuestions]);

  const getQuizDuration = useCallback((quiz: any): number => {
    if (typeof quiz.duration === 'number') return quiz.duration;
    const count = getQuizQuestionCount(quiz);
    return Math.max(1, count * 2);
  }, [getQuizQuestionCount]);

  const handleReviewUnattemptedQuiz = async (quiz: any) => {
    setSelectedQuiz(quiz);
    let quizQs = resolveQuizQuestions(quiz);
    if (quizQs.length === 0) {
      try {
        const fetched = await fetchQuizQuestions(quiz.id);
        if (Array.isArray(fetched) && fetched.length > 0) {
          quizQs = fetched;
          setAllQuestions(prev => [...prev.filter(q => q.quizId !== quiz.id), ...fetched]);
        }
      } catch (err) {
        console.warn('[Quiz] Could not fetch quiz questions:', err);
      }
    }
    if (quizQs.length === 0) {
      const defaultMatches = defaultQuizQuestions.filter(q => q.quizId === quiz.id);
      if (defaultMatches.length > 0) {
        quizQs = defaultMatches;
      }
    }
    setQuestions(quizQs);
    setGeneratedQuiz({
      title: quiz.title,
      questions: quizQs,
      sourceName: quiz.sourceName || (quiz.course === 'From Indexed Document' ? quiz.title : undefined),
      isDocumentBased: Boolean(quiz.sourceName || quiz.isDocumentBased || quiz.course === 'From Indexed Document'),
      difficulty: quiz.difficulty || 'Medium',
      duration: typeof quiz.duration === 'number' ? quiz.duration : undefined,
    });
    setView('preview');
  };

  const formatQuizCreatedDateTime = useCallback((dateInput: any): string => {
    if (!dateInput) return '';
    if (typeof dateInput === 'string') {
      const trimmed = dateInput.trim();
      if (trimmed.startsWith('created :')) {
        return trimmed;
      }
      const stripped = trimmed.replace(/^created\s*:\s*/i, '').trim();
      const d = new Date(stripped);
      if (!isNaN(d.getTime())) {
        const day = d.getDate();
        const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        const month = months[d.getMonth()];
        const year = d.getFullYear();
        let hours = d.getHours();
        const minutes = d.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'pm' : 'am';
        hours = hours % 12;
        hours = hours ? hours : 12;
        return `created :${day} ${month} ${year} ${hours}:${minutes}${ampm}`;
      }
      const num = Number(trimmed);
      if (!isNaN(num) && num > 1000000000) {
        return formatQuizCreatedDateTime(new Date(num));
      }
      return trimmed;
    }
    const d = new Date(dateInput);
    if (!isNaN(d.getTime())) {
      const day = d.getDate();
      const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      const month = months[d.getMonth()];
      const year = d.getFullYear();
      let hours = d.getHours();
      const minutes = d.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'pm' : 'am';
      hours = hours % 12;
      hours = hours ? hours : 12;
      return `created :${day} ${month} ${year} ${hours}:${minutes}${ampm}`;
    }
    return String(dateInput);
  }, []);

  const cleanQuestionText = useCallback((qStr: string, topicName: string): string => {
    if (!qStr) return '';
    let cleaned = qStr.trim();

    // Strip "Based on the notes material", "Based on notes material", and similar document references
    cleaned = cleaned.replace(/^(?:Based\s+on|According\s+to|From)\s+(?:the\s+)?(?:notes(?:\s+material)?|study\s+material|notes\s+material|uploaded\s+document|provided\s+(?:document|material|notes)|context|text)(?:\s*[,:—–-])?\s*/i, '');
    cleaned = cleaned.replace(/\b(?:based\s+on|according\s+to)\s+(?:the\s+)?(?:notes(?:\s+material)?|study\s+material|notes\s+material|uploaded\s+document|provided\s+(?:document|material))\b/gi, '');

    if (topicName && topicName.trim()) {
      const rawTopic = topicName.trim();
      const subTopics = rawTopic.split(/[—–-]/).map(s => s.trim()).filter(Boolean);
      const topicsToClean = Array.from(new Set([rawTopic, ...subTopics])).filter(t => t.length > 2);

      for (const t of topicsToClean) {
        const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        cleaned = cleaned.replace(
          new RegExp(`^(?:In|Regarding|For|Under|With respect to)\\s+(?:the context of\\s+)?(?:${escaped}|"${escaped}")(?:\\s*[,:—–-])?\\s*`, 'i'),
          ''
        );
        cleaned = cleaned.replace(
          new RegExp(`underlying\\s+(?:${escaped}|"${escaped}")`, 'gi'),
          'underlying this concept'
        );
        cleaned = cleaned.replace(
          new RegExp(`working with\\s+(?:${escaped}|"${escaped}")`, 'gi'),
          'working with this concept'
        );
        cleaned = cleaned.replace(
          new RegExp(`encountered in\\s+(?:${escaped}|"${escaped}")`, 'gi'),
          'encountered in this area'
        );
        cleaned = cleaned.replace(
          new RegExp(`applied to\\s+(?:${escaped}|"${escaped}")`, 'gi'),
          'applied in practice'
        );
        cleaned = cleaned.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), 'the subject');
      }
    }
    if (cleaned.length > 0) {
      cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }
    return cleaned;
  }, []);

  const formatQuizDate = useCallback((quiz: any): string => {
    if (quiz.createdAt) {
      const formatted = formatQuizCreatedDateTime(quiz.createdAt);
      if (formatted) return formatted;
    }
    if (quiz.createdDate) {
      const formatted = formatQuizCreatedDateTime(quiz.createdDate);
      if (formatted) return formatted;
    }
    if (quiz.dueDate) {
      if (quiz.dueDate.startsWith('created :')) {
        return quiz.dueDate;
      }
      const parsed = formatQuizCreatedDateTime(quiz.dueDate);
      if (parsed && parsed.startsWith('created :')) {
        return parsed;
      }
    }
    return formatQuizCreatedDateTime(new Date());
  }, [formatQuizCreatedDateTime]);

  const getQuizSubmittedTime = useCallback((quiz: any): string => {
    const rawTime = quiz.submittedAt || quiz.completedAt;
    if (rawTime) {
      try {
        const d = new Date(rawTime);
        if (!isNaN(d.getTime())) {
          return d.toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
        }
      } catch {
        // continue
      }
    }

    const matchedResult = results.find(
      (r: any) => (r.quizId && r.quizId === quiz.id) || (r.id && r.id === quiz.id)
    );
    const resultTime = matchedResult?.completedAt || matchedResult?.submittedAt || matchedResult?.createdAt;
    if (resultTime) {
      try {
        const d = new Date(resultTime);
        if (!isNaN(d.getTime())) {
          return d.toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
        }
      } catch {
        // continue
      }
    }

    if (quiz.submittedTime) return quiz.submittedTime;

    if (quiz.dueDate && typeof quiz.dueDate === 'string') {
      const cleaned = quiz.dueDate.replace(/^Completed\s*/i, '').trim();
      return cleaned || quiz.dueDate;
    }

    return 'Recently submitted';
  }, [results]);

  const handleAttemptUnattemptedQuiz = async (quiz: any) => {
    setSelectedQuiz(quiz);
    let quizQs = resolveQuizQuestions(quiz);
    if (quizQs.length === 0) {
      try {
        const fetched = await fetchQuizQuestions(quiz.id);
        if (Array.isArray(fetched) && fetched.length > 0) {
          quizQs = fetched;
          setAllQuestions(prev => [...prev.filter(q => q.quizId !== quiz.id), ...fetched]);
        }
      } catch (err) {
        console.warn('[Quiz] Could not fetch quiz questions:', err);
      }
    }
    if (quizQs.length === 0) {
      const defaultMatches = defaultQuizQuestions.filter(q => q.quizId === quiz.id);
      if (defaultMatches.length > 0) {
        quizQs = defaultMatches;
      }
    }
    setQuestions(quizQs);
    setActiveQuiz(0);
    setAnswers({});
    setShowReview(false);
    const durationMin = getQuizDuration(quiz);
    setRemainingSeconds(durationMin > 0 ? durationMin * 60 : 0);
    setView('take');
  };

  const reviewQuiz = (quiz: any) => {
    let quizQs = resolveQuizQuestions(quiz);
    const quizResults = results.filter(result => result.quizId === quiz.id || result.id === quiz.id);
    setSelectedQuiz(quiz);
    if (quizQs.length > 0) {
      setQuestions(quizQs);
    } else if (quizResults[0]?.answers && Array.isArray(quizResults[0].answers)) {
      setQuestions(quizResults[0].answers);
    } else {
      const sourceQuestions = allQuestions.length > 0 ? allQuestions : questions;
      const filtered = sourceQuestions.filter(question => question.quizId === quiz.id || question.quizId == null);
      if (filtered.length > 0) setQuestions(filtered);
    }
    setResults(quizResults);

    const answersMap: Record<number, any> = {};
    const attemptAnswers = quizResults[0]?.answers;
    if (Array.isArray(attemptAnswers)) {
      attemptAnswers.forEach((ans: any, idx: number) => {
        if (ans.chosenIdx !== undefined) {
          answersMap[idx] = ans.chosenIdx;
        }
      });
    }
    setAnswers(answersMap);
    setShowReview(true);
    setView('results');
  };

  const deleteDialogs = (
    <>
      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete Quiz"
        description="Are you sure you want to delete this quiz?"
        confirmLabel="Delete"
        confirmVariant="danger"
        loading={isDeletingQuiz}
        onConfirm={confirmDeleteQuiz}
        onCancel={() => { setDeleteConfirmOpen(false); setDeletingQuizId(null); }}
      />
      <ConfirmDialog
        open={deleteAllUnattemptedConfirmOpen}
        title="Delete All Unattempted Quizzes"
        description="Are you sure you want to delete all your unattempted quizzes? This will not affect your completed quiz history."
        confirmLabel="Delete All"
        confirmVariant="danger"
        loading={false}
        onConfirm={confirmDeleteAllUnattempted}
        onCancel={() => setDeleteAllUnattemptedConfirmOpen(false)}
      />
      <ConfirmDialog
        open={deleteAllHistoryConfirmOpen}
        title="Delete All Quiz History"
        description="Are you sure you want to delete all your quiz history? This will not affect your unattempted quizzes."
        confirmLabel="Delete All"
        confirmVariant="danger"
        loading={false}
        onConfirm={confirmDeleteAllHistory}
        onCancel={() => setDeleteAllHistoryConfirmOpen(false)}
      />
    </>
  );

  const currentUserId = getCurrentUserId();
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [q, qq, qr] = await Promise.all([
          fetchQuizzes(),
          fetchQuizQuestions(),
          fetchQuizResults(),
        ]);
        if (!cancelled) {
          const loadedQuizzes = Array.isArray(q) && q.length > 0 ? q : defaultQuizzes;
          const loadedQuestions = Array.isArray(qq) ? qq : [];
          const loadedResults = Array.isArray(qr) ? qr : [];
          const mergedQuestions = [
            ...loadedQuestions,
            ...defaultQuizQuestions.filter(dq => !loadedQuestions.some(lq => (lq.id && lq.id === dq.id) || (lq.quizId && lq.quizId === dq.quizId && lq.question === dq.question)))
          ];
          setQuizList(loadedQuizzes);
          setQuestions(loadedQuestions.length > 0 ? loadedQuestions : mergedQuestions);
          setAllQuestions(mergedQuestions);
          setResults(loadedResults);
          const attempted = new Set(
            loadedResults.map((r: any) => r.quizId || r.id).filter(Boolean)
              .concat(loadedQuizzes.filter((quiz: any) => quiz.status === 'completed').map((quiz: any) => quiz.id))
          );
          setAttemptedQuizzes(attempted);
        }
      } catch (err) {
        console.warn('[StudentQuizzes] Failed to load data:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [currentUserId]);

  // Load already-indexed materials so the user can generate a quiz from a
  // previously indexed PDF without having to re-upload it.
  useEffect(() => {
    let cancelled = false;
    let isFetching = false;
    let controller: AbortController | null = null;

    const loadMaterials = async () => {
      if (isFetching || cancelled) return;
      isFetching = true;
      controller = new AbortController();
      try {
        const token = typeof window !== 'undefined' ? window.localStorage.getItem('edurag-auth-token') : null;
        const res = await fetch('http://localhost:8000/api/materials', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = await res.json();
        const list: any[] = Array.isArray(data) ? data : (data?.materials ?? []);
        if (!cancelled) {
          const mapped: { id: string; name: string; status?: string }[] = [];
          const seen = new Set<string>();
          list.forEach((m: any) => {
            const id = m.id || m._id;
            const name = m.name || m.documentName || m.filename || m.title;
            if (id && name && !seen.has(name.toLowerCase())) {
              seen.add(name.toLowerCase());
              mapped.push({ id: String(id), name: String(name), status: m.status });
            }
          });
          setIndexedMaterials(mapped);
        }
      } catch {
        // aborted or backend offline — silently ignore
      } finally {
        isFetching = false;
      }
    };

    loadMaterials();
    const pollInterval = window.setInterval(loadMaterials, 10000);
    const onFocus = () => { loadMaterials(); };
    window.addEventListener('focus', onFocus);

    return () => {
      cancelled = true;
      if (controller) controller.abort();
      window.clearInterval(pollInterval);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

useEffect(() => {
    if (results.length > 0) {
      setAttemptedQuizzes(current => {
        const next = new Set(current);
        results.forEach((r: any) => {
          if (r.quizId) next.add(r.quizId);
          if (r.id) next.add(r.id);
        });
        return next;
      });
    }
  }, [results]);

  useEffect(() => {
    if (view !== 'take' || remainingSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setRemainingSeconds(value => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [view, remainingSeconds]);

  // Tick elapsed seconds while quiz is being generated so the user can see
  // progress instead of wondering if it has frozen.
  useEffect(() => {
    if (!isGenerating) { setGenElapsed(0); return; }
    setGenElapsed(0);
    const timer = window.setInterval(() => setGenElapsed(s => s + 1), 1000);
    return () => window.clearInterval(timer);
  }, [isGenerating]);

  const uploadDocument = async (file: File) => {
    setUploadStatus(`Uploading ${file.name}…`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300_000);

    try {
      const formData = new FormData();
      formData.append('file', file, file.name);
      formData.append('studentId', getCurrentUserId());
      formData.append('course', 'Quiz study material');

      setUploadStatus(`Uploading ${file.name} — extracting text…`);

      const token = typeof window !== 'undefined' ? window.localStorage.getItem('edurag-auth-token') : null;
      const res = await fetch('http://localhost:8000/api/materials/upload', {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await res.json();
      if (!res.ok || !data.success || !data.material) {
        throw new Error(data.error || 'The document could not be uploaded.');
      }

      const material = data.material;
      // Add with ready:true — indexing is done server-side before the response returns.
      setUploadedFiles(prev => [...prev, { id: material.id, name: material.name, size: file.size, ready: true }]);
      setIndexedMaterials(prev => {
        if (prev.some(m => m.id === material.id || m.name.toLowerCase() === material.name.toLowerCase())) {
          return prev;
        }
        return [{ id: material.id, name: material.name, status: 'ready' }, ...prev];
      });
      setSelectedIndexedId(material.id);
      setUploadStatus(`✓ ${file.name} indexed and ready.`);
      pushToast(`"${file.name}" indexed successfully. Generating quiz…`, 'success');
      // Return the material so the caller can immediately trigger quiz generation.
      return material;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setUploadStatus('Upload timed out. The file may be too large or the server is busy.');
        pushToast('Upload timed out. Please try again with a smaller file.', 'error');
      } else {
        let message = error instanceof Error ? error.message : 'The document could not be uploaded.';
        if (message.includes('ERR_FILE_NO_SPACE') || message.toLowerCase().includes('failed to fetch')) {
          message = 'Upload failed: Drive C: is out of disk space (net::ERR_FILE_NO_SPACE). Please free up space on Drive C: and retry.';
        }
        setUploadStatus(message);
        pushToast(message, 'error');
      }
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const generateQuiz = async (overrideMaterialId?: string, overrideMaterialName?: string) => {
    // Determine which material to use: freshly uploaded > already-indexed selection > topic match
    const isAllDocs = selectedIndexedId === 'all';
    let activeMaterialId = overrideMaterialId
      ?? (uploadedFiles.length > 0 ? uploadedFiles[0].id : (isAllDocs ? 'all' : (selectedIndexedId || null)));
    let activeMaterialName = overrideMaterialName
      ?? (uploadedFiles.length > 0
        ? uploadedFiles[0].name
        : (isAllDocs
            ? (indexedMaterials.length > 0 ? 'All Indexed Documents' : '')
            : (selectedIndexedId ? (indexedMaterials.find(m => String(m.id) === String(selectedIndexedId) || m.name === selectedIndexedId)?.name ?? '') : '')));

    // If no document was explicitly selected, check if genTopic itself references an indexed document or has .pdf extension
    if (!activeMaterialName) {
      const topicLower = genTopic.trim().toLowerCase();
      const matched = indexedMaterials.find(m => {
        const mLower = m.name.toLowerCase();
        return mLower === topicLower ||
          mLower.replace(/\.[^/.]+$/, '') === topicLower.replace(/\.[^/.]+$/, '') ||
          topicLower.includes(mLower) ||
          mLower.includes(topicLower);
      });
      if (matched) {
        activeMaterialId = activeMaterialId || matched.id;
        activeMaterialName = matched.name;
      } else if (topicLower.endsWith('.pdf')) {
        activeMaterialName = genTopic.trim();
      }
    }

    const isDocBased = Boolean(
      (activeMaterialId && activeMaterialId !== 'all') ||
      (isAllDocs && indexedMaterials.length > 0) ||
      activeMaterialName ||
      genTopic.trim().toLowerCase().endsWith('.pdf')
    );
    const finalSourceName = isAllDocs
      ? (indexedMaterials.length > 0 ? 'All Indexed Documents' : undefined)
      : (activeMaterialName || (genTopic.trim().toLowerCase().endsWith('.pdf') ? genTopic.trim() : undefined));

    if (!genTopic.trim()) {
      setGenError('Topic / Chapter is required.');
      pushToast('Topic / Chapter is required.', 'error');
      return;
    }
    const countNum = Number(genCount);
    if (!genCount || isNaN(countNum) || countNum < 1) {
      setGenError('Questions count is required.');
      pushToast('Questions count is required.', 'error');
      return;
    }
    if (!genDifficulty.trim()) {
      setGenError('Difficulty is required.');
      pushToast('Difficulty is required.', 'error');
      return;
    }

    const parsedTime = genTime.trim() ? Math.max(0, parseInt(genTime, 10) || 0) : 0;
    const effectiveDuration = parsedTime > 0 ? parsedTime : 0;

    setIsGenerating(true);
    setGeneratedQuiz(null);
    setGenError(null);

    const controller = new AbortController();
    // The backend returns its local fallback within 15 seconds if the provider
    // is slow. Leave a little transport headroom without blocking the UI long.
    const timeoutId = setTimeout(() => controller.abort(), 30_000);

    try {
      const effectiveTopic = finalSourceName
        ? (genTopic.trim() && genTopic.trim().toLowerCase() !== finalSourceName.toLowerCase()
            ? `${finalSourceName} — ${genTopic.trim()}`
            : finalSourceName)
        : genTopic.trim();

      const token = typeof window !== 'undefined' ? window.localStorage.getItem('edurag-auth-token') : null;

      // Hit the dedicated quiz endpoint — no chat overhead, no history lookup,
      // no extractive-answer pass, no material_name_map scan.
      const res = await fetch('http://localhost:8000/api/quiz/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: 'Bearer ' + token } : {}),
        },
        body: JSON.stringify({
          userId: getCurrentUserId(),
          role: getCurrentUserRole(),
          topic: genTopic.trim() || activeMaterialName || 'All Documents',
          difficulty: genDifficulty,
          count: countNum,
          questionType: genQuestionType,
          materialIds: activeMaterialId === 'all'
            ? indexedMaterials.map(m => m.id)
            : (activeMaterialId ? [activeMaterialId] : []),
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let data: any;
      try {
        const rawResponse = await res.text();
        data = JSON.parse(rawResponse);
      } catch (error) {
        console.error('[Quiz] Generation API returned an invalid response.', {
          status: res.status,
          statusText: res.statusText,
          error,
        });
        throw new Error(`Server returned an unexpected response (HTTP ${res.status}). Is the backend running?`);
      }

      if (!res.ok || !data.success) {
        console.error('[Quiz] Generation API failed.', {
          status: res.status,
          statusText: res.statusText,
          response: data,
          topic: genTopic.trim(),
          materialId: activeMaterialId,
        });
        throw new Error(data.error || `Quiz generation failed (HTTP ${res.status}).`);
      }
      if (!data.answer) {
        console.error('[Quiz] Generation API returned no quiz content.', { response: data });
        throw new Error('The backend returned an empty response. Please try again.');
      }

      const parsed = safeJsonParse(data.answer);
      if (!parsed || parsed.length === 0) {
        console.error('[Quiz] Generated quiz could not be parsed.', {
          answerPreview: String(data.answer).slice(0, 1000),
          answerLength: String(data.answer).length,
        });
        throw new Error('The AI returned an unexpected format. Please try again.');
      }

      const ts = Date.now();
      const generatedId = `gq-${ts}`;
      let rawItems = Array.isArray(parsed) ? parsed : [];
      if (rawItems.length < countNum) {
        const needed = countNum - rawItems.length;
        for (let i = 0; i < needed; i++) {
          const qIdx = rawItems.length + 1;
          if (genQuestionType === 'NAT') {
            rawItems.push({
              question: `What is the standard numerical value associated with configuration rule #${qIdx}?`,
              type: 'NAT',
              correct: qIdx * 10,
              options: [],
              explanation: `Standard specification sets the parameter value to ${qIdx * 10}.`,
            });
          } else if (genQuestionType === 'MSQ') {
            rawItems.push({
              question: `Which of the following practices are recommended for building maintainable systems (rule #${qIdx})?`,
              type: 'MSQ',
              options: [
                'Comprehensive automated testing and boundary validation',
                'Modular architectural decomposition',
                'Hardcoding secret parameters and bypassing assertions',
                'Clear error propagation and logging'
              ],
              correct: [0, 1, 3],
              explanation: 'Testing, modularity, and error handling are foundational engineering practices.',
            });
          } else {
            rawItems.push({
              question: `Which practice best aligns with ${genDifficulty || 'standard'} requirements for concept #${qIdx}?`,
              type: 'MCQ',
              options: [
                'Structured modular implementation with boundary validation',
                'Arbitrary unvalidated runtime parameters',
                'Disabling boundary checking and exception monitoring',
                'Omitting state management and concurrency controls'
              ],
              correct: 0,
              explanation: 'Structured modular implementation with validation is required.',
            });
          }
        }
      }

      const normalized = rawItems.slice(0, countNum).map((item: any, idx: number) => {
        const itemType: 'MCQ' | 'MSQ' | 'NAT' = (item.type || genQuestionType || 'MCQ').toUpperCase() as any;
        const rawQ = String(item.question || `Question ${idx + 1}`);
        const cleanedQ = cleanQuestionText(rawQ, genTopic) || `Question ${idx + 1}`;

        if (itemType === 'NAT') {
          const correctNum = typeof item.correct === 'number'
            ? item.correct
            : (parseFloat(item.correct) || (item.numericalAnswer !== undefined ? parseFloat(item.numericalAnswer) : 0) || 0);
          return {
            id: `gq-${ts}-${idx}`,
            quizId: generatedId,
            question: cleanedQ,
            type: 'NAT',
            options: [],
            correct: correctNum,
            explanation: item.explanation || '',
          };
        }

        if (itemType === 'MSQ') {
          const rawCorrect = Array.isArray(item.correct)
            ? item.correct.map(Number)
            : [Math.max(0, Math.min(3, Number(item.correct) || 0))];
          return {
            id: `gq-${ts}-${idx}`,
            quizId: generatedId,
            question: cleanedQ,
            type: 'MSQ',
            options: Array.isArray(item.options) && item.options.length >= 4
              ? item.options.slice(0, 4)
              : ['Option A', 'Option B', 'Option C', 'Option D'],
            correct: rawCorrect,
            explanation: item.explanation || '',
          };
        }

        // Default MCQ
        return {
          id: `gq-${ts}-${idx}`,
          quizId: generatedId,
          question: cleanedQ,
          type: 'MCQ',
          options: Array.isArray(item.options) && item.options.length >= 4
            ? item.options.slice(0, 4)
            : ['Option A', 'Option B', 'Option C', 'Option D'],
          correct: Math.max(0, Math.min(3, Number(item.correct) || 0)),
          explanation: item.explanation || '',
        };
      });

      const now = new Date(ts);
      const createdDateLabel = formatQuizCreatedDateTime(now);
      const nowIso = now.toISOString();

      const generatedTitle = `${effectiveTopic} Quiz`;
      const quizRecord = {
        id: generatedId,
        title: generatedTitle,
        course: isDocBased ? 'From Indexed Document' : 'AI Generated',
        questions: normalized.length,
        questionCount: normalized.length,
        duration: effectiveDuration,
        status: 'upcoming',
        dueDate: createdDateLabel,
        createdAt: nowIso,
        createdDate: createdDateLabel,
        topic: effectiveTopic,
        userId: getCurrentUserId(),
        difficulty: genDifficulty,
        questionType: genQuestionType,
        sourceName: finalSourceName,
        isDocumentBased: isDocBased,
      };

      // ── Show the quiz card immediately, save to backend in the background ──
      setGeneratedQuiz({
        title: generatedTitle,
        questions: normalized,
        sourceName: finalSourceName,
        isDocumentBased: isDocBased,
        difficulty: genDifficulty,
        duration: effectiveDuration,
        createdAt: nowIso,
        createdDate: createdDateLabel,
        questionType: genQuestionType,
      });
      setQuestions(normalized);
      setAllQuestions(current => [
        ...normalized,
        ...current.filter(q => q.quizId !== generatedId),
      ]);
      setQuizList(current => [
        {
          id: generatedId,
          title: generatedTitle,
          course: isDocBased ? 'From Indexed Document' : 'AI Generated',
          questions: normalized.length,
          questionCount: normalized.length,
          duration: effectiveDuration,
          status: 'upcoming',
          dueDate: createdDateLabel,
          createdAt: nowIso,
          createdDate: createdDateLabel,
          topic: effectiveTopic,
          difficulty: genDifficulty,
          questionType: genQuestionType,
          sourceName: finalSourceName,
          isDocumentBased: isDocBased,
        },
        ...current.filter(q => q.id !== generatedId),
      ]);
      pushToast(
        'Quiz generated successfully.',
        'success',
      );

      // Blank out all generator input fields upon successful quiz generation
      setGenTopic('');
      setGenCount('');
      setGenDifficulty('');
      setGenTime('');
      setGenQuestionType('MCQ');
      setSelectedIndexedId('all');
      setUploadedFiles([]);

      // Non-blocking persistence — user already sees the quiz card.
      saveQuiz(quizRecord, normalized).catch(e =>
        console.warn('[Quiz] Background save failed:', e),
      );
    } catch (err) {
      clearTimeout(timeoutId);
      console.error('[Quiz] Quiz generation failed.', {
        topic: genTopic.trim(),
        materialId: activeMaterialId,
        difficulty: genDifficulty,
        questionCount: genCount,
        error: err,
      });
      const message =
        err instanceof DOMException && err.name === 'AbortError'
          ? 'Quiz generation timed out. The backend may be busy — please try again.'
          : err instanceof Error
            ? err.message
            : 'Failed to generate quiz. Please try again.';
      setGenError(message);
      pushToast(message, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmitQuiz = async () => {
    const targetQuestions = questions.length > 0 ? questions : (generatedQuiz?.questions ?? []);
    if (targetQuestions.length === 0) return;
    const completedQuizId = selectedQuiz?.id || targetQuestions[0]?.quizId || targetQuestions[0]?.id;
    const computed = targetQuestions.map((q: any, idx: number) => {
      const qType = (q.type || q.questionType || selectedQuiz?.questionType || generatedQuiz?.questionType || 'MCQ').toUpperCase();
      const chosen = answers[idx];

      if (qType === 'NAT') {
        const correctNum = typeof q.correct === 'number'
          ? q.correct
          : (parseFloat(String(q.correct)) || (q.numericalAnswer !== undefined ? parseFloat(String(q.numericalAnswer)) : 0) || 0);
        const userStr = chosen !== undefined && chosen !== null ? String(chosen).trim() : '';
        const userNum = userStr !== '' ? parseFloat(userStr) : NaN;
        const isCorrect = !isNaN(userNum) && Math.abs(userNum - correctNum) < 0.001;
        return {
          id: `qr-${q.id || idx}`,
          quizId: completedQuizId,
          questionId: q.id,
          question: q.question,
          options: [],
          type: 'NAT',
          chosenIdx: chosen,
          yourAnswer: userStr !== '' ? userStr : 'Not answered',
          correctAnswer: String(correctNum),
          correct: isCorrect,
          explanation: q.explanation || '',
        };
      }

      if (qType === 'MSQ') {
        const correctArr: number[] = Array.isArray(q.correct)
          ? q.correct.map(Number)
          : [Number(q.correct) || 0];
        const chosenArr: number[] = Array.isArray(chosen)
          ? chosen.map(Number)
          : chosen !== undefined ? [Number(chosen)] : [];

        const isCorrect = correctArr.length > 0 &&
          correctArr.length === chosenArr.length &&
          correctArr.every(val => chosenArr.includes(val));
        const opts = q.options || [];
        return {
          id: `qr-${q.id || idx}`,
          quizId: completedQuizId,
          questionId: q.id,
          question: q.question,
          options: opts,
          type: 'MSQ',
          chosenIdx: chosenArr,
          yourAnswer: chosenArr.length > 0 ? chosenArr.map(i => opts[i] || String.fromCharCode(65 + i)).join(', ') : 'Not answered',
          correctIdx: correctArr,
          correctAnswer: correctArr.map(i => opts[i] || String.fromCharCode(65 + i)).join(', '),
          correct: isCorrect,
          explanation: q.explanation || '',
        };
      }

      // MCQ
      const correctIdx = typeof q.correct === 'number'
        ? q.correct
        : typeof q.correct === 'string'
          ? (['A', 'B', 'C', 'D'].indexOf(q.correct.toUpperCase()) >= 0
            ? ['A', 'B', 'C', 'D'].indexOf(q.correct.toUpperCase())
            : parseInt(q.correct, 10) || 0)
          : 0;
      const chosenText = chosen !== undefined && q.options && q.options[chosen] ? q.options[chosen] : 'Not answered';
      return {
        id: `qr-${q.id || idx}`,
        quizId: completedQuizId,
        questionId: q.id,
        question: q.question,
        options: q.options || [],
        type: 'MCQ',
        chosenIdx: chosen,
        yourAnswer: chosenText,
        correctIdx,
        correctAnswer: q.options && q.options[correctIdx] ? q.options[correctIdx] : '',
        correct: chosen === correctIdx,
        explanation: q.explanation || '',
      };
    });
    const score = computed.length
      ? Math.round((computed.filter((item: any) => item.correct).length / computed.length) * 100)
      : 0;
    const now = new Date();
    const nowIso = now.toISOString();
    const formattedSubmittedTime = now.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const completedQuiz = quizList.find(quiz => quiz.id === completedQuizId);
    const updatedQuiz = completedQuiz
      ? {
          ...completedQuiz,
          status: 'completed',
          score,
          completedAt: nowIso,
          submittedAt: nowIso,
          submittedTime: formattedSubmittedTime,
          dueDate: `Submitted: ${formattedSubmittedTime}`,
        }
      : null;

    setResults(computed);
    setAttemptedQuizzes(current => new Set(current).add(completedQuizId));
    if (updatedQuiz) {
      setSelectedQuiz(updatedQuiz);
      setQuizList(current => current.map(quiz => quiz.id === completedQuizId ? updatedQuiz : quiz));
      updateQuiz(updatedQuiz).catch(error =>
        console.warn('[Quiz] Could not save completed quiz status:', error),
      );
    }
    await saveQuizResult({
      id: `result-${Date.now()}`,
      quizId: completedQuizId,
      userId: getCurrentUserId(),
      score,
      answers: computed,
      completedAt: nowIso,
      submittedAt: nowIso,
    });
    setShowReview(false);
    setView('results');
  };

  if (view === 'preview') {
    const previewQuestions = (questions.length > 0 ? questions : (generatedQuiz?.questions ?? []));
    const activeTitle = selectedQuiz?.title || generatedQuiz?.title || 'Review All Questions';
    const activeCourse = selectedQuiz?.course || (generatedQuiz?.isDocumentBased ? 'From Indexed Document' : 'AI Generated');
    const activeTopic = selectedQuiz?.topic;
    const activeDifficulty = selectedQuiz?.difficulty || generatedQuiz?.difficulty || 'Medium';
    const activeDocName = selectedQuiz?.sourceName || generatedQuiz?.sourceName;
    const activeDuration = selectedQuiz?.duration !== undefined
      ? selectedQuiz.duration
      : (generatedQuiz?.duration !== undefined ? generatedQuiz.duration : Math.max(1, previewQuestions.length * 2));
    const durationLabel = activeDuration === 0 ? 'Untimed (No time limit)' : `${activeDuration} min`;

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold font-display text-neutral-900">{activeTitle}</h1>
              <Badge tone={activeDifficulty === 'Easy' ? 'success' : activeDifficulty === 'Hard' ? 'error' : 'primary'}>
                {activeDifficulty}
              </Badge>
              {activeDocName && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                  <FileText className="h-3 w-3" aria-hidden="true" />
                  {activeDocName}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-neutral-500">
              <span className="font-medium text-neutral-700">{activeCourse}</span>
              {activeTopic ? ` · ${activeTopic}` : ''} · {previewQuestions.length} Questions · {durationLabel} · Review all questions, options, and correct answers before starting.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" icon={ChevronLeft} onClick={() => setView('list')}>
              Back to Quizzes
            </Button>
            <Button
              size="sm"
              icon={Play}
              onClick={() => {
                if (selectedQuiz) setSelectedQuiz(selectedQuiz);
                setQuestions(previewQuestions);
                setView('take');
                setActiveQuiz(0);
                setAnswers({});
                setRemainingSeconds(activeDuration > 0 ? activeDuration * 60 : 0);
              }}
            >
              Start Quiz
            </Button>
          </div>
        </div>

        {previewQuestions.length === 0 ? (
          <Card className="border-neutral-200 shadow-sm">
            <CardBody>
              <EmptyState
                icon={HelpCircle}
                title="No questions found"
                description="This quiz does not have any questions available to preview."
                action={
                  <Button variant="outline" size="sm" icon={ChevronLeft} onClick={() => setView('list')}>
                    Back to Quizzes
                  </Button>
                }
              />
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-4">
            {previewQuestions.map((question: any, index: number) => {
              const qType = (question.type || selectedQuiz?.questionType || generatedQuiz?.questionType || 'MCQ').toUpperCase();
              const isNAT = qType === 'NAT';
              const isMSQ = qType === 'MSQ';
              const correctIndices: number[] = Array.isArray(question.correct)
                ? question.correct.map(Number)
                : typeof question.correct === 'number'
                  ? [question.correct]
                  : typeof question.correct === 'string' && ['A', 'B', 'C', 'D'].indexOf(question.correct.toUpperCase()) >= 0
                    ? [['A', 'B', 'C', 'D'].indexOf(question.correct.toUpperCase())]
                    : [parseInt(question.correct, 10) || 0];

              const opts = Array.isArray(question.options) ? question.options : [];
              return (
                <Card key={question.id ?? index} className="border-neutral-200 shadow-sm">
                  <CardBody>
                    <div className="flex items-start gap-3">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 border border-neutral-200">
                            {qType}
                          </span>
                        </div>
                        <p className="font-semibold leading-relaxed text-neutral-900">{question.question}</p>

                        {isNAT ? (
                          <div className="mt-3 p-3.5 rounded-xl border border-neutral-200 bg-neutral-50 text-sm">
                            <span className="font-semibold text-neutral-700">Correct Numerical Value: </span>
                            <span className="font-mono font-bold text-success-700 ml-1">
                              {question.correct !== undefined ? String(question.correct) : (question.numericalAnswer || 'N/A')}
                            </span>
                          </div>
                        ) : (
                          <div className="mt-4 grid gap-2 sm:grid-cols-2">
                            {opts.map((option: string, optionIndex: number) => {
                              const isCorrect = correctIndices.includes(optionIndex);
                              return (
                                <div
                                  key={`${question.id ?? index}-${optionIndex}`}
                                  className={cn(
                                    'flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors',
                                    isCorrect
                                      ? 'border-success-300 bg-success-50 text-success-800 font-medium'
                                      : 'border-neutral-200 bg-white text-neutral-700',
                                  )}
                                >
                                  <span className={cn(
                                    'grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold',
                                    isCorrect ? 'bg-success-600 text-white' : 'bg-neutral-100 text-neutral-600',
                                  )}>
                                    {String.fromCharCode(65 + optionIndex)}
                                  </span>
                                  <span className="flex-1">{option}</span>
                                  {isCorrect && <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-success-600" aria-label="Correct answer" />}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {!isNAT && correctIndices.length > 0 && opts.length > 0 && (
                          <p className="mt-3 text-xs font-semibold text-success-700 flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Correct answer: {correctIndices.map(ci => `Option ${String.fromCharCode(65 + ci)} (${opts[ci]})`).join(', ')}
                          </p>
                        )}
                        {question.explanation && (
                          <div className="mt-2 text-xs text-neutral-600 bg-neutral-50 rounded-lg p-2.5 border border-neutral-200">
                            <span className="font-semibold text-neutral-700">Explanation: </span>
                            {question.explanation}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (view === 'take') {
    const targetQuestions = questions;
    const q = targetQuestions[activeQuiz] || targetQuestions[0];
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" icon={ChevronLeft} onClick={() => setView('list')}>Back to Quizzes</Button>
          <div className="flex items-center gap-2 text-sm text-neutral-500 font-medium">
            <Clock className="h-4.5 w-4.5 text-primary-500" />
            {selectedQuiz?.duration === 0 || (remainingSeconds === 0 && selectedQuiz?.duration === 0) ? (
              <span className="font-semibold text-primary-700">Untimed (No time limit)</span>
            ) : (
              <span>{Math.floor(remainingSeconds / 60).toString().padStart(2, '0')}:{(remainingSeconds % 60).toString().padStart(2, '0')}</span>
            )}
          </div>
        </div>
        <Card className="max-w-3xl mx-auto border-neutral-200 shadow-lg">
          <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/50">
            <span className="text-sm font-semibold text-neutral-600">Question {activeQuiz + 1} of {targetQuestions.length}</span>
            <Progress value={((activeQuiz + 1) / targetQuestions.length) * 100} size="sm" className="w-32" />
          </div>
          <CardBody>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 border border-neutral-200">
                {(q.type || selectedQuiz?.questionType || generatedQuiz?.questionType || 'MCQ').toUpperCase()}
              </span>
            </div>
            <h2 className="text-lg font-display font-bold text-neutral-900 mb-6">{q.question}</h2>

            {(() => {
              const qType = (q.type || selectedQuiz?.questionType || generatedQuiz?.questionType || 'MCQ').toUpperCase();

              if (qType === 'NAT') {
                return (
                  <div className="space-y-4">
                    <div className="p-5 rounded-xl border border-neutral-200 bg-neutral-50/50">
                      <label className="text-sm font-semibold text-neutral-800 block mb-2">
                        Enter Numerical Answer:
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={answers[activeQuiz] !== undefined ? answers[activeQuiz] : ''}
                        onChange={e => setAnswers(a => ({ ...a, [activeQuiz]: e.target.value }))}
                        placeholder="Type numerical value (e.g. 42 or 3.14)"
                        className="w-full max-w-sm px-4 py-3 rounded-xl border border-neutral-300 text-lg font-mono outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                        autoFocus
                      />
                      <p className="mt-2 text-xs text-neutral-500">
                        Numerical Answer Type (NAT) — Enter the numerical value directly without units.
                      </p>
                    </div>
                  </div>
                );
              }

              if (qType === 'MSQ') {
                const selectedArr: number[] = Array.isArray(answers[activeQuiz])
                  ? answers[activeQuiz]
                  : answers[activeQuiz] !== undefined ? [Number(answers[activeQuiz])] : [];
                return (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-primary-700 bg-primary-50 px-3 py-1.5 rounded-lg border border-primary-200 inline-block mb-1">
                      Multiple Select Question (MSQ) — One or more options may be correct.
                    </p>
                    {q.options.map((opt: string, i: number) => {
                      const isSelected = selectedArr.includes(i);
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            const next = isSelected
                              ? selectedArr.filter(idx => idx !== i)
                              : [...selectedArr, i].sort();
                            setAnswers(a => ({ ...a, [activeQuiz]: next }));
                          }}
                          className={cn(
                            'w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-all bg-white',
                            isSelected ? 'border-primary-400 bg-primary-50 shadow-md shadow-primary-500/10' : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50',
                          )}
                        >
                          <div className={cn(
                            'grid place-items-center h-5 w-5 rounded border text-xs font-bold shrink-0 transition-colors',
                            isSelected ? 'bg-primary-600 border-primary-600 text-white' : 'border-neutral-300 bg-white text-transparent'
                          )}>
                            ✓
                          </div>
                          <span className={cn('grid place-items-center h-8 w-8 rounded-full text-sm font-bold shrink-0', isSelected ? 'bg-primary-600 text-white shadow-sm' : 'bg-neutral-100 text-neutral-600')}>
                            {String.fromCharCode(65 + i)}
                          </span>
                          <span className="text-sm text-neutral-800 font-medium">{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                );
              }

              // Default MCQ
              return (
                <div className="space-y-3">
                  {q.options.map((opt: string, i: number) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setAnswers(a => ({ ...a, [activeQuiz]: i }))}
                      className={cn(
                        'w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-all bg-white',
                        answers[activeQuiz] === i ? 'border-primary-400 bg-primary-50 shadow-md shadow-primary-500/10' : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50',
                      )}
                    >
                      <span className={cn('grid place-items-center h-8 w-8 rounded-full text-sm font-bold shrink-0', answers[activeQuiz] === i ? 'bg-primary-600 text-white shadow-sm' : 'bg-neutral-100 text-neutral-600')}>
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span className="text-sm text-neutral-800 font-medium">{opt}</span>
                    </button>
                  ))}
                </div>
              );
            })()}
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-neutral-200">
              <Button variant="outline" size="md" disabled={activeQuiz === 0} onClick={() => setActiveQuiz(a => a - 1)}>
                Previous
              </Button>
              <div className="flex gap-2">
                {targetQuestions.map((_: any, i: number) => (
                  <span
                    key={i}
                    className={cn(
                      'h-2.5 w-2.5 rounded-full transition-all',
                      i === activeQuiz
                        ? 'bg-primary-600 scale-125'
                        : answers[i] !== undefined
                          ? 'bg-success-400'
                          : 'bg-neutral-300'
                    )}
                  />
                ))}
              </div>
              <div className="flex items-center gap-3">
                {activeQuiz < targetQuestions.length - 1 && (
                  <Button size="md" icon={ArrowRight} onClick={() => setActiveQuiz(a => a + 1)}>
                    Next
                  </Button>
                )}
                <Button variant="success" size="md" icon={CheckCircle2} onClick={handleSubmitQuiz}>
                  Submit Quiz
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
        {deleteDialogs}
      </div>
    );
  }

  if (view === 'results') {
    const targetQuestions = questions.length > 0 ? questions : (generatedQuiz?.questions ?? []);
    const rawResults = results.length > 0
      ? (Array.isArray(results[0]?.answers) ? results[0].answers : results)
      : [];
    const computedResults = rawResults.length > 0
      ? rawResults
      : targetQuestions.map((q: any, idx: number) => {
          const qType = (q.type || q.questionType || selectedQuiz?.questionType || generatedQuiz?.questionType || 'MCQ').toUpperCase();
          const chosen = answers[idx];

          if (qType === 'NAT') {
            const correctNum = typeof q.correct === 'number'
              ? q.correct
              : (parseFloat(String(q.correct)) || (q.numericalAnswer !== undefined ? parseFloat(String(q.numericalAnswer)) : 0) || 0);
            const userStr = chosen !== undefined && chosen !== null ? String(chosen).trim() : '';
            const userNum = userStr !== '' ? parseFloat(userStr) : NaN;
            const isCorrect = !isNaN(userNum) && Math.abs(userNum - correctNum) < 0.001;
            return {
              id: `qr-${q.id || idx}`,
              quizId: selectedQuiz?.id || q.quizId || q.id,
              questionId: q.id,
              question: q.question,
              options: [],
              type: 'NAT',
              chosenIdx: chosen,
              yourAnswer: userStr !== '' ? userStr : 'Not answered',
              correctAnswer: String(correctNum),
              correct: isCorrect,
              explanation: q.explanation || '',
            };
          }

          if (qType === 'MSQ') {
            const correctArr: number[] = Array.isArray(q.correct)
              ? q.correct.map(Number)
              : [Number(q.correct) || 0];
            const chosenArr: number[] = Array.isArray(chosen)
              ? chosen.map(Number)
              : chosen !== undefined ? [Number(chosen)] : [];

            const isCorrect = correctArr.length > 0 &&
              correctArr.length === chosenArr.length &&
              correctArr.every(val => chosenArr.includes(val));
            const opts = q.options || [];
            return {
              id: `qr-${q.id || idx}`,
              quizId: selectedQuiz?.id || q.quizId || q.id,
              questionId: q.id,
              question: q.question,
              options: opts,
              type: 'MSQ',
              chosenIdx: chosenArr,
              yourAnswer: chosenArr.length > 0 ? chosenArr.map(i => opts[i] || String.fromCharCode(65 + i)).join(', ') : 'Not answered',
              correctIdx: correctArr,
              correctAnswer: correctArr.map(i => opts[i] || String.fromCharCode(65 + i)).join(', '),
              correct: isCorrect,
              explanation: q.explanation || '',
            };
          }

          // MCQ
          const correctIdx = typeof q.correct === 'number'
            ? q.correct
            : typeof q.correct === 'string'
              ? (['A', 'B', 'C', 'D'].indexOf(q.correct.toUpperCase()) >= 0
                ? ['A', 'B', 'C', 'D'].indexOf(q.correct.toUpperCase())
                : parseInt(q.correct, 10) || 0)
              : 0;
          const chosenText = chosen !== undefined && q.options && q.options[chosen] ? q.options[chosen] : 'Not answered';
          return {
            id: `qr-${q.id || idx}`,
            quizId: selectedQuiz?.id || q.quizId || q.id,
            questionId: q.id,
            question: q.question,
            options: q.options || [],
            type: 'MCQ',
            chosenIdx: chosen,
            yourAnswer: chosenText,
            correctIdx,
            correctAnswer: q.options && q.options[correctIdx] ? q.options[correctIdx] : '',
            correct: chosen === correctIdx,
            explanation: q.explanation || '',
          };
        });

    const totalCount = targetQuestions.length > 0 ? targetQuestions.length : computedResults.length;
    const correctCount = computedResults.filter((r: any) => r.correct).length;
    const incorrectCount = Math.max(0, totalCount - correctCount);
    const score = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
    const currentQuizTitle = selectedQuiz?.title || generatedQuiz?.title || 'Quiz Results';
    const currentQuizCourse = selectedQuiz?.course || (generatedQuiz?.isDocumentBased ? 'From Indexed Document' : 'AI Generated');
    const quizDurationMin = selectedQuiz?.duration !== undefined
      ? selectedQuiz.duration
      : (generatedQuiz?.duration !== undefined ? generatedQuiz.duration : Math.max(1, totalCount * 2));

    return (
      <div className="space-y-6">
        <SectionHeader
          title="Quiz Results"
          description={`${currentQuizCourse} — ${currentQuizTitle}`}
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Target}
            label="Your Score"
            value={`${score}%`}
            tone={score >= 80 ? 'success' : score >= 60 ? 'warning' : 'error'}
          />
          <StatCard
            icon={CheckCircle2}
            label="Correct"
            value={`${correctCount}/${totalCount}`}
            tone="success"
          />
          <StatCard
            icon={XCircle}
            label="Incorrect"
            value={incorrectCount}
            tone={incorrectCount > 0 ? 'error' : 'success'}
          />
          <StatCard
            icon={Clock}
            label="Time Limit"
            value={quizDurationMin === 0 ? 'Untimed' : `${quizDurationMin} min`}
            tone="primary"
          />
        </div>

        {/* Three Action Buttons: Review, Retake Quiz, Back to Quizzes */}
        <div className="flex justify-center items-center gap-3 flex-wrap pt-2">
          <Button
            variant={showReview ? 'primary' : 'outline'}
            icon={Eye}
            onClick={() => setShowReview(prev => !prev)}
          >
            Review
          </Button>
          <Button
            variant="outline"
            icon={RefreshCw}
            onClick={() => {
              const quizQs = targetQuestions.length > 0 ? targetQuestions : questions;
              const durationMin = selectedQuiz ? getQuizDuration(selectedQuiz) : (generatedQuiz?.duration ?? 0);
              setQuestions(quizQs);
              setView('take');
              setActiveQuiz(0);
              setAnswers({});
              setShowReview(false);
              setRemainingSeconds(durationMin > 0 ? durationMin * 60 : 0);
            }}
          >
            Retake Quiz
          </Button>
          <Button
            icon={ChevronRight}
            onClick={() => setView('list')}
          >
            Back to Quizzes
          </Button>
        </div>

        {/* Question-by-question breakdown ONLY shown after clicking Review */}
        {showReview && (
          <div className="space-y-6">
            <Card className="border-neutral-200 shadow-sm">
              <CardHeader
                title="Questions Breakdown & Review"
                subtitle={`Showing all ${totalCount} questions with your answers and correct solutions`}
                icon={FileText}
              />
              <CardBody className="space-y-4">
                {totalCount === 0 ? (
                  <EmptyState
                    icon={HelpCircle}
                    title="No questions found"
                    description="Could not find questions for this quiz review."
                  />
                ) : (
                  (targetQuestions.length > 0 ? targetQuestions : computedResults).map((q: any, idx: number) => {
                    const res = computedResults[idx] || computedResults.find((r: any) => r.question === q.question || r.questionId === q.id) || {};
                    const opts: string[] = Array.isArray(q.options) && q.options.length > 0
                      ? q.options
                      : (Array.isArray(res.options) ? res.options : []);

                    const qType = q.type || res.type || (opts.length === 0 ? 'NAT' : 'MCQ');
                    const isNAT = qType === 'NAT';
                    const isMSQ = qType === 'MSQ';

                    let isCorrect = false;
                    let isUnanswered = false;

                    let correctIdx = 0;
                    let studentChoiceIdx = -1;
                    let correctArr: number[] = [];
                    let chosenArr: number[] = [];

                    if (isNAT) {
                      isCorrect = !!res.correct;
                      const userVal = answers[idx] !== undefined ? String(answers[idx]).trim() : '';
                      isUnanswered = userVal === '' || res.yourAnswer === 'Not answered';
                    } else if (isMSQ) {
                      isCorrect = !!res.correct;
                      correctArr = Array.isArray(q.correct)
                        ? q.correct
                        : (Array.isArray(res.correctIdx) ? res.correctIdx : []);
                      chosenArr = Array.isArray(res.chosenIdx)
                        ? res.chosenIdx
                        : (Array.isArray(answers[idx]) ? answers[idx] : []);
                      isUnanswered = chosenArr.length === 0;
                    } else {
                      correctIdx = typeof q.correct === 'number'
                        ? q.correct
                        : typeof q.correct === 'string'
                          ? (['A', 'B', 'C', 'D'].indexOf(q.correct.toUpperCase()) >= 0
                            ? ['A', 'B', 'C', 'D'].indexOf(q.correct.toUpperCase())
                            : parseInt(q.correct, 10) || 0)
                          : (typeof res.correctIdx === 'number' ? res.correctIdx : 0);

                      studentChoiceIdx = res.chosenIdx !== undefined
                        ? res.chosenIdx
                        : (answers[idx] !== undefined ? answers[idx] : -1);

                      isCorrect = res.correct !== undefined
                        ? res.correct
                        : (studentChoiceIdx === correctIdx && studentChoiceIdx !== -1);

                      isUnanswered = studentChoiceIdx === -1 || studentChoiceIdx === undefined;
                    }

                    return (
                      <div
                        key={q.id || `q-review-${idx}`}
                        className={cn(
                          'p-4 rounded-xl border transition-all',
                          isCorrect
                            ? 'bg-success-50/40 border-success-200'
                            : isUnanswered
                              ? 'bg-neutral-50 border-neutral-200'
                              : 'bg-error-50/40 border-error-200'
                        )}
                      >
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-2.5">
                            <span className={cn(
                              'grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold',
                              isCorrect
                                ? 'bg-success-600 text-white'
                                : isUnanswered
                                  ? 'bg-neutral-200 text-neutral-700'
                                  : 'bg-error-600 text-white'
                            )}>
                              {idx + 1}
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-neutral-900 text-sm leading-snug">
                                  {q.question}
                                </h4>
                              </div>
                              <div className="mt-1">
                                <Badge tone="neutral" className="text-[10px]">
                                  {isNAT ? 'NAT' : isMSQ ? 'MSQ' : 'MCQ'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <Badge tone={isCorrect ? 'success' : isUnanswered ? 'neutral' : 'error'}>
                            {isCorrect ? 'Correct' : isUnanswered ? 'Not Answered' : 'Incorrect'}
                          </Badge>
                        </div>

                        {/* NAT review view */}
                        {isNAT && (
                          <div className="space-y-3 mt-3">
                            <div className="flex flex-wrap items-center gap-2">
                              {isCorrect ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-300 text-xs font-semibold text-emerald-800">
                                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                  Your Numerical Answer is Correct!
                                </span>
                              ) : isUnanswered ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-100 border border-neutral-300 text-xs font-semibold text-neutral-700">
                                  <HelpCircle className="h-4 w-4 text-neutral-500 shrink-0" />
                                  Not Answered — Correct Target Value is {res.correctAnswer || String(q.correctAnswer ?? q.correct ?? '')}
                                </span>
                              ) : (
                                <div className="flex flex-wrap items-center gap-2 text-xs">
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 border border-red-300 font-semibold text-red-800 shadow-xs">
                                    <XCircle className="h-4 w-4 text-red-600 shrink-0" />
                                    Your Answer: {res.yourAnswer || (answers[idx] !== undefined ? String(answers[idx]) : 'None')} (Wrong)
                                  </span>
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-300 font-semibold text-emerald-800 shadow-xs">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                    Correct Value: {res.correctAnswer || String(q.correctAnswer ?? q.correct ?? '')}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2 text-xs">
                              <div className={cn(
                                "p-3.5 rounded-xl border-2 shadow-sm transition-all",
                                isCorrect
                                  ? "border-emerald-500 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-400/30"
                                  : isUnanswered
                                    ? "border-neutral-300 bg-neutral-50 text-neutral-800"
                                    : "border-red-500 bg-red-50 text-red-950 ring-2 ring-red-400/30"
                              )}>
                                <span className="font-bold block mb-1">Your Numerical Answer:</span>
                                <span className="font-mono text-base font-bold">{res.yourAnswer || (answers[idx] !== undefined ? String(answers[idx]) : 'Not answered')}</span>
                              </div>
                              <div className="p-3.5 rounded-xl border-2 border-emerald-500 bg-emerald-50/70 text-emerald-950 shadow-sm">
                                <span className="font-bold block mb-1">Correct Numerical Target:</span>
                                <span className="font-mono text-base font-bold text-emerald-800">{res.correctAnswer || String(q.correctAnswer ?? q.correct ?? '')}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* MSQ review view */}
                        {isMSQ && (
                          <div className="space-y-3 mt-3">
                            {/* Summary callout for student choice vs correct options */}
                            <div className="flex flex-wrap items-center gap-2">
                              {isCorrect ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-300 text-xs font-semibold text-emerald-800">
                                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                  Your Selection: Options {chosenArr.map(i => String.fromCharCode(65 + i)).join(', ')} (All Correct)
                                </span>
                              ) : isUnanswered ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-100 border border-neutral-300 text-xs font-semibold text-neutral-700">
                                  <HelpCircle className="h-4 w-4 text-neutral-500 shrink-0" />
                                  Not Answered — Correct Options are {correctArr.map(i => String.fromCharCode(65 + i)).join(', ')}
                                </span>
                              ) : (
                                <div className="flex flex-wrap items-center gap-2 text-xs">
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 border border-red-300 font-semibold text-red-800 shadow-xs">
                                    <XCircle className="h-4 w-4 text-red-600 shrink-0" />
                                    Your Selection: {chosenArr.length > 0 ? chosenArr.map(i => `Option ${String.fromCharCode(65 + i)}`).join(', ') : 'None'} (Wrong)
                                  </span>
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-300 font-semibold text-emerald-800 shadow-xs">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                    Correct Options: {correctArr.map(i => `Option ${String.fromCharCode(65 + i)}`).join(', ')}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Options grid */}
                            <div className="grid gap-2 sm:grid-cols-2">
                              {opts.map((optionText: string, optIdx: number) => {
                                const isThisCorrect = correctArr.includes(optIdx);
                                const isStudentPick = chosenArr.includes(optIdx);

                                let cardStyle = 'border-neutral-200 bg-white text-neutral-600 opacity-75';
                                let badgeStyle = 'bg-neutral-100 text-neutral-600 border border-neutral-300';
                                let tagLabel: React.ReactNode = null;

                                if (isThisCorrect && isStudentPick) {
                                  // Picked and correct -> GREEN!
                                  cardStyle = 'border-2 border-emerald-500 bg-emerald-50 text-emerald-950 font-semibold shadow-sm ring-2 ring-emerald-400/30';
                                  badgeStyle = 'bg-emerald-600 text-white font-bold';
                                  tagLabel = (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-600 text-white shrink-0 shadow-xs">
                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                      Your Pick (Correct)
                                    </span>
                                  );
                                } else if (!isThisCorrect && isStudentPick) {
                                  // Picked and wrong -> RED!
                                  cardStyle = 'border-2 border-red-500 bg-red-50 text-red-950 font-semibold shadow-sm ring-2 ring-red-400/30';
                                  badgeStyle = 'bg-red-600 text-white font-bold';
                                  tagLabel = (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-600 text-white shrink-0 shadow-xs">
                                      <XCircle className="h-3.5 w-3.5" />
                                      Your Pick (Wrong)
                                    </span>
                                  );
                                } else if (isThisCorrect && !isStudentPick) {
                                  // Missed correct option -> GREEN!
                                  cardStyle = 'border-2 border-emerald-500 bg-emerald-50/70 text-emerald-950 font-semibold ring-1 ring-emerald-400/20';
                                  badgeStyle = 'bg-emerald-600 text-white font-bold';
                                  tagLabel = (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                      Correct Answer
                                    </span>
                                  );
                                }

                                return (
                                  <div
                                    key={optIdx}
                                    className={cn(
                                      'flex items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-xs transition-colors',
                                      cardStyle
                                    )}
                                  >
                                    <span className={cn('grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold', badgeStyle)}>
                                      {String.fromCharCode(65 + optIdx)}
                                    </span>
                                    <span className="flex-1 leading-snug">{optionText}</span>
                                    {tagLabel}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* MCQ review view */}
                        {!isNAT && !isMSQ && (
                          <div className="space-y-3 mt-3">
                            {/* Summary callout for student choice vs correct answer */}
                            <div className="flex flex-wrap items-center gap-2">
                              {isCorrect ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-300 text-xs font-semibold text-emerald-800">
                                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                  Your Answer: Option {String.fromCharCode(65 + studentChoiceIdx)} (Correct)
                                </span>
                              ) : isUnanswered ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-100 border border-neutral-300 text-xs font-semibold text-neutral-700">
                                  <HelpCircle className="h-4 w-4 text-neutral-500 shrink-0" />
                                  Not Answered — Correct Answer is Option {String.fromCharCode(65 + correctIdx)}
                                </span>
                              ) : (
                                <div className="flex flex-wrap items-center gap-2 text-xs">
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 border border-red-300 font-semibold text-red-800 shadow-xs">
                                    <XCircle className="h-4 w-4 text-red-600 shrink-0" />
                                    Your Answer: Option {studentChoiceIdx >= 0 ? String.fromCharCode(65 + studentChoiceIdx) : 'None'} (Wrong)
                                  </span>
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-300 font-semibold text-emerald-800 shadow-xs">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                    Correct Answer: Option {String.fromCharCode(65 + correctIdx)}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* All options list */}
                            <div className="grid gap-2 sm:grid-cols-2">
                              {opts.map((optionText: string, optIdx: number) => {
                                const isThisCorrect = optIdx === correctIdx;
                                const isStudentPick = optIdx === studentChoiceIdx;

                                let cardStyle = 'border-neutral-200 bg-white text-neutral-600 opacity-75';
                                let badgeStyle = 'bg-neutral-100 text-neutral-600 border border-neutral-300';
                                let tagLabel: React.ReactNode = null;

                                if (isStudentPick && isThisCorrect) {
                                  // Student picked this AND it is correct -> GREEN!
                                  cardStyle = 'border-2 border-emerald-500 bg-emerald-50 text-emerald-950 font-semibold shadow-sm ring-2 ring-emerald-400/30';
                                  badgeStyle = 'bg-emerald-600 text-white font-bold';
                                  tagLabel = (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-600 text-white shrink-0 shadow-xs">
                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                      Your Answer (Correct)
                                    </span>
                                  );
                                } else if (isStudentPick && !isThisCorrect) {
                                  // Student picked this AND it is wrong -> RED!
                                  cardStyle = 'border-2 border-red-500 bg-red-50 text-red-950 font-semibold shadow-sm ring-2 ring-red-400/30';
                                  badgeStyle = 'bg-red-600 text-white font-bold';
                                  tagLabel = (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-600 text-white shrink-0 shadow-xs">
                                      <XCircle className="h-3.5 w-3.5" />
                                      Your Answer (Wrong)
                                    </span>
                                  );
                                } else if (isThisCorrect) {
                                  // Correct option not picked -> GREEN!
                                  cardStyle = 'border-2 border-emerald-500 bg-emerald-50/70 text-emerald-950 font-semibold ring-1 ring-emerald-400/20';
                                  badgeStyle = 'bg-emerald-600 text-white font-bold';
                                  tagLabel = (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                      Correct Answer
                                    </span>
                                  );
                                }

                                return (
                                  <div
                                    key={optIdx}
                                    className={cn(
                                      'flex items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-xs transition-colors',
                                      cardStyle
                                    )}
                                  >
                                    <span className={cn('grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold', badgeStyle)}>
                                      {String.fromCharCode(65 + optIdx)}
                                    </span>
                                    <span className="flex-1 leading-snug">{optionText}</span>
                                    {tagLabel}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {q.explanation && (
                          <div className="mt-3 p-2.5 rounded-lg bg-white/80 border border-neutral-200 text-xs text-neutral-600">
                            <span className="font-semibold text-neutral-800">Explanation: </span>
                            {q.explanation}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </CardBody>
            </Card>

            <div className="flex justify-center items-center gap-3 flex-wrap pt-2">
              <Button
                variant="outline"
                icon={RefreshCw}
                onClick={() => {
                  const quizQs = targetQuestions.length > 0 ? targetQuestions : questions;
                  const durationMin = selectedQuiz ? getQuizDuration(selectedQuiz) : (generatedQuiz?.duration ?? 0);
                  setQuestions(quizQs);
                  setView('take');
                  setActiveQuiz(0);
                  setAnswers({});
                  setShowReview(false);
                  setRemainingSeconds(durationMin > 0 ? durationMin * 60 : 0);
                }}
              >
                Retake Quiz
              </Button>
              <Button icon={ChevronRight} onClick={() => setView('list')}>
                Back to Quizzes
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        <SectionHeader title="Quiz Center" description="Take faculty-provided or RAG-generated quizzes and review your performance" />
      <Card className="border-neutral-200 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader title="Generate Quiz with AI" subtitle="Enter a topic or chapter to create a custom quiz" icon={Bot} />
        <CardBody>
          <div className="space-y-5">
            <div>
              {/* Upload Document — first */}
              <label className="text-sm font-semibold text-neutral-700 mb-2.5 block">Upload Document</label>
              <input
                ref={fileInputRef}
                type="file"
                className="sr-only"
                multiple
                onChange={async (event) => {
                  const files = event.target.files;
                  if (!files || files.length === 0) return;
                  const filesArray = Array.from(files);
                  const remainingSlots = 8 - uploadedFiles.length;
                  if (filesArray.length > remainingSlots) {
                    pushToast(`You can upload a maximum of 8 files. You currently have ${uploadedFiles.length} uploaded.`, 'error');
                    setUploadStatus(`Maximum 8 files allowed (${uploadedFiles.length} already uploaded).`);
                    return;
                  }
                  setIsUploading(true);
                  try {
                    for (const file of filesArray) {
                      await uploadDocument(file);
                    }
                  } finally {
                    setIsUploading(false);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full flex items-center justify-center gap-2 h-11 px-4 rounded-xl border border-dashed border-neutral-300 text-sm font-semibold text-neutral-600 hover:border-primary-400 hover:text-primary-700 hover:bg-primary-50/50 transition-all disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isUploading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {isUploading ? 'Uploading…' : uploadedFiles.length > 0 ? 'Upload more document' : 'Upload any document type'}
              </button>
              {uploadStatus && (
                <p className={`mt-2.5 text-xs font-medium ${uploadStatus?.includes('✓') ? 'text-success-600' : 'text-neutral-500'}`} aria-live="polite">
                  {uploadStatus}
                </p>
              )}
              {uploadedFiles.length > 0 && (
                <div className="mt-3 space-y-2">
                  {uploadedFiles.map(file => (
                    <div key={file.id} className={cn(
                      'flex items-center gap-3 p-3 rounded-xl border transition-all',
                      file.ready
                        ? 'border-success-300 bg-success-50'
                        : 'border-primary-200 bg-primary-50',
                    )}>
                      <FileText className={cn('h-4.5 w-4.5 shrink-0', file.ready ? 'text-success-600' : 'text-primary-600')} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate text-neutral-800">{file.name}</p>
                        {file.size > 0 && (
                          <p className="text-xs text-neutral-400 mt-0.5">
                            {file.size < 1024 * 1024
                              ? `${(file.size / 1024).toFixed(1)} KB`
                              : `${(file.size / (1024 * 1024)).toFixed(2)} MB`}
                          </p>
                        )}
                      </div>
                      {file.ready ? (
                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-success-100 border border-success-300 text-success-700 text-xs font-bold shrink-0">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Ready
                        </span>
                      ) : (
                        <LoaderCircle className="h-4 w-4 animate-spin text-primary-500 shrink-0" />
                      )}
                      <button
                        type="button"
                        onClick={() => setUploadedFiles(prev => prev.filter(f => f.id !== file.id))}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-error-600 hover:bg-error-50 transition-colors"
                        title="Remove file"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Select already-indexed document — above Topic / Chapter */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <label className="text-sm font-semibold text-neutral-700">
                  Select Document Already Indexed
                </label>
                {indexedMaterials.length > 0 && (
                  <span className="text-xs font-medium text-success-700 bg-success-50 px-2 py-0.5 rounded-full border border-success-200">
                    {indexedMaterials.length} document{indexedMaterials.length > 1 ? 's' : ''} available
                  </span>
                )}
              </div>
              <select
                value={selectedIndexedId}
                onChange={e => {
                  const id = e.target.value;
                  setSelectedIndexedId(id);
                  if (id === 'all') {
                    if (!genTopic.trim()) {
                      setGenTopic('All Documents');
                      setGenError(null);
                    }
                  } else if (id && !genTopic.trim()) {
                    const found = indexedMaterials.find(m => m.id === id);
                    if (found?.name) {
                      setGenTopic(found.name.replace(/\.[^/.]+$/, ''));
                      setGenError(null);
                    }
                  }
                }}
                className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-sm outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
              >
                <option value="all">All doc.</option>
                {indexedMaterials.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} {m.status === 'processing' ? '(Indexing...)' : ''}
                  </option>
                ))}
              </select>
              {indexedMaterials.length === 0 && (
                <p className="mt-1.5 text-xs text-neutral-400">
                  No indexed documents yet — upload one above and it will appear here.
                </p>
              )}
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="text-sm font-semibold text-neutral-700 mb-2.5 block">
                  Topic / Chapter <span className="text-error-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={genTopic}
                  onChange={e => { setGenTopic(e.target.value); setGenError(null); }}
                  placeholder="e.g. Supervised Learning, Unit 1"
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-sm outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-neutral-700 mb-2.5 block">
                  Questions <span className="text-error-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={50}
                  value={genCount}
                  onChange={e => {
                    const val = e.target.value;
                    setGenCount(val === '' ? '' : Math.max(1, parseInt(val, 10) || 1));
                    setGenError(null);
                  }}
                  placeholder="e.g. 5"
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-sm outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-neutral-700 mb-2.5 block">
                  Difficulty <span className="text-error-500">*</span>
                </label>
                <select
                  required
                  value={genDifficulty}
                  onChange={e => { setGenDifficulty(e.target.value); setGenError(null); }}
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-sm outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                >
                  <option value="">— Select Difficulty —</option>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-neutral-700 mb-2.5 block flex items-center justify-between">
                  <span>Time</span>
                  <span className="text-xs font-normal text-neutral-400">min</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={180}
                  value={genTime}
                  onChange={e => setGenTime(e.target.value)}
                  placeholder="time(blank for no time)"
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-sm outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                />
                <p className="mt-1 text-xs text-neutral-400">time(blank for no time)</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-neutral-700 mb-2.5 block">
                  Type of Que <span className="text-error-500">*</span>
                </label>
                <select
                  value={genQuestionType}
                  onChange={e => setGenQuestionType(e.target.value as 'MCQ' | 'MSQ' | 'NAT')}
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-sm outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white font-medium text-neutral-800"
                >
                  <option value="MCQ">MCQ</option>
                  <option value="MSQ">MSQ</option>
                  <option value="NAT">NAT(Numerical Answer Type questions.)</option>
                </select>
                <p className="mt-1 text-xs text-neutral-400">Question format</p>
              </div>
            </div>
            {/* Inline error display — shows the actual backend error instead of silently staying on "Generating…" */}
            {genError && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-error-50 border border-error-200" role="alert">
                <AlertTriangle className="h-4.5 w-4.5 text-error-500 shrink-0 mt-0.5" />
                <p className="text-sm text-error-700 font-medium">{genError}</p>
              </div>
            )}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <Button
                  icon={Sparkles}
                  onClick={() => generateQuiz()}
                  disabled={isGenerating || isUploading || !genTopic.trim() || !genCount || !genDifficulty.trim()}
                  className="min-w-[180px] h-11"
                >
                  {isGenerating
                    ? `Generating… (${genElapsed}s)`
                    : 'Generate Quiz'}
                </Button>
                {generatedQuiz && !isGenerating && (
                  <Button
                    variant="outline"
                    icon={ArrowRight}
                    onClick={() => {
                      setView('take');
                      setActiveQuiz(0);
                      setAnswers({});
                      const dur = generatedQuiz?.duration ?? 0;
                      setRemainingSeconds(dur > 0 ? dur * 60 : 0);
                    }}
                  >
                    Take Generated Quiz
                  </Button>
                )}
              </div>
              {isGenerating && genElapsed >= 15 && (
                <p className="text-xs text-neutral-400 flex items-center gap-1.5">
                  <LoaderCircle className="h-3 w-3 animate-spin shrink-0" />
                  {genElapsed >= 60
                    ? 'Still working — the AI is processing a large document. Please wait…'
                    : 'This may take up to a minute depending on document size…'}
                </p>
              )}
            </div>
            {generatedQuiz && !isGenerating && (
              <div
                className="rounded-xl border border-success-200 bg-success-50 p-4"
                role="status"
                aria-live="polite"
              >
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-success-600 text-white">
                    <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-success-800">Quiz generated successfully</p>
                    {generatedQuiz.isDocumentBased && generatedQuiz.sourceName ? (
                      <p className="mt-1 text-sm leading-relaxed text-success-700">
                        This quiz is based on the important points extracted from your notes PDF:
                        {' '}<span className="font-semibold">{generatedQuiz.sourceName}</span>.
                      </p>
                    ) : (
                      <p className="mt-1 text-sm leading-relaxed text-success-700">
                        This quiz was created for the requested topic. Upload or select a notes PDF to generate questions from its important points.
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-success-200 bg-white px-2.5 py-1 text-success-800">
                        <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
                        {generatedQuiz.questions.length} questions
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-success-200 bg-white px-2.5 py-1 text-success-800 font-bold">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        {generatedQuiz.questionType || 'MCQ'}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-success-200 bg-white px-2.5 py-1 text-success-800">
                        <Target className="h-3.5 w-3.5" aria-hidden="true" />
                        {generatedQuiz.difficulty} difficulty
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-success-200 bg-white px-2.5 py-1 text-success-800">
                        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                        {generatedQuiz.duration === 0 ? 'Untimed' : `${generatedQuiz.duration} min`}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-success-200 bg-white px-2.5 py-1 text-success-800">
                        <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                        {generatedQuiz.createdDate ? formatQuizCreatedDateTime(generatedQuiz.createdDate) : formatQuizCreatedDateTime(new Date())}
                      </span>
                      {generatedQuiz.isDocumentBased && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-success-200 bg-white px-2.5 py-1 text-success-800">
                          <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                          Notes PDF source
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardBody>
      </Card>
      {loading ? (
        <Card className="border-neutral-200 shadow-sm"><CardBody><p className="text-sm text-neutral-400 text-center py-8">Loading quizzes...</p></CardBody></Card>
      ) : quizList.length === 0 && !generatedQuiz ? (
        <Card className="border-neutral-200 shadow-sm"><CardBody><EmptyState icon={HelpCircle} title="No quizzes" description="No quizzes are available yet. Generate one with AI above." /></CardBody></Card>
) : (
      <div className="space-y-6">
            {/* Unattempted Quizzes */}
            <Card className="border-neutral-200 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader title="Unattempted Quizzes" subtitle="Quizzes you haven't started yet" icon={Lock} action={
                <Button variant="danger" size="sm" icon={Trash2} onClick={() => setDeleteAllUnattemptedConfirmOpen(true)}>
                  Delete All
                </Button>
              } />
              <CardBody>
                {quizList.filter(quiz => !attemptedQuizzes.has(quiz.id) && quiz.status !== 'completed').length === 0 ? (
                  <EmptyState icon={Lock} title="All caught up!" description="You've attempted all available quizzes." />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {quizList.filter(quiz => !attemptedQuizzes.has(quiz.id) && quiz.status !== 'completed').map(quiz => {
                      const qCount = getQuizQuestionCount(quiz);
                      const durationMin = getQuizDuration(quiz);
                      const diff = quiz.difficulty || 'Medium';
                      const docName = quiz.sourceName || (quiz.title.toLowerCase().includes('.pdf') ? quiz.title.match(/[^—–-]+(?:\.pdf)/i)?.[0]?.trim() : '') || (quiz.topic?.toLowerCase().includes('.pdf') ? quiz.topic.match(/[^—–-]+(?:\.pdf)/i)?.[0]?.trim() : '');
                      const isDoc = quiz.isDocumentBased || quiz.course === 'From Indexed Document' || Boolean(docName);
                      return (
                        <div key={quiz.id} className="flex flex-col h-full p-4 rounded-xl border border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300 transition-all bg-white shadow-xs">
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              'grid place-items-center h-10 w-10 rounded-xl shrink-0',
                              quiz.status === 'upcoming' ? 'bg-amber-100 text-amber-700' : 'bg-primary-100 text-primary-600'
                            )}>
                              <HelpCircle className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h3 className="font-display font-semibold text-neutral-900 text-sm leading-snug">{quiz.title}</h3>
                                <Badge tone={diff === 'Easy' ? 'success' : diff === 'Hard' ? 'error' : 'primary'}>
                                  {diff}
                                </Badge>
                                {isDoc && (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                                    <FileText className="h-3 w-3" />
                                    {docName || 'Notes PDF'}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-neutral-500 mt-1">
                                <span className="font-medium text-neutral-700">{quiz.course || 'AI Generated'}</span>
                                {quiz.topic && <span> · {quiz.topic}</span>}
                              </p>
                              <div className="flex items-center gap-3 mt-2.5 text-xs text-neutral-500 flex-wrap">
                                <span className="flex items-center gap-1.5 font-medium text-neutral-700">
                                  <HelpCircle className="h-3.5 w-3.5 text-neutral-400" /> {qCount} Questions
                                </span>
                                <span className="flex items-center gap-1.5 font-medium text-neutral-700">
                                  <Clock className="h-3.5 w-3.5 text-neutral-400" /> {durationMin === 0 ? 'Untimed' : `${durationMin} min`}
                                </span>
                                <span className="flex items-center gap-1 font-medium text-neutral-600 text-[11px]">
                                  <Calendar className="h-3.5 w-3.5 text-neutral-400" />
                                  {formatQuizDate(quiz)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="mt-auto pt-3 flex items-center justify-between gap-2 border-t border-neutral-100 mt-3 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleDeleteQuiz(quiz.id)}
                              className="p-1.5 rounded-lg text-neutral-400 hover:text-error-600 hover:bg-error-50 transition-colors"
                              aria-label={`Delete ${quiz.title}`}
                              title="Delete quiz"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                            <Button
                              size="sm"
                              icon={Play}
                              onClick={() => handleAttemptUnattemptedQuiz(quiz)}
                            >
                              Attempt Quiz
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Quiz History */}
            <Card className="border-neutral-200 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader title="Quiz History" subtitle="All your past quiz attempts" icon={Clock} action={
                <Button variant="danger" size="sm" icon={Trash2} onClick={() => setDeleteAllHistoryConfirmOpen(true)}>
                  Delete All
                </Button>
              } />
              <CardBody>
                {quizList.filter((q: any) => q.status === 'completed' || attemptedQuizzes.has(q.id)).length === 0 ? (
                  <EmptyState icon={Clock} title="No quiz history" description="Your completed quizzes will appear here." />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {quizList.filter((q: any) => q.status === 'completed' || attemptedQuizzes.has(q.id)).map((quiz: any) => (
                      <div key={quiz.id} className="flex flex-col h-full p-4 rounded-xl border border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300 transition-all bg-white shadow-xs">
                        <div className="flex items-start gap-3">
                          <div className="grid place-items-center h-10 w-10 rounded-xl bg-success-100 text-success-600 shrink-0">
                            <CheckCircle2 className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-display font-semibold text-neutral-900 text-sm leading-snug">{quiz.title}</h3>
                            <p className="text-xs text-neutral-500 mt-0.5">
                              <span className="font-medium text-neutral-700">{quiz.course || 'AI Generated'}</span>
                              {quiz.questions ? ` · ${quiz.questions} questions` : ''}
                            </p>
                            <div className="flex items-center gap-1.5 mt-2 text-xs text-neutral-600">
                              <Clock className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                              <span className="font-medium text-neutral-700">Submitted:</span>
                              <span className="text-neutral-500">{getQuizSubmittedTime(quiz)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="mt-auto pt-3 flex items-center justify-between gap-2 border-t border-neutral-100 mt-3 shrink-0">
                          <div className="flex items-center gap-2">
                            {quiz.score !== undefined && (
                              <Badge tone={quiz.score >= 80 ? 'success' : quiz.score >= 60 ? 'warning' : 'error'}>
                                {quiz.score}% Score
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleDeleteQuiz(quiz.id)}
                              className="p-1.5 rounded-lg text-neutral-400 hover:text-error-600 hover:bg-error-50 transition-colors"
                              aria-label={`Delete ${quiz.title}`}
                              title="Delete quiz"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                            <Button variant="outline" size="sm" icon={BarChart3} onClick={() => reviewQuiz(quiz)}>
                              Review
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        )}
      {deleteDialogs}
      </div>
   );
 }

/* ============ PROGRESS ANALYTICS ============ */
export function StudentAnalytics() {
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [weeklyStudy, setWeeklyStudy] = useState<any[]>([]);
  const [quizScores, setQuizScores] = useState<any[]>([]);
  const [topics, setTopics] = useState<{ strong: string[]; weak: string[] }>({ strong: [], weak: [] });
  const [aiUsage, setAiUsage] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [statsData, quizzesData] = await Promise.all([
          fetchStats(),
          fetchQuizzes(),
        ]);
        if (!cancelled && statsData) {
          setAnalyticsData(statsData);
          setWeeklyStudy(statsData.weeklyStudyData || []);
          setTopics(statsData.topics || { strong: [], weak: [] });
          setAiUsage(statsData.aiUsageStats || null);
        }
        if (!cancelled && quizzesData) {
          const qs = quizzesData as any[];
          setQuizScores(qs.filter(q => q.score !== undefined).map(q => ({ quiz: q.title.split(' ').slice(0, 2).join(' ') || q.course, score: q.score })));
        }
      } catch (err) {
        console.warn('[StudentAnalytics] Failed to load data:', err);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const maxHours = weeklyStudy.length > 0 ? Math.max(...weeklyStudy.map((d: any) => d.hours || 0)) : 1;
  return (
    <div className="space-y-6">
      <SectionHeader title="Progress Analytics" description="Track your learning progress and AI usage insights" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Clock} label="This Week" value={weeklyStudy.reduce((sum: number, d: any) => sum + (d.hours || 0), 0).toFixed(1) + 'h'} tone="primary" trend={{ value: '12%', up: true }} />
        <StatCard icon={Award} label="Avg Quiz Score" value={quizScores.length > 0 ? Math.round(quizScores.reduce((s: number, q: any) => s + q.score, 0) / quizScores.length) + '%' : '—'} tone="success" trend={{ value: '5%', up: true }} />
        <StatCard icon={TrendingUp} label="Courses Progress" value="63%" tone="accent" trend={{ value: '8%', up: true }} />
        <StatCard icon={Bot} label="AI Queries" value={aiUsage?.totalQueries ?? '—'} tone="secondary" trend={{ value: '22%', up: true }} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Weekly Study Hours */}
        <Card className="border-neutral-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader title="Weekly Study Hours" subtitle="Daily study time breakdown" icon={Clock} />
          <CardBody>
            {weeklyStudy.length === 0 ? (
              <p className="text-sm text-neutral-400 text-center py-8">No study data available yet.</p>
            ) : (
            <div className="flex items-end justify-between gap-3 h-48">
              {weeklyStudy.map((d: any) => (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="relative w-full flex-1 flex items-end">
                    <div
                      className="w-full rounded-t-lg bg-gradient-to-t from-primary-600 to-primary-400 transition-all duration-500 group-hover:from-primary-700 group-hover:to-primary-500 relative"
                      style={{ height: `${(d.hours / maxHours) * 100}%` }}
                    >
                      <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-neutral-700 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-white px-2 py-0.5 rounded-lg shadow-sm border border-neutral-200">{d.hours}h</span>
                    </div>
                  </div>
                  <span className="text-xs text-neutral-500 font-bold">{d.day}</span>
                </div>
              ))}
            </div>
            )}
          </CardBody>
        </Card>

        {/* Quiz Scores */}
        <Card className="border-neutral-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader title="Quiz Scores" subtitle="Recent quiz performance" icon={Award} />
          <CardBody>
            {quizScores.length === 0 ? (
              <p className="text-sm text-neutral-400 text-center py-8">No quiz data available yet.</p>
            ) : (
            <div className="flex items-end justify-between gap-3 h-48">
              {quizScores.map((d: any) => (
                <div key={d.quiz} className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="relative w-full flex-1 flex items-end">
                    <div
                      className={cn('w-full rounded-t-lg transition-all duration-500', d.score >= 80 ? 'bg-gradient-to-t from-success-600 to-success-400' : d.score >= 60 ? 'bg-gradient-to-t from-warning-600 to-warning-400' : 'bg-gradient-to-t from-error-600 to-error-400')}
                      style={{ height: `${d.score}%` }}
                    >
                      <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-neutral-700 opacity-0 group-hover:opacity-100 transition-opacity bg-white px-2 py-0.5 rounded-lg shadow-sm border border-neutral-200">{d.score}</span>
                    </div>
                  </div>
                  <span className="text-xs text-neutral-500 font-bold text-center leading-tight">{d.quiz}</span>
                </div>
              ))}
            </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Topic Analysis */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="border-neutral-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader title="Strong Topics" subtitle="Areas you excel in" icon={TrendingUp} />
          <CardBody className="space-y-3">
            {topics.strong.length === 0 ? (
              <p className="text-sm text-neutral-400 text-center py-4">No data available.</p>
            ) : topics.strong.map((t, i) => (
              <div key={t} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-neutral-50 transition-colors">
                <div className="grid place-items-center h-9 w-9 rounded-xl bg-success-100 text-success-600 text-sm font-bold">{i + 1}</div>
                <span className="text-sm text-neutral-800 font-medium flex-1">{t}</span>
                <Badge tone="success">Strong</Badge>
              </div>
            ))}
          </CardBody>
        </Card>
        <Card className="border-neutral-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader title="Weak Topics" subtitle="Areas that need attention" icon={TrendingDown} />
          <CardBody className="space-y-3">
            {topics.weak.length === 0 ? (
              <p className="text-sm text-neutral-400 text-center py-4">No data available.</p>
            ) : topics.weak.map((t, i) => (
              <div key={t} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-neutral-50 transition-colors">
                <div className="grid place-items-center h-9 w-9 rounded-xl bg-error-100 text-error-600 text-sm font-bold">{i + 1}</div>
                <span className="text-sm text-neutral-800 font-medium flex-1">{t}</span>
                <Badge tone="error">Needs Work</Badge>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      {/* AI Usage */}
      <Card className="border-neutral-200 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader title="AI Usage Statistics" subtitle="How you're using AI features" icon={Bot} />
        <CardBody>
          {!aiUsage ? (
            <p className="text-sm text-neutral-400 text-center py-8">No AI usage data available yet.</p>
          ) : (
          <>
          <div className="grid sm:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total Queries', value: aiUsage.totalQueries, icon: Bot, tone: 'primary' },
              { label: 'Notes Generated', value: aiUsage.notesGenerated, icon: StickyNote, tone: 'accent' },
              { label: 'Quizzes Generated', value: aiUsage.quizzesGenerated, icon: HelpCircle, tone: 'success' },
            ].map(s => {
              const Icon = s.icon;
              return (
                <div key={s.label} className={cn('p-5 rounded-xl border border-neutral-200 bg-white shadow-sm', `bg-${s.tone}-50`)}>
                  <Icon className={cn('h-5.5 w-5.5 mb-3', `text-${s.tone}-600`)} />
                  <p className="text-2xl font-bold font-display text-neutral-900">{s.value}</p>
                  <p className="text-xs text-neutral-500 font-medium mt-1">{s.label}</p>
                </div>
              );
            })}
          </div>
          {aiUsage.weeklyQueries && aiUsage.weeklyQueries.length > 0 && (
            <div className="flex items-end justify-between gap-3 h-32">
              {aiUsage.weeklyQueries.map((d: any) => (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex-1 flex items-end">
                    <div className="w-full rounded-t-lg bg-gradient-to-t from-secondary-600 to-secondary-400" style={{ height: `${(d.count / 28) * 100}%` }} />
                  </div>
                  <span className="text-xs text-neutral-500 font-bold">{d.day}</span>
                </div>
              ))}
            </div>
          )}
          </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

/* ============ NOTIFICATIONS ============ */
export function StudentNotifications() {
  const [items, setItems] = useState<any[]>([]);
  const typeIcon = { quiz: HelpCircle, announcement: Bell, ai: Bot };
  const typeTone = { quiz: 'primary', announcement: 'secondary', ai: 'accent' } as const;
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchNotifications().then(data => {
      if (!cancelled) setItems(data);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const unread = items.filter(n => !n.read).length;
  const markRead = async (id: string) => {
    const item = items.find(n => n.id === id);
    if (!item || item.read) return;
    const updated = { ...item, read: true };
    if (await updateNotification(updated)) {
      setItems(current => current.map(n => n.id === id ? updated : n));
    }
  };
  const markUnread = async (id: string) => {
    const item = items.find(n => n.id === id);
    if (!item || !item.read) return;
    const updated = { ...item, read: false };
    if (await updateNotification(updated)) {
      setItems(current => current.map(n => n.id === id ? updated : n));
    }
  };
  const markAll = async () => {
    const updated = await Promise.all(items.filter(n => !n.read).map(n => updateNotification({ ...n, read: true })));
    if (updated.every(Boolean)) setItems(current => current.map(n => ({ ...n, read: true })));
  };
  const removeNotification = async (id: string) => {
    if (await deleteNotification(id)) setItems(current => current.filter(n => n.id !== id));
  };

  return (
    <div className="space-y-6">
      <SectionHeader title="Notifications" description={`${unread} unread notifications`} action={<Button variant="outline" size="sm" icon={Check} onClick={markAll}>Mark all read</Button>} />
      {loading ? (
        <Card className="border-neutral-200 shadow-sm"><CardBody><p className="text-sm text-neutral-400 text-center py-8">Loading notifications...</p></CardBody></Card>
      ) : items.length === 0 ? (
        <Card className="border-neutral-200 shadow-sm"><CardBody><EmptyState icon={Bell} title="No notifications" description="You're all caught up!" /></CardBody></Card>
      ) : (
      <div className="space-y-3">
        {items.map(n => {
          const Icon = typeIcon[n.type as keyof typeof typeIcon];
          return (
            <Card key={n.id} hover className={cn('p-5 border transition-all', !n.read ? 'border-primary-200 bg-primary-50/30 shadow-sm' : 'border-neutral-200 shadow-sm hover:shadow-md')} >
              <div className="flex items-start gap-4">
                <div className={cn('grid place-items-center h-11 w-11 rounded-xl shrink-0', `bg-${typeTone[n.type as keyof typeof typeTone]}-100 text-${typeTone[n.type as keyof typeof typeTone]}-600`)}>
                  <Icon className="h-5.5 w-5.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-neutral-900">{n.title}</p>
                    {!n.read && <span className="h-2.5 w-2.5 rounded-full bg-primary-500 shadow-sm shadow-primary-500/50" />}
                  </div>
                  <p className="text-sm text-neutral-600 mt-1 leading-relaxed">{n.message}</p>
                  <p className="text-xs text-neutral-400 mt-1.5 font-medium">{n.time}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => n.read ? void markUnread(n.id) : void markRead(n.id)}
                    className="rounded-lg px-2 py-1 text-xs font-semibold text-primary-600 hover:bg-primary-100"
                  >
                    {n.read ? 'Mark unread' : 'Mark read'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void removeNotification(n.id)}
                    className="rounded-lg p-2 text-neutral-400 hover:bg-error-50 hover:text-error-600"
                    aria-label={`Delete ${n.title}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      )}
    </div>
  );
}

/* ============ BOOKMARKS ============ */
export function StudentBookmarks() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const typeIcon = { answer: Bot, note: StickyNote, document: FileText };
  const typeTone = { answer: 'primary', note: 'accent', document: 'secondary' } as const;

  useEffect(() => {
    let cancelled = false;
    fetchBookmarks().then(data => {
      if (!cancelled) setItems(data);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-6">
      <SectionHeader title="Bookmarks" description="Your saved answers, notes, and favorite documents" />
      {loading ? (
        <Card className="border-neutral-200 shadow-sm"><CardBody><p className="text-sm text-neutral-400 text-center py-8">Loading bookmarks...</p></CardBody></Card>
      ) : items.length === 0 ? (
        <Card className="border-neutral-200 shadow-sm"><CardBody><EmptyState icon={Bookmark} title="No bookmarks" description="Save answers and notes to find them here." /></CardBody></Card>
      ) : (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(b => {
          const Icon = typeIcon[b.type as keyof typeof typeIcon];
          return (
            <Card key={b.id} hover className="p-5 border-neutral-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 bg-white">
              <div className="flex items-start gap-3">
                <div className={cn('grid place-items-center h-11 w-11 rounded-xl shrink-0', `bg-${typeTone[b.type as keyof typeof typeTone]}-100 text-${typeTone[b.type as keyof typeof typeTone]}-600`)}>
                  <Icon className="h-5.5 w-5.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-neutral-900 line-clamp-2">{b.title}</p>
                  <p className="text-xs text-neutral-500 mt-1.5">{b.detail}</p>
                  <p className="text-xs text-neutral-400 mt-2">Saved {b.time}</p>
                </div>
                <button className="text-accent-500 hover:text-accent-600 transition-colors"><Star className="h-5 w-5" fill="currentColor" /></button>
              </div>
            </Card>
          );
        })}
      </div>
      )}
    </div>
  );
}

/* ============ PROFILE ============ */
export function StudentProfile() {
  const [student, setStudent] = useState({ name: '', email: '', id: '', program: '', year: '', semester: 5, credits: 0, streak: 0 });
  const [coursesCount, setCoursesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', program: '', year: '', semester: 5 });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [profile, courses] = await Promise.all([
          fetchStudentProfile(),
          fetchStudentCourses(),
        ]);
        if (!cancelled) {
          setStudent(profile);
          setCoursesCount(courses.length);
        }
      } catch (err) {
        console.warn('[StudentProfile] Failed to load data:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const openEdit = () => {
    setForm({
      name: student.name,
      email: student.email,
      program: student.program,
      year: student.year,
      semester: student.semester,
    });
    setEditing(true);
    setSaved(false);
  };

  const saveEdit = () => {
    const updated = { ...student, ...form };
    setStudent(updated);
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      <SectionHeader title="Profile" description="Manage your personal and academic information" action={!editing && <Button icon={Pencil} size="sm" onClick={openEdit}>Edit Profile</Button>} />
      {saved && (
        <div className="rounded-xl border border-success-200 bg-success-50 px-5 py-3.5 text-sm text-success-700 font-medium shadow-sm">
          Profile updated successfully.
        </div>
      )}
      {loading ? (
        <Card className="border-neutral-200 shadow-sm"><CardBody><p className="text-sm text-neutral-400 text-center py-8">Loading profile...</p></CardBody></Card>
      ) : (
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Profile card */}
        <Card className="lg:col-span-1 border-neutral-200 shadow-sm hover:shadow-md transition-shadow">
          <CardBody className="text-center">
            <div className="relative inline-block">
              <Avatar name={student.name} size="xl" tone="primary" />
              <button className="absolute bottom-1 right-1 grid place-items-center h-9 w-9 rounded-full bg-white border border-neutral-200 text-neutral-500 hover:text-primary-600 hover:border-primary-300 shadow-md hover:shadow-lg transition-all">
                <Camera className="h-4 w-4" />
              </button>
            </div>
            <h3 className="font-display font-bold text-xl text-neutral-900 mt-5">{student.name}</h3>
            <p className="text-sm text-neutral-500 mt-1">{student.email}</p>
            <div className="flex items-center justify-center gap-2 mt-4">
              <Badge tone="primary">{student.id}</Badge>
              <Badge tone="success">Active</Badge>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-6 pt-6 border-t border-neutral-200">
              <div><p className="text-xl font-bold font-display text-neutral-900">{coursesCount}</p><p className="text-xs text-neutral-500 font-medium mt-0.5">Courses</p></div>
              <div><p className="text-xl font-bold font-display text-neutral-900">{student.credits}</p><p className="text-xs text-neutral-500 font-medium mt-0.5">Credits</p></div>
              <div><p className="text-xl font-bold font-display text-neutral-900">{student.streak}</p><p className="text-xs text-neutral-500 font-medium mt-0.5">Day Streak</p></div>
            </div>
          </CardBody>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          {editing ? (
            <Card className="border-neutral-200 shadow-sm">
              <CardHeader title="Edit Profile" icon={Pencil} />
              <CardBody>
                <div className="grid sm:grid-cols-2 gap-5">
                  <div><label className="text-xs text-neutral-500 font-bold mb-1.5 block">Full Name</label><input className="w-full h-11 px-4 rounded-xl bg-white border border-neutral-200 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-500/20 transition-all" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
                  <div><label className="text-xs text-neutral-500 font-bold mb-1.5 block">Email</label><input className="w-full h-11 px-4 rounded-xl bg-white border border-neutral-200 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-500/20 transition-all" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
                  <div><label className="text-xs text-neutral-500 font-bold mb-1.5 block">Program</label><input className="w-full h-11 px-4 rounded-xl bg-white border border-neutral-200 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-500/20 transition-all" value={form.program} onChange={e => setForm(f => ({ ...f, program: e.target.value }))} /></div>
                  <div><label className="text-xs text-neutral-500 font-bold mb-1.5 block">Year</label><input className="w-full h-11 px-4 rounded-xl bg-white border border-neutral-200 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-500/20 transition-all" value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} /></div>
                  <div><label className="text-xs text-neutral-500 font-bold mb-1.5 block">Semester</label><input type="number" className="w-full h-11 px-4 rounded-xl bg-white border border-neutral-200 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-500/20 transition-all" value={form.semester} onChange={e => setForm(f => ({ ...f, semester: Number(e.target.value) }))} /></div>
                </div>
                <div className="flex gap-3 mt-6">
                  <Button icon={Check} onClick={saveEdit} className="h-11">Save Changes</Button>
                  <Button variant="outline" onClick={() => setEditing(false)} className="h-11">Cancel</Button>
                </div>
              </CardBody>
            </Card>
          ) : (
            <>
              {/* Personal Info */}
              <Card className="border-neutral-200 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader title="Personal Information" icon={User} />
                <CardBody>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {[
                      { label: 'Full Name', value: student.name, icon: User },
                      { label: 'Email', value: student.email, icon: Mail },
                      { label: 'Student ID', value: student.id, icon: GraduationCap },
                      { label: 'Joined', value: (student as any).joinedAt || 'N/A', icon: Calendar },
                    ].map(f => {
                      const Icon = f.icon;
                      return (
                        <div key={f.label}>
                          <label className="text-xs text-neutral-500 font-bold mb-1.5 block">{f.label}</label>
                          <div className="flex items-center gap-2.5 h-11 px-4 rounded-xl bg-neutral-50 border border-neutral-200">
                            <Icon className="h-4.5 w-4.5 text-neutral-400" />
                            <span className="text-sm text-neutral-700 font-medium">{f.value}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardBody>
              </Card>

              {/* Academic Info */}
              <Card className="border-neutral-200 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader title="Academic Information" icon={GraduationCap} />
                <CardBody>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div><label className="text-xs text-neutral-500 font-bold mb-1.5 block">Program</label><div className="mt-1 h-11 px-4 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center text-sm text-neutral-700 font-medium">{student.program}</div></div>
                    <div><label className="text-xs text-neutral-500 font-bold mb-1.5 block">Year</label><div className="mt-1 h-11 px-4 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center text-sm text-neutral-700 font-medium">{student.year}</div></div>
                    <div><label className="text-xs text-neutral-500 font-bold mb-1.5 block">Semester</label><div className="mt-1 h-11 px-4 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center text-sm text-neutral-700 font-medium">Semester {student.semester}</div></div>
                    <div><label className="text-xs text-neutral-500 font-bold mb-1.5 block">Credits Earned</label><div className="mt-1 h-11 px-4 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center text-sm text-neutral-700 font-medium">{student.credits} / 160</div></div>
                  </div>
                </CardBody>
              </Card>

              {/* Change Password */}
              <Card className="border-neutral-200 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader title="Change Password" icon={Lock} />
                <CardBody>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2"><label className="text-xs text-neutral-500 font-bold mb-1.5 block">Current Password</label><input type="password" className="w-full h-11 px-4 rounded-xl bg-white border border-neutral-200 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-500/20 transition-all" placeholder="••••••••" /></div>
                    <div><label className="text-xs text-neutral-500 font-bold mb-1.5 block">New Password</label><input type="password" className="w-full h-11 px-4 rounded-xl bg-white border border-neutral-200 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-500/20 transition-all" placeholder="••••••••" /></div>
                    <div><label className="text-xs text-neutral-500 font-bold mb-1.5 block">Confirm Password</label><input type="password" className="w-full h-11 px-4 rounded-xl bg-white border border-neutral-200 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-500/20 transition-all" placeholder="••••••••" /></div>
                  </div>
                  <Button className="mt-5 h-11" size="sm" icon={Check}>Update Password</Button>
                </CardBody>
              </Card>
            </>
          )}
        </div>
      </div>
      )}
    </div>
  );
}
