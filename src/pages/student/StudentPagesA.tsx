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
  Quote,
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

type UploadedFile = {
  id: string;
  name: string;
  size: number;
  type: string;
  /** Plain-text content extracted from the file (best-effort). */
  text: string;
  /** Total page count (best-effort estimate). */
  pages: number;
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

/**
 * Best-effort plain-text extraction. Works natively for text-like files.
 * For PDF / DOCX / PPTX we read a small slice of the binary and pull any
 * printable ASCII runs out so the assistant still has *something* to quote.
 */
async function readFileText(file: File): Promise<{ text: string; pages: number }> {
  const ext = getExt(file.name);

  if (ext === 'txt' || ext === 'md' || ext === 'csv') {
    const text = await file.text();
    return { text, pages: Math.max(1, Math.round(text.length / 1800)) };
  }

  // Best-effort for binary formats: read first 256 KB, extract printable runs.
  const slice = file.slice(0, Math.min(file.size, 256 * 1024));
  const buffer = await slice.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let ascii = '';
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    const c = b >= 32 && b < 127 ? String.fromCharCode(b) : ' ';
    ascii += c;
  }
  const cleaned = ascii
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s{3,}/g, '\n')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 24)
    .join('\n')
    .slice(0, 4000);

  const pages = Math.max(1, Math.round(file.size / 60000));
  return {
    text: cleaned || `${file.name} (${formatBytes(file.size)}) â€” uploaded for context.`,
    pages,
  };
}

/** Find a relevant snippet of `text` that best matches `query`. */
function pickExcerpt(text: string, query: string): string {
  if (!text) return '';
  const q = (query || '').toLowerCase().trim();
  if (!q) {
    return text.slice(0, 220) + (text.length > 220 ? 'â€¦' : '');
  }
  const terms = q.split(/\s+/).filter(t => t.length > 2);
  if (terms.length === 0) return text.slice(0, 220) + (text.length > 220 ? 'â€¦' : '');

  const lower = text.toLowerCase();
  let bestIdx = -1;
  let bestScore = 0;
  for (const t of terms) {
    const idx = lower.indexOf(t);
    if (idx !== -1 && idx > bestScore) {
      bestScore = idx;
      bestIdx = idx;
    }
  }
  if (bestIdx === -1) return text.slice(0, 220) + (text.length > 220 ? 'â€¦' : '');

  const start = Math.max(0, bestIdx - 80);
  const end = Math.min(text.length, bestIdx + 240);
  return (start > 0 ? 'â€¦' : '') + text.slice(start, end) + (end < text.length ? 'â€¦' : '');
}

/** Estimate a page number for an excerpt within `text`. */
function estimatePage(text: string, excerptStart: number, totalPages: number): number {
  const ratio = Math.min(1, Math.max(0, excerptStart / Math.max(1, text.length)));
  return Math.max(1, Math.min(totalPages, Math.round(ratio * totalPages) + 1));
}

export function StudentAIAssistant() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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

  /**
   * Generate an AI answer grounded in the user's uploaded documents.
   * Uses dynamic retrieval: for each uploaded file, find the most relevant
   * excerpt and produce a `Source` entry with the correct page number.
   */
  const generateGroundedAnswer = useCallback(
    (query: string, files: UploadedFile[]): { content: string; sources: NonNullable<ChatMessage['sources']> } => {
      const sources: NonNullable<ChatMessage['sources']> = [];

      if (files.length === 0) {
        return {
          content:
            "I don't see any uploaded documents yet. Use the ðŸ“Ž paperclip in the composer to upload a PDF, DOCX, PPTX, TXT, MD, or CSV file and I'll answer directly from its content.",
          sources: [],
        };
      }

      const matchPerFile: { file: UploadedFile; excerpt: string; page: number; score: number }[] = [];

      for (const f of files) {
        const excerpt = pickExcerpt(f.text, query);
        const lower = f.text.toLowerCase();
        const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
        const score = terms.reduce((s, t) => s + (lower.includes(t) ? 1 : 0), 0);
        const page = estimatePage(f.text, lower.indexOf(terms[0] ?? '') || 0, f.pages);
        matchPerFile.push({ file: f, excerpt, page, score });
        sources.push({
          doc: f.name,
          page,
          excerpt: excerpt.slice(0, 160) + (excerpt.length > 160 ? 'â€¦' : ''),
        });
      }

      matchPerFile.sort((a, b) => b.score - a.score);
      const top = matchPerFile[0];

      if (!top || top.excerpt.length < 30) {
        return {
          content: `I reviewed ${files.length} uploaded document${files.length > 1 ? 's' : ''} but couldn't find a passage that directly answers **"${query}"**. Try rephrasing, or upload more relevant material.\n\n**Uploaded:**\n${files.map(f => `â€¢ ${f.name} (${formatBytes(f.size)}, ~${f.pages} pages)`).join('\n')}`,
          sources,
        };
      }

      const intro =
        files.length === 1
          ? `Based on **${top.file.name}**, here's what I found:`
          : `Based on ${files.length} uploaded documents, the strongest match comes from **${top.file.name}**:`;

      const content =
        `${intro}\n\n` +
        `> ${top.excerpt.split('\n').join('\n> ')}\n\n` +
        `**Summary:** ${top.excerpt.replace(/\s+/g, ' ').slice(0, 320)}${top.excerpt.length > 320 ? 'â€¦' : ''}\n\n` +
        `I also considered: ${files
          .filter(f => f.id !== top.file.id)
          .map(f => `\`${f.name}\` (p.${estimatePage(f.text, 0, f.pages)})`)
          .join(', ') || 'no other documents'}.`;

      return { content, sources };
    },
    [],
  );

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
        attachments: snapshotFiles.map(f => ({ id: f.id, name: f.name })),
      };

      const nextMessages = [...messages, userMsg];
      setMessages(nextMessages);
      setInput('');
      setIsThinking(true);

      setTimeout(() => {
        const { content, sources } = generateGroundedAnswer(trimmedText, snapshotFiles);
        const aiMsg: ChatMessage = {
          id: `a${Date.now()}`,
          role: 'assistant',
          timestamp: new Date().toISOString(),
          content,
          sources,
        };
        const updatedMessages = [...nextMessages, aiMsg];
        setMessages(updatedMessages);
        setIsThinking(false);

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
      }, 1200);
    },
    [activeConversationId, generateGroundedAnswer, isThinking, messages, uploadedFiles],
  );

  const handleNewChat = useCallback(() => {
    setActiveConversationId(null);
    setMessages([]);
    setInput('');
    setIsThinking(false);
  }, []);

  const handleSelectConversation = useCallback((conversation: ChatConversation) => {
    setActiveConversationId(conversation.conversationId);
    setMessages(conversation.messages);
  }, []);

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      e.target.value = '';

      const list = Array.from(files);
      setIsUploading(true);

      const accepted: UploadedFile[] = [];
      for (const file of list) {
        const ext = getExt(file.name);
        if (!ACCEPTED_EXT.includes(ext)) {
          pushToast(`"${file.name}" â€” unsupported file type. Use PDF, PPTX, DOCX, TXT, MD, or CSV.`, 'error');
          continue;
        }
        if (file.size > MAX_FILE_SIZE) {
          pushToast(`"${file.name}" is larger than 10 MB. Please choose a smaller file.`, 'error');
          continue;
        }
        try {
          const { text, pages } = await readFileText(file);
          accepted.push({
            id: `file_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
            name: file.name,
            size: file.size,
            type: file.type || ext,
            text,
            pages,
          });
        } catch (err) {
          pushToast(`Failed to read "${file.name}". ${err instanceof Error ? err.message : ''}`, 'error');
        }
      }

      if (accepted.length === 0) {
        setIsUploading(false);
        return;
      }

      setUploadedFiles(prev => {
        const next = [...prev, ...accepted];
        if (next.length > MAX_FILES) {
          pushToast(`Only the first ${MAX_FILES} files are kept â€” older uploads were removed.`, 'warning');
          return next.slice(0, MAX_FILES);
        }
        return next;
      });

      if (accepted.length === 1) {
        pushToast(`"${accepted[0].name}" uploaded successfully â€” ready for Q&A.`, 'success');
      } else {
        pushToast(`${accepted.length} files uploaded successfully â€” ready for Q&A.`, 'success');
      }
      setIsUploading(false);
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
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">{formatBytes(f.size)} Â· ~{f.pages} pages</p>
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
                          {msg.attachments.map(att => {
                            const fullFile = uploadedFiles.find(f => f.id === att.id);
                            const kind = fileIconFor(att.name);
                            return (
                              <div
                                key={att.id}
                                className={cn(
                                  'flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs font-medium',
                                  msg.role === 'user'
                                    ? 'bg-white/15 border-white/30 text-white'
                                    : fileBadgeClass[kind]
                                )}
                              >
                                <FileText className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate max-w-[10rem]">{att.name}</span>
                                {fullFile && (
                                  <span className={cn(
                                    'shrink-0 px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide',
                                    msg.role === 'user' ? 'bg-white/20 text-white' : 'bg-black/5 dark:bg-white/10'
                                  )}>
                                    {kind === 'text' ? 'txt' : kind}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <p className="text-sm whitespace-pre-line leading-relaxed">{msg.content}</p>

                      {/* Source references â€” fully dynamic */}
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-neutral-200/70 dark:border-neutral-700/70 space-y-2">
                          <p className="text-xs font-semibold flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
                            <Quote className="h-3.5 w-3.5" />
                            Source References
                          </p>

                          {msg.sources.map((src, i) => {
                            const kind = fileIconFor(src.doc);
                            return (
                              <div
                                key={`${src.doc}-${src.page}-${i}`}
                                className="flex items-start gap-2 text-xs rounded-lg px-2.5 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300"
                              >
                                <span className={cn(
                                  'grid place-items-center h-6 w-6 rounded-md border text-[10px] font-bold uppercase shrink-0',
                                  fileBadgeClass[kind]
                                )}>
                                  {kind === 'text' ? 'txt' : kind}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold truncate">{src.doc}</span>
                                    <span className="shrink-0 px-1.5 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 font-bold">
                                      p.{src.page}
                                    </span>
                                  </div>
                                  {src.excerpt && (
                                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2 italic">
                                      "{src.excerpt}"
                                    </p>
                                  )}
                                </div>
                              </div>
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
          <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex-shrink-0">
            {/* Compact file cards for current attachments */}
            {uploadedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {uploadedFiles.map(f => {
                  const kind = fileIconFor(f.name);
                  return (
                    <div
                      key={f.id}
                      className={cn(
                        'flex items-center gap-2 pl-2.5 pr-1.5 py-1.5 rounded-xl border text-xs font-medium',
                        fileBadgeClass[kind]
                      )}
                    >
                      <FileText className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate max-w-[10rem]">{f.name}</span>
                      <span className="text-[10px] opacity-70">{formatBytes(f.size)}</span>
                      <button
                        onClick={() => removeUploadedFile(f.id)}
                        className="ml-0.5 grid place-items-center h-5 w-5 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                        title="Remove"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex items-end gap-2 bg-neutral-100 dark:bg-neutral-800 rounded-2xl pl-4 pr-2 py-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-xl text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors disabled:opacity-50"
                title="Attach file"
                type="button"
                disabled={isUploading}
              >
                {isUploading ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Paperclip className="h-5 w-5" />}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
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
                className="flex-1 bg-transparent text-sm outline-none resize-none py-2 max-h-32 dark:text-neutral-100 dark:placeholder:text-neutral-500"
                rows={1}
              />

              <button
                onClick={() => send(input)}
                disabled={!input.trim() || isThinking}
                className="p-2 rounded-xl bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                type="button"
                title="Send"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Toasts */}
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    </div>
  );
}

/* =========================================================
   NOTES GENERATOR
========================================================= */

export function StudentNotes() {
  const [generated, setGenerated] =
    useState(false);

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
            subtitle="Choose type and source"
            icon={Sparkles}
          />

          <CardBody className="space-y-4">
            <div>
              <label className="text-sm font-medium text-neutral-700 mb-2 block">
                Select Course
              </label>

              <select className="w-full h-10 px-3 rounded-xl border border-neutral-200 bg-white text-sm outline-none focus:border-primary-400">
                {studentCourses.map(c => (
                  <option key={c.id}>
                    {c.code} â€” {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-neutral-700 mb-2 block">
                Select Chapter / Document
              </label>

              <select className="w-full h-10 px-3 rounded-xl border border-neutral-200 bg-white text-sm outline-none focus:border-primary-400">
                {documents.slice(0, 4).map(d => (
                  <option key={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
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
              onClick={() => setGenerated(true)}
            >
              Generate Smart Notes
            </Button>
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
                  >
                    Export
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    icon={BookmarkIcon}
                  >
                    Save
                  </Button>
                </div>
              </div>

              <div className="p-6 flex-1 overflow-y-auto">
                <h2 className="text-xl font-bold font-display text-neutral-900 mb-4">
                  {noteContent[type].title}
                </h2>

                <div className="prose prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap font-sans text-sm text-neutral-700 leading-relaxed">
                    {noteContent[type].body}
                  </pre>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Recently generated notes */}
      {generatedNotes.length > 0 && (
        <Card>
          <CardHeader
            title="Recently Generated Notes"
            icon={StickyNote}
          />

          <CardBody>
            <div className="space-y-2">
              {generatedNotes.map(note => (
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
                  >
                    Open
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
