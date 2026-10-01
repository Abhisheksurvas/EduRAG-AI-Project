import { useState, useRef, useEffect, useCallback, useMemo, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import {
  Printer,
  Eye,
  Code,
  Check,
  Share2,
  Flame,
  Target,
  TrendingUp,
  BookOpen,
  Bot,
  StickyNote,
  HelpCircle,
  ClipboardList,
  Clock,
  ChevronRight,
  FileText,
  Presentation,
  FileType,
  Search,
  Download,
  Sparkles,
  Send,
  Bot as BotIcon,
  RefreshCw,
  MessageSquare,
  Copy,
  Edit3,
  BookMarked,
  ArrowRight,
  CheckCircle2,
  Circle,
  Bookmark as BookmarkIcon,
  Brain,
  Zap,
  Trash2,
  Paperclip,
  PanelLeftOpen,
  PanelLeftClose,
  Maximize2,
  Minimize2,
  X,
  LoaderCircle,
  XCircle,
  Database,
} from 'lucide-react';

import {
  Card,
  CardHeader,
  CardBody,
  Badge,
  Button,
  Progress,
  StatCard,
  EmptyState,
  SectionHeader,
  ToastContainer,
  ConfirmDialog,
  type ToastData,
} from '@/components/ui';

import { cn } from '@/lib/utils';
import { getCurrentAccount } from '@/lib/auth';
import { useDashboard } from '@/context/DashboardContext';

import { ChatHistorySidebar } from '@/components/ChatHistorySidebar';
import { FormulaSheetRenderer, FormulaSectionCardsView, VisualMath, cleanLatexMath, parseFormulaSection, getFormulaSheetFormulas, type FormulaItem } from './FormulaSheetRenderer';
import { triggerVerifiedExportDownload } from '@/lib/exportNotesService';

import {
  loadConversations,
  saveConversation,
  generateConversationTitle,
  getCurrentUserId,
  getCurrentUserRole,
  type ChatConversation,
} from '@/lib/chatHistory';

import {
  studentCourses,
  documents,
  quizzes,
  assignments,
  chatHistory,
  recentActivity,
  aiUsageStats,
  generatedNotes,
  type ChatMessage,
  getStudentProfile,
} from '@/data/mockData';
import {
  fetchNotes,
  createNote,
  updateNote,
  deleteNote,
  deleteAllNotes,
  sendChatMessage,
  findMaterialsByTopic,
  generateNotesService,
  notifyDocumentSelected,
} from '@/lib/dataService';
import { normalizeTopic } from '@/lib/utils';

/* =========================================================
   TYPES / HELPERS
========================================================= */

const iconMap = {
  quiz: HelpCircle,
  ai: Bot,
  notes: StickyNote,
  assignment: ClipboardList,
  flashcard: BookOpen,
} as const;

const docIcon = {
  pdf: FileText,
  ppt: Presentation,
  doc: FileType,
  video: FileText,
} as const;

const docColor = {
  pdf: 'error',
  ppt: 'warning',
  doc: 'primary',
  video: 'secondary',
} as const;

/*
 * Static Tailwind classes.
 * Avoid bg-${color}-500 because Tailwind may not generate
 * dynamically constructed classes.
 */
const courseColorStyles: Record<string, string> = {
  primary: 'bg-primary-50 text-primary-600',
  secondary: 'bg-secondary-50 text-secondary-600',
  accent: 'bg-accent-50 text-accent-600',
  success: 'bg-success-50 text-success-600',
  warning: 'bg-warning-50 text-warning-600',
  error: 'bg-error-50 text-error-600',
};

const courseGradientStyles: Record<string, string> = {
  primary: 'from-primary-600 to-primary-800',
  secondary: 'from-secondary-600 to-secondary-800',
  accent: 'from-accent-600 to-accent-800',
  success: 'from-success-600 to-success-800',
  warning: 'from-warning-600 to-warning-800',
  error: 'from-error-600 to-error-800',
};

const courseLineGradientStyles: Record<string, string> = {
  primary: 'from-primary-400 to-primary-600',
  secondary: 'from-secondary-400 to-secondary-600',
  accent: 'from-accent-400 to-accent-600',
  success: 'from-success-400 to-success-600',
  warning: 'from-warning-400 to-warning-600',
  error: 'from-error-400 to-error-600',
};

const toneStyles: Record<string, string> = {
  primary: 'border-primary-300 bg-primary-50 text-primary-700',
  secondary: 'border-secondary-300 bg-secondary-50 text-secondary-700',
  accent: 'border-accent-300 bg-accent-50 text-accent-700',
  success: 'border-success-300 bg-success-50 text-success-700',
  warning: 'border-warning-300 bg-warning-50 text-warning-700',
};

/* =========================================================
   DASHBOARD
========================================================= */

export function StudentDashboard() {
  const student = getStudentProfile();

  return (
    <div className="space-y-6">
      {/* Welcome card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 p-8 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/3 translate-x-1/3" />
        <div className="absolute bottom-0 right-1/4 w-40 h-40 bg-secondary-400/20 rounded-full translate-y-1/2" />

        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="text-primary-200 text-sm">Welcome back,</p>

            <h1 className="text-3xl font-bold font-display mt-1">
              {student.name}
            </h1>

            <p className="text-primary-100 mt-2 text-sm">
              {student.program} · Semester {student.semester}
            </p>

            <div className="flex items-center gap-4 mt-4">
              <span className="flex items-center gap-1.5 text-sm bg-white/15 rounded-full px-3 py-1">
                <Flame className="h-4 w-4 text-accent-300" />
                {student.streak} day streak
              </span>

              <span className="flex items-center gap-1.5 text-sm bg-white/15 rounded-full px-3 py-1">
                <BookOpen className="h-4 w-4" />
                {student.credits} credits
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end">
            <div className="text-5xl font-bold font-display">
              {student.goalProgress}%
            </div>

            <p className="text-primary-200 text-sm mt-1">
              Today's goal
            </p>

            <div className="w-48 mt-2">
              <Progress
                value={student.goalProgress}
                size="lg"
                tone="accent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={BookOpen}
          label="Enrolled Courses"
          value={studentCourses.length}
          tone="primary"
          trend={{ value: '2 new', up: true }}
        />

        <StatCard
          icon={HelpCircle}
          label="Quizzes Completed"
          value={quizzes.filter(q => q.status === 'completed').length}
          tone="success"
          trend={{ value: '8%', up: true }}
        />

        <StatCard
          icon={ClipboardList}
          label="Pending Assignments"
          value={assignments.filter(a => a.status === 'pending').length}
          tone="warning"
        />

        <StatCard
          icon={Bot}
          label="AI Queries Today"
          value={aiUsageStats.weeklyQueries[0]?.count ?? 0}
          tone="secondary"
          trend={{ value: '15%', up: true }}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Today's Study Goal */}
        <Card>
          <CardHeader
            title="Today's Study Goal"
            subtitle="Stay on track"
            icon={Target}
          />

          <CardBody>
            <div className="flex items-start gap-3 mb-4">
              <div className="grid place-items-center h-10 w-10 rounded-xl bg-accent-100 text-accent-600 shrink-0">
                <Target className="h-5 w-5" />
              </div>

              <p className="text-sm text-neutral-700">
                {student.goalToday}
              </p>
            </div>

            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-neutral-500">
                Progress
              </span>

              <span className="text-sm font-semibold text-neutral-900">
                {student.goalProgress}%
              </span>
            </div>

            <Progress
              value={student.goalProgress}
              tone="accent"
              size="lg"
            />

            <Button
              variant="outline"
              size="sm"
              className="w-full mt-4"
            >
              Continue Studying
            </Button>
          </CardBody>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Recent Activity"
            subtitle="Your latest learning actions"
            icon={Clock}
          />

          <CardBody className="pt-4">
            <div className="space-y-1">
              {recentActivity.map(act => {
                const Icon =
                  iconMap[act.icon as keyof typeof iconMap] ?? BookOpen;

                return (
                  <div
                    key={act.id}
                    className="flex items-center gap-3 py-2.5 px-2 rounded-xl hover:bg-neutral-50 transition-colors"
                  >
                    <div className="grid place-items-center h-9 w-9 rounded-lg bg-neutral-100 text-neutral-500 shrink-0">
                      <Icon className="h-4 w-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-900">
                        {act.action}
                      </p>

                      <p className="text-xs text-neutral-500 truncate">
                        {act.detail}
                      </p>
                    </div>

                    <span className="text-xs text-neutral-400 shrink-0">
                      {act.time}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Learning Progress */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Learning Progress"
            subtitle="Course completion overview"
            icon={TrendingUp}
          />

          <CardBody className="space-y-4">
            {studentCourses.slice(0, 4).map(course => {
              const Icon = course.icon;

              return (
                <div
                  key={course.id}
                  className="flex items-center gap-4"
                >
                  <div
                    className={cn(
                      'grid place-items-center h-10 w-10 rounded-xl shrink-0',
                      courseColorStyles[course.color] ??
                      'bg-neutral-100 text-neutral-600'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-neutral-900 truncate">
                        {course.title}
                      </span>

                      <span className="text-sm font-semibold text-neutral-600">
                        {course.progress}%
                      </span>
                    </div>

                    <Progress
                      value={course.progress}
                      tone={course.color as any}
                      size="sm"
                    />
                  </div>
                </div>
              );
            })}
          </CardBody>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader title="Quick Actions" icon={Zap} />

          <CardBody className="grid grid-cols-2 gap-3">
            {[
              {
                label: 'Ask AI',
                icon: Bot,
                tone: 'primary',
              },
              {
                label: 'Generate Notes',
                icon: StickyNote,
                tone: 'accent',
              },
              {
                label: 'Take Quiz',
                icon: HelpCircle,
                tone: 'success',
              },
            ].map(action => {
              const Icon = action.icon;

              return (
                <button
                  key={action.label}
                  type="button"
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-xl border border-neutral-200',
                    'hover:border-neutral-300 hover:shadow-md transition-all duration-200 group',
                    action.tone === 'primary' && 'hover:bg-primary-50',
                    action.tone === 'accent' && 'hover:bg-accent-50',
                    action.tone === 'success' && 'hover:bg-success-50'
                  )}
                >
                  <div
                    className={cn(
                      'grid place-items-center h-10 w-10 rounded-xl transition-transform group-hover:scale-110',
                      action.tone === 'primary' &&
                      'bg-primary-100 text-primary-600',
                      action.tone === 'accent' &&
                      'bg-accent-100 text-accent-600',
                      action.tone === 'success' &&
                      'bg-success-100 text-success-600'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>

                  <span className="text-xs font-medium text-neutral-700">
                    {action.label}
                  </span>
                </button>
              );
            })}
          </CardBody>
        </Card>
      </div>

      {/* Recently Uploaded Documents */}
      <Card>
        <CardHeader
          title="Recently Uploaded Documents"
          subtitle="Latest materials from your courses"
          icon={FileText}
          action={
            <Button
              variant="ghost"
              size="sm"
              icon={ChevronRight}
            >
              View Library
            </Button>
          }
        />

        <CardBody>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {documents.slice(0, 6).map(doc => {
              const Icon = docIcon[doc.type];

              return (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-neutral-200 hover:border-neutral-300 hover:shadow-md transition-all cursor-pointer group"
                >
                  <div
                    className={cn(
                      'grid place-items-center h-11 w-11 rounded-xl shrink-0',
                      `bg-${docColor[doc.type]}-100`,
                      `text-${docColor[doc.type]}-600`
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-neutral-900 truncate">
                      {doc.name}
                    </p>

                    <p className="text-xs text-neutral-500">
                      {doc.course} · {doc.size}
                    </p>
                  </div>

                  <Download className="h-4 w-4 text-neutral-300 group-hover:text-primary-600 transition-colors shrink-0" />
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

/* =========================================================
   MY COURSES
========================================================= */

export function StudentCourses() {
  const student = getStudentProfile();

  const [coursesList, setCoursesList] =
    useState(studentCourses);

  const [selected, setSelected] =
    useState<string | null>(null);

  const course = coursesList.find(
    c => c.id === selected
  );

  const deleteCourse = (
    courseId: string,
    e?: MouseEvent
  ) => {
    e?.stopPropagation();

    setCoursesList(prev =>
      prev.filter(c => c.id !== courseId)
    );

    if (selected === courseId) {
      setSelected(null);
    }
  };

  if (course) {
    const Icon = course.icon;

    const materialsCount = documents.filter(
      d => d.course === course.code
    ).length;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            icon={ChevronRight}
            onClick={() => setSelected(null)}
            className="rotate-180"
          >
            Back to Courses
          </Button>

          <Button
            variant="ghost"
            size="sm"
            icon={Trash2}
            className="text-error-600 hover:bg-error-50"
            onClick={e =>
              deleteCourse(course.id, e)
            }
          >
            Drop Course
          </Button>
        </div>

        <div
          className={cn(
            'relative overflow-hidden rounded-3xl p-8 text-white bg-gradient-to-br',
            courseGradientStyles[course.color] ??
            'from-primary-600 to-primary-800'
          )}
        >
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <Badge className="bg-white/20 text-white ring-white/30">
                {course.code} · {course.category}
              </Badge>

              <h1 className="text-2xl font-bold font-display mt-3">
                {course.title}
              </h1>

              <p className="text-white/80 mt-1">
                Instructor: {course.instructor}
              </p>
            </div>

            <div className="grid place-items-center h-16 w-16 rounded-2xl bg-white/15">
              <Icon className="h-8 w-8" />
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-4">
          <StatCard
            icon={BookOpen}
            label="Modules"
            value={`${course.completedModules}/${course.modules}`}
            tone="primary"
          />

          <StatCard
            icon={TrendingUp}
            label="Progress"
            value={`${course.progress}%`}
            tone="success"
          />

          <StatCard
            icon={FileText}
            label="Materials"
            value={materialsCount}
            tone="accent"
          />

          <StatCard
            icon={Target}
            label="Credits"
            value={course.credits}
            tone="secondary"
          />
        </div>

        <Card>
          <CardHeader
            title="Course Materials"
            subtitle="Documents and resources for this course"
            icon={FileText}
          />

          <CardBody>
            <div className="space-y-2">
              {documents.filter(
                d => d.course === course.code
              ).length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="No course materials"
                  description="No documents are available for this course."
                />
              ) : (
                documents
                  .filter(d => d.course === course.code)
                  .map(doc => {
                    const DIcon = docIcon[doc.type];

                    return (
                      <div
                        key={doc.id}
                        className="flex items-center gap-3 p-3 rounded-xl border border-neutral-200 hover:bg-neutral-50 transition-colors"
                      >
                        <div
                          className={cn(
                            'grid place-items-center h-10 w-10 rounded-lg shrink-0',
                            `bg-${docColor[doc.type]}-100`,
                            `text-${docColor[doc.type]}-600`
                          )}
                        >
                          <DIcon className="h-5 w-5" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-neutral-900 truncate">
                            {doc.name}
                          </p>

                          <p className="text-xs text-neutral-500">
                            {doc.pages} pages · {doc.size} ·{' '}
                            {doc.uploadedAt}
                          </p>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          icon={Download}
                        >
                          Download
                        </Button>
                      </div>
                    );
                  })
              )}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Next Lesson"
            icon={Sparkles}
          />

          <CardBody>
            <div className="flex items-center gap-4 p-4 rounded-xl bg-primary-50/60 border border-primary-100">
              <div className="grid place-items-center h-12 w-12 rounded-xl bg-primary-600 text-white">
                <BookOpen className="h-6 w-6" />
              </div>

              <div className="flex-1">
                <p className="font-medium text-neutral-900">
                  {course.nextLesson}
                </p>

                <p className="text-sm text-neutral-500 mt-0.5">
                  Module {course.completedModules + 1} of{' '}
                  {course.modules}
                </p>
              </div>

              <Button icon={ArrowRight}>
                Start Lesson
              </Button>
            </div>
          </CardBody>
        </Card>
</div>
  );
}

  return (
    <div className="space-y-6">
      <SectionHeader
        title="My Courses"
        description={`${coursesList.length} enrolled courses · Semester ${student.semester}`}
        action={
          coursesList.length < studentCourses.length ? (
            <Button
              variant="outline"
              size="sm"
              icon={RefreshCw}
              onClick={() =>
                setCoursesList(studentCourses)
              }
            >
              Restore Courses
            </Button>
          ) : undefined
        }
      />

      {coursesList.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={BookOpen}
              title="No Enrolled Courses"
              description="You have dropped or cleared all your courses."
              action={
                <Button
                  icon={RefreshCw}
                  onClick={() =>
                    setCoursesList(studentCourses)
                  }
                >
                  Restore All Courses
                </Button>
              }
            />
          </CardBody>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {coursesList.map(course => {
            const Icon = course.icon;

            return (
              <Card
                key={course.id}
                hover
                className="p-0 overflow-hidden cursor-pointer"
              >
                <div className="w-full text-left">
                  <div
                    className={cn(
                      'h-2 bg-gradient-to-r',
                      courseLineGradientStyles[
                      course.color
                      ] ?? 'from-primary-400 to-primary-600'
                    )}
                  />

                  <div className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div
                        className={cn(
                          'grid place-items-center h-12 w-12 rounded-xl',
                          courseColorStyles[
                          course.color
                          ] ??
                          'bg-neutral-100 text-neutral-600'
                        )}
                      >
                        <Icon className="h-6 w-6" />
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge
                          tone={
                            course.category === 'Core'
                              ? 'primary'
                              : course.category ===
                                'Elective'
                                ? 'secondary'
                                : 'accent'
                          }
                        >
                          {course.category}
                        </Badge>

                        <button
                          type="button"
                          title="Delete / Drop Course"
                          onClick={e =>
                            deleteCourse(course.id, e)
                          }
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-error-600 hover:bg-error-50 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div
                      onClick={() =>
                        setSelected(course.id)
                      }
                      className="cursor-pointer"
                    >
                      <p className="text-xs text-neutral-400 font-medium">
                        {course.code} · {course.credits}{' '}
                        Credits
                      </p>

                      <h3 className="font-display font-semibold text-neutral-900 mt-1 leading-snug">
                        {course.title}
                      </h3>

                      <p className="text-sm text-neutral-500 mt-1">
                        {course.instructor}
                      </p>

                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs text-neutral-500">
                            {course.completedModules}/
                            {course.modules} modules
                          </span>

                          <span className="text-xs font-semibold text-neutral-700">
                            {course.progress}%
                          </span>
                        </div>

                        <Progress
                          value={course.progress}
                          tone={course.color as any}
                          size="sm"
                        />
                      </div>

                      <p className="text-xs text-neutral-400 mt-3 flex items-center gap-1.5">
                        <BookOpen className="h-3.5 w-3.5" />
                        Next: {course.nextLesson}
                      </p>
                    </div>
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

/* =========================================================
   MY LIBRARY
========================================================= */

export function StudentLibrary() {
  const [libraryDocs, setLibraryDocs] =
    useState(documents);

  const [filter, setFilter] =
    useState<string>('all');

  const [query, setQuery] =
    useState('');

  const deleteDoc = (docId: string) => {
    setLibraryDocs(prev =>
      prev.filter(d => d.id !== docId)
    );
  };

  const filtered = libraryDocs.filter(d =>
    (filter === 'all' || d.type === filter) &&
    d.name
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'pdf', label: 'PDF' },
    { id: 'ppt', label: 'Slides' },
    { id: 'doc', label: 'Documents' },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="My Library"
        description="Your notes, study materials, and uploaded documents"
        action={
          libraryDocs.length < documents.length ? (
            <Button
              variant="outline"
              size="sm"
              icon={RefreshCw}
              onClick={() =>
                setLibraryDocs(documents)
              }
            >
              Reset Library
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 h-10 px-3.5 rounded-xl bg-white border border-neutral-200 flex-1 min-w-[200px]">
          <Search className="h-4 w-4 text-neutral-400" />

          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search documentsâ€¦"
            className="flex-1 bg-transparent text-sm outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-white border border-neutral-200 rounded-xl p-1">
          {filters.map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                'px-3 h-8 rounded-lg text-sm font-medium transition-colors',
                filter === f.id
                  ? 'bg-primary-600 text-white'
                  : 'text-neutral-600 hover:bg-neutral-100'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={FileText}
              title="No documents found"
              description="Try adjusting your search or filter."
              action={
                libraryDocs.length < documents.length ? (
                  <Button
                    icon={RefreshCw}
                    onClick={() =>
                      setLibraryDocs(documents)
                    }
                  >
                    Restore Documents
                  </Button>
                ) : undefined
              }
            />
          </CardBody>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(doc => {
            const Icon = docIcon[doc.type];

            return (
              <Card
                key={doc.id}
                hover
                className="p-5"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      'grid place-items-center h-12 w-12 rounded-xl shrink-0',
                      `bg-${docColor[doc.type]}-100`,
                      `text-${docColor[doc.type]}-600`
                    )}
                  >
                    <Icon className="h-6 w-6" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-neutral-900 line-clamp-2">
                      {doc.name}
                    </p>

                    <p className="text-xs text-neutral-500 mt-1">
                      {doc.course} · {doc.pages} pages ·{' '}
                      {doc.size}
                    </p>

                    <p className="text-xs text-neutral-400 mt-0.5">
                      Uploaded {doc.uploadedAt} by{' '}
                      {doc.uploadedBy}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-neutral-100">
                  <Button
                    variant="outline"
                    size="sm"
                    icon={Download}
                    className="flex-1"
                  >
                    Download
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    icon={Trash2}
                    className="text-error-600 hover:bg-error-50"
                    onClick={() =>
                      deleteDoc(doc.id)
                    }
                  >
                    Delete
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   AI STUDY ASSISTANT
========================================================= */

/* =========================================================
   AI STUDY ASSISTANT — RAG Chat UI
   - Sidebar chat history with [+], [search], [close]
   - File upload -> compact file cards inside the chat
   - RAG answers grounded in the uploaded document content
   - Source references: dynamic per-message (doc + page)
   - Suggested questions populate the input field
   - Toast notifications on upload (success / error)
========================================================= */

const ACCEPTED_EXT = ['pdf', 'pptx', 'docx', 'txt', 'md', 'csv'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_FILES = 5;
const MATERIAL_FILE_URL = 'http://localhost:8000/api/materials/download';

type UploadedFile = {
  id: string;
  name: string;
  size: number;
  type: string;
  pages: number;
  status: 'indexing' | 'ready' | 'failed';
};

function getExt(name: string): string {
  const m = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : '';
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function openMaterialFile(id: string, inline = true): void {
  const query = inline ? '?inline=1' : '';
  window.open(`${MATERIAL_FILE_URL}/${encodeURIComponent(id)}${query}`, '_blank', 'noopener,noreferrer');
}

function fileIconFor(name: string): 'pdf' | 'ppt' | 'doc' | 'text' {
  const ext = getExt(name);
  if (ext === 'pdf') return 'pdf';
  if (ext === 'pptx') return 'ppt';
  if (ext === 'docx') return 'doc';
  return 'text';
}

const fileBadgeClass: Record<'pdf' | 'ppt' | 'doc' | 'text', string> = {
  pdf: 'bg-error-100 text-error-700 dark:bg-error-900/40 dark:text-error-300 border-error-200 dark:border-error-800',
  ppt: 'bg-warning-100 text-warning-700 dark:bg-warning-900/40 dark:text-warning-300 border-warning-200 dark:border-warning-800',
  doc: 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300 border-primary-200 dark:border-primary-800',
  text: 'bg-success-100 text-success-700 dark:bg-success-900/40 dark:text-success-300 border-success-200 dark:border-success-800',
};

function renderHighlightedText(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={`${part}-${index}`} className="font-semibold text-primary-700 dark:text-primary-300">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

function renderAnswerContent(content: string) {
  return content.split(/\r?\n/).map((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={`space-${index}`} className="h-2" />;

    const bullet = trimmed.match(/^[-*•]\s+(.*)$/);
    if (bullet) {
      return (
        <div key={`bullet-${index}`} className="aisa-answer-bullet">
          <span className="aisa-answer-bullet-dot" aria-hidden="true" />
          <span>{renderHighlightedText(bullet[1])}</span>
        </div>
      );
    }

    const heading = trimmed.match(/^#{1,3}\s+(.*)$/);
    if (heading) {
      return (
        <h4 key={`heading-${index}`} className="aisa-answer-heading">
          {renderHighlightedText(heading[1])}
        </h4>
      );
    }

    return <p key={`line-${index}`} className="aisa-answer-line">{renderHighlightedText(trimmed)}</p>;
  });
}

async function readSSEStream(
  response: Response,
  onMetadata: (data: any) => void,
  onToken: (token: string) => void,
  onDone: (data: any) => void,
): Promise<void> {
  if (!response.body) {
    const data = await response.json();
    onMetadata(data);
    if (data.answer) onToken(data.answer);
    onDone(data);
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() || '';

    for (const evt of events) {
      if (!evt.trim()) continue;
      const lines = evt.split('\n');
      let eventName = 'message';
      let dataStr = '';

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          eventName = line.slice(7).trim();
        } else if (line.startsWith('data: ')) {
          dataStr = line.slice(6).trim();
        }
      }

      if (!dataStr) continue;
      try {
        const parsed = JSON.parse(dataStr);
        if (eventName === 'metadata') {
          onMetadata(parsed);
        } else if (eventName === 'token') {
          if (parsed.delta) onToken(parsed.delta);
        } else if (eventName === 'done') {
          onDone(parsed);
        } else if (eventName === 'error') {
          throw new Error(parsed.error || 'AI streaming error');
        }
      } catch (err) {
        if (err instanceof Error && err.message.includes('AI streaming error')) {
          throw err;
        }
      }
    }
  }
}

export function StudentAIAssistant() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const { isFullScreen, setIsFullScreen } = useDashboard();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageText, setEditingMessageText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [loadingDocs, setLoadingDocs] = useState<boolean>(true);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isFullScreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullScreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullScreen, setIsFullScreen]);

  useEffect(() => {
    if (!sourcesOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSourcesOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sourcesOpen]);

  useEffect(() => {
    return () => {
      setIsFullScreen(false);
    };
  }, [setIsFullScreen]);

  const pushToast = useCallback((message: string, tone: ToastData['tone']) => {
    const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    setToasts(prev => [...prev, { id, message, tone }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const loadStudentDocuments = useCallback(async () => {
    try {
      setLoadingDocs(true);
      const token = typeof window !== 'undefined' ? window.localStorage.getItem('edurag-auth-token') : null;
      const userId = getCurrentUserId();
      const role = getCurrentUserRole();
      const res = await fetch(`http://localhost:8000/api/materials?userId=${encodeURIComponent(userId)}&role=${encodeURIComponent(role)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return;
      const data = await res.json();
      const list: any[] = Array.isArray(data) ? data : (data?.materials ?? []);

      const docMap = new Map<string, UploadedFile>();
      list.forEach((m: any) => {
        const id = String(m.id || m._id || '').trim();
        const rawName = String(m.name || m.documentName || m.filename || m.title || '').trim();
        if (!id || !rawName) return;

        const normName = rawName.toLowerCase();
        const rawStatus = String(m.status || '').toLowerCase();
        const isReady = rawStatus === 'ready' || rawStatus === 'approved' || rawStatus === 'indexed';
        const status: 'ready' | 'indexing' | 'failed' = isReady ? 'ready' : (rawStatus === 'failed' ? 'failed' : 'indexing');

        if (isReady || status === 'indexing') {
          if (!docMap.has(normName) || (isReady && docMap.get(normName)?.status !== 'ready')) {
            docMap.set(normName, {
              id,
              name: rawName,
              size: Number(m.size) || 0,
              type: m.type || getExt(rawName),
              pages: Number(m.pages) || 1,
              status,
            });
          }
        }
      });

      const docs = Array.from(docMap.values());
      setUploadedFiles(prev => {
        // Retain any in-flight local uploads
        const inFlight = prev.filter(p => p.status === 'indexing' && !docMap.has(p.name.toLowerCase()));
        return [...docs, ...inFlight];
      });

      // Maintain existing selection without auto-selecting if empty
      setSelectedDocIds(prev => {
        if (prev.size > 0) {
          const valid = new Set<string>();
          for (const id of prev) {
            if (docs.some(d => d.id === id)) valid.add(id);
          }
          if (valid.size > 0) return valid;
        }
        return new Set();
      });
    } catch (err) {
      console.warn('[StudentAIAssistant] Failed to load documents:', err);
    } finally {
      setLoadingDocs(false);
    }
  }, []);

  useEffect(() => {
    loadStudentDocuments();
  }, [loadStudentDocuments]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await loadConversations();
        if (!cancelled) setConversations(data);
      } catch (err) {
        console.warn('[StudentAIAssistant] Failed to load conversations:', err);
      } finally {
        if (!cancelled) setLoadingConversations(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }, [input]);

  const currentSuggestions = useMemo(() => {
    const readyDocs = uploadedFiles.filter(f => f.status === 'ready');
    const activeSelectedDocs = readyDocs.filter(f => selectedDocIds.has(f.id));

    // When document(s) are actively selected, strictly show suggestions for the selected document!
    if (activeSelectedDocs.length > 0) {
      const primaryDoc = activeSelectedDocs[0];
      const primaryName = primaryDoc.name.replace(/\.[^/.]+$/, '').trim();
      const lower = primaryDoc.name.toLowerCase();

      if (lower.includes('aiml') || lower.includes('ai') || lower.includes('machine learning') || lower.includes('neural')) {
        return {
          label: `Suggested for ${primaryDoc.name}`,
          questions: [
            `What are the core machine learning concepts in "${primaryName}"?`,
            `How does gradient descent and optimization work according to "${primaryName}"?`,
            `Explain the model evaluation metrics discussed in "${primaryName}".`,
            `What are the major algorithms and architectures covered in "${primaryName}"?`,
            `Summarize the key takeaways and formulas from "${primaryName}".`,
          ],
        };
      }

      if (lower.includes('crypt') || lower.includes('network') || lower.includes('security') || lower.includes('cipher')) {
        return {
          label: `Suggested for ${primaryDoc.name}`,
          questions: [
            `Explain the key cryptographic algorithms and protocols in "${primaryName}".`,
            `What are the main security vulnerabilities and defense models in "${primaryName}"?`,
            `How do authentication and encryption mechanisms function in "${primaryName}"?`,
            `What are the critical network protocols and layer standards in "${primaryName}"?`,
            `Summarize the core security principles from "${primaryName}".`,
          ],
        };
      }

      if (lower.includes('dbms') || lower.includes('database') || lower.includes('sql')) {
        return {
          label: `Suggested for ${primaryDoc.name}`,
          questions: [
            `Explain the normalization rules and transaction ACID properties in "${primaryName}".`,
            `How do indexing, B-trees, and query optimization work according to "${primaryName}"?`,
            `What are the concurrency control and locking mechanisms described in "${primaryName}"?`,
            `Summarize the relational schema designs and constraints in "${primaryName}".`,
            `What are the top exam questions based on "${primaryName}"?`,
          ],
        };
      }

      if (lower.includes('graph') || lower.includes('tree') || lower.includes('dsa') || lower.includes('algorithm') || lower.includes('dijkstra')) {
        return {
          label: `Suggested for ${primaryDoc.name}`,
          questions: [
            `Summarize the algorithm time and space complexities in "${primaryName}".`,
            `Explain the graph traversal and shortest-path techniques in "${primaryName}".`,
            `How do tree structures and balancing operations work in "${primaryName}"?`,
            `Compare the algorithm trade-offs and dynamic programming approaches in "${primaryName}".`,
            `What are the top exam-oriented problems from "${primaryName}"?`,
          ],
        };
      }

      if (lower.includes('os') || lower.includes('operating')) {
        return {
          label: `Suggested for ${primaryDoc.name}`,
          questions: [
            `Explain process scheduling and synchronization mechanisms in "${primaryName}".`,
            `How does virtual memory, paging, and page replacement work in "${primaryName}"?`,
            `What are deadlock prevention and avoidance algorithms discussed in "${primaryName}"?`,
            `Summarize file system architecture and I/O management in "${primaryName}".`,
            `What are high-yield exam questions from "${primaryName}"?`,
          ],
        };
      }

      return {
        label: `Suggested for ${primaryDoc.name}`,
        questions: [
          `Summarize the key topics and concepts covered in "${primaryName}".`,
          `Explain the most important definitions, principles, and formulas in "${primaryName}".`,
          `What are the high-probability exam questions from "${primaryName}"?`,
          `Provide a clear step-by-step breakdown of the core sections in "${primaryName}".`,
          `Give a quick revision summary and key takeaways of "${primaryName}".`,
        ],
      };
    }

    // When NO document is explicitly selected, but readyDocs exist:
    if (readyDocs.length > 0) {
      return {
        label: `Suggested across ${readyDocs.length} ready document${readyDocs.length === 1 ? '' : 's'}`,
        questions: [
          `Summarize the common themes across all my uploaded documents.`,
          `What are the key formulas and definitions across my course materials?`,
          `What are the most important exam topics covered in my documents?`,
          `Provide a comprehensive overview of my study materials.`,
          `Compare the methodologies and concepts presented in my documents.`,
        ],
      };
    }

    return {
      label: 'Popular Study Questions',
      questions: [
        'How do I effectively structure my exam revision using RAG?',
        'What is the difference between supervised and unsupervised learning?',
        'Explain time complexity and Big-O notation with examples.',
        'What are ACID properties in relational database management?',
        'Explain Dijkstra’s algorithm and shortest path concepts.',
      ],
    };
  }, [uploadedFiles, selectedDocIds]);

  const send = useCallback(
    async (text: string) => {
      const trimmedText = text.trim();
      if (!trimmedText) return;
      if (isThinking) return;

      const readyDocs = uploadedFiles.filter(f => f.status === 'ready');
      const activeSelectedDocs = readyDocs.filter(f => selectedDocIds.has(f.id));
      const hasExplicitSelection = activeSelectedDocs.length > 0;
      const docsForRag = hasExplicitSelection ? activeSelectedDocs : readyDocs;

      const userMsg: ChatMessage = {
        id: `u${Date.now()}`,
        role: 'user',
        content: trimmedText,
        timestamp: new Date().toISOString(),
        attachments: hasExplicitSelection
          ? activeSelectedDocs.map(f => ({ id: f.id, name: f.name, status: f.status }))
          : [],
      };

      const nextMessages = [...messages, userMsg];
      setMessages(nextMessages);
      setInput('');
      setIsThinking(true);

      const convId = activeConversationId || `chat-${Date.now()}`;
      if (!activeConversationId) {
        setActiveConversationId(convId);
      }

      // Optimistically show the current chat in the left history bar immediately!
      const initialTitle = generateConversationTitle(nextMessages);
      const initialConv: ChatConversation = {
        conversationId: convId,
        userId: getCurrentUserId(),
        role: 'student',
        title: initialTitle,
        messages: nextMessages,
        updatedAt: new Date().toISOString(),
      };
      setConversations(prev => [initialConv, ...prev.filter(c => c.conversationId !== convId)]);
      saveConversation(initialConv).catch(console.warn);

      const aiMsgId = `a${Date.now()}`;
      let curMaterial = '';
      let curAi = '';
      let curSources: { doc: string; page: number; excerpt: string }[] = [];
      let curSourceType: 'general' | 'document' = 'general';

      const syncAiMessage = (
        aiText: string,
        matText: string,
        srcs: { doc: string; page: number; excerpt: string }[],
        srcType: 'general' | 'document',
      ) => {
        setMessages(prev => {
          const idx = prev.findIndex(m => m.id === aiMsgId);
          const item: ChatMessage = {
            id: aiMsgId,
            role: 'assistant',
            timestamp: new Date().toISOString(),
            content: aiText || (matText ? 'Refer to the extracted material citations above.' : ''),
            materialAnswer: matText || undefined,
            aiAnswer: aiText || undefined,
            sources: srcs,
            sourceType: srcType,
            attachments: hasExplicitSelection
              ? activeSelectedDocs.map(f => ({ id: f.id, name: f.name, status: f.status }))
              : docsForRag.map(f => ({ id: f.id, name: f.name, status: f.status })),
          };
          if (idx >= 0) {
            const arr = [...prev];
            arr[idx] = item;
            return arr;
          }
          return [...prev, item];
        });
      };

      // Create initial placeholder card immediately for instant feedback
      syncAiMessage('', '', [], 'general');

      try {
        const token = window.localStorage.getItem('edurag-auth-token');
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), 120_000);
        const convId = activeConversationId || `chat-${Date.now()}`;
        const response = await fetch('http://localhost:8000/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream, application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          signal: controller.signal,
          body: JSON.stringify({
            userId: getCurrentUserId(),
            role: getCurrentUserRole(),
            conversationId: convId,
            title: 'Chat',
            name: '',
            branch: '',
            semester: '',
            topic: 'General',
            difficulty: 'Medium',
            question: trimmedText,
            responseMode: 'both',
            context: '',
            selectedMaterialIds: docsForRag.map(f => f.id),
            history: nextMessages.slice(-7, -1).map(m => ({
              role: m.role,
              content: m.content,
            })),
            stream: true,
          }),
        });
        window.clearTimeout(timeoutId);

        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('text/event-stream')) {
          await readSSEStream(
            response,
            metadata => {
              if (metadata.material_answer) curMaterial = metadata.material_answer;
              if (Array.isArray(metadata.sources)) {
                curSources = metadata.sources.map((s: any) => ({ ...s, excerpt: '' }));
              }
              if (metadata.source_type) curSourceType = metadata.source_type;
              syncAiMessage(curAi, curMaterial, curSources, curSourceType);
            },
            tokenChunk => {
              curAi += tokenChunk;
              syncAiMessage(curAi, curMaterial, curSources, curSourceType);
            },
            doneData => {
              if (doneData.ai_answer) curAi = doneData.ai_answer;
              if (doneData.material_answer) curMaterial = doneData.material_answer;
              if (Array.isArray(doneData.sources)) {
                curSources = doneData.sources.map((s: any) => ({ ...s, excerpt: '' }));
              }
              if (doneData.source_type) curSourceType = doneData.source_type;
              syncAiMessage(curAi, curMaterial, curSources, curSourceType);
            },
          );
        } else {
          const data = await response.json();
          if (!response.ok || !data.success || !data.answer) {
            throw new Error(data.error || 'The document search could not be completed.');
          }
          curAi = data.answer;
          curMaterial = typeof data.material_answer === 'string' ? data.material_answer : '';
          curSources = Array.isArray(data.sources) ? data.sources.map((s: any) => ({ ...s, excerpt: '' })) : [];
          curSourceType = data.source_type === 'general' ? 'general' : 'document';
          syncAiMessage(curAi, curMaterial, curSources, curSourceType);
        }

        const finalAiMessage: ChatMessage = {
          id: aiMsgId,
          role: 'assistant',
          timestamp: new Date().toISOString(),
          content: curAi || (curMaterial ? 'Refer to the extracted material citations above.' : ''),
          materialAnswer: curMaterial || undefined,
          aiAnswer: curAi || undefined,
          sources: curSources,
          sourceType: curSourceType,
          attachments: hasExplicitSelection
            ? activeSelectedDocs.map(f => ({ id: f.id, name: f.name, status: f.status }))
            : docsForRag.map(f => ({ id: f.id, name: f.name, status: f.status })),
        };

        const updatedMessages = [...nextMessages, finalAiMessage];
        const title = generateConversationTitle(updatedMessages);
        const conversation: ChatConversation = {
          conversationId: convId,
          userId: getCurrentUserId(),
          role: 'student',
          title,
          messages: updatedMessages,
          updatedAt: new Date().toISOString(),
        };

        saveConversation(conversation).then(() => {
          setConversations(prev => [conversation, ...prev.filter(c => c.conversationId !== convId)]);
          setActiveConversationId(convId);
        });
      } catch (err) {
        setMessages(prev => {
          const idx = prev.findIndex(m => m.id === aiMsgId);
          const errItem: ChatMessage = {
            id: aiMsgId,
            role: 'assistant',
            timestamp: new Date().toISOString(),
            content: err instanceof Error ? err.message : 'I could not search your uploaded documents. Please try again.',
            sources: [],
          };
          if (idx >= 0) {
            const arr = [...prev];
            arr[idx] = errItem;
            return arr;
          }
          return [...prev, errItem];
        });
      } finally {
        setIsThinking(false);
      }
    },
    [activeConversationId, isThinking, messages, uploadedFiles, selectedDocIds],
  );

  const handleNewChat = useCallback(() => {
    setActiveConversationId(null);
    setMessages([]);
    setInput('');
    setEditingMessageId(null);
    setEditingMessageText('');
    setIsThinking(false);
  }, []);

  const handleSelectConversation = useCallback((conversation: ChatConversation) => {
    setActiveConversationId(conversation.conversationId);
    setMessages(conversation.messages);
    setEditingMessageId(null);
    setEditingMessageText('');
  }, []);

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      const list = Array.from(files);
      e.target.value = '';
      setIsUploading(true);
      pushToast(
        list.length === 1 ? `Uploading "${list[0].name}"…` : `Uploading ${list.length} files in parallel…`,
        'warning',
      );

      // Pre-screen files
      const validFiles: { file: File; ext: string; pendingId: string }[] = [];
      const pendingFilesToAdd: UploadedFile[] = [];

      for (const file of list) {
        const ext = getExt(file.name);
        if (!ACCEPTED_EXT.includes(ext)) {
          pushToast(`"${file.name}" — unsupported file type. Use PDF, PPTX, DOCX, TXT, MD, or CSV.`, 'error');
          continue;
        }
        if (file.size > MAX_FILE_SIZE) {
          pushToast(`"${file.name}" is larger than 10 MB. Please choose a smaller file.`, 'error');
          continue;
        }

        const pendingId = `uploading_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        validFiles.push({ file, ext, pendingId });
        pendingFilesToAdd.push({
          id: pendingId,
          name: file.name,
          size: file.size,
          type: file.type || ext,
          pages: 1,
          status: 'indexing',
        });
      }

      if (validFiles.length === 0) {
        setIsUploading(false);
        return;
      }

      // Add all pending placeholders at once
      setUploadedFiles(prev => [...prev, ...pendingFilesToAdd]);
      setSelectedDocIds(prev => {
        const next = new Set(prev);
        pendingFilesToAdd.forEach(p => next.add(p.id));
        return next;
      });

      // Upload all valid files concurrently in parallel
      const uploadPromises = validFiles.map(async ({ file, ext, pendingId }) => {
        try {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('studentId', getCurrentUserId());
          formData.append('course', 'Personal study material');
          const token = window.localStorage.getItem('edurag-auth-token');
          const response = await fetch('http://localhost:8000/api/materials/upload', {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            body: formData,
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok || !data.success || !data.material?.id) {
            throw new Error(data.error || 'The file could not be indexed.');
          }

          // Handle deduplication: if file was already indexed, return ready immediately
          if (data.deduplicated && data.material.status === 'ready') {
            const uploadedFile: UploadedFile = {
              id: data.material.id,
              name: data.material.name || file.name,
              size: file.size,
              type: file.type || ext,
              pages: Number(data.material.pages) || 1,
              status: 'ready',
            };
            setUploadedFiles(prev => prev.map(item => item.id === pendingId ? uploadedFile : item));
            setSelectedDocIds(prev => {
              const next = new Set(prev);
              next.delete(pendingId);
              next.add(uploadedFile.id);
              return next;
            });
            notifyDocumentSelected(uploadedFile.id, uploadedFile.name, 'Student AI Assistant Upload').catch(console.warn);
            pushToast(`"${file.name}" already indexed — ready instantly!`, 'success');
            return uploadedFile;
          }

          const uploadedFile: UploadedFile = {
            id: data.material.id,
            name: data.material.name || file.name,
            size: file.size,
            type: file.type || ext,
            pages: Number(data.material.pages) || 1,
            status: data.material.status === 'ready' ? 'ready' : 'indexing',
          };
          setUploadedFiles(prev => prev.map(item => item.id === pendingId ? uploadedFile : item));
          setSelectedDocIds(prev => {
            const next = new Set(prev);
            next.delete(pendingId);
            next.add(uploadedFile.id);
            return next;
          });
          notifyDocumentSelected(uploadedFile.id, uploadedFile.name, 'Student AI Assistant Upload').catch(console.warn);
          return uploadedFile;
        } catch (err) {
          setUploadedFiles(prev => prev.filter(item => item.id !== pendingId));
          setSelectedDocIds(prev => {
            const next = new Set(prev);
            next.delete(pendingId);
            return next;
          });
          pushToast(`Failed to upload "${file.name}". ${err instanceof Error ? err.message : ''}`, 'error');
          return null;
        }
      });

      const results = await Promise.all(uploadPromises);
      const accepted: UploadedFile[] = results.filter((f): f is UploadedFile => f !== null);

      if (accepted.length === 0) {
        setIsUploading(false);
        return;
      }

      if (accepted.length === 1) {
        pushToast(`"${accepted[0].name}" attached — indexing for RAG…`, 'success');
      } else {
        pushToast(`${accepted.length} files attached — indexing for RAG…`, 'success');
      }

      const pendingIds = new Set(accepted.filter(file => file.status !== 'ready').map(file => file.id));
      let indexingComplete = true;

      if (pendingIds.size > 0) {
        const indexedIds = new Set<string>();
        const userId = getCurrentUserId();

        // High-speed adaptive polling: check after 50ms, 120ms, then 200ms
        for (let attempt = 0; attempt < 40 && indexedIds.size < pendingIds.size; attempt += 1) {
          const delay = attempt === 0 ? 50 : attempt < 5 ? 120 : 200;
          await new Promise(resolve => window.setTimeout(resolve, delay));
          try {
            const unindexed = Array.from(pendingIds).filter(id => !indexedIds.has(id));
            if (unindexed.length === 0) break;

            const idsQuery = unindexed.join(',');
            const statusResponse = await fetch(
              `http://localhost:8000/api/materials/status?ids=${encodeURIComponent(idsQuery)}&userId=${encodeURIComponent(userId)}&role=student`,
            );
            if (!statusResponse.ok) continue;
            const statusData = await statusResponse.json();

            if (statusData.statuses && typeof statusData.statuses === 'object') {
              for (const [mid, sInfo] of Object.entries<any>(statusData.statuses)) {
                if (sInfo.status === 'ready' || sInfo.ready) {
                  indexedIds.add(mid);
                } else if (sInfo.status === 'failed') {
                  setUploadedFiles(prev => prev.map(file =>
                    file.id === mid ? { ...file, status: 'failed' } : file,
                  ));
                }
              }
            } else if (statusData.status === 'ready' || statusData.ready) {
              if (unindexed.length === 1) {
                indexedIds.add(unindexed[0]);
              }
            }

            if (indexedIds.size > 0) {
              setUploadedFiles(prev => prev.map(file =>
                indexedIds.has(file.id) ? { ...file, status: 'ready' } : file,
              ));
            }

            if (indexedIds.size === pendingIds.size) {
              break;
            }
          } catch {
            continue;
          }
        }

        if (indexedIds.size === pendingIds.size) {
          pushToast(
            accepted.length === 1
              ? `"${accepted[0].name}" indexed successfully and is ready for questions!`
              : `${accepted.length} files indexed successfully and are ready for questions!`,
            'success',
          );
          void loadStudentDocuments();
        } else {
          indexingComplete = false;
          pushToast('The document was uploaded; indexing is finalizing in background.', 'warning');
        }
      }

      if (indexingComplete) {
        setIsUploading(false);
        textareaRef.current?.focus();
      }
    },
    [loadStudentDocuments, pushToast],
  );

  const removeUploadedFile = useCallback(
    (id: string) => {
      setUploadedFiles(prev => prev.filter(f => f.id !== id));
      setSelectedDocIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      notifyDocumentSelected('none', 'No document attached', 'Student AI Assistant').catch(console.warn);
    },
    [],
  );

  const toggleDocSelection = useCallback((id: string) => {
    setSelectedDocIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        if (next.size === 0) {
          notifyDocumentSelected('none', 'No document attached (searching all ready documents)', 'Student AI Assistant').catch(console.warn);
        } else {
          const remainingId = Array.from(next)[0];
          const remainingDoc = uploadedFiles.find(f => f.id === remainingId);
          notifyDocumentSelected(remainingId, remainingDoc?.name || remainingId, 'Student AI Assistant').catch(console.warn);
        }
      } else {
        // If 1 document was already selected, switch to the new one; otherwise add
        if (prev.size === 1) {
          const targetDoc = uploadedFiles.find(f => f.id === id);
          notifyDocumentSelected(id, targetDoc?.name || id, 'Student AI Assistant').catch(console.warn);
          return new Set([id]);
        }
        next.add(id);
        const targetDoc = uploadedFiles.find(f => f.id === id);
        notifyDocumentSelected(id, targetDoc?.name || id, 'Student AI Assistant').catch(console.warn);
      }
      return next;
    });
  }, [uploadedFiles]);

  const selectAllDocs = useCallback(() => {
    const readyIds = uploadedFiles.filter(f => f.status === 'ready').map(f => f.id);
    setSelectedDocIds(new Set(readyIds));
    notifyDocumentSelected('all', 'All Ready Documents', 'Student AI Assistant').catch(console.warn);
    pushToast('All ready documents attached to your next question.', 'success');
  }, [uploadedFiles, pushToast]);

  const clearDocSelection = useCallback(() => {
    setSelectedDocIds(new Set());
    notifyDocumentSelected('none', 'No document attached (searching all ready documents)', 'Student AI Assistant').catch(console.warn);
    pushToast('Document detached. Next question will search across all documents.', 'warning');
  }, [pushToast]);

  const readyDocuments = useMemo(
    () => uploadedFiles.filter(d => d.status === 'ready'),
    [uploadedFiles],
  );
  const selectedDocuments = useMemo(
    () => uploadedFiles.filter(d => selectedDocIds.has(d.id)),
    [uploadedFiles, selectedDocIds],
  );
  const docCount = readyDocuments.length;

  const adjustTextareaHeight = useCallback(() => {
    const target = textareaRef.current;
    if (!target) return;
    target.style.height = 'auto';
    target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
  }, []);

  const currentAccount = getCurrentAccount();
  const userInitial = (currentAccount?.name || 'A').trim().charAt(0).toUpperCase() || 'A';

  const handleConversationDeleted = useCallback((deletedId: string) => {
    if (activeConversationId === deletedId) {
      handleNewChat();
    }
    setConversations(prev => prev.filter(c => c.conversationId !== deletedId));
  }, [activeConversationId, handleNewChat]);
  const copyQuestion = useCallback(async (question: string) => {
    try {
      await navigator.clipboard.writeText(question);
      pushToast('Question copied to clipboard.', 'success');
    } catch {
      pushToast('Could not copy the question.', 'error');
    }
  }, [pushToast]);

  const startEditingMessage = useCallback((message: ChatMessage) => {
    setEditingMessageId(message.id);
    setEditingMessageText(message.content);
    requestAnimationFrame(() => {
      const textarea = editTextareaRef.current;
      if (!textarea) return;
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 128)}px`;
      textarea.focus();
      textarea.setSelectionRange(message.content.length, message.content.length);
    });
  }, []);

  const cancelEditingMessage = useCallback(() => {
    setEditingMessageId(null);
    setEditingMessageText('');
  }, []);

  const saveEditedMessage = useCallback(async () => {
    const trimmedText = editingMessageText.trim();
    if (!editingMessageId || !trimmedText) return;

    setEditingMessageId(null);
    setEditingMessageText('');
    setIsThinking(true);

    const editedIndex = messages.findIndex(message => message.id === editingMessageId);
    if (editedIndex < 0) {
      setIsThinking(false);
      return;
    }

    const originalMessage = messages[editedIndex];
    const editedUserMessage: ChatMessage = {
      ...originalMessage,
      content: trimmedText,
      timestamp: new Date().toISOString(),
    };
    const messagesBeforeEdit = messages.slice(0, editedIndex);
    const messagesWithEdit = [
      ...messagesBeforeEdit,
      editedUserMessage,
      ...messages.slice(editedIndex + 1),
    ];
    setMessages(messagesWithEdit);

    try {
      const token = window.localStorage.getItem('edurag-auth-token');
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 300_000);
      const response = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          question: trimmedText,
          userId: getCurrentUserId(),
          role: 'student',
          selectedMaterialIds: (originalMessage.attachments || []).map(file => file.id),
          responseMode: 'both',
          conversationId: activeConversationId,
          history: messagesBeforeEdit.map(message => ({
            role: message.role,
            content: message.content,
          })),
        }),
        signal: controller.signal,
      });
      window.clearTimeout(timeoutId);
      const data = await response.json();
      if (!response.ok || !data.success || !data.answer) {
        throw new Error(data.error || 'The answer could not be regenerated.');
      }

      const regeneratedAnswer: ChatMessage = {
        id: messages[editedIndex + 1]?.role === 'assistant'
          ? messages[editedIndex + 1].id
          : `a${Date.now()}`,
        role: 'assistant',
        timestamp: new Date().toISOString(),
        content: data.answer,
        materialAnswer: typeof data.material_answer === 'string' ? data.material_answer : undefined,
        aiAnswer: typeof data.ai_answer === 'string' ? data.ai_answer : undefined,
        sources: Array.isArray(data.sources)
          ? data.sources.map((source: { doc: string; page: number }) => ({ ...source, excerpt: '' }))
          : [],
        sourceType: data.source_type === 'general' ? 'general' : 'document',
        attachments: originalMessage.attachments,
      };
      const answerIndex = editedIndex + 1;
      const regeneratedMessages = messagesWithEdit[answerIndex]?.role === 'assistant'
        ? messagesWithEdit.map((message, index) => index === answerIndex ? regeneratedAnswer : message)
        : [
            ...messagesWithEdit.slice(0, answerIndex),
            regeneratedAnswer,
            ...messagesWithEdit.slice(answerIndex),
          ];
      setMessages(regeneratedMessages);

      const conversationId = activeConversationId || `conv_${Date.now()}`;
      const conversation: ChatConversation = {
        conversationId,
        userId: getCurrentUserId(),
        role: 'student',
        title: generateConversationTitle(regeneratedMessages),
        messages: regeneratedMessages,
        updatedAt: new Date().toISOString(),
      };
      await saveConversation(conversation);
      setActiveConversationId(conversationId);
      setConversations(prev => [
        conversation,
        ...prev.filter(item => item.conversationId !== conversationId),
      ]);
    } catch (err) {
      const errorMessage: ChatMessage = {
        id: messages[editedIndex + 1]?.role === 'assistant'
          ? messages[editedIndex + 1].id
          : `a${Date.now()}`,
        role: 'assistant',
        timestamp: new Date().toISOString(),
        content: err instanceof Error ? err.message : 'I could not regenerate the answer. Please try again.',
        sources: [],
      };
      const answerIndex = editedIndex + 1;
      setMessages(messagesWithEdit[answerIndex]?.role === 'assistant'
        ? messagesWithEdit.map((message, index) => index === answerIndex ? errorMessage : message)
        : [
            ...messagesWithEdit.slice(0, answerIndex),
            errorMessage,
            ...messagesWithEdit.slice(answerIndex),
          ]);
    } finally {
      setIsThinking(false);
    }
  }, [activeConversationId, editingMessageId, editingMessageText, messages]);

  return (
    <div className={cn('space-y-4', isFullScreen && 'space-y-0 h-full flex flex-col')}>
      {!isFullScreen && (
        <SectionHeader
          title="AI Study Assistant"
          description="AI-powered RAG chat — upload your documents and ask anything about them."
        />
      )}

      <div
        className={cn(
          isFullScreen
            ? 'flex-1 flex flex-row h-full w-full bg-white dark:bg-neutral-950 overflow-hidden m-0 p-0 rounded-none border-0'
            : 'flex h-[calc(100vh-10rem)] rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-sm relative'
        )}
      >
        {/* Sidebar */}
        {sidebarOpen && (
          <ChatHistorySidebar
            activeConversationId={activeConversationId}
            conversations={conversations}
            onConversationsChange={setConversations}
            onSelectConversation={handleSelectConversation}
            onNewChat={handleNewChat}
            onClose={() => setSidebarOpen(false)}
            onConversationDeleted={handleConversationDeleted}
            className="w-72 bg-neutral-50 dark:bg-neutral-950 shrink-0 border-r border-neutral-200 dark:border-neutral-800"
          />
        )}

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0 h-full">
          {/* Top Navbar */}
          <div className="h-14 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between px-4 bg-white dark:bg-neutral-950 flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              {!sidebarOpen && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100 dark:text-neutral-400 transition-colors"
                  title="Open chat history sidebar"
                >
                  <PanelLeftOpen className="h-5 w-5" />
                </button>
              )}
              <div className="flex items-center gap-2 min-w-0">
                <div className="grid place-items-center h-8 w-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 text-white shrink-0">
                  <BotIcon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-display font-semibold text-sm text-neutral-900 dark:text-neutral-100 truncate">EduRAG Assistant</h2>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-success-500 animate-pulse" />
                    Online · {readyDocuments.length} ready document{readyDocuments.length === 1 ? '' : 's'}
                    {selectedDocuments.length > 0 ? ` (${selectedDocuments.length} selected for RAG)` : ''}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setSourcesOpen(v => {
                    const next = !v;
                    if (next) void loadStudentDocuments();
                    return next;
                  });
                }}
                className={cn(
                  'relative grid h-9 w-9 shrink-0 place-items-center rounded-xl transition-colors',
                  sourcesOpen
                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                    : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100 dark:text-neutral-400'
                )}
                title="Uploaded documents"
              >
                <FileText className="h-5 w-5" />
                {selectedDocuments.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white shadow-sm">
                    {selectedDocuments.length}
                  </span>
                )}
              </button>

              {/* Single Full Screen icon button right of select document */}
              <button
                onClick={() => setIsFullScreen(v => !v)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100 dark:text-neutral-400 transition-colors cursor-pointer"
                title={isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
                aria-label={isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
              >
                {isFullScreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
              </button>

              <button
                onClick={() => setSidebarOpen(v => !v)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100 dark:text-neutral-400 transition-colors"
                title={sidebarOpen ? 'Close chat history sidebar' : 'Open chat history sidebar'}
              >
                {sidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Uploaded documents panel */}
          {sourcesOpen && (
            <>
              {/* Blank area click backdrop to close */}
              <div
                className="fixed inset-0 z-20 cursor-default bg-black/5 dark:bg-black/40"
                onClick={() => setSourcesOpen(false)}
                aria-label="Close document panel"
              />
              <div className="absolute right-4 top-[4.5rem] w-96 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl z-30 overflow-hidden animate-fade-in-up">
              <div className="px-4 py-3.5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/80 dark:bg-neutral-950">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-display font-semibold text-sm text-neutral-900 dark:text-neutral-100">Uploaded Documents</p>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      {readyDocuments.length} READY
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    {selectedDocuments.length === 0
                      ? 'Select document(s) to attach to your next question'
                      : `${selectedDocuments.length} of ${readyDocuments.length} attached to your next question`}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => void loadStudentDocuments()}
                    className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    title="Refresh document list"
                  >
                    <RefreshCw className={cn("h-4 w-4", loadingDocs && "animate-spin")} />
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs px-2.5 py-1.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors font-medium flex items-center gap-1 shadow-sm"
                  >
                    <span>+ Add</span>
                  </button>
                  <button
                    onClick={() => setSourcesOpen(false)}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    title="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Quick Select All / Clear Bar */}
              {uploadedFiles.length > 1 && (
                <div className="px-4 py-2 bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200/60 dark:border-neutral-800 flex items-center justify-between text-xs">
                  <span className="text-neutral-500 dark:text-neutral-400">
                    Click document to attach / detach
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={selectAllDocs}
                      className="font-medium text-primary-600 dark:text-primary-400 hover:underline"
                    >
                      Attach All
                    </button>
                    <span className="text-neutral-300 dark:text-neutral-600">·</span>
                    <button
                      type="button"
                      onClick={clearDocSelection}
                      className="font-medium text-neutral-500 dark:text-neutral-400 hover:underline"
                    >
                      Detach All
                    </button>
                  </div>
                </div>
              )}

              <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
                {loadingDocs && uploadedFiles.length === 0 ? (
                  <div className="px-3 py-8 flex flex-col items-center justify-center gap-2 text-center text-xs text-neutral-500 dark:text-neutral-400">
                    <LoaderCircle className="h-5 w-5 animate-spin text-primary-500" />
                    <span>Loading indexed documents…</span>
                  </div>
                ) : uploadedFiles.length === 0 ? (
                  <div className="px-3 py-8 text-center text-xs text-neutral-500 dark:text-neutral-400">
                    No documents uploaded yet. Click + Add to upload your study material.
                  </div>
                ) : (
                  uploadedFiles.map(f => {
                    const kind = fileIconFor(f.name);
                    const isSelected = selectedDocIds.has(f.id);
                    const isReady = f.status === 'ready';

                    return (
                      <div
                        key={f.id}
                        onClick={() => toggleDocSelection(f.id)}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none',
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 dark:border-emerald-500/80 shadow-sm ring-1 ring-emerald-500/30'
                            : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-neutral-300 dark:hover:border-neutral-700'
                        )}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            toggleDocSelection(f.id);
                          }
                        }}
                      >
                        <span className={cn('grid place-items-center h-9 w-9 rounded-lg border text-xs font-bold uppercase shrink-0', fileBadgeClass[kind])}>
                          {kind === 'text' ? 'txt' : kind}
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate" title={f.name}>
                              {f.name}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {isReady ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                                <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400" />
                                READY
                              </span>
                            ) : f.status === 'failed' ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-error-100 text-error-800 border border-error-300">
                                FAILED
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
                                <LoaderCircle className="h-2.5 w-2.5 animate-spin text-amber-600" />
                                INDEXING
                              </span>
                            )}
                            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                              {f.size > 0 ? `${formatBytes(f.size)} · ` : ''}~{f.pages || 1} page{(f.pages || 1) === 1 ? '' : 's'}
                            </span>
                          </div>
                        </div>

                        {/* Selection status badge/button */}
                        <div className="shrink-0 flex items-center gap-1.5">
                          {isSelected ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-xs font-semibold shadow-sm">
                              <Check className="h-3.5 w-3.5" />
                              Attached
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 text-xs font-medium bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700">
                              Attach
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5 bg-neutral-50/30 dark:bg-neutral-950">
            {messages.length === 0 && !isThinking ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <div className="grid place-items-center h-16 w-16 rounded-2xl bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 mb-4 animate-floaty">
                  <BotIcon className="h-8 w-8" />
                </div>
                <h3 className="font-display font-semibold text-neutral-900 dark:text-neutral-100">How can I help you today?</h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 max-w-sm">
                  Upload a PDF / DOCX / PPTX / TXT file using the paperclip, then ask anything — answers are grounded in your documents with full source references.
                </p>

                <div className="mt-6 w-full max-w-2xl">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 border border-primary-200/60 dark:border-primary-800/60 shadow-xs">
                      <Sparkles className="h-3.5 w-3.5 text-primary-600 dark:text-primary-400" />
                      {currentSuggestions.label}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {currentSuggestions.questions.map(q => (
                      <button
                        key={q}
                        onClick={() => {
                          setInput(q);
                          textareaRef.current?.focus();
                        }}
                        className="text-xs sm:text-sm px-3.5 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:border-primary-300 dark:hover:border-primary-700 hover:text-primary-700 dark:hover:text-primary-300 transition-all text-left shadow-xs"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <>
                {messages.map(msg => (
                  <div
                    key={msg.id}
                    className={cn('flex gap-3 animate-fade-in-up', msg.role === 'user' && 'flex-row-reverse')}
                  >
                    <div
                      className={cn(
                        'grid place-items-center h-8 w-8 rounded-lg shrink-0 font-display font-bold text-xs',
                        msg.role === 'user'
                          ? 'bg-primary-600 text-white'
                          : 'bg-gradient-to-br from-primary-500 to-primary-700 text-white'
                      )}
                    >
                      {msg.role === 'user' ? userInitial : <BotIcon className="h-4 w-4" />}
                    </div>

                    <div
                      className={cn(
                        'max-w-[80%] rounded-2xl px-4 py-3 shadow-sm',
                        msg.role === 'user'
                          ? 'bg-primary-600 text-white'
                          : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-100 border border-neutral-200/60 dark:border-neutral-800'
                      )}
                    >
                      {/* Uploaded file cards inside the message */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mb-2.5">
                          {msg.role === 'user' ? (
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-white/95">
                                <Paperclip className="h-3.5 w-3.5 text-white/90" />
                                <span>Attached to this question ({msg.attachments.length}):</span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {msg.attachments.map(att => {
                                  const kind = fileIconFor(att.name);
                                  return (
                                    <div
                                      key={att.id}
                                      className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 border border-white/40 text-white text-xs font-medium cursor-pointer transition-all shadow-sm"
                                      onClick={() => openMaterialFile(att.id)}
                                      title={`Preview ${att.name}`}
                                      role="button"
                                      tabIndex={0}
                                      onKeyDown={(event) => {
                                        if (event.key === 'Enter' || event.key === ' ') {
                                          event.preventDefault();
                                          openMaterialFile(att.id);
                                        }
                                      }}
                                    >
                                      <span className="grid place-items-center h-5 w-5 rounded-md bg-white/25 text-white text-[10px] font-extrabold uppercase shrink-0">
                                        {kind === 'pdf' ? <FileText className="h-3 w-3" /> : (kind === 'text' ? 'TXT' : kind.toUpperCase())}
                                      </span>
                                      <span className="truncate max-w-[12rem] font-semibold">{att.name}</span>
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white shrink-0 shadow-2xs">
                                        <CheckCircle2 className="h-2.5 w-2.5" />
                                        READY
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-2 items-center">
                              <span className="text-[10px] uppercase tracking-wide font-semibold text-neutral-500 dark:text-neutral-400 self-center mr-1">
                                Used:
                              </span>
                              {msg.attachments.map(att => {
                                const kind = fileIconFor(att.name);
                                return (
                                  <div
                                    key={att.id}
                                    className={cn(
                                      'aisa-message-file-card text-left cursor-pointer hover:opacity-90 transition-opacity',
                                      fileBadgeClass[kind]
                                    )}
                                    onClick={() => openMaterialFile(att.id)}
                                    title={`Preview ${att.name}`}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(event) => {
                                      if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        openMaterialFile(att.id);
                                      }
                                    }}
                                  >
                                    {kind === 'pdf' ? (
                                      <FileText className="h-3.5 w-3.5 shrink-0" />
                                    ) : (
                                      <span className="text-[10px] font-extrabold uppercase">{kind === 'text' ? 'TXT' : kind}</span>
                                    )}
                                    <span className="truncate max-w-[10rem]">{att.name}</span>
                                    <span className="shrink-0 px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                                      READY
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {msg.role === 'assistant' ? (
                        <div className="aisa-answer-content">
                          <section className="aisa-answer-section">
                            <h3 className="aisa-answer-section-title">
                              <span className="aisa-answer-section-icon aisa-answer-section-icon--materials">
                                <FileText className="h-3.5 w-3.5" />
                              </span>
                              Based on Study Material
                            </h3>
                            <p className="aisa-answer-muted">
                              Answer strictly from the uploaded document.
                            </p>
                            <div>
                              {msg.materialAnswer ? (
                                renderAnswerContent(msg.materialAnswer)
                              ) : isThinking && msg.id === messages[messages.length - 1]?.id ? (
                                <div className="flex items-center gap-2 py-2 text-xs text-neutral-500 dark:text-neutral-400">
                                  <LoaderCircle className="h-3.5 w-3.5 animate-spin text-primary-500" />
                                  <span>Searching document context...</span>
                                </div>
                              ) : (
                                renderAnswerContent('No document-based answer was available for this question.')
                              )}
                            </div>
                          </section>

                          <section className="aisa-answer-section aisa-answer-section--ai">
                            <h3 className="aisa-answer-section-title">
                              <span className="aisa-answer-section-icon aisa-answer-section-icon--ai">
                                <Sparkles className="h-3.5 w-3.5" />
                              </span>
                              Based on AI — Final Answer
                            </h3>
                            <p className="aisa-answer-muted">
                              Complete answer using general AI knowledge, beyond the uploaded document when necessary.
                            </p>
                            <div>
                              {msg.aiAnswer || msg.content ? (
                                <>
                                  {renderAnswerContent(msg.aiAnswer || msg.content)}
                                  {isThinking && msg.id === messages[messages.length - 1]?.id && (
                                    <span className="inline-block h-3.5 w-1.5 ml-1 bg-primary-500 animate-pulse align-middle rounded-xs" />
                                  )}
                                </>
                              ) : isThinking && msg.id === messages[messages.length - 1]?.id ? (
                                <div className="flex items-center gap-2 py-2 text-xs text-neutral-500 dark:text-neutral-400">
                                  <LoaderCircle className="h-3.5 w-3.5 animate-spin text-primary-500" />
                                  <span>Generating complete AI response...</span>
                                </div>
                              ) : (
                                renderAnswerContent('No response generated.')
                              )}
                            </div>
                          </section>
                        </div>
                      ) : (
                        <>
                          {editingMessageId === msg.id ? (
                            <div className="space-y-2">
                              <textarea
                                ref={editTextareaRef}
                                value={editingMessageText}
                                onChange={event => {
                                  setEditingMessageText(event.target.value);
                                  event.target.style.height = 'auto';
                                  event.target.style.height = `${Math.min(event.target.scrollHeight, 128)}px`;
                                }}
                                onKeyDown={event => {
                                  if (event.key === 'Escape') {
                                    event.preventDefault();
                                    cancelEditingMessage();
                                  }
                                  if (event.key === 'Enter' && !event.shiftKey) {
                                    event.preventDefault();
                                    void saveEditedMessage();
                                  }
                                }}
                                className="w-full min-w-[16rem] resize-none rounded-lg border border-white/40 bg-white/15 px-3 py-2 text-sm leading-relaxed text-white outline-none placeholder:text-white/60 focus:border-white"
                                aria-label="Edit message"
                                rows={1}
                              />
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={cancelEditingMessage}
                                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-white/75 transition-colors hover:bg-white/15 hover:text-white"
                                  title="Cancel edit"
                                >
                                  <X className="h-3 w-3" />
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void saveEditedMessage()}
                                  disabled={!editingMessageText.trim()}
                                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-white/90 transition-colors hover:bg-white/15 hover:text-white disabled:opacity-50"
                                  title="Save edit"
                                >
                                  <CheckCircle2 className="h-3 w-3" />
                                  Save
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm whitespace-pre-line leading-relaxed">{msg.content}</p>
                          )}
                          <div className="mt-2 flex items-center justify-end gap-1 border-t border-white/20 pt-2">
                            <button
                              type="button"
                              onClick={() => copyQuestion(msg.content)}
                              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-white/75 transition-colors hover:bg-white/15 hover:text-white"
                              title="Copy question"
                              aria-label="Copy question"
                            >
                              <Copy className="h-3 w-3" />
                              Copy
                            </button>
                            {editingMessageId !== msg.id && (
                              <button
                                type="button"
                                onClick={() => startEditingMessage(msg)}
                                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-white/75 transition-colors hover:bg-white/15 hover:text-white"
                                title="Edit question"
                                aria-label="Edit question"
                              >
                                <Edit3 className="h-3 w-3" />
                                Edit
                              </button>
                            )}
                          </div>
                        </>
                      )}

                      {/* Source references â€” fully dynamic */}
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="aisa-message-sources">
                          <p className="aisa-sources-label">
                            <Sparkles className="h-3.5 w-3.5" />
                          Study material sources
                          </p>

                          {msg.sources.map((src, i) => {
                            const kind = fileIconFor(src.doc);
                            return (
                              <button
                                type="button"
                                onClick={() => {
                                  const matchingAttachment = msg.attachments?.find(file => file.name === src.doc);
                                  if (matchingAttachment) {
                                    openMaterialFile(matchingAttachment.id);
                                  } else {
                                    setSourcesOpen(true);
                                  }
                                }}
                                key={`${src.doc}-${src.page}-${i}`}
                                className="aisa-source-card"
                                title={`Open ${src.doc}, page ${src.page}`}
                              >
                                <span className={cn(
                                  'aisa-source-card-icon',
                                  fileBadgeClass[kind]
                                )}>
                                  {kind === 'pdf' ? <FileText className="h-3.5 w-3.5" /> : (kind === 'text' ? 'TXT' : kind.toUpperCase())}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="aisa-source-card-name">{src.doc}</div>
                                  <div className="aisa-source-card-page">Page {src.page}</div>
                                  {src.excerpt && (
                                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2 italic">
                                      "{src.excerpt}"
                                    </p>
                                  )}
                                </div>
                                <ArrowRight className="aisa-source-card-arrow h-3.5 w-3.5" />
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Thinking indicator */}
                {isThinking && messages[messages.length - 1]?.role !== 'assistant' && (
                  <div className="flex gap-3 animate-fade-in">
                    <div className="grid place-items-center h-8 w-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-md shadow-primary-500/30">
                      <BotIcon className="h-4 w-4" />
                    </div>
                    <div className="bg-neutral-100 dark:bg-neutral-900 rounded-2xl px-4 py-3 flex items-center gap-1.5 border border-neutral-200 dark:border-neutral-800">
                      {[0, 1, 2].map(i => (
                        <span
                          key={i}
                          className="h-2 w-2 rounded-full bg-neutral-400 dark:bg-neutral-500 animate-typing"
                          style={{ animationDelay: `${i * 0.2}s` }}
                        />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Suggested questions — populate input */}
          {messages.length <= 3 && !isThinking && messages.length > 0 && (
            <div className="px-4 pb-2 bg-neutral-50/30 dark:bg-neutral-950">
              <div className="flex items-center gap-1.5 mb-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                <Sparkles className="h-3 w-3 text-primary-600 dark:text-primary-400" />
                <span className="font-semibold text-[11px]">{currentSuggestions.label}:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {currentSuggestions.questions.map(q => (
                  <button
                    key={q}
                    onClick={() => {
                      setInput(q);
                      textareaRef.current?.focus();
                    }}
                    className="text-xs px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 hover:text-primary-600 dark:hover:text-primary-300 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Composer */}
          <div className="aisa-composer-wrap">
            {selectedDocuments.length > 0 ? (
              <div className="mb-2.5 flex flex-wrap gap-2" aria-live="polite" aria-label="Attached document">
                {selectedDocuments.map(file => {
                  const kind = fileIconFor(file.name);
                  return (
                    <div
                      key={file.id}
                      className="aisa-attachment-card !max-w-full w-full border border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/90 dark:bg-emerald-950/60 shadow-xs flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl transition-all"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={cn('aisa-attachment-icon shrink-0', fileBadgeClass[kind])}>
                          {kind === 'pdf' ? <FileText className="h-4 w-4" /> : kind === 'text' ? 'TXT' : kind.toUpperCase()}
                        </span>
                        <div className="min-w-0 flex flex-col">
                          <span className="aisa-attachment-name font-semibold text-xs text-neutral-900 dark:text-neutral-100 truncate" title={file.name}>
                            {file.name}
                          </span>
                          <span className="aisa-attachment-size flex items-center gap-1.5 text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                            {file.status === 'ready' ? (
                              <span className="inline-flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-400 text-[10px] uppercase">
                                <CheckCircle2 className="h-3 w-3" /> READY
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-primary-600 dark:text-primary-400 font-medium text-[10px]">
                                <LoaderCircle className="h-3 w-3 animate-spin" />
                                Indexing…
                              </span>
                            )}
                            <span className="text-neutral-300 dark:text-neutral-600">·</span>
                            <span>~{file.pages || 1} page{(file.pages || 1) === 1 ? '' : 's'}</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setSourcesOpen(true)}
                          className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 hover:underline font-semibold flex items-center gap-1"
                        >
                          Change selection
                        </button>
                        <span className="text-neutral-300 dark:text-neutral-600">·</span>
                        <button
                          type="button"
                          onClick={() => toggleDocSelection(file.id)}
                          className="text-xs text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 hover:underline font-medium"
                        >
                          Detach
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleDocSelection(file.id)}
                          aria-label={`Detach and close ${file.name}`}
                          title="Close / detach document"
                          className="grid h-6 w-6 place-items-center rounded-md text-neutral-400 hover:text-rose-600 hover:bg-rose-100/60 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition-colors ml-0.5"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : readyDocuments.length > 0 ? (
              <div className="px-4 py-2.5 bg-neutral-100/80 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-300 mb-2.5">
                <span className="flex items-center gap-2">
                  <Database className="h-3.5 w-3.5 text-primary-600 dark:text-primary-400 shrink-0" />
                  <span>No document attached — question will search all {readyDocuments.length} ready documents in your account</span>
                </span>
                <button
                  type="button"
                  onClick={() => setSourcesOpen(true)}
                  className="font-semibold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1 shrink-0"
                >
                  <Paperclip className="h-3 w-3" />
                  <span>Attach document</span>
                </button>
              </div>
            ) : null}

            <div className="aisa-composer">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="aisa-composer-tool-btn aisa-composer-attach"
                title="Attach files"
                aria-label="Attach files"
                type="button"
              >
                <Paperclip className="h-5 w-5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                className="aisa-file-input"
                onChange={handleFileUpload}
                multiple
                accept=".pdf,.pptx,.docx,.txt,.md,.csv,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown,text/csv"
              />

              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => {
                  setInput(e.target.value);
                  adjustTextareaHeight();
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                placeholder="Ask anything from your documents…"
                className="aisa-composer-textarea"
                aria-label="Message EduRAG Assistant"
                rows={1}
              />

              <button
                onClick={() => send(input)}
                disabled={!input.trim() || isThinking || isUploading}
                className="aisa-composer-send"
                type="button"
                title={isUploading ? 'Waiting for document indexing to finish' : 'Send'}
                aria-label="Send message"
              >
                <Send className="h-[1.1rem] w-[1.1rem]" />
              </button>
            </div>
            <p className="aisa-composer-hint">Enter to send <span aria-hidden="true">·</span> Shift + Enter for a new line</p>
          </div>
        </div>
      </div>

      {/* Toasts — rendered outside chat wrapper to avoid any clipping */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

/* =========================================================
   NOTES GENERATOR
========================================================= */


// ---------------------------------------------------------------------------
// Premium Smart Note Renderer & Interactive Studio Component
// ---------------------------------------------------------------------------

function SmartNoteRenderer({
  content,
  title,
  type,
  topic,
  course,
}: {
  content: string;
  title: string;
  type: string;
  topic?: string;
  course?: string;
}) {
  // When the user selects Formula Sheet, render the clean structured UI card format
  const isFormulaSheet =
    type === 'formulas' ||
    type === 'formula' ||
    title.toLowerCase().includes('formula sheet') ||
    content.toLowerCase().includes('core formulas') ||
    content.toLowerCase().includes('formula sheet & reference guide');

  if (isFormulaSheet) {
    return <FormulaSheetRenderer content={content} title={title} topic={topic} course={course} />;
  }

  const sections = content.split(/\n(?=##\s+)/g);
  const heroBlock = sections[0] || '';
  const bodySections = sections.slice(1);

  // Parse hero title and metadata
  const titleMatch = heroBlock.match(/^#\s+([^\n]+)/);
  const displayTitle = titleMatch ? titleMatch[1].trim() : title;

  // Clean hero introductory text (skip the # title and metadata lines)
  const heroIntroLines = heroBlock
    .split('\n')
    .filter(line => !line.startsWith('# ') && !line.startsWith('**Topic') && !line.startsWith('**Note') && !line.startsWith('**Source') && line.trim() !== '---');
  const heroIntro = heroIntroLines.join('\n').trim();

  // Helper to render inline markdown formatting (bold, italic, code, math)
  const formatInline = (text: string) => {
    const parts = text.split(/(\*[^*]+\*|\`[^`]+\`|\$[^$]+\$)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const inner = part.slice(2, -2);
        if (inner.startsWith('$') && inner.endsWith('$')) {
          return (
            <strong key={i} className="font-semibold text-neutral-900 font-serif">
              <VisualMath expr={inner.slice(1, -1)} large={false} />
            </strong>
          );
        }
        return <strong key={i} className="font-semibold text-neutral-900">{formatInline(inner)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={i} className="text-neutral-700 italic">{part.slice(1, -1)}</em>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={i} className="px-1.5 py-0.5 rounded bg-neutral-100 font-mono text-xs text-primary-700">{part.slice(1, -1)}</code>;
      }
      if (part.startsWith('$') && part.endsWith('$')) {
        return (
          <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded bg-violet-50 text-violet-900 font-serif text-xs font-medium border border-violet-100 mx-0.5 shadow-2xs">
            <VisualMath expr={part.slice(1, -1)} large={false} />
          </span>
        );
      }
      return part;
    });
  };

  // Helper to render section body
  const renderSectionBody = (secText: string, secTitleLower: string) => {
    // If this is a formula section, render using Student-Friendly Formula Cards!
    const isFormulaSection =
      secTitleLower.includes('formula') ||
      secTitleLower.includes('equation') ||
      secTitleLower.includes('identit') ||
      (type === 'formulas' && (secTitleLower.includes('core') || secTitleLower.includes('quantitative')));

    if (isFormulaSection) {
      return [<FormulaSectionCardsView key="formula-cards-view" secContent={secText} />];
    }

    const lines = secText.split('\n').filter(l => l.trim().length > 0);
    const elements: React.ReactNode[] = [];

    // Check for tables
    const tableLines = lines.filter(l => l.trim().startsWith('|') && l.trim().endsWith('|'));
    if (tableLines.length >= 2) {
      const headerCols = tableLines[0].split('|').map(c => c.trim()).filter(Boolean);
      const rowLines = tableLines.slice(2);
      elements.push(
        <div key="table" className="my-3 overflow-x-auto rounded-xl border border-neutral-200 shadow-xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-neutral-50/90 border-b border-neutral-200">
                {headerCols.map((col, idx) => (
                  <th key={idx} className="px-3.5 py-2.5 font-semibold text-neutral-800">{formatInline(col)}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 bg-white">
              {rowLines.map((rowStr, rIdx) => {
                const cols = rowStr.split('|').map(c => c.trim()).filter(Boolean);
                return (
                  <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-neutral-50/40'}>
                    {cols.map((col, cIdx) => (
                      <td key={cIdx} className="px-3.5 py-2.5 text-neutral-700">{formatInline(col)}</td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
      return elements;
    }

    const isDefSection = secTitleLower.includes('definition') || secTitleLower.includes('glossary') || secTitleLower.includes('terminology');
    const isTrapSection = secTitleLower.includes('pitfall') || secTitleLower.includes('trap') || secTitleLower.includes('warning');
    const isTakeawaySection = secTitleLower.includes('takeaway') || secTitleLower.includes('highlight') || secTitleLower.includes('exam');

    let currentList: { term?: string; text: string; num?: string }[] = [];

    lines.forEach((line, lIdx) => {
      // Definition item: - **Term**: Definition
      const defMatch = line.match(/^[-*•]\s+\*\*([^*]+)\*\*:\s*(.*)/);
      if (defMatch) {
        currentList.push({ term: defMatch[1].trim(), text: defMatch[2].trim() });
        return;
      }

      // Numbered step: 1. **Step**: Description or 1. Description
      const numMatch = line.match(/^(\d+)\.\s+(\*\*([^*]+)\*\*:\s*)?(.*)/);
      if (numMatch) {
        currentList.push({
          num: numMatch[1],
          term: numMatch[3]?.trim(),
          text: numMatch[4]?.trim() || '',
        });
        return;
      }

      // Bullet point: - **Term**: or - Text
      const bulletMatch = line.match(/^[-*•]\s+(.*)/);
      if (bulletMatch) {
        currentList.push({ text: bulletMatch[1].trim() });
        return;
      }

      // Flush list if regular paragraph encountered
      if (currentList.length > 0) {
        elements.push(renderListItems(currentList, isDefSection, isTrapSection, isTakeawaySection, `${lIdx}-list`));
        currentList = [];
      }

      // Math equation line
      if (line.includes('$$') || line.trim().startsWith('$')) {
        elements.push(
          <div key={`math-${lIdx}`} className="my-3 py-5 px-4 rounded-xl bg-gradient-to-r from-violet-50/50 via-indigo-50/30 to-violet-50/50 border border-violet-100/90 flex items-center justify-center text-center overflow-x-auto shadow-2xs">
            <VisualMath expr={line} large={true} />
          </div>
        );
        return;
      }

      // Normal paragraph
      elements.push(
        <p key={`p-${lIdx}`} className="text-sm text-neutral-700 leading-relaxed mb-3">
          {formatInline(line)}
        </p>
      );
    });

    if (currentList.length > 0) {
      elements.push(renderListItems(currentList, isDefSection, isTrapSection, isTakeawaySection, 'final-list'));
    }

    return elements;
  };

  const renderListItems = (
    items: { term?: string; text: string; num?: string }[],
    isDef: boolean,
    isTrap: boolean,
    isTakeaway: boolean,
    keyPrefix: string
  ) => {
    // If definitions section
    if (isDef && items.some(item => item.term)) {
      return (
        <div key={keyPrefix} className="grid grid-cols-1 md:grid-cols-2 gap-3 my-3">
          {items.map((item, idx) => (
            <div key={idx} className="p-4 rounded-xl border border-primary-100/80 bg-white shadow-xs hover:border-primary-300 hover:shadow-sm transition-all">
              {item.term && (
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-primary-50 text-primary-700 border border-primary-200 text-xs font-bold tracking-wide">
                    {formatInline(item.term)}
                  </span>
                </div>
              )}
              <p className="text-xs text-neutral-600 leading-relaxed">
                {formatInline(item.text)}
              </p>
            </div>
          ))}
        </div>
      );
    }

    // If numbered steps
    if (items.some(item => item.num)) {
      return (
        <div key={keyPrefix} className="space-y-3 my-3">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-start gap-3.5 p-3.5 rounded-xl bg-white border border-neutral-200/90 shadow-xs hover:border-neutral-300 transition-all">
              <span className="grid place-items-center h-6 w-6 rounded-lg bg-primary-600 text-white text-xs font-bold shrink-0 mt-0.5 shadow-xs">
                {item.num || idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                {item.term && (
                  <span className="font-semibold text-neutral-900 text-xs block mb-1">
                    {formatInline(item.term)}
                  </span>
                )}
                <span className="text-xs text-neutral-700 leading-relaxed block">
                  {formatInline(item.text)}
                </span>
              </div>
            </div>
          ))}
        </div>
      );
    }

    // Default bullet list
    return (
      <ul key={keyPrefix} className="space-y-2.5 my-3">
        {items.map((item, idx) => (
          <li key={idx} className="flex items-start gap-2.5 text-xs text-neutral-700 leading-relaxed">
            <span className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${isTrap ? 'bg-amber-500' : isTakeaway ? 'bg-emerald-500' : 'bg-primary-500'}`} />
            <span className="flex-1 min-w-0">
              {item.term && (
                <strong className="font-semibold text-neutral-900 mr-1.5">
                  {formatInline(item.term)}:
                </strong>
              )}
              {formatInline(item.text)}
            </span>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. Hero Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 via-primary-700 to-indigo-800 text-white p-6 shadow-md">
        <div className="relative z-10">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold text-white">
              {type === 'formulas' ? <Zap className="h-3.5 w-3.5 text-amber-300" /> : <Sparkles className="h-3.5 w-3.5 text-amber-300" />}
              {type === 'formulas' ? 'Verified EduRAG Formula Sheet' : 'Verified EduRAG Study Notes'}
            </span>
            {topic && (
              <span className="px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-medium text-white/90">
                Topic: {topic}
              </span>
            )}
            {course && (
              <span className="px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-medium text-white/80">
                Document: {course}
              </span>
            )}
          </div>

          <h1 className="text-xl md:text-2xl font-bold font-display tracking-tight text-white mb-2 leading-snug">
            {displayTitle}
          </h1>

          {heroIntro && (
            <p className="text-xs md:text-sm text-primary-100/95 leading-relaxed max-w-3xl mt-3 bg-white/10 p-3.5 rounded-xl border border-white/10 backdrop-blur-xs">
              {formatInline(heroIntro)}
            </p>
          )}
        </div>

        {/* Decorative corner glow */}
        <div className="absolute -top-12 -right-12 h-44 w-44 rounded-full bg-primary-400/20 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 h-36 w-36 rounded-full bg-indigo-400/20 blur-xl pointer-events-none" />
      </div>

      {/* 2. Structured Section Blocks */}
      <div className="space-y-4">
        {bodySections.map((sec, sIdx) => {
          const firstLineEnd = sec.indexOf('\n');
          const headerLine = (firstLineEnd !== -1 ? sec.slice(0, firstLineEnd) : sec).replace(/^##\s*/, '').trim();
          const secContent = firstLineEnd !== -1 ? sec.slice(firstLineEnd + 1) : '';
          const hLower = headerLine.toLowerCase();

          // Section card styling based on tone
          const isWarning = hLower.includes('pitfall') || hLower.includes('trap') || hLower.includes('warning');
          const isSuccess = hLower.includes('takeaway') || hLower.includes('highlight') || hLower.includes('best practice');
          const isOverview = hLower.includes('executive') || hLower.includes('overview') || hLower.includes('summary');
          const isFormula = hLower.includes('formula') || hLower.includes('equation') || hLower.includes('identit');

          return (
            <div
              key={sIdx}
              id={`sec-${sIdx}`}
              className={`rounded-2xl p-5 border transition-all ${
                isWarning
                  ? 'bg-amber-50/40 border-amber-200/90 shadow-xs'
                  : isSuccess
                  ? 'bg-emerald-50/40 border-emerald-200/90 shadow-xs'
                  : isOverview
                  ? 'bg-primary-50/30 border-primary-200/80 shadow-xs'
                  : isFormula
                  ? 'bg-gradient-to-br from-violet-50/25 via-white to-violet-50/10 border-violet-200/90 shadow-xs'
                  : 'bg-white border-neutral-200/80 shadow-xs'
              }`}
            >
              <div className="flex items-center gap-2.5 pb-3 mb-3 border-b border-neutral-100">
                <span
                  className={`grid place-items-center h-7 w-7 rounded-lg text-xs font-bold ${
                    isWarning
                      ? 'bg-amber-100 text-amber-800'
                      : isSuccess
                      ? 'bg-emerald-100 text-emerald-800'
                      : isFormula
                      ? 'bg-violet-100 text-violet-800'
                      : 'bg-primary-100 text-primary-800'
                  }`}
                >
                  {isFormula ? '⚡' : sIdx + 1}
                </span>
                <h3 className="font-display font-semibold text-neutral-900 text-base">
                  {headerLine}
                </h3>
              </div>

              <div>{renderSectionBody(secContent, hLower)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


function generatePlainTextContent(note: any): string {
  const plain = (note.content || '')
    .replace(/#{1,6}\s*(.*)/g, '$1\n')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/```[\s\S]*?```/g, (match: string) => match.replace(/```[a-z]*\n?/g, '').trim())
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '• ')
    .trim();

  return `${note.title || 'Notes'}\n${'='.repeat(Math.max((note.title || 'Notes').length, 20))}\n` +
    (note.chapter ? `Topic / Chapter: ${note.chapter}\n` : '') +
    (note.course ? `Course: ${note.course}\n` : '') +
    `Generated by EduRAG AI Study System on ${new Date().toLocaleDateString()}\n\n` +
    plain;
}

function generateWordContent(note: any): string {
  const noteElement = typeof document !== 'undefined' ? document.getElementById('printable-note-content') : null;
  const innerHtml = noteElement ? noteElement.innerHTML : (note.content || '').replace(/\n/g, '<br/>');

  return `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' 
          xmlns:w='urn:schemas-microsoft-com:office:word' 
          xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset="utf-8">
      <title>${note.title || 'Note'}</title>
      <style>
        body { font-family: Calibri, 'Segoe UI', Arial, sans-serif; font-size: 11pt; line-height: 1.6; color: #1e293b; padding: 40px; }
        h1 { font-size: 24pt; color: #1e3a8a; margin-bottom: 8pt; border-bottom: 2pt solid #bfdbfe; padding-bottom: 8pt; }
        h2 { font-size: 16pt; color: #1d4ed8; margin-top: 18pt; margin-bottom: 6pt; border-bottom: 1pt solid #e2e8f0; padding-bottom: 4pt; }
        h3 { font-size: 13pt; color: #334155; margin-top: 12pt; margin-bottom: 4pt; }
        p { margin: 6pt 0; }
        table { border-collapse: collapse; width: 100%; margin: 14pt 0; }
        th, td { border: 1pt solid #cbd5e1; padding: 7pt 10pt; text-align: left; }
        th { background-color: #f1f5f9; font-weight: bold; color: #0f172a; }
        .meta-box { background: #f8fafc; border: 1pt solid #e2e8f0; padding: 12pt; border-radius: 6pt; margin-bottom: 20pt; }
        .badge { background-color: #dbeafe; color: #1e40af; padding: 3pt 8pt; border-radius: 4pt; font-size: 9pt; font-weight: bold; display: inline-block; margin-bottom: 6pt; }
        code { font-family: Consolas, monospace; background: #f1f5f9; padding: 2pt 4pt; border-radius: 3pt; font-size: 10pt; }
        pre { background: #f8fafc; border: 1pt solid #e2e8f0; padding: 10pt; border-radius: 6pt; font-family: Consolas, monospace; }
        ul, ol { margin: 6pt 0 6pt 20pt; }
        li { margin-bottom: 4pt; }
      </style>
    </head>
    <body>
      <div class="meta-box">
        <span class="badge">${note.type === 'formulas' ? '⚡ FORMULA SHEET' : 'STUDY NOTES'}</span>
        <div style="font-size: 16pt; font-weight: bold; color: #0f172a; margin-top: 4pt;">${note.title || 'Generated Notes'}</div>
        ${note.chapter ? `<div style="color: #475569; font-size: 10pt; margin-top: 2pt;"><strong>Topic / Chapter:</strong> ${note.chapter}</div>` : ''}
        ${note.course ? `<div style="color: #475569; font-size: 10pt; margin-top: 2pt;"><strong>Course:</strong> ${note.course}</div>` : ''}
        <div style="color: #94a3b8; font-size: 9pt; margin-top: 4pt;">Generated by EduRAG AI &bull; ${new Date().toLocaleDateString()}</div>
      </div>
      <div>
        ${innerHtml}
      </div>
    </body>
    </html>
  `;
}

function generatePptContent(note: any): string {
  const lines = (note.content || '').split('\n');
  const slides: { title: string; bullets: string[] }[] = [];
  let currentTitle = note.title || 'Overview';
  let currentBullets: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('# ') || trimmed.startsWith('## ') || trimmed.startsWith('### ')) {
      if (currentBullets.length > 0 || currentTitle !== (note.title || 'Overview')) {
        slides.push({ title: currentTitle, bullets: currentBullets });
      }
      currentTitle = trimmed.replace(/^#+\s*/, '');
      currentBullets = [];
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
      currentBullets.push(trimmed.replace(/^[-*•]\s*/, ''));
    } else if (trimmed.length > 0 && !trimmed.startsWith('```')) {
      currentBullets.push(trimmed);
    }
  }
  if (currentBullets.length > 0 || slides.length === 0) {
    slides.push({ title: currentTitle, bullets: currentBullets });
  }

  return `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:x="urn:schemas-microsoft-com:office:powerpoint"
          xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <title>${note.title || 'Presentation'}</title>
      <style>
        body { font-family: 'Segoe UI', Calibri, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; }
        .slide {
          page-break-after: always;
          width: 960px;
          min-height: 540px;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
          padding: 48px;
          margin: 0 auto 30px auto;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .slide-header { border-bottom: 2px solid #3b82f6; padding-bottom: 12px; margin-bottom: 24px; }
        .slide-title { font-size: 26px; font-weight: bold; color: #1e3a8a; margin: 0; }
        .slide-subtitle { font-size: 13px; color: #64748b; margin-top: 4px; }
        .slide-body { flex: 1; font-size: 16px; color: #334155; line-height: 1.7; }
        .bullet-item { margin-bottom: 12px; display: flex; align-items: flex-start; }
        .bullet-dot { color: #3b82f6; font-size: 20px; line-height: 1; margin-right: 12px; }
        .slide-footer { border-top: 1px solid #e2e8f0; padding-top: 12px; display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8; }
        .title-slide { text-align: center; justify-content: center; align-items: center; background: linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%); color: #ffffff; }
        .title-slide h1 { font-size: 38px; color: #ffffff; margin-bottom: 16px; font-weight: 800; }
        .title-slide p { font-size: 18px; color: #93c5fd; max-width: 600px; margin: 0 auto; }
        .title-slide .badge { display: inline-block; padding: 6px 16px; background: rgba(255,255,255,0.15); border-radius: 9999px; font-size: 13px; font-weight: 600; color: #67e8f9; margin-bottom: 20px; }
      </style>
    </head>
    <body>
      <div class="slide title-slide">
        <div>
          <span class="badge">${note.type === 'formulas' ? '⚡ FORMULA DECK' : '📚 STUDY PRESENTATION'}</span>
          <h1>${note.title || 'Study Presentation'}</h1>
          ${note.chapter ? `<p>Topic: ${note.chapter}</p>` : ''}
          <div style="margin-top: 32px; font-size: 12px; color: #cbd5e1;">
            Generated with EduRAG AI Study System &bull; ${new Date().toLocaleDateString()}
          </div>
        </div>
      </div>

      ${slides.map((s, idx) => `
        <div class="slide">
          <div class="slide-header">
            <h2 class="slide-title">${s.title}</h2>
            <div class="slide-subtitle">${note.title || 'Notes'} &bull; Slide ${idx + 1}</div>
          </div>
          <div class="slide-body">
            ${s.bullets.slice(0, 8).map(b => `
              <div class="bullet-item">
                <span class="bullet-dot">&bull;</span>
                <div>${b.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</div>
              </div>
            `).join('')}
          </div>
          <div class="slide-footer">
            <span>EduRAG AI Presentation</span>
            <span>Slide ${idx + 2} of ${slides.length + 1}</span>
          </div>
        </div>
      `).join('')}
    </body>
    </html>
  `;
}

export function cleanMathForPdf(text: string): string {
  if (!text) return '';
  let s = text.trim();

  // Strip wrapping $$ or $
  s = s.replace(/^\$\$([\s\S]*?)\$\$$/g, '$1').replace(/^\$([\s\S]*?)\$$/g, '$1').trim();
  s = s.replace(/\$\$([\s\S]*?)\$\$/g, '$1').replace(/\$([^$]+)\$/g, '$1');

  // Strip markdown bold / italic / code artifacts
  s = s.replace(/\*\*([^*]+)\*\*/g, '$1');
  s = s.replace(/\*([^*]+)\*/g, '$1');
  s = s.replace(/\`([^`]+)\`/g, '$1');

  // Fractions: \frac{a}{b} -> (a / b)
  while (/\\frac\{([^{}]+)\}\{([^{}]+)\}/.test(s)) {
    s = s.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1 / $2)');
  }

  // Roots
  s = s.replace(/\\sqrt\{([^}]+)\}/g, 'sqrt($1)');
  s = s.replace(/\\sqrt\[(\d+)\]\{([^}]+)\}/g, 'root-$1($2)');

  // Text commands
  s = s.replace(/\\(text|mathrm|operatorname|mathbf|mathit|mathtt)\{([^}]+)\}/g, '$2');

  // Hats, bars, and vectors
  s = s.replace(/\\hat\{y\}/g, 'y_pred').replace(/\\hat\{x\}/g, 'x_hat').replace(/\\hat\{([a-zA-Z])\}/g, '$1_hat');
  s = s.replace(/\\bar\{x\}/g, 'x_mean').replace(/\\bar\{y\}/g, 'y_mean').replace(/\\bar\{([a-zA-Z])\}/g, '$1_mean');
  s = s.replace(/\\vec\{([a-zA-Z])\}/g, 'vec($1)');

  // Summations & products with bounds
  s = s.replace(/\\sum_\{([^}]+)\}\^\{?([^}\s]+)\}?/g, 'Sum ($1 to $2) ');
  s = s.replace(/\\sum_\{([^}]+)\}/g, 'Sum ($1) ');
  s = s.replace(/\\sum\b/g, 'Sum ');
  s = s.replace(/\\prod_\{([^}]+)\}\^\{?([^}\s]+)\}?/g, 'Product ($1 to $2) ');
  s = s.replace(/\\prod_\{([^}]+)\}/g, 'Product ($1) ');
  s = s.replace(/\\prod\b/g, 'Product ');
  s = s.replace(/\\int_\{([^}]+)\}\^\{?([^}\s]+)\}?/g, 'Integral ($1 to $2) ');
  s = s.replace(/\\int\b/g, 'Integral ');

  // Multipliers before absolute values: 2|E| -> 2 * |E|
  s = s.replace(/(\d+)\s*\|([A-Za-z0-9_]+)\|/g, '$1 * |$2|');

  // Multipliers & arithmetic
  s = s.replace(/\\cdot\b/g, ' * ');
  s = s.replace(/\\times\b/g, ' * ');
  s = s.replace(/\\div\b/g, ' / ');
  s = s.replace(/\\pm\b/g, ' +/- ');
  s = s.replace(/\\mp\b/g, ' -/+ ');

  // Relational & Logic
  s = s.replace(/\\(leq|le)\b/g, ' <= ');
  s = s.replace(/\\(geq|ge)\b/g, ' >= ');
  s = s.replace(/\\(neq|ne)\b/g, ' != ');
  s = s.replace(/\\approx\b/g, ' ~= ');
  s = s.replace(/\\equiv\b/g, ' = ');
  s = s.replace(/\\ll\b/g, ' << ');
  s = s.replace(/\\gg\b/g, ' >> ');
  s = s.replace(/\\(implies|Longrightarrow)\b/g, ' => ');
  s = s.replace(/\\(iff|Longleftrightarrow)\b/g, ' <=> ');
  s = s.replace(/\\(to|rightarrow)\b/g, ' -> ');
  s = s.replace(/\\leftarrow\b/g, ' <- ');

  // Set theory
  s = s.replace(/\\in\b/g, ' in ');
  s = s.replace(/\\notin\b/g, ' not in ');
  s = s.replace(/\\subset\b/g, ' subset of ');
  s = s.replace(/\\cup\b/g, ' union ');
  s = s.replace(/\\cap\b/g, ' intersection ');

  // Greek letters
  s = s.replace(/\\alpha\b/g, 'alpha');
  s = s.replace(/\\beta\b/g, 'beta');
  s = s.replace(/\\gamma\b/g, 'gamma');
  s = s.replace(/\\delta\b/g, 'delta');
  s = s.replace(/\\epsilon\b/g, 'epsilon');
  s = s.replace(/\\theta\b/g, 'theta');
  s = s.replace(/\\lambda\b/g, 'lambda');
  s = s.replace(/\\mu\b/g, 'mu');
  s = s.replace(/\\pi\b/g, 'pi');
  s = s.replace(/\\sigma\b/g, 'sigma');
  s = s.replace(/\\tau\b/g, 'tau');
  s = s.replace(/\\phi\b/g, 'phi');
  s = s.replace(/\\omega\b/g, 'omega');
  s = s.replace(/\\Delta\b/g, 'Delta');
  s = s.replace(/\\Sigma\b/g, 'Sum');
  s = s.replace(/\\infty\b/g, 'infinity');

  // Modulo
  s = s.replace(/\\pmod\{([^}]+)\}/g, '(mod $1)');
  s = s.replace(/\\mod\b/g, 'mod');

  // Delimiters
  s = s.replace(/\\left\(/g, '(').replace(/\\right\)/g, ')');
  s = s.replace(/\\left\[/g, '[').replace(/\\right\]/g, ']');
  s = s.replace(/\\left\\\{/g, '{').replace(/\\right\\\}/g, '}');
  s = s.replace(/\\left\|/g, '|').replace(/\\right\|/g, '|');
  s = s.replace(/\\\{/g, '{').replace(/\\\}/g, '}');
  s = s.replace(/\\_/g, '_');
  s = s.replace(/\\ /g, ' ');
  s = s.replace(/\\[a-zA-Z]+/g, '');

  // Unicode to clean ASCII for standard PDF Helvetica/Courier rendering
  s = s.replace(/[√]/g, 'sqrt');
  s = s.replace(/[∑]/g, 'Sum');
  s = s.replace(/[∏]/g, 'Product');
  s = s.replace(/[∫]/g, 'Integral');
  s = s.replace(/[ŷ]/g, 'y_pred');
  s = s.replace(/[x̂]/g, 'x_hat');
  s = s.replace(/[x̄]/g, 'x_mean');
  s = s.replace(/[ȳ]/g, 'y_mean');
  s = s.replace(/[²]/g, '^2');
  s = s.replace(/[³]/g, '^3');
  s = s.replace(/[⁴]/g, '^4');
  s = s.replace(/[ⁿ]/g, '^n');
  s = s.replace(/[₁]/g, '_1');
  s = s.replace(/[₂]/g, '_2');
  s = s.replace(/[₃]/g, '_3');
  s = s.replace(/[₄]/g, '_4');
  s = s.replace(/[ᵢ]/g, '_i');
  s = s.replace(/[ⱼ]/g, '_j');
  s = s.replace(/[ₙ]/g, '_n');
  s = s.replace(/[α]/g, 'alpha');
  s = s.replace(/[β]/g, 'beta');
  s = s.replace(/[γ]/g, 'gamma');
  s = s.replace(/[δ]/g, 'delta');
  s = s.replace(/[ε]/g, 'epsilon');
  s = s.replace(/[θ]/g, 'theta');
  s = s.replace(/[λ]/g, 'lambda');
  s = s.replace(/[μ]/g, 'mu');
  s = s.replace(/[π]/g, 'pi');
  s = s.replace(/[σ]/g, 'sigma');
  s = s.replace(/[τ]/g, 'tau');
  s = s.replace(/[φ]/g, 'phi');
  s = s.replace(/[ω]/g, 'omega');
  s = s.replace(/[Δ]/g, 'Delta');
  s = s.replace(/[Σ]/g, 'Sum');
  s = s.replace(/[Ω]/g, 'Omega');
  s = s.replace(/[≤]/g, '<=');
  s = s.replace(/[≥]/g, '>=');
  s = s.replace(/[≠]/g, '!=');
  s = s.replace(/[≈]/g, '~=');
  s = s.replace(/[≡]/g, '=');
  s = s.replace(/[×·]/g, '*');
  s = s.replace(/[÷]/g, '/');
  s = s.replace(/[±]/g, '+/-');
  s = s.replace(/[∓]/g, '-/+');
  s = s.replace(/[→]/g, '->');
  s = s.replace(/[←]/g, '<-');
  s = s.replace(/[⇒]/g, '=>');
  s = s.replace(/[⇔]/g, '<=>');
  s = s.replace(/[—–]/g, '-');
  s = s.replace(/[•]/g, '*');
  s = s.replace(/[“”]/g, '"');
  s = s.replace(/[‘’]/g, "'");

  return s.replace(/[ \t]+/g, ' ').trim();
}

export function formatNoteDateTime(val?: string): string {
  if (!val) return 'Just now';
  if (val === 'Yesterday' || val.includes('ago')) return val;
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  const dateStr = d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const timeStr = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `${dateStr} at ${timeStr}`;
}

export function triggerPdfBlobDownload(doc: any, filename: string) {
  const safeFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  try {
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = safeFilename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
      URL.revokeObjectURL(url);
    }, 1500);
  } catch (err) {
    console.warn('Direct blob URL trigger failed, falling back to doc.save:', err);
    doc.save(safeFilename);
  }
}

export async function downloadPdfDirect(note: any) {
  if (!note) {
    throw new Error('No note data available for export.');
  }

  const jspdfModule = await import('jspdf');
  const jsPDFClass = (jspdfModule as any).jsPDF || (jspdfModule as any).default?.jsPDF || (jspdfModule as any).default || jspdfModule;
  const doc = new jsPDFClass({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const maxLineWidth = pageWidth - margin * 2;
  let y = 40;

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - margin - 24) {
      doc.addPage();
      y = 40;
    }
  };

  const createdD = note.createdAt ? new Date(note.createdAt) : new Date();
  const dateStr = !isNaN(createdD.getTime())
    ? createdD.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const timeStr = !isNaN(createdD.getTime())
    ? createdD.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    : new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  const isFormulaSheet =
    note.type === 'formulas' ||
    note.type === 'formula' ||
    (note.title && note.title.toLowerCase().includes('formula sheet')) ||
    (note.content && (
      note.content.toLowerCase().includes('core formulas') ||
      note.content.toLowerCase().includes('formula sheet & reference guide') ||
      note.content.toLowerCase().includes('formula name')
    ));

  const parsedFormulas: FormulaItem[] = isFormulaSheet
    ? getFormulaSheetFormulas(note.content || '', note.chapter, note.title)
    : [];

  const formatFormulaMathForDisplay = (raw: string): string => {
    if (!raw) return '';
    let s = cleanLatexMath(raw);

    // Subscripts with braces: _{i} -> ᵢ
    s = s.replace(/_\{0\}/g, '₀').replace(/_\{1\}/g, '₁').replace(/_\{2\}/g, '₂').replace(/_\{3\}/g, '₃')
         .replace(/_\{4\}/g, '₄').replace(/_\{5\}/g, '₅').replace(/_\{n\}/g, 'ₙ').replace(/_\{i\}/g, 'ᵢ')
         .replace(/_\{j\}/g, 'ⱼ').replace(/_\{k\}/g, 'ₖ').replace(/_\{t\}/g, 'ₜ').replace(/_\{m\}/g, 'ₘ');

    // Superscripts with braces: ^{2} -> ²
    s = s.replace(/\^\{0\}/g, '⁰').replace(/\^\{1\}/g, '¹').replace(/\^\{2\}/g, '²').replace(/\^\{3\}/g, '³')
         .replace(/\^\{n\}/g, 'ⁿ').replace(/\^\{T\}/g, 'ᵀ').replace(/\^\{-1\}/g, '⁻¹').replace(/\^\{-z\}/g, '⁻ᶻ');

    // Common unbraced subscripts and superscripts:
    s = s.replace(/_0/g, '₀').replace(/_1/g, '₁').replace(/_2/g, '₂').replace(/_3/g, '₃')
         .replace(/_4/g, '₄').replace(/_5/g, '₅').replace(/_n/g, 'ₙ').replace(/_i/g, 'ᵢ')
         .replace(/_j/g, 'ⱼ').replace(/_k/g, 'ₖ').replace(/_t/g, 'ₜ').replace(/_m/g, 'ₘ');
    s = s.replace(/\^0/g, '⁰').replace(/\^1/g, '¹').replace(/\^2/g, '²').replace(/\^3/g, '³')
         .replace(/\^n/g, 'ⁿ').replace(/\^T/g, 'ᵀ');

    // In case of y_pred, y_hat, y_mean from plain text:
    s = s.replace(/\by_pred\b/g, 'ŷ').replace(/\by_hat\b/g, 'ŷ').replace(/\bx_hat\b/g, 'x̂');
    s = s.replace(/\bx_mean\b/g, 'x̄').replace(/\by_mean\b/g, 'ȳ');

    // Strip any stray markdown / latex symbols
    s = s.replace(/[$`]/g, '');
    s = s.replace(/\\/g, '');

    return s.replace(/[ \t]+/g, ' ').trim();
  };

  const cleanTextForDisplay = (text: string): string => {
    if (!text) return '';
    let s = text.trim();
    s = s.replace(/\*\*([^*]+)\*\*/g, '$1');
    s = s.replace(/\*([^*]+)\*/g, '$1');
    s = s.replace(/\`([^`]+)\`/g, '$1');
    s = s.replace(/\$([^$]+)\$/g, (_, math) => formatFormulaMathForDisplay(math));
    s = s.replace(/\by_pred\b/g, 'ŷ').replace(/\by_hat\b/g, 'ŷ').replace(/\bx_hat\b/g, 'x̂');
    s = s.replace(/\bx_mean\b/g, 'x̄').replace(/\by_mean\b/g, 'ȳ');
    s = s.replace(/_i\b/g, 'ᵢ').replace(/_n\b/g, 'ₙ').replace(/_1\b/g, '₁').replace(/_2\b/g, '₂');
    s = s.replace(/\^2\b/g, '²').replace(/\^3\b/g, '³').replace(/\^n\b/g, 'ⁿ');
    s = s.replace(/[$`\\]/g, '');
    return s.trim();
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Dedicated Formula Sheet PDF (Instant, Crisp Vector Rendering)
  // ──────────────────────────────────────────────────────────────────────────
  if (parsedFormulas.length > 0) {
    // 1. Header Banner
    doc.setFillColor(109, 40, 217); // Purple 700
    doc.roundedRect(margin, y, maxLineWidth, 64, 8, 8, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(233, 213, 255); // Purple 200
    doc.text('VERIFIED EDURAG FORMULA SHEET • ' + cleanTextForDisplay(note.chapter || 'REFERENCE GUIDE').toUpperCase(), margin + 14, y + 18);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(255, 255, 255);
    const titleLines = doc.splitTextToSize(cleanTextForDisplay(note.title || 'Formula Sheet & Reference Guide'), maxLineWidth - 28);
    doc.text(titleLines[0] || 'Formula Sheet & Reference Guide', margin + 14, y + 36);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(216, 180, 254);
    doc.text(`Generated by EduRAG AI • ${parsedFormulas.length} Structured Formulas • ${dateStr} at ${timeStr}`, margin + 14, y + 52);

    y += 78;

    // 2. Render each Formula Card
    for (let idx = 0; idx < parsedFormulas.length; idx++) {
      const item = parsedFormulas[idx];
      const rawFormula = item.studentFormula || cleanLatexMath(item.math) || item.name;
      const cleanFormula = formatFormulaMathForDisplay(rawFormula);
      const meaningText = item.meaning ? cleanTextForDisplay(item.meaning) : '';
      const meaningLines = meaningText ? doc.splitTextToSize(`Meaning: ${meaningText}`, maxLineWidth - 32) : [];
      const formulaLines = doc.splitTextToSize(cleanFormula, maxLineWidth - 32);

      // Estimate card height
      let neededH = 50 + (formulaLines.length * 14);
      if (meaningLines.length > 0) neededH += (meaningLines.length * 12) + 16;
      if (item.symbols && item.symbols.length > 0) neededH += Math.min(item.symbols.length * 14 + 16, 70);
      if (item.workedExample) neededH += 44;
      if (item.finalAnswer) neededH += 24;
      if (item.mnemonic) neededH += 24;

      checkPageBreak(Math.min(neededH + 16, 260));

      const cardStartY = y;

      // Card Header Badges
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(margin, y, maxLineWidth, 22, 6, 6, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(109, 40, 217);
      const badgesText = `[Unit: ${cleanTextForDisplay(item.unit || 'Core')}]   [Chapter: ${cleanTextForDisplay(item.chapter || note.chapter || 'General')}]   [Page: ${cleanTextForDisplay(item.page || '1')}]`;
      doc.text(badgesText, margin + 8, y + 14);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      const numText = `Formula #${idx + 1}`;
      doc.text(numText, pageWidth - margin - doc.getTextWidth(numText) - 8, y + 14);
      y += 28;

      // Formula Name
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text(cleanTextForDisplay(item.name || 'Formula'), margin + 8, y);
      y += 16;

      // Formula Math Box
      const fBoxHeight = Math.max(26, formulaLines.length * 14 + 12);
      doc.setFillColor(245, 243, 255);
      doc.setDrawColor(199, 210, 254);
      doc.roundedRect(margin + 4, y, maxLineWidth - 8, fBoxHeight, 5, 5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(109, 40, 217);
      doc.text('FORMULA', margin + 12, y + 10);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(formulaLines, margin + 12, y + 22);
      y += fBoxHeight + 8;

      // Formula Meaning Box
      if (meaningLines.length > 0) {
        const mBoxHeight = Math.max(22, meaningLines.length * 12 + 10);
        doc.setFillColor(254, 252, 232);
        doc.setDrawColor(254, 240, 138);
        doc.roundedRect(margin + 4, y, maxLineWidth - 8, mBoxHeight, 4, 4, 'FD');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(113, 63, 18);
        doc.text(meaningLines, margin + 12, y + 13);
        y += mBoxHeight + 6;
      }

      // Variables Explained
      if (item.symbols && item.symbols.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
        doc.text('VARIABLES EXPLAINED:', margin + 8, y + 6);
        y += 14;

        item.symbols.slice(0, 6).forEach((s: any) => {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(109, 40, 217);
          const sym = `${formatFormulaMathForDisplay(s.symbol || '')}:`;
          doc.text(sym, margin + 12, y);
          const symW = doc.getTextWidth(sym) + 4;

          doc.setFont('helvetica', 'normal');
          doc.setTextColor(51, 65, 85);
          const desc = doc.splitTextToSize(cleanTextForDisplay(s.meaning || ''), maxLineWidth - 32 - symW);
          doc.text(desc, margin + 12 + symW, y);
          y += Math.max(12, desc.length * 10);
        });
        y += 4;
      }

      // Worked Example
      if (item.workedExample) {
        const exLines = item.workedExample.split('\n').filter(Boolean);
        const exHeight = Math.max(22, exLines.slice(0, 3).length * 12 + 16);
        doc.setFillColor(240, 253, 244);
        doc.setDrawColor(187, 247, 208);
        doc.roundedRect(margin + 4, y, maxLineWidth - 8, exHeight, 4, 4, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(22, 101, 52);
        doc.text('WORKED EXAMPLE:', margin + 12, y + 11);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(30, 41, 59);
        let stepY = y + 22;
        exLines.slice(0, 3).forEach((line: string, lIdx: number) => {
          const cleanL = cleanTextForDisplay(line.replace(/^[-*•\d.]+\s*/, ''));
          const stepText = doc.splitTextToSize(`${lIdx + 1}. ${cleanL}`, maxLineWidth - 32);
          doc.text(stepText[0] || '', margin + 12, stepY);
          stepY += 11;
        });
        y += exHeight + 6;
      }

      // Final Answer
      if (item.finalAnswer) {
        doc.setFillColor(236, 253, 245);
        doc.setDrawColor(167, 243, 208);
        doc.roundedRect(margin + 4, y, maxLineWidth - 8, 20, 4, 4, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(6, 95, 70);
        doc.text('Final Answer: ' + cleanTextForDisplay(item.finalAnswer), margin + 12, y + 13);
        y += 26;
      }

      // Quick Memory Tip
      if (item.mnemonic) {
        doc.setFillColor(254, 243, 199);
        doc.setDrawColor(253, 230, 138);
        doc.roundedRect(margin + 4, y, maxLineWidth - 8, 20, 4, 4, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(146, 64, 14);
        doc.text('Quick Memory Tip: ' + cleanTextForDisplay(item.mnemonic), margin + 12, y + 13);
        y += 26;
      }

      // Outer Card Border
      const cardHeight = y - cardStartY + 4;
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, cardStartY, maxLineWidth, cardHeight, 6, 6, 'S');
      y += 14;
    }

    // 3. Complexity Table (if available)
    const secBlocks = (note.content || '').split(/\n(?=##\s+)/g);
    for (const sec of secBlocks.slice(1)) {
      const firstLineEnd = sec.indexOf('\n');
      const headerLine = (firstLineEnd !== -1 ? sec.slice(0, firstLineEnd) : sec).toLowerCase();
      if (headerLine.includes('complexity') || headerLine.includes('computational bound') || headerLine.includes('metric')) {
        const secText = firstLineEnd !== -1 ? sec.slice(firstLineEnd + 1) : '';
        const lines = secText.split('\n').filter((l: string) => l.trim().length > 0);
        const tableLines = lines.filter((l: string) => l.trim().startsWith('|') && l.trim().endsWith('|'));
        if (tableLines.length >= 2) {
          checkPageBreak(120);
          const headerCols = tableLines[0].split('|').map((c: string) => c.trim()).filter(Boolean);
          const rowLines = tableLines.slice(2);

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(11);
          doc.setTextColor(15, 23, 42);
          doc.text('Computational Complexity & Bounds', margin, y);
          y += 14;

          // Header
          doc.setFillColor(241, 245, 249);
          doc.rect(margin, y, maxLineWidth, 18, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(30, 41, 59);
          const colW = maxLineWidth / Math.max(headerCols.length, 1);
          headerCols.forEach((col: string, cIdx: number) => {
            doc.text(cleanTextForDisplay(col), margin + (cIdx * colW) + 6, y + 12);
          });
          y += 18;

          // Rows
          rowLines.forEach((r: string, rIdx: number) => {
            const cols = r.split('|').map((c: string) => c.trim()).filter(Boolean);
            if (cols.length === 0) return;
            checkPageBreak(16);
            if (rIdx % 2 === 1) {
              doc.setFillColor(248, 250, 252);
              doc.rect(margin, y, maxLineWidth, 16, 'F');
            }
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(51, 65, 85);
            cols.forEach((col: string, cIdx: number) => {
              doc.text(cleanTextForDisplay(col), margin + (cIdx * colW) + 6, y + 11);
            });
            y += 16;
          });
          y += 14;
          break;
        }
      }
    }

    // 4. Running headers & footers
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      if (i > 1) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text('EduRAG AI Study System • Formula Reference Guide', margin, 24);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.line(margin, 28, pageWidth - margin, 28);
      }

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(margin, pageHeight - 26, pageWidth - margin, pageHeight - 26);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('EduRAG AI Study System • Formula Reference Guide', margin, pageHeight - 14);
      const pageStr = `Page ${i} of ${totalPages}`;
      const pw = doc.getTextWidth(pageStr);
      doc.text(pageStr, pageWidth - margin - pw, pageHeight - 14);
    }

    const safeTitle = (note.title || 'formula_sheet').replace(/[^a-z0-9_-]+/gi, '_').toLowerCase();
    triggerPdfBlobDownload(doc, `${safeTitle}.pdf`);
    return;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Clean Standard Study Notes PDF (Non-Formula notes)
  // ──────────────────────────────────────────────────────────────────────────
  // Header Badge
  doc.setFillColor(238, 242, 255);
  doc.roundedRect(margin, y, 98, 20, 4, 4, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(67, 56, 202);
  doc.text('STUDY NOTES', margin + 8, y + 13.5);
  y += 34;

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  const titleLines = doc.splitTextToSize(note.title || 'Generated Notes', maxLineWidth);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 22 + 4;

  // Metadata
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  if (note.chapter) {
    doc.text(`Topic / Chapter: ${cleanMathForPdf(note.chapter)}`, margin, y);
    y += 14;
  }
  if (note.course) {
    doc.text(`Course: ${cleanMathForPdf(note.course)}`, margin, y);
    y += 14;
  }
  doc.text(`Generated by EduRAG AI Study System • ${dateStr} at ${timeStr}`, margin, y);
  y += 16;

  // Top Rule
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(1);
  doc.line(margin, y, pageWidth - margin, y);
  y += 20;

  // Content
  const rawLines = (note.content || '').split('\n');
  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      y += 8;
      continue;
    }

    if (trimmed.startsWith('# ')) {
      checkPageBreak(36);
      y += 6;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(30, 58, 138);
      const heading = cleanMathForPdf(trimmed.replace(/^#\s*/, ''));
      const split = doc.splitTextToSize(heading, maxLineWidth);
      doc.text(split, margin, y);
      y += split.length * 19 + 6;
    } else if (trimmed.startsWith('## ')) {
      checkPageBreak(30);
      y += 5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12.5);
      doc.setTextColor(29, 78, 216);
      const heading = cleanMathForPdf(trimmed.replace(/^##\s*/, ''));
      const split = doc.splitTextToSize(heading, maxLineWidth);
      doc.text(split, margin, y);
      y += split.length * 16 + 5;
    } else if (trimmed.startsWith('### ')) {
      checkPageBreak(24);
      y += 4;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(30, 41, 59);
      const heading = cleanMathForPdf(trimmed.replace(/^###\s*/, ''));
      const split = doc.splitTextToSize(heading, maxLineWidth);
      doc.text(split, margin, y);
      y += split.length * 14 + 4;
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
      checkPageBreak(18);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59);
      const bulletText = cleanMathForPdf(trimmed.replace(/^[-*•]\s*/, ''));
      doc.setFillColor(59, 130, 246);
      doc.circle(margin + 4, y - 3, 2, 'F');
      const split = doc.splitTextToSize(bulletText, maxLineWidth - 14);
      doc.text(split, margin + 14, y);
      y += split.length * 13 + 4;
    } else {
      checkPageBreak(16);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(51, 65, 85);
      const cleanText = cleanMathForPdf(trimmed);
      const split = doc.splitTextToSize(cleanText, maxLineWidth);
      doc.text(split, margin, y);
      y += split.length * 13 + 4;
    }
  }

  // Add page numbers on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('EduRAG AI Study System • Study Notes', margin, pageHeight - 20);
    const pageStr = `Page ${i} of ${totalPages}`;
    const pw = doc.getTextWidth(pageStr);
    doc.text(pageStr, pageWidth - margin - pw, pageHeight - 20);
  }

  const safeTitle = (note.title || 'notes').replace(/[^a-z0-9_-]+/gi, '_').toLowerCase();
  triggerPdfBlobDownload(doc, `${safeTitle}.pdf`);
}

export function StudentNotes() {
  const [generated, setGenerated] = useState(false);
  const [notes, setNotes] = useState<any[]>([]);
  const [activeNote, setActiveNote] = useState<any | null>(null);
  const [isGeneratingNote, setIsGeneratingNote] = useState(false);
  const [noteGenElapsed, setNoteGenElapsed] = useState(0);

  useEffect(() => {
    if (!isGeneratingNote) {
      setNoteGenElapsed(0);
      return;
    }
    const timer = setInterval(() => {
      setNoteGenElapsed(s => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isGeneratingNote]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [copiedNote, setCopiedNote] = useState<boolean>(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<string | null>(null);

  const handleExportNote = async (format: 'pdf' | 'docx' | 'pptx' | 'txt') => {
    if (!activeNote || isExporting) return;
    setIsExporting(true);
    setExportingFormat(format);
    try {
      await triggerVerifiedExportDownload(activeNote, format);
      setShowExportModal(false);
      const labels: Record<string, string> = {
        pdf: 'PDF Document (.pdf)',
        docx: 'Word Document (.docx)',
        pptx: 'PowerPoint Presentation (.pptx)',
        txt: 'Plain Text (.txt)',
      };
      pushToast(`Downloaded as ${labels[format] || format}`, 'success');
    } catch (err: any) {
      console.error(`${format.toUpperCase()} export error:`, err);
      pushToast(err.message || `Failed to export ${format.toUpperCase()}. Please try again.`, 'error');
    } finally {
      setIsExporting(false);
      setExportingFormat(null);
    }
  };

  useEffect(() => {
    if (showExportModal) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setShowExportModal(false);
      };
      document.addEventListener('keydown', onKey);
      return () => {
        document.body.style.overflow = originalOverflow;
        document.removeEventListener('keydown', onKey);
      };
    }
  }, [showExportModal]);
  const [showDeleteNoteConfirm, setShowDeleteNoteConfirm] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<any | null>(null);
  const [isDeletingNote, setIsDeletingNote] = useState(false);
  const [noteTopic, setNoteTopic] = useState('');
  const [uploadedNoteFiles, setUploadedNoteFiles] = useState<{ id: string; name: string; status: 'processing' | 'ready' | 'failed' }[]>([]);
  const [noteUploadStatus, setNoteUploadStatus] = useState<string | null>(null);
  const [isUploadingNoteFile, setIsUploadingNoteFile] = useState(false);
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const noteFileInputRef = useRef<HTMLInputElement>(null);
  const [indexedMaterials, setIndexedMaterials] = useState<{ id: string; name: string; status?: string }[]>([]);
  const [selectedIndexedId, setSelectedIndexedId] = useState<string>('all');
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);



  const handleDeleteAllNotes = async () => {
    setIsDeletingAll(true);
    try {
      const allIds = notes.map(n => n.id);
      await deleteAllNotes(allIds);
      setNotes([]);
      setActiveNote(null);
      setGenerated(false);
      setShowDeleteAllConfirm(false);
      pushToast('All recently generated notes deleted successfully.', 'success');
    } catch (err) {
      console.warn('Failed to delete all notes:', err);
      pushToast('Failed to delete notes. Please try again.', 'error');
    } finally {
      setIsDeletingAll(false);
    }
  };

  const loadMaterials = useCallback(async () => {
    try {
      const token = typeof window !== 'undefined' ? window.localStorage.getItem('edurag-auth-token') : null;
      const res = await fetch('http://localhost:8000/api/materials', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return [];
      const data = await res.json();
      const list: any[] = Array.isArray(data) ? data : (data?.materials ?? []);
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
      return mapped;
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    loadMaterials();
  }, [loadMaterials]);

  const pushToast = useCallback((message: string, tone: ToastData['tone']) => {
    const id = `note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts(prev => [...prev, { id, message, tone }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchNotes()
      .then(data => {
        if (!cancelled) {
          const sorted = [...(data || [])].sort((a, b) => {
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            if (timeA !== timeB) return timeB - timeA;
            const idA = typeof a.id === 'string' ? a.id.replace(/\D/g, '') : '';
            const idB = typeof b.id === 'string' ? b.id.replace(/\D/g, '') : '';
            if (idA && idB && idA !== idB) return Number(idB) - Number(idA);
            return 0;
          });
          setNotes(sorted);
          // By default, the generated notes page (right side) is blank.
          // Note is displayed only when student generates a new note or clicks 'View' on a saved note.
        }
      })
      .catch(error => {
        if (!cancelled) setNotesError(error instanceof Error ? error.message : 'Unable to load notes.');
      })
      .finally(() => {
        if (!cancelled) setNotesLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const sortedRecentNotes = useMemo<any[]>(() => {
    return [...notes].sort((a: any, b: any) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (timeA !== timeB) return timeB - timeA; // Newest on top, older previously generated at bottom
      const idA = typeof a.id === 'string' ? a.id.replace(/\D/g, '') : '';
      const idB = typeof b.id === 'string' ? b.id.replace(/\D/g, '') : '';
      if (idA && idB && idA !== idB) return Number(idB) - Number(idA);
      return 0;
    });
  }, [notes]);

  const [type, setType] =
    useState<
      'summary' |
      'keypoints' |
      'definitions' |
      'formulas'
    >('summary');

  const noteTypes = [
    {
      id: 'summary' as const,
      label: 'Chapter Summary',
      icon: FileText,
      tone: 'primary',
    },
    {
      id: 'keypoints' as const,
      label: 'Key Points',
      icon: Sparkles,
      tone: 'accent',
    },
    {
      id: 'definitions' as const,
      label: 'Definitions',
      icon: BookMarked,
      tone: 'secondary',
    },
    {
      id: 'formulas' as const,
      label: 'Formula Sheet',
      icon: Zap,
      tone: 'warning',
    },
  ];

  const MAX_UPLOADED_FILES = 10;
  const allowedExtensions = [
    'pdf', 'pptx', 'docx', 'txt', 'md', 'csv', 'ppt', 'png', 'jpg', 'jpeg',
    'mp3', 'wav', 'm4a', 'ogg', 'mp4', 'webm', 'mov',
  ];

  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return;

    const validFiles: File[] = [];

    for (const file of files) {
      const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
      if (!allowedExtensions.includes(extension)) {
        setNoteUploadStatus(`"${file.name}" — unsupported file type. Use PDF, audio, video, images, or text documents.`);
        pushToast(`"${file.name}" — unsupported file type. Use PDF, audio, video, images, or text documents.`, 'error');
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        setNoteUploadStatus(`"${file.name}" is larger than 10 MB. Please choose a smaller document.`);
        pushToast(`"${file.name}" is larger than 10 MB. Please choose a smaller document.`, 'error');
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) {
      return;
    }

    const existingCount = uploadedNoteFiles.length;
    if (existingCount >= MAX_UPLOADED_FILES) {
      const message = `You have reached the maximum of ${MAX_UPLOADED_FILES} uploaded files. Remove some before adding more.`;
      setNoteUploadStatus(message);
      pushToast(message, 'error');
      return;
    }

    const slotsAvailable = MAX_UPLOADED_FILES - existingCount;
    const filesToUpload = validFiles.slice(0, slotsAvailable);
    if (validFiles.length > slotsAvailable) {
      const message = `Only ${slotsAvailable} more file(s) can be added. Extra files were ignored.`;
      setNoteUploadStatus(message);
      pushToast(message, 'warning');
    }

    setIsUploadingNoteFile(true);
    setNoteUploadStatus(`Uploading ${filesToUpload.length} ${filesToUpload.length === 1 ? 'file' : 'files'}…`);

    const newlyUploaded: { id: string; name: string; status: 'processing' | 'ready' | 'failed' }[] = [];

    try {
      for (const file of filesToUpload) {
        setNoteUploadStatus(`Uploading ${file.name} — extracting text…`);

        const formData = new FormData();
        formData.append('file', file, file.name);
        formData.append('studentId', getCurrentUserId());
        formData.append('course', 'Notes study material');
        const token = window.localStorage.getItem('edurag-auth-token');
        const response = await fetch('http://localhost:8000/api/materials/upload', {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          body: formData,
        });
        const data = await response.json();
        if (!response.ok || !data.success || !data.material?.id) {
          throw new Error(data.error || `The document "${file.name}" could not be uploaded.`);
        }
        const materialStatus = data.material.status || 'processing';
        const isReadyImmediately = materialStatus === 'ready' || materialStatus === 'approved' || (data.chunks && data.chunks > 0);
        const uploadedEntry = {
          id: data.material.id,
          name: data.material.name || file.name,
          status: isReadyImmediately ? ('ready' as const) : ('processing' as const),
        };
        newlyUploaded.push(uploadedEntry);

        if (!isReadyImmediately) {
          const pendingId = data.material.id;
          const fileName = file.name;
          let attempt = 0;
          const maxAttempts = 25;

          const markReady = () => {
            setUploadedNoteFiles(prev => prev.map(item =>
              (item.id === pendingId || item.name.toLowerCase() === fileName.toLowerCase())
                ? { ...item, status: 'ready' }
                : item,
            ));
            setNoteUploadStatus(`✓ ${fileName} indexed successfully. You can generate notes now.`);
            loadMaterials().then(mats => {
              if (mats && mats.length > 0) {
                const found = mats.find(m => m.id === pendingId || m.name.toLowerCase() === fileName.toLowerCase());
                if (found) {
                  setSelectedIndexedId(found.id);
                  if (!noteTopic.trim()) {
                    setNoteTopic(found.name.replace(/\.[^/.]+$/, ''));
                  }
                }
              }
            });
          };

          const poll = async () => {
            attempt++;
            if (attempt >= maxAttempts) {
              markReady();
              return;
            }

            try {
              const statusToken = window.localStorage.getItem('edurag-auth-token');
              const controller = new AbortController();
              const timer = setTimeout(() => controller.abort(), 3000);
              const statusRes = await fetch(
                `http://localhost:8000/api/materials/status?id=${encodeURIComponent(pendingId)}&name=${encodeURIComponent(fileName)}`,
                {
                  headers: statusToken ? { Authorization: `Bearer ${statusToken}` } : {},
                  signal: controller.signal,
                },
              );
              clearTimeout(timer);

              if (statusRes.ok) {
                const statusData = await statusRes.json();
                if (statusData && (statusData.ready || statusData.status === 'ready' || (statusData.chunks && statusData.chunks > 0))) {
                  markReady();
                  pushToast(`"${fileName}" indexed successfully. You can generate notes now.`, 'success');
                  return;
                }
              }

              const listCtrl = new AbortController();
              const listTimer = setTimeout(() => listCtrl.abort(), 3000);
              const listRes = await fetch('http://localhost:8000/api/materials', {
                headers: statusToken ? { Authorization: `Bearer ${statusToken}` } : {},
                signal: listCtrl.signal,
              });
              clearTimeout(listTimer);

              if (listRes.ok) {
                const materials = await listRes.json();
                if (Array.isArray(materials)) {
                  const readyMat = materials.find((m: any) =>
                    m.id === pendingId ||
                    m.name?.toLowerCase() === fileName.toLowerCase() ||
                    m.documentName?.toLowerCase() === fileName.toLowerCase()
                  );
                  if (readyMat && (readyMat.status === 'ready' || readyMat.status === 'approved' || (readyMat.chunks && readyMat.chunks > 0))) {
                    markReady();
                    pushToast(`"${fileName}" indexed successfully. You can generate notes now.`, 'success');
                    return;
                  }
                }
              }
            } catch {
              // Non-fatal network hiccup during poll
            }

            setTimeout(poll, 600);
          };

          setTimeout(poll, 500);
        } else {
          loadMaterials().then(mats => {
            if (mats && mats.length > 0) {
              const found = mats.find(m => m.id === data.material.id || m.name.toLowerCase() === file.name.toLowerCase());
              if (found) {
                setSelectedIndexedId(found.id);
                if (!noteTopic.trim()) {
                  setNoteTopic(found.name.replace(/\.[^/.]+$/, ''));
                }
              }
            }
          });
        }
      }

      setUploadedNoteFiles(prev => [...prev, ...newlyUploaded]);
      const allReady = newlyUploaded.every(item => item.status === 'ready');
      const anyFailed = newlyUploaded.some(item => item.status === 'failed');
      const anyProcessing = newlyUploaded.some(item => item.status === 'processing');
      if (allReady) {
        setNoteUploadStatus(`✓ ${newlyUploaded.length} file(s) indexed successfully. You can generate notes now.`);
        loadMaterials();
      } else if (anyFailed) {
        setNoteUploadStatus(`Indexing failed for some file(s). Please try again.`);
      } else if (anyProcessing) {
        setNoteUploadStatus(`✓ ${newlyUploaded.length} file(s) uploaded. Indexing in progress…`);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'The document could not be uploaded.';
      setNoteUploadStatus(msg);
      pushToast(msg, 'error');
    } finally {
      setIsUploadingNoteFile(false);
    }
  };

  const handleNoteFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    event.target.value = '';
    await handleFiles(files);
  };

  const handleGenerateNotes = async () => {
    const enteredTopic = noteTopic.trim();
    if (!enteredTopic) {
      setNotesError('Course / Topic / Chapter is compulsory. Please enter a unit or chapter (e.g. Unit-2, Decision Trees) before generating.');
      pushToast('Course / Topic / Chapter is compulsory (e.g. Unit-2). Please enter it before generating.', 'error');
      return;
    }

    setIsGeneratingNote(true);
    setNotesError(null);
    try {
      const label = noteTypes.find(item => item.id === type)?.label || 'Smart Notes';
      const docName = (selectedIndexedId && selectedIndexedId !== 'all' ? indexedMaterials.find(m => m.id === selectedIndexedId)?.name : '') ||
        (uploadedNoteFiles[0]?.name || '');
      const docNameClean = docName.replace(/\.[^/.]+$/, '').trim();

      const displayTopic = enteredTopic;
      const headingTitle = selectedPrompt ? `${selectedPrompt}` : `${label}: ${displayTopic}`;

      const materialIds: string[] = [];
      if (selectedIndexedId && selectedIndexedId !== 'all') {
        materialIds.push(selectedIndexedId);
      } else if (selectedIndexedId === 'all' && indexedMaterials.length > 0) {
        materialIds.push(...indexedMaterials.map(m => m.id));
      }
      if (uploadedNoteFiles.length > 0) {
        materialIds.push(...uploadedNoteFiles.map(f => f.id));
      }

      const contextStr = [
        docName ? `Selected document: ${docName}` : (uploadedNoteFiles.length > 0 ? `Uploaded documents: ${uploadedNoteFiles.map(f => f.name).join(', ')}` : ''),
        selectedPrompt ? `Prompt directive: "${selectedPrompt}"` : '',
      ].filter(Boolean).join('\n');

      const result = await generateNotesService({
        topic: displayTopic,
        type,
        materialIds: materialIds.length > 0 ? materialIds : undefined,
        context: contextStr,
        documentName: docName || undefined,
        selectedDocumentName: docName || undefined,
      });

      const answerText = result.content ? result.content.trim() : '';

      if (!answerText) {
        throw new Error('Failed to generate notes. Please try again.');
      }

      const finalTitle = result.title || headingTitle;

      const note = {
        id: `note_${Date.now()}`,
        title: finalTitle,
        type,
        course: docNameClean || 'Study Material',
        chapter: enteredTopic || (selectedPrompt || displayTopic),
        content: answerText,
        createdAt: new Date().toISOString(),
        userId: getCurrentUserId(),
      };

      try {
        await createNote(note);
      } catch (saveErr) {
        console.warn('Note save warning:', saveErr);
      }

      setNotes(current => [note, ...current.filter(n => n.id !== note.id)]);
      setActiveNote(note);
      setGenerated(true);
      pushToast(`"${finalTitle}" generated successfully!`, 'success');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unable to generate notes.';
      setNotesError(msg);
      pushToast(msg, 'error');
    } finally {
      setIsGeneratingNote(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Notes Generator"
        description="Generate smart notes from your course materials using AI"
      />

      {/* Main 2-Section Layout: Left = Add a file & Pick a prompt; Right = Notes Generator i.e. Chapter Summary Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ──────────────── Left Section (lg:col-span-5): Add a file, below it Pick a prompt ──────────────── */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-3xl border border-neutral-200/90 bg-white shadow-sm overflow-hidden p-6 md:p-7 space-y-6">
            
            {/* Add a file */}
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div>
                  <h2 className="text-base font-bold font-display text-neutral-900 leading-tight">
                    Add a file
                  </h2>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Drop in anything you'd like to use.
                  </p>
                </div>
              </div>

              {/* Document Selection Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-neutral-700 flex items-center gap-1.5">
                    <Database className="h-3.5 w-3.5 text-emerald-600" />
                    Select Document Already Indexed
                    <span className="text-neutral-400 font-normal">(optional)</span>
                  </label>
                  {indexedMaterials.length > 0 && (
                    <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/80">
                      {indexedMaterials.length} available
                    </span>
                  )}
                </div>
                <select
                  value={selectedIndexedId}
                  onChange={async e => {
                    const id = e.target.value;
                    setSelectedIndexedId(id);
                    const selectedMat = indexedMaterials.find(m => m.id === id);
                    const docName = id === 'all' ? 'All Indexed Documents' : (selectedMat?.name || id);

                    notifyDocumentSelected(id, docName).catch(console.warn);

                    if (id !== 'all' && selectedMat?.name && !noteTopic.trim()) {
                      setNoteTopic(selectedMat.name.replace(/\.[^/.]+$/, ''));
                    }
                  }}
                  className="w-full h-9 px-3 rounded-xl border border-neutral-200 bg-white text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all text-neutral-800"
                >
                  <option value="all">All doc.</option>
                  {indexedMaterials.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.status === 'processing' ? '(Indexing...)' : ''}
                    </option>
                  ))}
                </select>

                {selectedIndexedId && (
                  <div className="mt-2 flex items-center justify-between p-2 rounded-xl bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-950">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <FileText className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">
                        Selected: <strong>{selectedIndexedId === 'all' ? 'All Indexed Documents' : (indexedMaterials.find(m => m.id === selectedIndexedId)?.name || selectedIndexedId)}</strong>
                      </span>
                    </div>
                    <span className="shrink-0 text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-semibold border border-emerald-200">
                      Active
                    </span>
                  </div>
                )}
              </div>

              {/* Course / Topic / Chapter (Compulsory) - Below Select Document Already Indexed */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-neutral-700">
                    Course / Topic / Chapter <span className="text-rose-600 font-bold">* (Compulsory)</span>
                  </label>
                  <span className="text-[11px] text-neutral-400">e.g. Unit-2, Decision Trees</span>
                </div>
                <input
                  type="text"
                  required
                  value={noteTopic}
                  onChange={event => {
                    setNoteTopic(event.target.value);
                    if (event.target.value.trim() && notesError) setNotesError(null);
                  }}
                  placeholder="e.g. Unit-2, Chapter 4, Decision Trees (Compulsory)"
                  className={`w-full h-9 px-3 rounded-xl border bg-white text-xs outline-none transition-all ${
                    !noteTopic.trim() && notesError
                      ? 'border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30'
                      : 'border-neutral-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30'
                  }`}
                />
              </div>

              {/* Note Type Section - Below Course / Topic / Chapter */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-neutral-700">
                    Note Type
                  </label>
                  <span className="text-[11px] text-neutral-400">Select structure</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {noteTypes.map(nt => {
                    const Icon = nt.icon;
                    const isSelected = type === nt.id;
                    return (
                      <button
                        key={nt.id}
                        type="button"
                        onClick={() => setType(nt.id)}
                        className={`flex items-center gap-2 h-9 px-2.5 rounded-xl border text-xs font-medium transition-all text-left cursor-pointer w-full min-w-0 ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50/80 text-emerald-950 font-semibold ring-1 ring-emerald-500 shadow-2xs'
                            : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 hover:border-neutral-300'
                        }`}
                      >
                        <span className={`grid place-items-center h-6 w-6 rounded-lg shrink-0 ${
                          isSelected ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-100 text-neutral-500'
                        }`}>
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <span className="truncate whitespace-nowrap">{nt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Hidden native file input */}
              <input
                ref={noteFileInputRef}
                type="file"
                multiple
                onChange={handleNoteFileUpload}
                className="hidden"
                accept=".pdf,.pptx,.docx,.txt,.md,.csv,.ppt,.png,.jpg,.jpeg,.mp3,.wav,.m4a,.ogg,.mp4,.webm,.mov,audio/*,video/*,image/*,text/*"
              />

              {/* Large Dashed-Border Upload Drop-Zone matching Reference Image */}
              <div
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }}
                onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }}
                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragOver(false);
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    handleFiles(Array.from(e.dataTransfer.files));
                  }
                }}
                onClick={() => {
                  if (!isUploadingNoteFile) {
                    noteFileInputRef.current?.click();
                  }
                }}
                className={`relative w-full rounded-2xl border-2 border-dashed transition-all cursor-pointer p-6 flex flex-col items-center justify-center text-center group ${
                  isDragOver
                    ? 'border-emerald-500 bg-emerald-50/70 scale-[1.01]'
                    : 'border-emerald-300/80 hover:border-emerald-500 bg-emerald-50/20 hover:bg-emerald-50/40'
                }`}
              >
                {/* Stacked squircle illustration in center (Audio, Document, Image) */}
                <div className="relative flex items-center justify-center w-28 h-20 mb-3 select-none pointer-events-none">
                  {/* Left tile - soft purple squircle with music note */}
                  <div className="absolute left-1.5 w-12 h-12 rounded-2xl bg-[#ede9fe] text-[#7c3aed] flex items-center justify-center shadow-xs -rotate-8 transform transition-transform group-hover:-rotate-12">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 18V5l12-2v13" />
                      <circle cx="6" cy="18" r="3" />
                      <circle cx="18" cy="16" r="3" />
                    </svg>
                  </div>
                  {/* Right tile - soft purple squircle with photo icon */}
                  <div className="absolute right-1.5 w-12 h-12 rounded-2xl bg-[#ede9fe] text-[#7c3aed] flex items-center justify-center shadow-xs rotate-8 transform transition-transform group-hover:rotate-12">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                      <circle cx="9" cy="9" r="2" />
                      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                    </svg>
                  </div>
                  {/* Center front tile - soft peach squircle with document note icon */}
                  <div className="relative z-10 w-14 h-14 rounded-2xl bg-[#ffedd5] text-[#ea580c] flex items-center justify-center shadow-md border border-[#fed7aa]/60 transform transition-transform group-hover:scale-105">
                    <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <line x1="10" y1="9" x2="8" y2="9" />
                    </svg>
                  </div>
                </div>

                {/* Text */}
                <h3 className="text-base font-bold text-neutral-900 tracking-tight">
                  Drag your notes here
                </h3>
                <p className="text-xs text-neutral-500 mt-1 max-w-xs leading-relaxed">
                  PDF, audio, video, images or text — any language.
                </p>

                {/* Green action text */}
                <button
                  type="button"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 group-hover:text-emerald-700 group-hover:underline cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    noteFileInputRef.current?.click();
                  }}
                >
                  <span>Or browse your files</span>
                  <span className="text-sm leading-none">→</span>
                </button>
              </div>

              {/* Uploading Status & Uploaded Files UI */}
              {isUploadingNoteFile && (
                <div className="flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                  <LoaderCircle className="h-4 w-4 animate-spin text-emerald-600 shrink-0" />
                  <span>Uploading and extracting document text…</span>
                </div>
              )}

              {uploadedNoteFiles.length > 0 && (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {uploadedNoteFiles.map((file, idx) => (
                    <div key={file.id} className="space-y-1.5">
                      <div className="flex items-center gap-2.5 p-2.5 rounded-xl border border-neutral-200 bg-neutral-50">
                        <FileText className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span className="flex-1 text-xs text-neutral-800 font-medium truncate">{file.name}</span>
                        {file.status === 'processing' ? (
                          <button
                            type="button"
                            onClick={async () => {
                              setUploadedNoteFiles(prev => prev.map((f, i) => i === idx ? { ...f, status: 'ready' } : f));
                              setNoteUploadStatus(`✓ ${file.name} is ready for notes.`);
                              loadMaterials().then(mats => {
                                if (mats && mats.length > 0) {
                                  const found = mats.find(m => m.id === file.id || m.name.toLowerCase() === file.name.toLowerCase());
                                  if (found) setSelectedIndexedId(found.id);
                                }
                              });
                            }}
                            title="Click to mark ready immediately"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-warning-100 text-warning-700 ring-1 ring-warning-200 hover:bg-warning-200 transition-colors cursor-pointer"
                          >
                            <LoaderCircle className="h-3 w-3 animate-spin" />
                            Processing… (Click if Ready)
                          </button>
                        ) : file.status === 'ready' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-success-100 text-success-700 ring-1 ring-success-200">
                            <CheckCircle2 className="h-3 w-3" />
                            Ready
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-error-100 text-error-700 ring-1 ring-error-200">
                            <XCircle className="h-3 w-3" />
                            Indexing failed
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setUploadedNoteFiles(prev => prev.filter((_, index) => index !== idx));
                          }}
                          className="p-1 rounded text-neutral-400 hover:text-error-600 hover:bg-error-50 transition-colors cursor-pointer"
                          title="Remove file"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {file.status === 'failed' && (
                        <div className="flex items-center justify-between gap-2 px-1 text-xs text-error-600">
                          <span>Indexing failed for "{file.name}".</span>
                          <button
                            type="button"
                            className="text-xs font-semibold underline cursor-pointer"
                            onClick={() => {
                              setUploadedNoteFiles(prev => prev.filter((_, index) => index !== idx));
                              noteFileInputRef.current?.click();
                            }}
                          >
                            Retry
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {noteUploadStatus && (
                <p className={`text-xs font-medium ${
                  noteUploadStatus.includes('indexed successfully') ? 'text-success-600' :
                  noteUploadStatus.includes('Indexing in progress') ? 'text-warning-600' :
                  noteUploadStatus.includes('Indexing failed') ? 'text-error-600' :
                  noteUploadStatus.includes('✓') ? 'text-success-600' : 'text-neutral-500'
                }`}>
                  {noteUploadStatus}
                </p>
              )}
            </div>

              {/* Generate Notes Button */}
              <div className="space-y-2 pt-2">
                <Button
                  icon={isGeneratingNote ? LoaderCircle : Sparkles}
                  className="w-full h-11 text-sm font-semibold rounded-xl bg-primary-600 hover:bg-primary-700 text-white shadow-sm disabled:opacity-60 cursor-pointer"
                  disabled={
                    isGeneratingNote ||
                    !noteTopic.trim()
                  }
                  onClick={handleGenerateNotes}
                >
                  {isGeneratingNote
                    ? (type === 'formulas' ? `Generating Formula Sheet… (${noteGenElapsed}s)` : `Generating Smart Notes… (${noteGenElapsed}s)`)
                    : (type === 'formulas' ? 'Generate Formula Sheet' : 'Generate Smart Notes')}
                </Button>

                {notesError && <p className="text-xs text-error-600">{notesError}</p>}
              </div>

          </div>
        </div>

        {/* ──────────────── Right Section (lg:col-span-7): Notes Generator i.e. Chapter Summary Viewer ──────────────── */}
        <div className="lg:col-span-7">
          {activeNote ? (
            <Card className="flex flex-col border border-neutral-200/90 shadow-sm bg-white overflow-hidden rounded-3xl">
              {/* Top Executive Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 border-b border-neutral-200/80 bg-neutral-50/50">
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary-100 text-primary-800 border border-primary-200/80 shadow-2xs">
                    {type === 'formulas' || activeNote.type === 'formulas' ? <Zap className="h-3 w-3 text-amber-500" /> : <Sparkles className="h-3 w-3 text-primary-600" />}
                    {(type === 'formulas' || activeNote.type === 'formulas') ? 'Formula Sheet' : (noteTypes.find(nt => nt.id === (activeNote.type || type))?.label || 'Notes')}
                  </span>

                  {activeNote.chapter && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-neutral-200/70 text-neutral-800">
                      Topic: {activeNote.chapter}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Copy Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={copiedNote ? Check : Copy}
                    onClick={async () => {
                      if (!activeNote?.content) return;
                      try {
                        if (navigator?.clipboard?.writeText) {
                          await navigator.clipboard.writeText(activeNote.content);
                        } else {
                          const textArea = document.createElement('textarea');
                          textArea.value = activeNote.content;
                          textArea.style.position = 'fixed';
                          textArea.style.opacity = '0';
                          document.body.appendChild(textArea);
                          textArea.focus();
                          textArea.select();
                          document.execCommand('copy');
                          document.body.removeChild(textArea);
                        }
                        setCopiedNote(true);
                        pushToast('Note content copied to clipboard!', 'success');
                        setTimeout(() => setCopiedNote(false), 2000);
                      } catch {
                        try {
                          const textArea = document.createElement('textarea');
                          textArea.value = activeNote.content;
                          textArea.style.position = 'fixed';
                          textArea.style.opacity = '0';
                          document.body.appendChild(textArea);
                          textArea.focus();
                          textArea.select();
                          document.execCommand('copy');
                          document.body.removeChild(textArea);
                          setCopiedNote(true);
                          pushToast('Note content copied to clipboard!', 'success');
                          setTimeout(() => setCopiedNote(false), 2000);
                        } catch {
                          pushToast('Failed to copy note. Please copy manually.', 'error');
                        }
                      }
                    }}
                    title="Copy full note"
                    className={copiedNote ? 'text-emerald-700 bg-emerald-50' : ''}
                  >
                    {copiedNote ? 'Copied' : 'Copy'}
                  </Button>

                  {/* Print Button: Prints ONLY the generated notes */}
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={Printer}
                    onClick={() => {
                      if (!activeNote) return;
                      const noteElement = document.getElementById('printable-note-content');
                      const noteHtml = noteElement ? noteElement.innerHTML : (activeNote.content || '').replace(/\n/g, '<br/>');

                      const iframe = document.createElement('iframe');
                      iframe.style.position = 'fixed';
                      iframe.style.right = '0';
                      iframe.style.bottom = '0';
                      iframe.style.width = '0';
                      iframe.style.height = '0';
                      iframe.style.border = '0';
                      document.body.appendChild(iframe);

                      const iframeDoc = iframe.contentWindow?.document;
                      if (!iframeDoc) return;

                      iframeDoc.open();
                      iframeDoc.write(`
                        <!DOCTYPE html>
                        <html>
                          <head>
                            <title>${activeNote.title || 'Generated Notes'} - EduRAG AI</title>
                            <meta charset="utf-8" />
                            <style>
                              @page {
                                size: A4 portrait;
                                margin: 18mm 16mm;
                              }
                              * { box-sizing: border-box; }
                              body {
                                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                                color: #1e293b;
                                line-height: 1.6;
                                margin: 0;
                                padding: 24px;
                                background: #ffffff;
                                -webkit-print-color-adjust: exact;
                                print-color-adjust: exact;
                              }
                              .header-meta {
                                margin-bottom: 24px;
                                padding-bottom: 16px;
                                border-bottom: 2px solid #e2e8f0;
                              }
                              .badge {
                                display: inline-block;
                                padding: 4px 12px;
                                background: #e0f2fe;
                                color: #0369a1;
                                border-radius: 9999px;
                                font-size: 11px;
                                font-weight: 700;
                                text-transform: uppercase;
                                letter-spacing: 0.05em;
                                margin-bottom: 10px;
                              }
                              h1 {
                                font-size: 24px;
                                color: #0f172a;
                                margin: 0 0 8px 0;
                                font-weight: 800;
                              }
                              .meta-info {
                                font-size: 13px;
                                color: #64748b;
                                margin: 4px 0;
                              }
                              h2 {
                                font-size: 18px;
                                color: #1e3a8a;
                                margin-top: 24px;
                                margin-bottom: 10px;
                                border-bottom: 1px solid #e2e8f0;
                                padding-bottom: 4px;
                              }
                              h3 {
                                font-size: 15px;
                                color: #334155;
                                margin-top: 16px;
                                margin-bottom: 6px;
                              }
                              p { margin: 8px 0; }
                              table {
                                width: 100%;
                                border-collapse: collapse;
                                margin: 16px 0;
                              }
                              th, td {
                                border: 1px solid #cbd5e1;
                                padding: 8px 12px;
                                text-align: left;
                                font-size: 13px;
                              }
                              th {
                                background-color: #f8fafc;
                                font-weight: 600;
                                color: #0f172a;
                              }
                              code {
                                font-family: Consolas, monospace;
                                background: #f1f5f9;
                                padding: 2px 5px;
                                border-radius: 4px;
                                font-size: 12px;
                              }
                              pre {
                                background: #f8fafc;
                                border: 1px solid #e2e8f0;
                                padding: 12px;
                                border-radius: 6px;
                                overflow-x: auto;
                              }
                              .footer {
                                margin-top: 40px;
                                padding-top: 12px;
                                border-top: 1px solid #e2e8f0;
                                font-size: 11px;
                                color: #94a3b8;
                                display: flex;
                                justify-content: space-between;
                              }
                              @media print {
                                body { padding: 0; }
                              }
                            </style>
                          </head>
                          <body>
                            <div class="header-meta">
                              <span class="badge">${activeNote.type === 'formulas' ? 'Formula Sheet' : 'Smart Notes'}</span>
                              <h1>${activeNote.title || 'Generated Notes'}</h1>
                              ${activeNote.chapter ? `<div class="meta-info"><strong>Topic / Chapter:</strong> ${activeNote.chapter}</div>` : ''}
                              ${activeNote.course ? `<div class="meta-info"><strong>Course:</strong> ${activeNote.course}</div>` : ''}
                              <div class="meta-info" style="font-size: 11px; color: #94a3b8;">
                                Generated by EduRAG AI Study System &bull; ${new Date().toLocaleDateString()}
                              </div>
                            </div>
                            <div class="note-body">
                              ${noteHtml}
                            </div>
                            <div class="footer">
                              <span>EduRAG AI Study System</span>
                              <span>Printed Notes Document</span>
                            </div>
                          </body>
                        </html>
                      `);
                      iframeDoc.close();

                      setTimeout(() => {
                        iframe.contentWindow?.focus();
                        iframe.contentWindow?.print();
                        setTimeout(() => {
                          if (document.body.contains(iframe)) {
                            document.body.removeChild(iframe);
                          }
                        }, 2500);
                      }, 400);
                    }}
                    title="Print generated notes only"
                  >
                    Print
                  </Button>

                  {/* Export Button: Asks student which format (.pdf, .docx, .pptx, .txt, .md) */}
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={Download}
                    onClick={() => setShowExportModal(true)}
                    title="Export in .pdf, .docx, .pptx, .txt, .md"
                  >
                    Export
                  </Button>

                  {/* Delete Button: Asks confirmation and deletes properly */}
                  {activeNote && (
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={Trash2}
                      onClick={() => {
                        setNoteToDelete(activeNote);
                        setShowDeleteNoteConfirm(true);
                      }}
                      title="Delete note"
                      className="text-error-600 hover:text-error-700 hover:bg-error-50 cursor-pointer"
                    >
                      Delete
                    </Button>
                  )}

                  {/* Close Button: Returns right side to blank state */}
                  {activeNote && (
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={X}
                      onClick={() => {
                        setActiveNote(null);
                        setGenerated(false);
                      }}
                      title="Close note view"
                      className="text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 cursor-pointer"
                    >
                      Close
                    </Button>
                  )}
                </div>
              </div>

              {/* Note Content View Area: Clean structured viewer with printable ID */}
              <div id="printable-note-content" className="p-6 md:p-8 flex-1 overflow-y-auto max-h-[820px]">
                <SmartNoteRenderer
                  content={activeNote.content}
                  title={activeNote.title}
                  type={type === 'formulas' ? 'formulas' : (activeNote.type || type)}
                  topic={activeNote.chapter}
                  course={activeNote.course}
                />
              </div>
            </Card>
          ) : (
            <Card className="flex flex-col items-center justify-center p-12 border border-neutral-200/90 shadow-sm bg-white rounded-3xl text-center min-h-[480px]">
              <div className={`h-16 w-16 rounded-2xl flex items-center justify-center mb-4 ${
                type === 'formulas' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
              }`}>
                {type === 'formulas' ? <Zap className="h-8 w-8" /> : <StickyNote className="h-8 w-8" />}
              </div>
              <h3 className="text-lg font-bold font-display text-neutral-900 mb-1">
                {type === 'formulas' ? 'Formula Sheet Generator' : 'Generated Notes'}
              </h3>
              <p className="text-sm text-neutral-500 max-w-sm mb-6 leading-relaxed">
                {type === 'formulas'
                  ? 'Add your course document on the left to extract and generate clean structured formula cards with step-by-step worked examples.'
                  : "Add a file or topic on the left to generate your complete chapter summary notes, or select a note from Recently Generated Notes below."}
              </p>
              <Button
                icon={type === 'formulas' ? Zap : Sparkles}
                onClick={handleGenerateNotes}
                disabled={
                  isGeneratingNote ||
                  (!noteTopic.trim() &&
                    uploadedNoteFiles.length === 0 &&
                    (!selectedIndexedId || (selectedIndexedId === 'all' && indexedMaterials.length === 0)) &&
                    !selectedPrompt)
                }
              >
                {type === 'formulas' ? 'Generate Formula Sheet' : 'Generate Smart Notes'}
              </Button>
            </Card>
          )}
        </div>

      </div>

      {/* Recently generated notes */}
      {notesLoading ? (
        <Card><CardBody><p className="text-sm text-neutral-400 text-center py-6">Loading saved notes...</p></CardBody></Card>
      ) : notes.length > 0 && (
        <Card>
          <CardHeader
            title="Recently Generated Notes"
            subtitle={`${notes.length} note${notes.length === 1 ? '' : 's'} available`}
            icon={StickyNote}
            action={
              <Button
                variant="outline"
                size="sm"
                icon={Trash2}
                onClick={() => setShowDeleteAllConfirm(true)}
                className="text-error-600 border-error-200 hover:bg-error-50 hover:border-error-300 transition-colors shadow-2xs font-semibold"
                title="Delete all recently generated notes"
              >
                Delete All
              </Button>
            }
          />

          <CardBody>
            <div className="space-y-2">
              {sortedRecentNotes.map((note: any) => (
                <div
                  key={note.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-neutral-200 hover:bg-neutral-50 transition-colors"
                >
                  <div className="grid place-items-center h-10 w-10 rounded-lg bg-primary-100 text-primary-600">
                    <FileText className="h-5 w-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900 truncate">
                      {note.title}
                    </p>

                    <p className="text-xs text-neutral-500 flex items-center gap-1.5 flex-wrap">
                      <span>{note.course}</span>
                      <span>·</span>
                      <span>{note.chapter}</span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1 text-neutral-600 font-medium">
                        <Clock className="h-3 w-3 text-neutral-400" />
                        {formatNoteDateTime(note.createdAt)}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      title="Delete note"
                      onClick={(e) => {
                        e.stopPropagation();
                        setNoteToDelete(note);
                        setShowDeleteNoteConfirm(true);
                      }}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-error-600 hover:bg-error-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>

                    <Button
                      variant="ghost"
                      size="sm"
                      icon={Download}
                      onClick={() => {
                        setActiveNote(note);
                        setGenerated(true);
                      }}
                    >
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Export Format Selection Modal */}
      {showExportModal && activeNote && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }}
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop: Dims background */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
            onClick={() => setShowExportModal(false)}
          />

          {/* Modal Container: Compact, perfectly centered horizontally + vertically */}
          <div
            className="relative bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-[440px] border border-neutral-200/90 flex flex-col max-h-[min(88vh,560px)] overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Header - Fixed at Top */}
            <div className="flex items-center justify-between px-5 py-3.5 sm:py-4 border-b border-neutral-100 bg-white shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
                  <Download className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-neutral-900 font-display leading-tight truncate">Export Note</h3>
                  <p className="text-[11px] sm:text-xs text-neutral-500 truncate">Choose the format to download your generated note</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="h-8 w-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer shrink-0 ml-2"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body - Only this content scrolls */}
            <div className="px-5 py-3.5 sm:py-4 overflow-y-auto flex-1 overscroll-contain space-y-2.5">
              {/* Note info banner */}
              <div className="p-2.5 sm:p-3 bg-neutral-50 rounded-xl border border-neutral-200/80 flex items-center justify-between gap-2">
                <div className="min-w-0 pr-2">
                  <div className="text-xs font-semibold text-neutral-800 truncate">{activeNote.title}</div>
                  {activeNote.chapter && (
                    <div className="text-[11px] text-neutral-500 truncate">Topic: {activeNote.chapter}</div>
                  )}
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-100 text-primary-800 shrink-0 uppercase tracking-wide">
                  {activeNote.type === 'formulas' ? 'Formulas' : 'Notes'}
                </span>
              </div>

              {/* Format selection cards */}
              <div className="space-y-2">
                {/* PDF */}
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={() => handleExportNote('pdf')}
                  className="w-full flex items-center gap-3 p-2.5 sm:p-3 rounded-xl border border-neutral-200 bg-white hover:border-rose-400 hover:bg-rose-50/40 hover:shadow-xs transition-all text-left cursor-pointer group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="h-9 w-9 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-105 transition-transform">
                    {isExporting && exportingFormat === 'pdf' ? '...' : 'PDF'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs sm:text-sm font-semibold text-neutral-900 group-hover:text-rose-900 flex items-center gap-1.5">
                      <span>PDF Document</span>
                      <span className="text-[10px] font-normal text-neutral-400">(.pdf)</span>
                      {isExporting && exportingFormat === 'pdf' && (
                        <span className="text-[10px] font-medium text-rose-600 animate-pulse ml-auto">Validating & Exporting...</span>
                      )}
                    </div>
                    <div className="text-[11px] text-neutral-500 truncate">
                      Vector-rendered PDF document verified for Adobe Acrobat Reader
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-neutral-400 group-hover:text-rose-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>

                {/* DOCX */}
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={() => handleExportNote('docx')}
                  className="w-full flex items-center gap-3 p-2.5 sm:p-3 rounded-xl border border-neutral-200 bg-white hover:border-blue-400 hover:bg-blue-50/40 hover:shadow-xs transition-all text-left cursor-pointer group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="h-9 w-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-105 transition-transform">
                    {isExporting && exportingFormat === 'docx' ? '...' : 'DOCX'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs sm:text-sm font-semibold text-neutral-900 group-hover:text-blue-900 flex items-center gap-1.5">
                      <span>Microsoft Word</span>
                      <span className="text-[10px] font-normal text-neutral-400">(.docx)</span>
                      {isExporting && exportingFormat === 'docx' && (
                        <span className="text-[10px] font-medium text-blue-600 animate-pulse ml-auto">Validating & Exporting...</span>
                      )}
                    </div>
                    <div className="text-[11px] text-neutral-500 truncate">
                      Native OpenXML Word document with styled cards and formulas
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-neutral-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>

                {/* PPTX */}
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={() => handleExportNote('pptx')}
                  className="w-full flex items-center gap-3 p-2.5 sm:p-3 rounded-xl border border-neutral-200 bg-white hover:border-amber-400 hover:bg-amber-50/40 hover:shadow-xs transition-all text-left cursor-pointer group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="h-9 w-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-105 transition-transform">
                    {isExporting && exportingFormat === 'pptx' ? '...' : 'PPTX'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs sm:text-sm font-semibold text-neutral-900 group-hover:text-amber-900 flex items-center gap-1.5">
                      <span>PowerPoint Slides</span>
                      <span className="text-[10px] font-normal text-neutral-400">(.pptx)</span>
                      {isExporting && exportingFormat === 'pptx' && (
                        <span className="text-[10px] font-medium text-amber-600 animate-pulse ml-auto">Validating & Exporting...</span>
                      )}
                    </div>
                    <div className="text-[11px] text-neutral-500 truncate">
                      Native OpenXML presentation slides formatted for classroom decks
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-neutral-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>

                {/* TXT */}
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={() => handleExportNote('txt')}
                  className="w-full flex items-center gap-3 p-2.5 sm:p-3 rounded-xl border border-neutral-200 bg-white hover:border-emerald-400 hover:bg-emerald-50/40 hover:shadow-xs transition-all text-left cursor-pointer group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="h-9 w-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-105 transition-transform">
                    {isExporting && exportingFormat === 'txt' ? '...' : 'TXT'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs sm:text-sm font-semibold text-neutral-900 group-hover:text-emerald-900 flex items-center gap-1.5">
                      <span>Plain Text</span>
                      <span className="text-[10px] font-normal text-neutral-400">(.txt)</span>
                    </div>
                    <div className="text-[11px] text-neutral-500 truncate">
                      Direct download .txt clean plain text notes
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-neutral-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
              </div>
            </div>

            {/* Modal Footer - Fixed at Bottom */}
            <div className="px-5 py-3 border-t border-neutral-100 bg-neutral-50/50 flex items-center justify-end shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowExportModal(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Confirm Delete Single Note Dialog */}
      <ConfirmDialog
        open={showDeleteNoteConfirm}
        title="Delete Note?"
        description={`Are you sure you want to permanently delete "${(noteToDelete || activeNote)?.title || 'this note'}"? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="danger"
        loading={isDeletingNote}
        onConfirm={async () => {
          const target = noteToDelete || activeNote;
          if (!target) return;
          setIsDeletingNote(true);
          try {
            const deletedTitle = target.title;
            const deletedId = target.id;
            const ok = await deleteNote(deletedId);
            if (!ok) {
              setNotesError('The note could not be deleted from storage.');
              pushToast('The note could not be deleted.', 'error');
              return;
            }
            const remaining = notes.filter(item => item.id !== deletedId);
            setNotes(remaining);
            if (activeNote?.id === deletedId) {
              setActiveNote(remaining.length > 0 ? remaining[0] : null);
              setGenerated(remaining.length > 0);
            }
            setShowDeleteNoteConfirm(false);
            setNoteToDelete(null);
            pushToast(`Deleted note "${deletedTitle}".`, 'success');
          } catch (err) {
            console.error('Delete note error:', err);
            pushToast('Failed to delete note. Please try again.', 'error');
          } finally {
            setIsDeletingNote(false);
          }
        }}
        onCancel={() => {
          setShowDeleteNoteConfirm(false);
          setNoteToDelete(null);
        }}
      />

      {/* Confirm Delete All Dialog */}
      <ConfirmDialog
        open={showDeleteAllConfirm}
        title="Delete All Notes?"
        description={`Are you sure you want to permanently delete all ${notes.length} recently generated notes? This action cannot be undone.`}
        confirmLabel="Delete All"
        confirmVariant="danger"
        loading={isDeletingAll}
        onConfirm={handleDeleteAllNotes}
        onCancel={() => setShowDeleteAllConfirm(false)}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
