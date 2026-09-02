import { useState, useEffect, useRef } from 'react';
import {
  HelpCircle, Clock, CheckCircle2, XCircle, ChevronRight, ArrowRight,
  Star, RefreshCw, Calendar, Download,
  BarChart3, TrendingUp, TrendingDown, Bell, Bookmark, FileText,
  Bot, StickyNote, User, Mail, GraduationCap, Award, Lock, Camera,
  Check, AlertCircle, ChevronLeft, Target, Pencil, Sparkles, Plus, X, LoaderCircle,
} from 'lucide-react';
import { Card, CardHeader, CardBody, Badge, Button, Progress, StatCard, Avatar, EmptyState, SectionHeader } from '@/components/ui';
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
  fetchBookmarks,
  fetchStudentCourses,
  fetchStudentProfile,
  fetchStats,
} from '@/lib/dataService';
import {
  suggestedQuestions,
  quizQuestions,
  quizzes,
  type ChatMessage,
} from '@/data/mockData';

function safeJsonParse(text: string): any[] | null {
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return null;
    try {
      const parsed = JSON.parse(match[0]);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
}

/* ============ QUIZ CENTER ============ */
export function StudentQuizzes() {
  const [view, setView] = useState<'list' | 'take' | 'results'>('list');
  const [activeQuiz, setActiveQuiz] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [quizList, setQuizList] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [genTopic, setGenTopic] = useState('');
  const [genCount, setGenCount] = useState(5);
  const [genDifficulty, setGenDifficulty] = useState('Medium');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuiz, setGeneratedQuiz] = useState<{ title: string; questions: any[] } | null>(null);
  const [uploadedFile, setUploadedFile] = useState<{ id: string; name: string } | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          setQuizList(q);
          setQuestions(qq);
          setResults(qr);
        }
      } catch (err) {
        console.warn('[StudentQuizzes] Failed to load data:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const uploadDocument = async (file: File) => {
    const allowedExtensions = ['pdf', 'pptx', 'docx', 'txt', 'md', 'csv'];
    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';

    if (!allowedExtensions.includes(extension)) {
      setUploadStatus('Unsupported file. Upload PDF, PPTX, DOCX, TXT, MD, or CSV files.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadStatus('This file is larger than 10 MB. Please choose a smaller document.');
      return;
    }

    setIsUploading(true);
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
      setUploadedFile({ id: material.id, name: material.name });
      setUploadStatus(`✓ ${file.name} uploaded. Ready to generate quiz.`);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setUploadStatus('Upload timed out. The file may be too large or the server is busy.');
      } else {
        setUploadStatus(error instanceof Error ? error.message : 'The document could not be uploaded.');
      }
      setUploadedFile(null);
    } finally {
      clearTimeout(timeoutId);
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const generateQuiz = async () => {
    if (!genTopic.trim() && !uploadedFile) {
      alert('Please enter a topic or upload a file.');
      return;
    }
    setIsGenerating(true);
    setGeneratedQuiz(null);
    try {
      const effectiveTopic = uploadedFile ? `${uploadedFile.name}${genTopic.trim() ? ' - ' + genTopic : ''}` : genTopic;
      const prompt = uploadedFile
        ? `Using the uploaded document "${uploadedFile.name}" as source material, generate a ${genCount}-question multiple-choice quiz focused on "${genTopic || 'the document content'}" at ${genDifficulty} difficulty. IMPORTANT: Output must be ONLY a valid JSON array starting with [ and ending with ]. No markdown, no code blocks, no explanations. Each object must have: question (string), options (array of exactly 4 strings), correct (0-3 index of correct option).`
        : `Generate a ${genCount}-question multiple-choice quiz on the topic "${genTopic}" at ${genDifficulty} difficulty. IMPORTANT: Output must be ONLY a valid JSON array starting with [ and ending with ]. No markdown, no code blocks, no explanations. Each object must have: question (string), options (array of exactly 4 strings), correct (0-3 index of correct option).`;
      const token = typeof window !== 'undefined' ? window.localStorage.getItem('edurag-auth-token') : null;
      const res = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: 'Bearer ' + token } : {}),
        },
        body: JSON.stringify({
          userId: getCurrentUserId(),
          role: getCurrentUserRole(),
          conversationId: `quiz-gen-${Date.now()}`,
          title: `Quiz: ${effectiveTopic}`,
          name: '',
          branch: '',
          semester: '',
          topic: effectiveTopic,
          difficulty: genDifficulty,
          question: prompt,
          context: uploadedFile ? `Quiz from uploaded document: ${uploadedFile.name}. Topic: ${genTopic || 'general'}` : `Generate a ${genDifficulty} difficulty quiz on ${genTopic}`,
          selectedMaterialIds: uploadedFile ? [uploadedFile.id] : [],
        }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.answer) {
        const parsed = safeJsonParse(data.answer);
        if (!parsed || parsed.length === 0) {
          console.warn('[Quiz] Raw AI response:', data.answer);
          throw new Error('Could not parse quiz from AI response.');
        }
        const normalized = parsed.slice(0, Math.max(1, genCount)).map((item: any, idx: number) => ({
          id: `gq-${Date.now()}-${idx}`,
          question: String(item.question || `Question ${idx + 1}`),
          options: Array.isArray(item.options) && item.options.length >= 4 ? item.options.slice(0, 4) : ['Option A', 'Option B', 'Option C', 'Option D'],
          correct: Math.max(0, Math.min(3, Number(item.correct) || 0)),
        }));
        setGeneratedQuiz({ title: `${effectiveTopic} Quiz`, questions: normalized });
        setQuestions(normalized);
        setQuizList(current => [
          {
            id: `gq-${Date.now()}`,
            title: `${effectiveTopic} Quiz`,
            course: uploadedFile ? 'From Uploaded File' : 'AI Generated',
            questions: normalized.length,
            duration: normalized.length * 2,
            status: 'upcoming',
            dueDate: 'Just now',
            topic: effectiveTopic,
          },
          ...current,
        ]);
      } else {
        throw new Error(data.error || 'Failed to generate quiz');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to generate quiz. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (view === 'take') {
    const targetQuestions = questions.length > 0 ? questions : quizQuestions;
    const q = targetQuestions[activeQuiz] || targetQuestions[0];
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" icon={ChevronLeft} onClick={() => setView('list')}>Back to Quizzes</Button>
          <div className="flex items-center gap-2 text-sm text-neutral-500 font-medium"><Clock className="h-4.5 w-4.5" /> 30:00</div>
        </div>
        <Card className="max-w-3xl mx-auto border-neutral-200 shadow-lg">
          <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/50">
            <span className="text-sm font-semibold text-neutral-600">Question {activeQuiz + 1} of {targetQuestions.length}</span>
            <Progress value={((activeQuiz + 1) / targetQuestions.length) * 100} size="sm" className="w-32" />
          </div>
          <CardBody>
            <h2 className="text-lg font-display font-bold text-neutral-900 mb-6">{q.question}</h2>
            <div className="space-y-3">
              {q.options.map((opt: string, i: number) => (
                <button
                  key={i}
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
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-neutral-200">
              <Button variant="outline" size="md" disabled={activeQuiz === 0} onClick={() => setActiveQuiz(a => a - 1)}>Previous</Button>
              <div className="flex gap-2">
                {targetQuestions.map((_: any, i: number) => (
                  <span key={i} className={cn('h-2.5 w-2.5 rounded-full transition-all', i === activeQuiz ? 'bg-primary-600 scale-125' : answers[i] !== undefined ? 'bg-success-400' : 'bg-neutral-300')} />
                ))}
              </div>
              {activeQuiz < targetQuestions.length - 1 ? (
                <Button size="md" icon={ArrowRight} onClick={() => setActiveQuiz(a => a + 1)}>Next</Button>
              ) : (
                <Button variant="success" size="md" icon={CheckCircle2} onClick={() => {
                  if (targetQuestions.length > 0 && targetQuestions[0].id.startsWith('gq-')) {
                    const computed = targetQuestions.map((q: any, idx: number) => ({
                      id: `qr-${q.id}`,
                      quizId: q.id,
                      question: q.question,
                      yourAnswer: q.options[answers[idx] ?? -1] || 'Not answered',
                      correct: (answers[idx] ?? -1) === q.correct,
                    }));
                    setResults(computed);
                  }
                  setView('results');
                }}>Submit Quiz</Button>
              )}
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (view === 'results') {
    const computedResults = results.length > 0 ? results : (questions.length > 0 ? questions.map((q: any, idx: number) => ({
      id: `qr-${q.id}`,
      quizId: q.id,
      question: q.question,
      yourAnswer: q.options[answers[idx] ?? -1] || 'Not answered',
      correct: (answers[idx] ?? -1) === q.correct,
    })) : []);
    const correct = computedResults.filter(r => r.correct).length;
    const score = computedResults.length > 0 ? Math.round((correct / computedResults.length) * 100) : 0;
    return (
      <div className="space-y-6">
        <SectionHeader title="Quiz Results" description={quizList[0]?.course + ' — ' + quizList[0]?.title || 'Quiz Results'} />
        <div className="grid lg:grid-cols-4 gap-4">
          <StatCard icon={Target} label="Your Score" value={`${score}%`} tone={score >= 80 ? 'success' : score >= 60 ? 'warning' : 'error'} />
          <StatCard icon={CheckCircle2} label="Correct" value={`${correct}/${computedResults.length}`} tone="success" />
          <StatCard icon={XCircle} label="Incorrect" value={computedResults.length - correct} tone="error" />
          <StatCard icon={Clock} label="Time Taken" value="24:35" tone="primary" />
        </div>
        <Card className="border-neutral-200 shadow-sm">
          <CardHeader title="Incorrect Answers Review" subtitle="Learn from your mistakes" icon={AlertCircle} />
          <CardBody className="space-y-3">
            {computedResults.filter(r => !r.correct).map(r => {
              const q = questions.find(qq => qq.id === r.quizId);
              return (
                <div key={r.id} className="p-4 rounded-xl bg-error-50/50 border border-error-200">
                  <p className="text-sm font-semibold text-neutral-900 mb-2">{r.question}</p>
                  <div className="flex items-center gap-2 text-sm">
                    <XCircle className="h-4.5 w-4.5 text-error-500 shrink-0" />
                    <span className="text-neutral-600">Your answer: <span className="text-error-700 font-bold">{r.yourAnswer}</span></span>
                  </div>
                  {q && (
                    <div className="flex items-center gap-2 text-sm mt-1.5">
                      <CheckCircle2 className="h-4.5 w-4.5 text-success-500 shrink-0" />
                      <span className="text-neutral-600">Correct answer: <span className="text-success-700 font-bold">{q.options[q.correct]}</span></span>
                    </div>
                  )}
                </div>
              );
            })}
            {computedResults.filter(r => !r.correct).length === 0 && (
              <EmptyState icon={CheckCircle2} title="Perfect Score!" description="You got every question right. Outstanding work!" />
            )}
          </CardBody>
        </Card>
        <div className="flex justify-center gap-3">
          <Button variant="outline" icon={RefreshCw} onClick={() => { setView('take'); setActiveQuiz(0); setAnswers({}); }}>Retake Quiz</Button>
          <Button icon={ChevronRight} onClick={() => setView('list')}>Back to Quizzes</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <SectionHeader title="Quiz Center" description="Take faculty-provided or RAG-generated quizzes and review your performance" />
      <Card className="border-neutral-200 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader title="Generate Quiz with AI" subtitle="Enter a topic or chapter to create a custom quiz" icon={Bot} />
        <CardBody>
          <div className="space-y-5">
            <div>
              <label className="text-sm font-semibold text-neutral-700 mb-2.5 block">Upload Document (optional)</label>
              <input
                ref={fileInputRef}
                type="file"
                className="sr-only"
                accept=".pdf,.pptx,.docx,.txt,.md,.csv,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown,text/csv"
                onChange={event => {
                  const file = event.target.files?.[0];
                  if (file) void uploadDocument(file);
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full flex items-center justify-center gap-2 h-11 px-4 rounded-xl border border-dashed border-neutral-300 text-sm font-semibold text-neutral-600 hover:border-primary-400 hover:text-primary-700 hover:bg-primary-50/50 transition-all disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isUploading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {isUploading ? 'Uploading…' : uploadedFile ? 'Change file' : 'Upload PDF, PPTX, DOCX, TXT, MD, CSV'}
              </button>
              {uploadStatus && (
                <p className={`mt-2.5 text-xs font-medium ${uploadStatus?.includes('✓') ? 'text-success-600' : 'text-neutral-500'}`} aria-live="polite">
                  {uploadStatus}
                </p>
              )}
              {uploadedFile && (
                <div className="mt-3 flex items-center gap-3 p-3 rounded-xl border border-primary-200 bg-primary-50">
                  <FileText className="h-4.5 w-4.5 text-primary-600 shrink-0" />
                  <span className="flex-1 text-sm text-primary-800 font-medium truncate">{uploadedFile.name}</span>
                  <button
                    type="button"
                    onClick={() => setUploadedFile(null)}
                    className="p-1.5 rounded-lg text-primary-600 hover:text-primary-800 hover:bg-primary-100 transition-colors"
                    title="Remove file"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-semibold text-neutral-700 mb-2.5 block">Topic / Chapter</label>
                <input
                  type="text"
                  value={genTopic}
                  onChange={e => setGenTopic(e.target.value)}
                  placeholder="e.g. Data Structures, Photosynthesis"
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-sm outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                />
              </div>
            <div>
              <label className="text-sm font-semibold text-neutral-700 mb-2.5 block">Questions</label>
              <input
                type="number"
                min={1}
                max={50}
                value={genCount}
                onChange={e => setGenCount(Math.max(1, Number(e.target.value)))}
                placeholder="e.g. 5"
                className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-sm outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
              />
            </div>
              <div>
                <label className="text-sm font-semibold text-neutral-700 mb-2.5 block">Difficulty</label>
                <select
                  value={genDifficulty}
                  onChange={e => setGenDifficulty(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-sm outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button icon={Sparkles} onClick={generateQuiz} disabled={isGenerating || (!genTopic.trim() && !uploadedFile)} className="min-w-[180px] h-11">
                {isGenerating ? 'Generating…' : 'Generate Quiz'}
              </Button>
              {generatedQuiz && (
                <Button variant="outline" icon={ArrowRight} onClick={() => { setView('take'); setActiveQuiz(0); setAnswers({}); }}>
                  Take Generated Quiz
                </Button>
              )}
            </div>
          </div>
        </CardBody>
      </Card>
      {loading ? (
        <Card className="border-neutral-200 shadow-sm"><CardBody><p className="text-sm text-neutral-400 text-center py-8">Loading quizzes...</p></CardBody></Card>
      ) : quizList.length === 0 && !generatedQuiz ? (
        <Card className="border-neutral-200 shadow-sm"><CardBody><EmptyState icon={HelpCircle} title="No quizzes" description="No quizzes are available yet. Generate one with AI above." /></CardBody></Card>
      ) : (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {quizList.map(quiz => (
          <Card key={quiz.id} hover className="p-5 border-neutral-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
              <div className={cn('grid place-items-center h-12 w-12 rounded-xl', quiz.status === 'completed' ? 'bg-success-100 text-success-600' : quiz.status === 'upcoming' ? 'bg-warning-100 text-warning-600' : 'bg-primary-100 text-primary-600')}>
                <HelpCircle className="h-6 w-6" />
              </div>
              <Badge tone={quiz.status === 'completed' ? 'success' : quiz.status === 'upcoming' ? 'warning' : 'primary'}>
                {quiz.status === 'completed' ? 'Completed' : quiz.status === 'upcoming' ? 'Upcoming' : 'In Progress'}
              </Badge>
            </div>
            <h3 className="font-display font-semibold text-neutral-900">{quiz.title}</h3>
            <p className="text-xs text-neutral-500 mt-1">{quiz.course} · {quiz.topic}</p>
            <p className="text-xs font-bold text-primary-700 mt-1">{quiz.course === 'AI Generated' || quiz.id.startsWith('gq-') ? 'Generated by AI Assistant (RAG)' : 'Provided by Teacher'}</p>
            <div className="flex items-center gap-4 mt-4 text-xs text-neutral-500">
              <span className="flex items-center gap-1.5"><HelpCircle className="h-4 w-4" /> {quiz.questions} Qs</span>
              <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> {quiz.duration} min</span>
            </div>
            {quiz.score !== undefined && (
              <div className="mt-4 pt-4 border-t border-neutral-100">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-neutral-500">Score</span>
                  <span className={cn('text-sm font-bold', quiz.score >= 80 ? 'text-success-600' : quiz.score >= 60 ? 'text-warning-600' : 'text-error-600')}>{quiz.score}%</span>
                </div>
                <Progress value={quiz.score} tone={quiz.score >= 80 ? 'success' : 'warning'} size="sm" />
              </div>
            )}
            <p className="text-xs text-neutral-400 mt-3">{quiz.dueDate}</p>
            {quiz.status === 'upcoming' ? (
              <Button className="w-full mt-4" size="sm" icon={ArrowRight} onClick={() => { setView('take'); setActiveQuiz(0); setAnswers({}); }}>Start Quiz</Button>
            ) : (
              <Button variant="outline" className="w-full mt-4" size="sm" icon={BarChart3} onClick={() => setView('results')}>Correct It</Button>
            )}
          </Card>
        ))}
      </div>
      )}

      <Card className="border-neutral-200 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader title="Quiz History" subtitle="All your past quiz attempts" icon={Clock} />
        <CardBody>
          <div className="space-y-2">
            {(quizList.length > 0 ? quizList : quizzes).filter((q: any) => q.status === 'completed').map((quiz: any) => (
              <div key={quiz.id} className="flex items-center gap-4 p-4 rounded-xl border border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300 transition-all bg-white">
                <div className="grid place-items-center h-10 w-10 rounded-xl bg-success-100 text-success-600"><CheckCircle2 className="h-5 w-5" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-neutral-900 truncate">{quiz.title}</p>
                  <p className="text-xs text-neutral-500">{quiz.course} · {quiz.questions} questions · {quiz.dueDate}</p>
                </div>
                <Badge tone={quiz.score! >= 80 ? 'success' : 'warning'}>{quiz.score}%</Badge>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
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
  const markRead = (id: string) => setItems(items.map(n => n.id === id ? { ...n, read: true } : n));
  const markAll = () => setItems(items.map(n => ({ ...n, read: true })));

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
            <Card key={n.id} hover className={cn('p-5 cursor-pointer border transition-all', !n.read ? 'border-primary-200 bg-primary-50/30 shadow-sm' : 'border-neutral-200 shadow-sm hover:shadow-md')} >
              <div className="flex items-start gap-4" onClick={() => markRead(n.id)}>
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

