import { useState, useRef, useEffect, useCallback, type MouseEvent } from 'react';
import {
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
  X,
  LoaderCircle,
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
  type ToastData,
} from '@/components/ui';

import { cn } from '@/lib/utils';

import { ChatHistorySidebar } from '@/components/ChatHistorySidebar';

import {
  loadConversations,
  saveConversation,
  generateConversationTitle,
  getCurrentUserId,
  type ChatConversation,
} from '@/lib/chatHistory';

import {
  studentCourses,
  documents,
  quizzes,
  assignments,
  chatHistory,
  suggestedQuestions,
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
  sendChatMessage,
} from '@/lib/dataService';

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
              {student.program} Â· Semester {student.semester}
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
                      {doc.course} Â· {doc.size}
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
                {course.code} Â· {course.category}
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
                            {doc.pages} pages Â· {doc.size} Â·{' '}
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
        description={`${coursesList.length} enrolled courses Â· Semester ${student.semester}`}
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
                        {course.code} Â· {course.credits}{' '}
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
                      {doc.course} Â· {doc.pages} pages Â·{' '}
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
   AI STUDY ASSISTANT â€” ChatGPT-style UI
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
  status: 'indexing' | 'ready';
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

export function StudentAIAssistant() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageText, setEditingMessageText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pushToast = useCallback((message: string, tone: ToastData['tone']) => {
    const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    setToasts(prev => [...prev, { id, message, tone }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

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

  const send = useCallback(
    async (text: string) => {
      const trimmedText = text.trim();
      if (!trimmedText) return;
      if (isThinking) return;

      const snapshotFiles = uploadedFiles;
      const userMsg: ChatMessage = {
        id: `u${Date.now()}`,
        role: 'user',
        content: trimmedText,
        timestamp: new Date().toISOString(),
        attachments: snapshotFiles.map(f => ({ id: f.id, name: f.name, status: f.status })),
      };

      const nextMessages = [...messages, userMsg];
      setMessages(nextMessages);
      setInput('');
      setUploadedFiles([]);
      setIsThinking(true);

      try {
        const token = window.localStorage.getItem('edurag-auth-token');
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
            selectedMaterialIds: snapshotFiles.map(file => file.id),
            responseMode: 'both',
            conversationId: activeConversationId,
          }),
        });
        const data = await response.json();
        if (!response.ok || !data.success || !data.answer) {
          throw new Error(data.error || 'The document search could not be completed.');
        }
        const aiMsg: ChatMessage = {
          id: `a${Date.now()}`,
          role: 'assistant',
          timestamp: new Date().toISOString(),
          content: data.answer,
          materialAnswer: typeof data.material_answer === 'string' ? data.material_answer : undefined,
          aiAnswer: typeof data.ai_answer === 'string' ? data.ai_answer : undefined,
          sources: Array.isArray(data.sources)
            ? data.sources.map((source: { doc: string; page: number }) => ({ ...source, excerpt: '' }))
            : [],
          sourceType: data.source_type === 'general' ? 'general' : 'document',
          attachments: snapshotFiles.map(f => ({ id: f.id, name: f.name, status: f.status })),
        };
        const updatedMessages = [...nextMessages, aiMsg];
        setMessages(updatedMessages);

        const title = generateConversationTitle(nextMessages);
        const convId = activeConversationId || `conv_${Date.now()}`;
        const conversation: ChatConversation = {
          conversationId: convId,
          userId: getCurrentUserId(),
          role: 'student',
          title,
          messages: updatedMessages,
          updatedAt: new Date().toISOString(),
        };

        saveConversation(conversation).then(() => {
          loadConversations().then(setConversations);
          setActiveConversationId(convId);
        });
      } catch (err) {
        setMessages(prev => [...prev, {
          id: `a${Date.now()}`,
          role: 'assistant',
          timestamp: new Date().toISOString(),
          content: err instanceof Error ? err.message : 'I could not search your uploaded documents. Please try again.',
          sources: [],
        }]);
      } finally {
        setIsThinking(false);
      }
    },
    [activeConversationId, isThinking, messages, uploadedFiles],
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
        list.length === 1 ? `Uploading "${list[0].name}"…` : `Uploading ${list.length} files…`,
        'warning',
      );

      const accepted: UploadedFile[] = [];
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
        const pendingFile: UploadedFile = {
          id: pendingId,
          name: file.name,
          size: file.size,
          type: file.type || ext,
          pages: 1,
          status: 'indexing',
        };
        setUploadedFiles(prev => [
          ...prev,
          pendingFile,
        ].slice(-MAX_FILES));

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
          const uploadedFile: UploadedFile = {
            id: data.material.id,
            name: data.material.name || file.name,
            size: file.size,
            type: file.type || ext,
            pages: Number(data.material.pages) || 1,
            status: data.material.status === 'ready' ? 'ready' : 'indexing',
          };
          accepted.push(uploadedFile);
          setUploadedFiles(prev => prev.map(item => item.id === pendingId ? uploadedFile : item));
        } catch (err) {
          setUploadedFiles(prev => prev.filter(item => item.id !== pendingId));
          pushToast(`Failed to upload "${file.name}". ${err instanceof Error ? err.message : ''}`, 'error');
        }
      }

      if (accepted.length === 0) {
        setIsUploading(false);
        return;
      }

      if (accepted.length === 1) {
        pushToast(`"${accepted[0].name}" attached successfully — indexing for RAG.`, 'success');
      } else {
        pushToast(`${accepted.length} files attached successfully — indexing for RAG.`, 'success');
      }
      const pendingIds = new Set(accepted.filter(file => file.status !== 'ready').map(file => file.id));
      let indexingComplete = true;
      if (pendingIds.size > 0) {
        let indexedIds = new Set<string>();
        for (let attempt = 0; attempt < 30 && indexedIds.size < pendingIds.size; attempt += 1) {
          await new Promise(resolve => window.setTimeout(resolve, 1000));
          try {
            const statusResponse = await fetch(
              `http://localhost:8000/api/materials?userId=${encodeURIComponent(getCurrentUserId())}&role=student`,
            );
            const materials = await statusResponse.json();
            if (!statusResponse.ok || !Array.isArray(materials)) break;
            indexedIds = new Set(
              materials
                .filter((material: { id?: string; status?: string }) =>
                  pendingIds.has(material.id ?? '') && material.status === 'ready',
                )
                .map((material: { id: string }) => material.id),
            );
            if (indexedIds.size > 0) {
              setUploadedFiles(prev => prev.map(file =>
                indexedIds.has(file.id) ? { ...file, status: 'ready' } : file,
              ));
            }
          } catch {
            break;
          }
        }

        if (indexedIds.size === pendingIds.size) {
          pushToast(
            accepted.length === 1
              ? `"${accepted[0].name}" indexed successfully and is ready for questions.`
              : `${accepted.length} files indexed successfully and are ready for questions.`,
            'success',
          );
        } else {
          indexingComplete = false;
          pushToast('The document was uploaded, but indexing is still in progress. Send is enabled when indexing completes.', 'warning');
        }
      }
      if (indexingComplete) {
        setIsUploading(false);
        textareaRef.current?.focus();
      }
    },
    [pushToast],
  );

  const removeUploadedFile = useCallback(
    (id: string) => {
      setUploadedFiles(prev => prev.filter(f => f.id !== id));
    },
    [],
  );

  const adjustTextareaHeight = useCallback(() => {
    const target = textareaRef.current;
    if (!target) return;
    target.style.height = 'auto';
    target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
  }, []);

  const userInitial = 'A';
  const docCount = uploadedFiles.length;
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
      });
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
    <div className="space-y-4">
      <SectionHeader
        title="AI Study Assistant"
        description="ChatGPT-style RAG chat â€” upload your documents and ask anything about them."
      />

      <div className="flex h-[calc(100vh-10rem)] rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm relative">
        {/* Sidebar */}
        {sidebarOpen && (
          <ChatHistorySidebar
            activeConversationId={activeConversationId}
            onSelectConversation={handleSelectConversation}
            onNewChat={handleNewChat}
            onClose={() => setSidebarOpen(false)}
            className="w-72 bg-neutral-50 dark:bg-neutral-950 shrink-0"
          />
        )}

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Navbar */}
          <div className="h-14 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between px-4 bg-white dark:bg-neutral-900 flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              {!sidebarOpen && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100 transition-colors"
                  title="Open sidebar"
                >
                  <PanelLeftOpen className="h-5 w-5" />
                </button>
              )}
              <div className="flex items-center gap-2 min-w-0">
                <div className="grid place-items-center h-8 w-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 text-white shrink-0">
                  <BotIcon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-display font-semibold text-sm text-neutral-900 dark:text-neutral-100 truncate">EduRAG Assistant</h2>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-success-500 animate-pulse" />
                    Online Â· {docCount} document{docCount === 1 ? '' : 's'} loaded
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setSourcesOpen(!sourcesOpen)}
                className={cn(
                  'grid h-9 w-9 shrink-0 place-items-center rounded-xl transition-colors',
                  sourcesOpen
                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                    : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100'
                )}
                title="Uploaded documents"
              >
                <FileText className="h-5 w-5" />
              </button>

              <button
                onClick={() => setSidebarOpen(v => !v)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100 transition-colors"
                title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
              >
                <PanelLeftClose className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Uploaded documents panel */}
          {sourcesOpen && (
            <div className="absolute right-4 top-[5.5rem] w-80 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-lg z-20 overflow-hidden animate-fade-in-up">
              <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                <div>
                  <p className="font-display font-semibold text-sm text-neutral-900 dark:text-neutral-100">Uploaded Documents</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">{docCount} loaded â€” used for RAG context</p>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs px-2.5 py-1.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors"
                >
                  + Add
                </button>
              </div>
              <div className="p-2 space-y-1 max-h-72 overflow-y-auto">
                {uploadedFiles.length === 0 && (
                  <div className="px-3 py-6 text-center text-xs text-neutral-500 dark:text-neutral-400">
                    No documents uploaded yet.
                  </div>
                )}
                {uploadedFiles.map(f => {
                  const kind = fileIconFor(f.name);
                  return (
                    <div
                      key={f.id}
                      className="flex items-center gap-2.5 p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60"
                    >
                      <span className={cn('grid place-items-center h-8 w-8 rounded-lg border text-xs font-bold uppercase shrink-0', fileBadgeClass[kind])}>
                        {kind === 'text' ? 'txt' : kind}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 truncate">{f.name}</p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          {formatBytes(f.size)} Â· ~{f.pages} pages Â· {f.status === 'ready' ? 'Ready for RAG' : 'Indexing'}
                        </p>
                      </div>
                      <button
                        onClick={() => removeUploadedFile(f.id)}
                        className="text-neutral-400 hover:text-error-600 dark:hover:text-error-400 transition-colors"
                        title="Remove"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5 bg-white dark:bg-neutral-900">
            {messages.length === 0 && !isThinking ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <div className="grid place-items-center h-16 w-16 rounded-2xl bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 mb-4 animate-floaty">
                  <BotIcon className="h-8 w-8" />
                </div>
                <h3 className="font-display font-semibold text-neutral-900 dark:text-neutral-100">How can I help you today?</h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 max-w-sm">
                  Upload a PDF / DOCX / PPTX / TXT file using the paperclip, then ask anything â€” answers are grounded in your documents with full source references.
                </p>

                <div className="mt-6 flex flex-wrap gap-2 justify-center">
                  {suggestedQuestions.map(q => (
                    <button
                      key={q}
                      onClick={() => {
                        setInput(q);
                        textareaRef.current?.focus();
                      }}
                      className="text-sm px-4 py-2 rounded-full border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
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
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-100 border border-neutral-200/60 dark:border-neutral-700/60'
                      )}
                    >
                      {/* Uploaded file cards inside the message */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mb-2 flex flex-wrap gap-2">
                          {msg.role === 'assistant' && (
                            <span className="text-[10px] uppercase tracking-wide font-semibold text-neutral-500 dark:text-neutral-400 self-center mr-1">
                              {msg.role === 'assistant' ? 'Used' : 'Attached'}:
                            </span>
                          )}
                          {msg.attachments.map(att => {
                            const kind = fileIconFor(att.name);
                            return (
                              <div
                                key={att.id}
                                className={cn(
                                  'aisa-message-file-card text-left cursor-pointer hover:opacity-90 transition-opacity',
                                  msg.role === 'user'
                                    ? 'bg-white/15 border-white/30 text-white'
                                    : fileBadgeClass[kind]
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
                                {att.status && (
                                  <span className={cn(
                                    'shrink-0 px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide',
                                    'bg-black/5 dark:bg-white/10'
                                  )}>
                                    {att.status === 'ready' ? 'Ready' : 'Indexing'}
                                  </span>
                                )}
                                {msg.role === 'assistant' && uploadedFiles.some(file => file.id === att.id) && (
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      removeUploadedFile(att.id);
                                    }}
                                    className={cn(
                                      'aisa-message-file-remove'
                                    )}
                                    title={`Remove ${att.name}`}
                                    aria-label={`Remove ${att.name}`}
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            );
                          })}
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
                            <div>{renderAnswerContent(msg.materialAnswer || 'No document-based answer was available for this question.')}</div>
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
                            <div>{renderAnswerContent(msg.aiAnswer || msg.content)}</div>
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
                {isThinking && (
                  <div className="flex gap-3 animate-fade-in">
                    <div className="grid place-items-center h-8 w-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-md shadow-primary-500/30">
                      <BotIcon className="h-4 w-4" />
                    </div>
                    <div className="bg-neutral-100 dark:bg-neutral-800 rounded-2xl px-4 py-3 flex items-center gap-1.5 border border-neutral-200 dark:border-neutral-700">
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

          {/* Suggested questions â€” populate input */}
          {messages.length <= 2 && !isThinking && messages.length > 0 && (
            <div className="px-4 pb-2 flex flex-wrap gap-2 bg-white dark:bg-neutral-900">
              {suggestedQuestions.map(q => (
                <button
                  key={q}
                  onClick={() => {
                    setInput(q);
                    textareaRef.current?.focus();
                  }}
                  className="text-xs px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Composer */}
          <div className="aisa-composer-wrap">
            {uploadedFiles.length > 0 && (
              <div className="aisa-attachment-preview" aria-live="polite" aria-label="Files attached to the next question">
                <p className="aisa-attachment-label">Attached to your next question</p>
                <div className="aisa-attachment-list">
                  {uploadedFiles.map(file => {
                    const kind = fileIconFor(file.name);
                    return (
                      <div key={file.id} className="aisa-attachment-card">
                        <span className={cn('aisa-attachment-icon', fileBadgeClass[kind])}>
                          {kind === 'pdf' ? <FileText className="h-4 w-4" /> : kind === 'text' ? 'TXT' : kind.toUpperCase()}
                        </span>
                        <span className="aisa-attachment-meta">
                          <span className="aisa-attachment-name">{file.name}</span>
                          <span className="aisa-attachment-size flex items-center gap-1">
                            {file.status === 'ready' ? (
                              <>
                                {formatBytes(file.size)} <span aria-hidden="true">·</span> Ready
                              </>
                            ) : (
                              <>
                                <LoaderCircle className="h-3 w-3 animate-spin text-primary-500" />
                                Indexing…
                              </>
                            )}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => removeUploadedFile(file.id)}
                          className="aisa-attachment-remove"
                          title={`Remove ${file.name}`}
                          aria-label={`Remove ${file.name}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

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
                placeholder="Ask anything from your documentsâ€¦"
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

export function StudentNotes() {
  const [generated, setGenerated] = useState(false);
  const [notes, setNotes] = useState<any[]>([]);
  const [activeNote, setActiveNote] = useState<any | null>(null);
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [isGeneratingNote, setIsGeneratingNote] = useState(false);
  const [notesLoading, setNotesLoading] = useState(true);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [noteTopic, setNoteTopic] = useState('');
  const [uploadedNoteFile, setUploadedNoteFile] = useState<{ id: string; name: string } | null>(null);
  const [noteUploadStatus, setNoteUploadStatus] = useState<string | null>(null);
  const [isUploadingNoteFile, setIsUploadingNoteFile] = useState(false);
  const noteFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetchNotes()
      .then(data => {
        if (!cancelled) {
          setNotes(data);
          if (data.length > 0) {
            setActiveNote(data[0]);
            setGenerated(true);
          }
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

  const noteContent: Record<
    typeof type,
    { title: string; body: string }
  > = {
    summary: {
      title:
        'Graph Traversal â€” Chapter Summary',

      body: `This chapter covers fundamental graph traversal techniques.

1. BFS (Breadth-First Search): Uses a queue and explores level by level. Optimal for unweighted shortest paths. Time: O(V+E), Space: O(V).

2. DFS (Depth-First Search): Uses stack/recursion and explores deeply before backtracking. Used for cycle detection, topological sorting, and finding connected components. Time: O(V+E), Space: O(V).

3. Dijkstra's Algorithm: Finds shortest paths in weighted graphs with non-negative weights using a greedy approach with a min-heap. Time: O((V+E) log V).

4. Minimum Spanning Trees: Kruskal's uses union-find and is edge-based, while Prim's is vertex-based and uses a priority queue.`,
    },

    keypoints: {
      title: 'Key Points â€” Graph Traversal',

      body: `â€¢ BFS uses a Queue; DFS uses a Stack or recursion
â€¢ BFS guarantees shortest path in unweighted graphs
â€¢ DFS is useful for topological sorting and cycle detection
â€¢ Dijkstra requires non-negative edge weights
â€¢ Kruskal's algorithm sorts edges and uses Union-Find
â€¢ Prim's algorithm grows the MST from a starting vertex
â€¢ BFS space complexity can be O(V)
â€¢ DFS space complexity can be O(V) in the worst case
â€¢ A* combines shortest-path search with heuristics
â€¢ Floyd-Warshall finds all-pairs shortest paths in O(VÂ³)`,
    },

    definitions: {
      title:
        'Important Definitions â€” Graph Traversal',

      body: `Graph: A data structure consisting of vertices (nodes) and edges connecting them.

Adjacent: Two vertices are adjacent if connected by an edge.

Degree: Number of edges incident to a vertex.

Path: A sequence of vertices connected by edges.

Cycle: A path that starts and ends at the same vertex.

Connected Graph: A graph where every pair of vertices is connected by a path.

Tree: A connected acyclic graph with exactly V-1 edges.

Spanning Tree: A subgraph that is a tree and includes all vertices.

Weighted Graph: A graph where each edge has an associated weight or cost.

Directed Graph: A graph where edges have direction.`,
    },

    formulas: {
      title:
        'Formula Sheet â€” Graph Algorithms',

      body: `BFS Time Complexity: O(V + E)
DFS Time Complexity: O(V + E)
Dijkstra (Min-Heap): O((V + E) log V)
Dijkstra (Array): O(VÂ²)
Bellman-Ford: O(V Ã— E)
Floyd-Warshall: O(VÂ³)
Kruskal's MST: O(E log E)
Prim's MST (Binary Heap): O(E log V)
Prim's MST (Array): O(VÂ²)

Number of edges in complete graph: n(n-1)/2
Number of edges in complete bipartite graph: m Ã— n
Handshaking Lemma: Î£ deg(v) = 2|E|

Maximum edges in a tree: V - 1
Minimum edges for connectivity: V - 1`,
    },
  };

  const handleNoteFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const allowedExtensions = ['pdf', 'pptx', 'docx', 'txt', 'md', 'csv'];
    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!allowedExtensions.includes(extension)) {
      setNoteUploadStatus('Upload a PDF, PPTX, DOCX, TXT, MD, or CSV file.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setNoteUploadStatus('This file is larger than 10 MB.');
      return;
    }

    setIsUploadingNoteFile(true);
    setNoteUploadStatus(`Uploading ${file.name}…`);
    try {
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
        throw new Error(data.error || 'The document could not be uploaded.');
      }
      setUploadedNoteFile({ id: data.material.id, name: data.material.name || file.name });
      setNoteUploadStatus('Uploaded and ready to generate notes.');
    } catch (error) {
      setUploadedNoteFile(null);
      setNoteUploadStatus(error instanceof Error ? error.message : 'The document could not be uploaded.');
    } finally {
      setIsUploadingNoteFile(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Notes Generator"
        description="Generate smart notes from your course materials using AI"
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Generate panel */}
        <Card className="lg:col-span-1">
          <CardHeader
            title="Generate Notes"
          subtitle="Choose a topic or upload a document"
            icon={Sparkles}
          />

          <CardBody className="space-y-4">
            <div>
              <label className="text-sm font-medium text-neutral-700 mb-2 block">
              Enter Topic or Chapter
              </label>
            <input
              type="text"
              value={noteTopic}
              onChange={event => setNoteTopic(event.target.value)}
              placeholder="e.g. Graph traversal, Chapter 4"
              className="w-full h-10 px-3 rounded-xl border border-neutral-200 bg-white text-sm outline-none focus:border-primary-400"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-neutral-700 mb-2 block">
              Upload File
            </label>
            <input
              ref={noteFileInputRef}
              type="file"
              onChange={handleNoteFileUpload}
              className="hidden"
              accept=".pdf,.pptx,.docx,.txt,.md,.csv,application/pdf,text/plain,text/markdown,text/csv"
            />
            <button
              type="button"
              onClick={() => noteFileInputRef.current?.click()}
              disabled={isUploadingNoteFile}
              className="w-full flex items-center gap-3 min-h-12 px-3 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 text-left hover:border-primary-400 hover:bg-primary-50 transition-colors disabled:opacity-60"
            >
              <span className="grid place-items-center h-8 w-8 rounded-lg bg-primary-100 text-primary-600">
                {isUploadingNoteFile ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-neutral-700 truncate">
                  {uploadedNoteFile?.name || 'Choose a study document'}
                </span>
                <span className="block text-xs text-neutral-500">
                  {isUploadingNoteFile ? 'Uploading and indexing…' : 'PDF, PPTX, DOCX, TXT, MD, or CSV'}
                </span>
              </span>
              {uploadedNoteFile && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={event => {
                    event.stopPropagation();
                    setUploadedNoteFile(null);
                    setNoteUploadStatus(null);
                  }}
                  onKeyDown={event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setUploadedNoteFile(null);
                      setNoteUploadStatus(null);
                    }
                  }}
                  className="grid place-items-center h-7 w-7 rounded-lg text-neutral-400 hover:bg-error-50 hover:text-error-600"
                  aria-label="Remove uploaded file"
                >
                  <X className="h-4 w-4" />
                </span>
              )}
            </button>
            {noteUploadStatus && (
              <p className="mt-1.5 text-xs text-neutral-500">{noteUploadStatus}</p>
            )}
          </div>

            <div>
              <label className="text-sm font-medium text-neutral-700 mb-2 block">
                Note Type
              </label>

              <div className="grid grid-cols-2 gap-2">
                {noteTypes.map(nt => {
                  const Icon = nt.icon;

                  return (
                    <button
                      key={nt.id}
                      type="button"
                      onClick={() =>
                        setType(nt.id)
                      }
                      className={cn(
                        'flex flex-col items-center gap-2 p-3 rounded-xl border text-xs font-medium transition-all',
                        type === nt.id
                          ? toneStyles[nt.tone]
                          : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      {nt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <Button
              icon={Sparkles}
              className="w-full"
              disabled={isGeneratingNote || (!noteTopic.trim() && !uploadedNoteFile)}
              onClick={async () => {
                setIsGeneratingNote(true);
                setNotesError(null);
                try {
                  const label = noteTypes.find(item => item.id === type)?.label || 'Smart Notes';
                  const response = await sendChatMessage({
                    question: `Create ${label} for ${noteTopic || uploadedNoteFile?.name || 'the uploaded study material'}. Return only the note content, with clear headings and bullet points.`,
                    topic: noteTopic || uploadedNoteFile?.name || label,
                    difficulty: 'Medium',
                    context: uploadedNoteFile ? `Use uploaded document ${uploadedNoteFile.name} as source material.` : '',
                    selectedMaterialIds: uploadedNoteFile ? [uploadedNoteFile.id] : [],
                    responseMode: 'ai',
                  });
                  const note = {
                    id: `note_${Date.now()}`,
                    title: `${label} — ${noteTopic || uploadedNoteFile?.name || 'Study Material'}`,
                    type,
                    course: 'Student Study Material',
                    chapter: noteTopic || uploadedNoteFile?.name || 'General',
                    content: response.ai_answer || response.answer,
                    createdAt: new Date().toISOString(),
                    userId: getCurrentUserId(),
                  };
                  if (!await createNote(note)) throw new Error('The note could not be saved.');
                  setNotes(current => [note, ...current]);
                  setActiveNote(note);
                  setNoteDraft(note.content);
                  setGenerated(true);
                } catch (error) {
                  setNotesError(error instanceof Error ? error.message : 'Unable to generate notes.');
                } finally {
                  setIsGeneratingNote(false);
                }
              }}
            >
              {isGeneratingNote ? 'Generating…' : 'Generate Smart Notes'}
            </Button>
            {notesError && <p className="text-xs text-error-600">{notesError}</p>}
          </CardBody>
        </Card>

        {/* Generated notes */}
        <div className="lg:col-span-2">
          {!generated ? (
            <Card className="h-full">
              <CardBody>
                <EmptyState
                  icon={StickyNote}
                  title="No notes generated yet"
                  description="Select a course, document, and note type, then click Generate to create AI-powered study notes."
                />
              </CardBody>
            </Card>
          ) : (
            <Card className="h-full flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
                <div className="flex items-center gap-2">
                  <Badge tone="primary">
                    <Sparkles className="h-3 w-3" />
                    AI Generated
                  </Badge>

                  <span className="text-xs text-neutral-400">
                    Just now
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={Download}
                    onClick={() => {
                      if (!activeNote) return;
                      const blob = new Blob([activeNote.content], { type: 'text/plain;charset=utf-8' });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `${activeNote.title.replace(/[^a-z0-9]+/gi, '_')}.txt`;
                      link.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    Export
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    icon={BookmarkIcon}
                    onClick={() => {
                      if (activeNote) {
                        setEditingNote(true);
                        setNoteDraft(activeNote.content);
                      }
                    }}
                  >
                    Edit
                  </Button>
                  {editingNote && (
                    <Button
                      size="sm"
                      onClick={async () => {
                        if (!activeNote) return;
                        const updated = { ...activeNote, content: noteDraft, updatedAt: new Date().toISOString() };
                        if (!await updateNote(updated)) {
                          setNotesError('The note could not be updated.');
                          return;
                        }
                        setActiveNote(updated);
                        setNotes(current => current.map(item => item.id === updated.id ? updated : item));
                        setEditingNote(false);
                      }}
                    >
                      Save
                    </Button>
                  )}
                  {activeNote && (
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={Trash2}
                      onClick={async () => {
                        if (!await deleteNote(activeNote.id)) {
                          setNotesError('The note could not be deleted.');
                          return;
                        }
                        const remaining = notes.filter(item => item.id !== activeNote.id);
                        setNotes(remaining);
                        setActiveNote(remaining[0] || null);
                        setGenerated(remaining.length > 0);
                      }}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </div>

              <div className="p-6 flex-1 overflow-y-auto">
                <h2 className="text-xl font-bold font-display text-neutral-900 mb-4">
                  {activeNote?.title || noteContent[type].title}
                </h2>

                <div className="prose prose-sm max-w-none">
                  {editingNote ? (
                    <textarea
                      value={noteDraft}
                      onChange={event => setNoteDraft(event.target.value)}
                      className="w-full min-h-80 rounded-xl border border-neutral-200 p-4 text-sm text-neutral-700 outline-none focus:border-primary-400"
                    />
                  ) : (
                    <pre className="whitespace-pre-wrap font-sans text-sm text-neutral-700 leading-relaxed">
                      {activeNote?.content || noteContent[type].body}
                    </pre>
                  )}
                </div>
              </div>
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
            icon={StickyNote}
          />

          <CardBody>
            <div className="space-y-2">
              {notes.map(note => (
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

                    <p className="text-xs text-neutral-500">
                      {note.course} Â· {note.chapter} Â·{' '}
                      {note.createdAt}
                    </p>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    icon={Download}
                    onClick={() => {
                      setActiveNote(note);
                      setGenerated(true);
                      setNoteDraft(note.content);
                    }}
                  >
                    View
                  </Button>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
