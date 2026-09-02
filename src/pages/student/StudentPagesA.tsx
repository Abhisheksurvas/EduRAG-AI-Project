import {
 type ReactNode, useEffect, useMemo, useRef, useState }
 from 'react';
import {
 Flame, Target, TrendingUp, BookOpen, Bot, StickyNote, HelpCircle, Clock, ChevronRight, FileText, Presentation, FileType, Search, Filter, Download, Sparkles, Send, Bot as BotIcon, RefreshCw, MessageSquare, Quote, BookMarked, ArrowRight, CheckCircle2, XCircle, Circle, Star, Bookmark as BookmarkIcon, Brain, Zap, Calendar, Trash2, Plus, X, LoaderCircle, PanelLeft, Copy, Pencil, Check, }
 from 'lucide-react';
import {
 Card, CardHeader, CardBody, Badge, Button, Progress, StatCard, Avatar, EmptyState, SectionHeader }
 from '@/components/ui';
import {
 ChatHistorySidebar }
 from '@/components/ChatHistorySidebar';
import {
 cn }
 from '@/lib/utils';
import {
 loadConversations, saveConversation, getCurrentUserId, getCurrentUserRole, generateConversationTitle, type ChatConversation, }
 from '@/lib/chatHistory';
import {
 fetchStudentProfile, fetchStudentCourses, fetchQuizzes, fetchDocuments, fetchStats, fetchActivity, }
 from '@/lib/dataService';
import {
 useMaterials }
 from '@/lib/materialsStore';
import {
 studentCourses, quizzes, recentActivity, generatedNotes, type ChatMessage, type DocumentItem, }
 from '@/data/mockData';
const iconMap = {
 quiz: HelpCircle, ai: Bot, notes: StickyNote, }
;
const docIcon = {
 pdf: FileText, ppt: Presentation, doc: FileType, video: FileText }
;
const docColor = {
 pdf: 'error', ppt: 'warning', doc: 'primary', video: 'secondary' }
 as const;
function formatInline(text: string): ReactNode[] {
 const nodes: ReactNode[] = []; const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\)/g; let lastIndex = 0; let match: RegExpExecArray | null; let key = 0; while ((match = regex.exec(text) !== null) {

    if (match.index > lastIndex)
        nodes.push(text.slice(lastIndex, match.index);)

    const tok = match[0];
    if (tok.startsWith('**') {

        nodes.push(<strong key={
key++}
 className="font-semibold text-neutral-900">{
tok.slice(2, -2)}
</strong>);)

    }

    else if (tok.startsWith('*') {

        nodes.push(<em key={
key++}
 className="italic">{
tok.slice(1, -1)}
</em>);)

    }

    else if (tok.startsWith('`') {

        nodes.push(<code key={
key++}
 className="rounded bg-neutral-100 px-1.5 py-0.5 text-[0.85em] font-mono text-primary-700">          {
tok.slice(1, -1)}
        </code>);)

    }

    else if (tok.startsWith('[') {

        const link = tok.match(/^\[([^\]]+)\]\(([^)]+)\)$/);)

        if (link) {

            nodes.push(<a key={
key++}
 href={
link[2]}
 target="_blank" rel="noreferrer" className="text-primary-600 underline hover:text-primary-700">            {
link[1]}
          </a>);)

        }

        else {

            nodes.push(tok);)

        }

    }

    lastIndex = regex.lastIndex;
}
 if (lastIndex < text.length)
    nodes.push(text.slice(lastIndex);)
 return nodes; }

function parseMarkdown(src: string): ReactNode[] {
 const out: ReactNode[] = []; const lines = src.split('\n');)
 let i = 0; let key = 0; let para: string[] = []; const flushPara = () => {
 if (para.length) {

    out.push(<p key={
key++}
 className="text-neutral-800">{
formatInline(para.join(' ')}
</p>);)

    para = [];
}
 }
; while (i < lines.length) {

    const line = lines[i];
// Fenced code block    if (/^\s*```/.test(line) {
      flushPara();)
      const lang = line.trim().slice(3).trim();)
      const code: string[] = [];      i++;      while (i < lines.length && !/^\s*```/.test(lines[i]) {
        code.push(lines[i]);)
        i++;      }
      i++; // consume closing fence      out.push(        <div key={
key++}
 className="overflow-hidden rounded-xl border border-neutral-200 bg-neutral-900 dark:border-neutral-700/50 dark:bg-[#0b1120]">          {
lang && <div className="bg-neutral-800/70 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide text-neutral-400 dark:bg-white/5 dark:text-neutral-500">{
lang}
</div>}
          <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-neutral-100 dark:text-neutral-300">            <code>{
code.join('\n')}
</code>          </pre>        </div>,      );)
      continue;    }
    // Heading    const heading = line.match(/^(#{
1,3}
)\s+(.*)$/);)
    if (heading) {
      flushPara();)
      const level = heading[1].length;      const cls =        level === 1          ? 'text-lg font-bold text-neutral-900'          : level === 2            ? 'text-base font-bold text-neutral-900'            : 'text-sm font-semibold text-neutral-900';      out.push(        <p key={
key++}
 className={
`${
cls}
 mt-1`}
>          {
formatInline(heading[2])}
        </p>,      );)
      i++;      continue;    }
    // Blockquote    if (/^>\s?/.test(line) {
      flushPara();)
      const quote: string[] = [];      while (i < lines.length && /^>\s?/.test(lines[i]) {
        quote.push(lines[i].replace(/^>\s?/, '');)
        i++;      }
      out.push(        <blockquote key={
key++}
 className="border-l-4 border-primary-300 pl-4 italic text-neutral-600">          {
formatInline(quote.join(' ')}
        </blockquote>,      );)
      continue;    }
    // Unordered list    if (/^[-*]\s+/.test(line) {
      flushPara();)
      const items: string[] = [];      while (i < lines.length && /^[-*]\s+/.test(lines[i]) {
        items.push(lines[i].replace(/^[-*]\s+/, '');)
        i++;      }
      out.push(        <ul key={
key++}
 className="space-y-1.5 pl-1">          {
items.map((it, idx) => (            <li key={
idx}
 className="flex gap-2.5">              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500" />              <span className="flex-1">{
formatInline(it)}
</span>            </li>          )}
        </ul>,      );)
      continue;    }
    // Ordered list    if (/^\d+\.\s+/.test(line) {
      flushPara();)
      const items: string[] = [];      while (i < lines.length && /^\d+\.\s+/.test(lines[i]) {
        items.push(lines[i].replace(/^\d+\.\s+/, '');)
        i++;      }
      out.push(        <ol key={
key++}
 className="space-y-1.5 pl-1">          {
items.map((it, idx) => (            <li key={
idx}
 className="flex gap-2.5">              <span className="font-semibold text-primary-700">{
idx + 1}
.</span>              <span className="flex-1">{
formatInline(it)}
</span>            </li>          )}
        </ol>,      );)
      continue;    }
    // Horizontal rule    if (/^---+$/.test(line.trim()) {
      flushPara();)
      out.push(<hr key={
key++}
 className="border-neutral-200" />);)
      i++;      continue;    }
    // Blank line    if (line.trim() === '') {
      flushPara();)
      i++;      continue;    }
    // Paragraph text    para.push(line.trim();)
    i++;  }
  flushPara();)
  return out;}


function StudyAnswerContent({
 content }
: {
 content: string }
) {
  return <div className="space-y-3 text-sm leading-relaxed">{
parseMarkdown(content)}
</div>;}
/* ============ DASHBOARD ============ */export function StudentDashboard() {
  const [student, setStudent] = useState({
 name: '', program: '', semester: 5, goalToday: '', goalProgress: 0, streak: 0, credits: 0 }
);)
  const [courses, setCourses] = useState<typeof studentCourses>([]);)
  const [quizList, setQuizList] = useState<typeof quizzes>([]);)
  const [docList, setDocList] = useState<DocumentItem[]>([]);)
  const [activity, setActivity] = useState<typeof recentActivity>([]);)
  const [stats, setStats] = useState<{
 weeklyQueries: {
 count: number }
[] }
 | null>(null);)
  const [loading, setLoading] = useState(true);)
  useEffect(() => {
    let cancelled = false;    const load = async () => {
      setLoading(true);)
      try {
        const [profile, coursesData, quizzesData, docsData, statsData, activityData] = await Promise.all([          fetchStudentProfile(),          fetchStudentCourses(),          fetchQuizzes(),          fetchDocuments(),          fetchStats(),          fetchActivity(),        ]);)
        if (!cancelled) {
          setStudent(profile);)
          setCourses(coursesData as any[]);)
          setQuizList(quizzesData as any[]);)
          setDocList(docsData as DocumentItem[]);)
          setActivity(activityData as any[]);)
          setStats(statsData as any);)
        }
      }
 catch (err) {
        console.warn('[StudentDashboard] Failed to load data:', err);)
      }
 finally {
        if (!cancelled) setLoading(false);)
      }
    }
;    load();)
    return () => {
 cancelled = true; }
;  }
, []);)
  const aiQueriesToday = stats?.weeklyQueries?.[0]?.count ?? 0;  const completedQuizzes = quizList.filter((q: any) => q.status === 'completed').length;  const avgProgress = courses.length > 0    ? Math.round(courses.reduce((sum: number, course: any) => sum + course.progress, 0) / courses.length)    : 0;  return (    <div className="space-y-6">      {
/* Welcome card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 p-8 text-white shadow-xl shadow-primary-900/20">        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full -translate-y-1/3 translate-x-1/3" />        <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-secondary-400/20 rounded-full translate-y-1/2" />        <div className="relative flex flex-wrap items-center justify-between gap-6">          <div>            <p className="text-primary-200 text-sm font-medium">Welcome back,</p>            <h1 className="text-3xl font-bold font-display mt-1">{
student.name}
</h1>            <p className="text-primary-100 mt-2 text-sm">{
student.program}
 · Semester {
student.semester}
</p>            <div className="flex items-center gap-3 mt-5">              <span className="flex items-center gap-2 text-sm bg-white/15 backdrop-blur-sm rounded-full px-4 py-1.5 border border-white/10">                <Flame className="h-4 w-4 text-accent-300" /> {
student.streak}
 day streak              </span>              <span className="flex items-center gap-2 text-sm bg-white/15 backdrop-blur-sm rounded-full px-4 py-1.5 border border-white/10">                <BookOpen className="h-4 w-4" /> {
student.credits}
 credits              </span>            </div>          </div>          <div className="flex flex-col items-end">            <div className="text-5xl font-bold font-display">{
student.goalProgress}
%</div>            <p className="text-primary-200 text-sm mt-1 font-medium">Today's goal</p>            <div className="w-48 mt-3"><Progress value={
student.goalProgress}
 size="lg" tone="accent" /></div>          </div>        </div>      </div>      {
/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">        <StatCard icon={
BookOpen}
 label="Enrolled Courses" value={
courses.length}
 tone="primary" trend={
{
 value: '2 new', up: true }
}
 />        <StatCard icon={
HelpCircle}
 label="Quizzes Completed" value={
completedQuizzes}
 tone="success" trend={
{
 value: '8%', up: true }
}
 />        <StatCard icon={
TrendingUp}
 label="Course Progress" value={
`${
avgProgress}
%`}
 tone="warning" />        <StatCard icon={
Bot}
 label="AI Queries Today" value={
aiQueriesToday}
 tone="secondary" trend={
{
 value: '15%', up: true }
}
 />      </div>      <div className="grid lg:grid-cols-3 gap-6">        {
/* Today's Study Goal */}
        <Card className="border-neutral-200 shadow-sm hover:shadow-md transition-shadow">          <CardHeader title="Today's Study Goal" subtitle="Stay on track" icon={
Target}
 />          <CardBody>            <div className="flex items-start gap-3 mb-5">              <div className="grid place-items-center h-11 w-11 rounded-xl bg-accent-100 text-accent-600 shrink-0">                <Target className="h-5 w-5" />              </div>              <p className="text-sm text-neutral-700 leading-relaxed">{
student.goalToday}
</p>            </div>            <div className="flex items-center justify-between mb-2">              <span className="text-sm text-neutral-500">Progress</span>              <span className="text-sm font-semibold text-neutral-900">{
student.goalProgress}
%</span>            </div>            <Progress value={
student.goalProgress}
 tone="accent" size="lg" />            <Button variant="outline" size="sm" className="w-full mt-5">Continue Studying</Button>          </CardBody>        </Card>        {
/* Recent Activity */}
        <Card className="lg:col-span-2 border-neutral-200 shadow-sm hover:shadow-md transition-shadow">          <CardHeader title="Recent Activity" subtitle="Your latest learning actions" icon={
Clock}
 />          <CardBody className="pt-4">            <div className="space-y-1">              {
activity.map((act) => {
                const Icon = iconMap[act.icon as keyof typeof iconMap] ?? Clock;                return (                  <div key={
act.id}
 className="flex items-center gap-3 py-3 px-3 rounded-xl hover:bg-neutral-50 transition-colors group">                    <div className="grid place-items-center h-10 w-10 rounded-xl bg-neutral-100 text-neutral-500 shrink-0 group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors">                      <Icon className="h-5 w-5" />                    </div>                    <div className="flex-1 min-w-0">                      <p className="text-sm font-medium text-neutral-900">{
act.action}
</p>                      <p className="text-xs text-neutral-500 truncate">{
act.detail}
</p>                    </div>                    <span className="text-xs text-neutral-400 shrink-0 font-medium">{
act.time}
</span>                  </div>                );)
              }
)}
            </div>          </CardBody>        </Card>      </div>      <div className="grid lg:grid-cols-3 gap-6">        {
/* Learning Progress */}
        <Card className="lg:col-span-2 border-neutral-200 shadow-sm hover:shadow-md transition-shadow">          <CardHeader title="Learning Progress" subtitle="Course completion overview" icon={
TrendingUp}
 />          <CardBody className="space-y-5">            {
courses.slice(0, 4).map((course) => {
              const isReactComponent = (c: any) => typeof c === 'function' || (c && typeof c === 'object' && ('$$typeof' in c || 'render' in c);)
              const Icon = isReactComponent(course.icon) ? course.icon : BookOpen;              return (                <div key={
course.id}
 className="flex items-center gap-4 p-3 rounded-xl hover:bg-neutral-50 transition-colors">                  <div className={
cn('grid place-items-center h-11 w-11 rounded-xl shrink-0', `bg-${
course.color}
-50 text-${
course.color}
-600`)}
>                    <Icon className="h-5.5 w-5.5" />                  </div>                  <div className="flex-1 min-w-0">                    <div className="flex items-center justify-between mb-2">                      <span className="text-sm font-medium text-neutral-900 truncate">{
course.title}
</span>                      <span className="text-sm font-bold text-neutral-700">{
course.progress}
%</span>                    </div>                    <Progress value={
course.progress}
 tone={
course.color as any}
 size="sm" />                  </div>                </div>              );)
            }
)}
          </CardBody>        </Card>        {
/* Quick Actions */}
        <Card className="border-neutral-200 shadow-sm hover:shadow-md transition-shadow">          <CardHeader title="Quick Actions" icon={
Zap}
 />          <CardBody className="grid grid-cols-2 gap-3">            {
[              {
 label: 'Ask AI', icon: Bot, tone: 'primary' }
,              {
 label: 'Generate Notes', icon: StickyNote, tone: 'accent' }
,              {
 label: 'Take Quiz', icon: HelpCircle, tone: 'success' }
,              {
 label: 'My Library', icon: FileText, tone: 'secondary' }
,            ].map((action) => {
              const Icon = action.icon;              return (                <button key={
action.label}
 className={
cn('flex flex-col items-center gap-3 p-5 rounded-xl border border-neutral-200 hover:border-neutral-300 hover:shadow-lg transition-all duration-200 group bg-white', `hover:bg-${
action.tone}
-50`)}
>                  <div className={
cn('grid place-items-center h-12 w-12 rounded-xl transition-transform group-hover:scale-110 group-hover:shadow-md', `bg-${
action.tone}
-100 text-${
action.tone}
-600`)}
>                    <Icon className="h-6 w-6" />                  </div>                  <span className="text-xs font-semibold text-neutral-700">{
action.label}
</span>                </button>              );)
            }
)}
          </CardBody>        </Card>      </div>      {
/* Recently Uploaded Documents */}
      <Card className="border-neutral-200 shadow-sm hover:shadow-md transition-shadow">        <CardHeader title="Recently Uploaded Documents" subtitle="Latest materials from your courses" icon={
FileText}
 action={
<Button variant="ghost" size="sm" icon={
ChevronRight}
>View Library</Button>}
 />        <CardBody>          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">            {
docList.slice(0, 6).map((doc) => {
              const Icon = docIcon[doc.type];              const handleDocDownload = async () => {
                try {
                  const token = typeof window !== 'undefined' ? window.localStorage.getItem('edurag-auth-token') : null;                  const res = await fetch(`http://localhost:8000/api/materials/download/${
doc.id}
`, {
                    headers: token ? {
 Authorization: `Bearer ${
token}
` }
 : {
}
,                  }
);)
                  if (!res.ok) throw new Error('Download failed');)
                  const blob = await res.blob();)
                  const url = URL.createObjectURL(blob);)
                  const a = document.createElement('a');)
                  a.href = url;                  a.download = doc.name;                  document.body.appendChild(a);)
                  a.click();)
                  document.body.removeChild(a);)
                  URL.revokeObjectURL(url);)
                }
 catch (error) {
                  console.error('Download failed:', error);)
                }
              }
;              return (                <div key={
doc.id}
 className="flex items-center gap-3 p-4 rounded-xl border border-neutral-200 hover:border-neutral-300 hover:shadow-lg transition-all cursor-pointer group bg-white" onClick={
handleDocDownload}
>                  <div className={
cn('grid place-items-center h-12 w-12 rounded-xl shrink-0', `bg-${
docColor[doc.type]}
-100 text-${
docColor[doc.type]}
-600`)}
>                    <Icon className="h-6 w-6" />                  </div>                  <div className="min-w-0 flex-1">                    <p className="text-sm font-semibold text-neutral-900 truncate">{
doc.name}
</p>                    <p className="text-xs text-neutral-500 mt-1">{
doc.course}
 · {
doc.size}
</p>                    {
doc.year && <p className="text-xs text-neutral-400 mt-0.5">Year: {
doc.year}
 · {
doc.department}
</p>}
                  </div>                  <Download className="h-5 w-5 text-neutral-300 group-hover:text-primary-600 group-hover:translate-x-0.5 transition-all shrink-0" />                </div>              );)
            }
)}
          </div>        </CardBody>      </Card>    </div>  );)
}
/* ============ MY COURSES ============ */function CourseMaterials({
 courseCode }
: {
 courseCode: string }
) {
  const [apiBased, setApiBased] = useState<DocumentItem[]>([]);)
      // Live-updating localStorage materials (faculty-uploaded)  const localMats = useMaterials(courseCode);)
  useEffect(() => {
    let cancelled = false;    fetchDocuments().then(data => {
      if (!cancelled) {
        const docs = data as DocumentItem[];        setApiBased(docs.filter(d => d.course === courseCode);)
      }
    }
);)
    return () => {
 cancelled = true; }
;  }
, [courseCode]);)
      // Normalise and merge: local (faculty-uploaded, newest first) + API docs, de-dupe by name  const VALID_TYPES = ['pdf', 'ppt', 'doc', 'video'] as const;  type DocType = typeof VALID_TYPES[number];  const normaliseType = (t: string): DocType =>    (VALID_TYPES as readonly string[]).includes(t) ? (t as DocType) : 'pdf';  const seenNames = new Set<string>();)
  const materials: DocumentItem[] = [];  for (const m of [...localMats, ...apiBased]) {
    if (!seenNames.has(m.name) {
      seenNames.add(m.name);)
      materials.push({
 ...m, type: normaliseType(m.type) }
 as DocumentItem);)
    }
  }
  const handleDownload = async (doc: DocumentItem) => {
    try {
      const token = typeof window !== 'undefined' ? window.localStorage.getItem('edurag-auth-token') : null;      const res = await fetch(`http://localhost:8000/api/materials/download/${
doc.id}
`, {
        headers: token ? {
 Authorization: `Bearer ${
token}
` }
 : {
}
,      }
);)
      if (!res.ok) throw new Error('Download failed');)
      const blob = await res.blob();)
      const url = URL.createObjectURL(blob);)
      const a = document.createElement('a');)
      a.href = url;      a.download = doc.name;      document.body.appendChild(a);)
      a.click();)
      document.body.removeChild(a);)
      URL.revokeObjectURL(url);)
    }
 catch (error) {
      console.error('Download failed:', error);)
    }
  }
;  return (    <Card className="border-neutral-200 shadow-sm hover:shadow-md transition-shadow">      <CardHeader title="Course Materials" subtitle={
`${
materials.length}
 document${
materials.length !== 1 ? 's' : ''}
 available`}
 icon={
FileText}
 />      <CardBody>        <div className="space-y-2">          {
materials.map((doc) => {
            const type = doc.type as DocType;            const DIcon = docIcon[type] ?? FileText;            const color = docColor[type] ?? 'primary';            const isNew = localMats.some(m => m.name === doc.name);)
            return (              <div key={
doc.id}
 className={
cn('flex items-center gap-3 p-3.5 rounded-xl border transition-all', isNew ? 'border-success-200 bg-success-50/50 hover:bg-success-50' : 'border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300')}
>                <div className={
cn('grid place-items-center h-10 w-10 rounded-lg shrink-0', `bg-${
color}
-100 text-${
color}
-600`)}
>                  <DIcon className="h-5 w-5" />                </div>                <div className="flex-1 min-w-0">                  <div className="flex items-center gap-2">                    <p className="text-sm font-semibold text-neutral-900 truncate">{
doc.name}
</p>                    {
isNew && <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded bg-success-500 text-white">NEW</span>}
                  </div>                  <p className="text-xs text-neutral-500 mt-1">                    {
doc.pages ? `${
doc.pages}
 pages · ` : ''}
{
doc.size}
 · {
doc.uploadedAt}
                    {
doc.uploadedBy && ` · by ${
doc.uploadedBy}
`}
                  </p>                  {
(doc as any).description && (                    <p className="text-xs text-neutral-400 mt-0.5 italic">{
(doc as any).description}
</p>                  )}
                </div>                <Button variant="ghost" size="sm" icon={
Download}
 onClick={
() => handleDownload(doc)}
>Download</Button>              </div>            );)
          }
)}
          {
materials.length === 0 && (            <p className="text-sm text-neutral-400 text-center py-6">No materials uploaded for this course yet.</p>          )}
        </div>      </CardBody>    </Card>  );)
}


export function StudentCourses() {
  const student = {
 name: '', program: '', semester: 5 }
;  const [coursesList, setCoursesList] = useState<typeof studentCourses>(studentCourses);)
  const [docList, setDocList] = useState<DocumentItem[]>([]);)
  const [selected, setSelected] = useState<string | null>(null);)
      // All locally-stored faculty-uploaded materials (no filter = all courses)  const allLocalMats = useMaterials();)
  const course = coursesList.find((c: any) => c.id === selected);)
  useEffect(() => {
    let cancelled = false;    fetchStudentCourses().then(data => {
      if (!cancelled) setCoursesList(data as any[]);)
    }
);)
    fetchDocuments().then(data => {
      if (!cancelled) setDocList(data as DocumentItem[]);)
    }
);)
    return () => {
 cancelled = true; }
;  }
, []);)
  const deleteCourse = (courseId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();)
    setCoursesList((prev: any[]) => prev.filter((c: any) => c.id !== courseId);)
    if (selected === courseId) {
      setSelected(null);)
    }
  }
;  if (course) {
    const isReactComponent = (c: any) => typeof c === 'function' || (c && typeof c === 'object' && ('$$typeof' in c || 'render' in c);)
    const Icon = isReactComponent(course.icon) ? course.icon : BookOpen;    return (      <div className="space-y-6">        <div className="flex items-center justify-between">          <Button variant="outline" size="sm" icon={
ChevronRight}
 onClick={
() => setSelected(null)}
 className="rotate-180">Back to Courses</Button>        </div>        <div className={
cn('relative overflow-hidden rounded-3xl p-8 text-white bg-gradient-to-br shadow-xl', `from-${
course.color}
-600 to-${
course.color}
-800`)}
>          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/3 translate-x-1/3" />          <div className="relative flex items-start justify-between gap-4">            <div>              <Badge className="bg-white/20 text-white ring-white/30 backdrop-blur-sm">{
course.code}
 · {
course.category}
</Badge>              <h1 className="text-2xl font-bold font-display mt-3">{
course.title}
</h1>              <p className="text-white/80 mt-1.5">Instructor: {
course.instructor}
</p>              {
course.department && <p className="text-white/70 text-sm mt-1">{
course.department}
 · {
course.year}
</p>}
            </div>            <div className="grid place-items-center h-16 w-16 rounded-2xl bg-white/15 backdrop-blur-sm ring-1 ring-white/20">              <Icon className="h-8 w-8" />            </div>          </div>        </div>        <div className="grid lg:grid-cols-4 gap-4">          <StatCard icon={
BookOpen}
 label="Modules" value={
`${
course.completedModules}
/${
course.modules}
`}
 tone="primary" />          <StatCard icon={
TrendingUp}
 label="Progress" value={
`${
course.progress}
%`}
 tone="success" />          <StatCard icon={
FileText}
 label="Materials" value={
docList.filter(d => d.course === course.code).length}
 tone="accent" />          <StatCard icon={
Target}
 label="Credits" value={
course.credits}
 tone="secondary" />        </div>        <CourseMaterials courseCode={
course.code}
 />      </div>    );)
  }
  return (    <div className="space-y-6">      <SectionHeader        title="My Courses"        description={
`${
coursesList.length}
 enrolled courses`}
        action={
          coursesList.length === 0 && (            <Button variant="outline" size="sm" icon={
RefreshCw}
 onClick={
() => {
 fetchStudentCourses().then(data => setCoursesList(data as any[]);)
 }
}
>Refresh Courses</Button>          )        }
      />      {
coursesList.length === 0 ? (        <Card className="border-neutral-200 shadow-sm">          <CardBody>            <EmptyState              icon={
BookOpen}
              title="No Enrolled Courses"              description="You are not enrolled in any courses yet."              action={
<Button icon={
RefreshCw}
 onClick={
() => {
 fetchStudentCourses().then(data => setCoursesList(data as any[]);)
 }
}
>Refresh</Button>}
            />          </CardBody>        </Card>      ) : (        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">          {
coursesList.map((course) => {
            const isReactComponent = (c: any) => typeof c === 'function' || (c && typeof c === 'object' && ('$$typeof' in c || 'render' in c);)
            const Icon = isReactComponent(course.icon) ? course.icon : BookOpen;            const localCount = allLocalMats.filter(m => m.course === course.code).length;            return (              <Card key={
course.id}
 hover className="p-0 overflow-hidden cursor-pointer border-neutral-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">                <div className="w-full text-left">                  <div className={
cn('h-2 bg-gradient-to-r', `from-${
course.color}
-400 to-${
course.color}
-600`)}
 />                  <div className="p-5">                    <div className="flex items-start justify-between mb-4">                      <div className={
cn('grid place-items-center h-12 w-12 rounded-xl', `bg-${
course.color}
-50 text-${
course.color}
-600`)}
>                        <Icon className="h-6 w-6" />                      </div>                      <div className="flex items-center gap-2">                        <Badge tone={
course.category === 'Core' ? 'primary' : course.category === 'Elective' ? 'secondary' : 'accent'}
>{
course.category}
</Badge>                        {
localCount > 0 && (                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-success-100 text-success-700">                            <FileText className="h-3 w-3" />{
localCount}
 note{
localCount !== 1 ? 's' : ''}
                          </span>                        )}
                        <button                          title="Delete / Drop Course"                          onClick={
(e) => deleteCourse(course.id, e)}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-error-600 hover:bg-error-50 transition-colors"                        >                          <Trash2 className="h-4 w-4" />                        </button>                      </div>                    </div>                    <div onClick={
() => setSelected(course.id)}
>                      <p className="text-xs text-neutral-400 font-medium">{
course.code}
 · {
course.credits}
 Credits · {
course.category}
</p>                      <h3 className="font-display font-semibold text-neutral-900 mt-1 leading-snug">{
course.title}
</h3>                      {
course.department && <p className="text-xs text-neutral-500 mt-0.5">{
course.department}
 · {
course.year}
</p>}
                      <p className="text-sm text-neutral-500 mt-1">{
course.instructor}
</p>                      <div className="mt-4">                        <div className="flex items-center justify-between mb-1.5">                          <span className="text-xs text-neutral-500">{
course.completedModules}
/{
course.modules}
 modules</span>                          <span className="text-xs font-bold text-neutral-700">{
course.progress}
%</span>                        </div>                        <Progress value={
course.progress}
 tone={
course.color as any}
 size="sm" />                      </div>                      <p className="text-xs text-neutral-400 mt-3 flex items-center gap-1.5">                        <BookOpen className="h-3.5 w-3.5" /> Next: {
course.nextLesson}
                      </p>                      {
localCount > 0 && (                        <p className="text-xs text-success-600 font-medium mt-2 flex items-center gap-1">                          <FileText className="h-3 w-3" /> {
localCount}
 new material{
localCount !== 1 ? 's' : ''}
 uploaded — click to view                        </p>                      )}
                    </div>                  </div>                </div>              </Card>            );)
          }
)}
        </div>      )}
    </div>  );)
}
/* ============ AI ASSISTANT ============ */export function StudentAIAssistant() {
  const [libraryDocs, setLibraryDocs] = useState<DocumentItem[]>([]);)
  const [filter, setFilter] = useState<string>('all');)
  const [query, setQuery] = useState('');)
  const [apiDocs, setApiDocs] = useState<DocumentItem[]>([]);)
  const localMats = useMaterials();)
  useEffect(() => {
    let cancelled = false;    fetchDocuments().then(data => {
      if (!cancelled) setApiDocs(data as DocumentItem[]);)
    }
);)
    return () => {
 cancelled = true; }
;  }
, []);)
  useEffect(() => {
    const VALID_TYPES = ['pdf', 'ppt', 'doc', 'video'] as const;    type DocType = typeof VALID_TYPES[number];    const normaliseType = (t: string): DocType =>      (VALID_TYPES as readonly string[]).includes(t) ? (t as DocType) : 'pdf';    const seenNames = new Set<string>();)
    const merged: DocumentItem[] = [];    for (const m of [...localMats, ...apiDocs]) {
      if (!seenNames.has(m.name) {
        seenNames.add(m.name);)
        merged.push({
 ...m, type: normaliseType(m.type) }
 as DocumentItem);)
      }
    }
    setLibraryDocs(merged);)
  }
, [localMats, apiDocs]);)
  const deleteDoc = (docId: string) => {
    setLibraryDocs(prev => prev.filter(d => d.id !== docId);)
  }
;  const handleDownload = async (doc: DocumentItem) => {
    try {
      const token = typeof window !== 'undefined' ? window.localStorage.getItem('edurag-auth-token') : null;      const res = await fetch(`http://localhost:8000/api/materials/download/${
doc.id}
`, {
        headers: token ? {
 Authorization: `Bearer ${
token}
` }
 : {
}
,      }
);)
      if (!res.ok) throw new Error('Download failed');)
      const blob = await res.blob();)
      const url = URL.createObjectURL(blob);)
      const a = document.createElement('a');)
      a.href = url;      a.download = doc.name;      document.body.appendChild(a);)
      a.click();)
      document.body.removeChild(a);)
      URL.revokeObjectURL(url);)
    }
 catch (error) {
      console.error('Download failed:', error);)
    }
  }
;  const filtered = libraryDocs.filter(d =>    (filter === 'all' || d.type === filter) &&    d.name.toLowerCase().includes(query.toLowerCase()  );)
  const filters = [    {
 id: 'all', label: 'All' }
, {
 id: 'pdf', label: 'PDF' }
,    {
 id: 'ppt', label: 'Slides' }
, {
 id: 'doc', label: 'Documents' }
,  ];  return (    <div className="space-y-6">      <SectionHeader        title="My Library"        description="Your notes, study materials, and uploaded documents"        action={
          libraryDocs.length === 0 && (            <Button variant="outline" size="sm" icon={
RefreshCw}
 onClick={
() => {
 fetchDocuments().then(data => setApiDocs(data as DocumentItem[]);)
 }
}
>Refresh Library</Button>          )        }
      />      <div className="flex flex-wrap items-center gap-3">        <div className="flex items-center gap-2 h-11 px-4 rounded-xl bg-white border border-neutral-200 focus-within:border-primary-400 focus-within:ring-2 focus-within:ring-primary-500/20 transition-all flex-1 min-w-[200px] shadow-sm">          <Search className="h-4.5 w-4.5 text-neutral-400" />          <input value={
query}
 onChange={
e => setQuery(e.target.value)}
 placeholder="Search documents…" className="flex-1 bg-transparent text-sm outline-none text-neutral-900 placeholder:text-neutral-400" />        </div>        <div className="flex items-center gap-1.5 bg-white border border-neutral-200 rounded-xl p-1 shadow-sm">          {
filters.map(f => (            <button key={
f.id}
 onClick={
() => setFilter(f.id)}
 className={
cn('px-4 h-9 rounded-lg text-sm font-semibold transition-all', filter === f.id ? 'bg-primary-600 text-white shadow-sm' : 'text-neutral-600 hover:bg-neutral-100')}
>              {
f.label}
            </button>          )}
        </div>      </div>      {
filtered.length === 0 ? (        <Card className="border-neutral-200 shadow-sm"><CardBody><EmptyState icon={
FileText}
 title="No documents found" description="Try adjusting your search or filter." action={
libraryDocs.length === 0 ? <Button icon={
RefreshCw}
 onClick={
() => {
 fetchDocuments().then(data => setApiDocs(data as DocumentItem[]);)
 }
}
>Refresh Documents</Button> : undefined}
 /></CardBody></Card>      ) : (        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">          {
filtered.map(doc => {
            const Icon = docIcon[doc.type];            return (              <Card key={
doc.id}
 hover className="p-5 border-neutral-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">                <div className="flex items-start gap-3">                  <div className={
cn('grid place-items-center h-12 w-12 rounded-xl shrink-0', `bg-${
docColor[doc.type]}
-100 text-${
docColor[doc.type]}
-600`)}
>                    <Icon className="h-6 w-6" />                  </div>                  <div className="min-w-0 flex-1">                    <p className="text-sm font-semibold text-neutral-900 line-clamp-2">{
doc.name}
</p>                    <p className="text-xs text-neutral-500 mt-1.5">{
doc.course}
 · {
doc.pages}
 pages · {
doc.size}
</p>                    <p className="text-xs font-semibold text-primary-700 mt-1.5">{
doc.uploadedBy === 'You' ? 'Uploaded by Student' : 'Provided by Faculty'}
</p>                    <p className="text-xs text-neutral-400 mt-1">Uploaded {
doc.uploadedAt}
 by {
doc.uploadedBy}
</p>                  </div>                </div>                 <div className="flex items-center gap-2 mt-5 pt-4 border-t border-neutral-100">                   <Button variant="outline" size="sm" icon={
Download}
 className="flex-1" onClick={
() => handleDownload(doc)}
>Download</Button>                   <Button variant="ghost" size="sm" icon={
Trash2}
 className="text-error-600 hover:bg-error-50" onClick={
() => deleteDoc(doc.id)}
>Delete</Button>                 </div>              </Card>            );)
          }
)}
        </div>      )}
    </div>  );)
}
/* ============ AI STUDY ASSISTANT ============ */export function StudentAIAssistant() {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);)
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);)
  const [input, setInput] = useState('');)
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);)
  const [editingDraft, setEditingDraft] = useState('');)
  const [isThinking, setIsThinking] = useState(false);)
  const [uploadedDocs, setUploadedDocs] = useState<DocumentItem[]>([]);)
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);)
  const [isUploading, setIsUploading] = useState(false);)
  // ChatGPT-style processing stages for the upload/indexing progress indicator.  const [uploadStage, setUploadStage] = useState<'idle' | 'uploading' | 'extracting' | 'indexing' | 'done' | 'error'>('idle');)
  const uploadStageRef = useRef<'idle' | 'uploading' | 'extracting' | 'indexing' | 'done' | 'error'>('idle');)
  const [loadingHistory, setLoadingHistory] = useState(true);)
  const [sidebarOpen, setSidebarOpen] = useState(true);)
  const [studentProfile, setStudentProfile] = useState({
 name: '', program: '', semester: 5 }
);)
  const fileInputRef = useRef<HTMLInputElement>(null);)
  const [availableDocs, setAvailableDocs] = useState<DocumentItem[]>([]);)
  const [docQuery, setDocQuery] = useState('');)
  const userId = getCurrentUserId();)
  const role = getCurrentUserRole();)
  // Build suggested questions from the student's actual study materials so they  // are dynamic rather than hardcoded. Falls back to generic prompts when no  // materials are available yet.  const suggestedQuestionsDynamic = useMemo(() => {
    const fromDocs = Array.from(      new Set(availableDocs.map((doc) => doc.name).filter(Boolean),    ).slice(0, 4);)
    if (fromDocs.length === 0) {
      return [        'Summarize my study materials',        'Quiz me on my uploaded documents',        'Explain a key concept from my notes',        'What can you help me with?',      ];    }
    const first = fromDocs[0];    return [      `Summarize the key points of "${
first}
"`,      `Explain the main topics covered in "${
first}
"`,      `What are the most important definitions in "${
first}
"?`,      'Give me a practice question based on my materials',    ];  }
, [availableDocs]);)
  const activeConversation = conversations.find(c => c.conversationId === activeConversationId) ?? null;  const messages = activeConversation?.messages ?? [];  // Load conversations and documents from MongoDB on mount  useEffect(() => {
    let cancelled = false;    const load = async () => {
      setLoadingHistory(true);)
      try {
        const [data, profile, docs] = await Promise.all([          loadConversations(),          fetchStudentProfile(),          fetchDocuments(),        ]);)
        if (!cancelled) {
          setConversations(data);)
          setStudentProfile(profile);)
          setAvailableDocs(docs as DocumentItem[]);)
          if (data.length > 0) {
            setActiveConversationId(data[0].conversationId);)
          }
 else {
            setActiveConversationId(null);)
          }
        }
      }
 catch (err) {
        console.warn('[StudentAIAssistant] Failed to load conversations:', err);)
      }
 finally {
        if (!cancelled) setLoadingHistory(false);)
      }
    }
;    load();)
  }
, [userId, role]);)
  // Save conversation to MongoDB whenever messages change  const persistConversation = async (conversation: ChatConversation) => {
    try {
      await saveConversation(conversation);)
    }
 catch (err) {
      console.warn('[StudentAIAssistant] Failed to save conversation:', err);)
    }
  }
;  const addMessageToConversation = (conversationId: string, message: ChatMessage) => {
    setConversations(current => {
      const updated = current.map(conversation => {
        if (conversation.conversationId !== conversationId) return conversation;        const isFirstQuestion = message.role === 'user' && conversation.messages.every(item => item.role !== 'user');)
        const updatedConv: ChatConversation = {
          ...conversation,          title: isFirstQuestion ? generateConversationTitle([...conversation.messages, message]) : conversation.title,          updatedAt: new Date().toISOString(),          messages: [...conversation.messages, message],        }
;        // Persist to MongoDB        void persistConversation(updatedConv);)
        return updatedConv;      }
);)
      return updated;    }
);)
  }
;  const startNewChat = () => {
    const newConv: ChatConversation = {
      conversationId: `chat-${
Date.now()}
-${
Math.random().toString(36).substr(2, 9)}
`,      userId,      role,      title: 'New chat',      messages: [],      updatedAt: new Date().toISOString(),    }
;    setConversations(current => [newConv, ...current]);)
    setActiveConversationId(newConv.conversationId);)
    setInput('');)
    setIsThinking(false);)
    void persistConversation(newConv);)
  }
;  const handleSelectConversation = (conversation: ChatConversation) => {
    setActiveConversationId(conversation.conversationId);)
    setInput('');)
    setIsThinking(false);)
  }
;  const handleConversationDeleted = (conversationId: string) => {
    setConversations(prev => prev.filter(c => c.conversationId !== conversationId);)
    if (activeConversationId === conversationId) {
      setActiveConversationId(null);)
    }
  }
;  // Keep a ref in sync with the visible upload stage so we can block duplicate  // uploads even across async gaps.  const setStage = (s: 'idle' | 'uploading' | 'extracting' | 'indexing' | 'done' | 'error') => {
    uploadStageRef.current = s;    setUploadStage(s);)
  }
;  // Auto-hide the success notice shortly after it appears. The error notice is  // left on screen until the student explicitly closes it via the × button.  const finishUploadLoader = (stage: 'done' | 'error') => {
    setStage(stage);)
    if (stage === 'done') {
      window.setTimeout(() => {
        setStage('idle');)
        setUploadStatus(null);)
      }
, 3000);)
    }
  }
;  // Manually dismiss the top-center upload notice immediately.  const dismissUploadNotice = () => {
    setStage('idle');)
    setUploadStatus(null);)
  }
;  const uploadDocument = async (file: File) => {
    // Block duplicate uploads while a file is still being processed.    if (uploadStageRef.current !== 'idle') return;    const allowedExtensions = ['pdf', 'pptx', 'docx', 'txt', 'md', 'csv'];    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';    if (!allowedExtensions.includes(extension) {
      setStage('error');)
      setUploadStatus('Unsupported file. Upload PDF, PPTX, DOCX, TXT, MD, or CSV files.');)
      finishUploadLoader('error');)
      return;    }
    if (file.size > 10 * 1024 * 1024) {
      setStage('error');)
      setUploadStatus('This file is larger than 10 MB. Please choose a smaller document.');)
      finishUploadLoader('error');)
      return;    }
    setStage('uploading');)
    setIsUploading(true);)
    setUploadStatus(`Uploading ${
file.name}
…`);)
    // Generous timeout — large PDFs can take a while to parse on the server.    const controller = new AbortController();)
    const timeoutId = setTimeout(() => controller.abort(), 300_000);)
    try {
      // Use multipart/form-data — avoids base64 encoding overhead (~33% size reduction)      const formData = new FormData();)
      formData.append('file', file, file.name);)
      formData.append('studentId', userId);)
      formData.append('course', 'Personal study material');)
      setStage('extracting');)
      setUploadStatus(`Extracting text from ${
file.name}
…`);)
      const res = await fetch('http://localhost:8000/api/materials/upload', {
        method: 'POST',        headers: {
          ...(typeof window !== 'undefined' && window.localStorage.getItem('edurag-auth-token')            ? {
 Authorization: `Bearer ${
window.localStorage.getItem('edurag-auth-token')}
` }
            : {
}
),        }
,        body: formData,        signal: controller.signal,      }
);)
      clearTimeout(timeoutId);)
 // Clear timeout on successful response      const data = await res.json();)
      if (!res.ok || !data.success || !data.material) {
        throw new Error(data.error || 'The document could not be uploaded.');)
      }
      const material = data.material;      const uploadedDoc: DocumentItem = {
        id: material.id,        name: material.name,        type: extension === 'pptx' ? 'ppt' : extension === 'docx' ? 'doc' : 'pdf',        course: material.course,        size: `${
(file.size / 1024 / 1024).toFixed(file.size < 1024 * 1024 ? 1 : 2)}
 MB`,        uploadedAt: 'Just now',        uploadedBy: 'You',        pages: material.pages,        status: 'approved' as const,      }
;      setUploadedDocs(current => [...current, uploadedDoc]);)
      setAvailableDocs(current => [...current, uploadedDoc]);)
      setSelectedDocs(current => [...new Set([...current, material.id])]);)
      // The server now indexes the document in the background (embeddings/RAG).      setStage('indexing');)
      setUploadStatus(`Indexing ${
file.name}
 for the AI assistant…`);)
      // Poll until the document is queryable. The server persists the material      // record immediately, so this usually resolves within a few seconds; the      // embedding step can take longer the first time the model loads.      const finalizeUpload = async (attempt = 0) => {
        try {
          const docs: DocumentItem[] = await fetchDocuments();)
          const stored = docs.find((d) => d.id === material.id);)
          if (stored) {
            const realPages = typeof stored.pages === 'number' ? stored.pages : 0;            const pageWord = realPages === 1 ? 'page' : 'pages';            setUploadedDocs((prev) => prev.map((d) => (d.id === material.id ? {
 ...d, pages: realPages }
 : d));)
            setAvailableDocs((prev) => prev.map((d) => (d.id === material.id ? {
 ...d, pages: realPages }
 : d));)
            setUploadStatus(`✓ ${
file.name}
 — ${
realPages}
 ${
pageWord}
 extracted. Ready to use!`);)
            finishUploadLoader('done');)
            return;          }
          if (attempt < 25) {
            setTimeout(() => void finalizeUpload(attempt + 1), 2000);)
          }
 else {
            // One last attempt in case it just finished between polls.            const refreshed: DocumentItem[] = await fetchDocuments();)
            const found = refreshed.find((d) => d.id === material.id);)
            if (found) {
              const realPages = typeof found.pages === 'number' ? found.pages : 0;              setUploadedDocs((prev) => prev.map((d) => (d.id === material.id ? {
 ...d, pages: realPages }
 : d));)
              setAvailableDocs((prev) => prev.map((d) => (d.id === material.id ? {
 ...d, pages: realPages }
 : d));)
              setUploadStatus(`✓ ${
file.name}
 — ${
realPages}
 ${
realPages === 1 ? 'page' : 'pages'}
 extracted. Ready to use!`);)
              finishUploadLoader('done');)
              return;            }
            setUploadStatus(`⚠ ${
file.name}
 is taking longer than usual to index. It may already be ready — try asking a question, or refresh if needed.`);)
            finishUploadLoader('error');)
          }
        }
 catch {
          setUploadStatus(`✓ ${
file.name}
 — uploaded, but could not confirm indexing. Refresh to verify.`);)
          finishUploadLoader('error');)
        }
      }
;      setTimeout(() => void finalizeUpload(0), 2000);)
    }
 catch (error) {
      let message = 'The document could not be uploaded.';      if (error instanceof DOMException && error.name === 'AbortError') {
        message = 'Upload timed out. The file may be too large or the server is busy. Try a smaller file.';      }
 else if (error instanceof TypeError) {
        message = 'Could not reach the server at localhost:8000. Make sure the Python backend is running (python backend/app.py).';      }
 else if (error instanceof Error) {
        message = error.message;      }
      setStage('error');)
      setUploadStatus(message);)
      finishUploadLoader('error');)
    }
 finally {
      clearTimeout(timeoutId);)
      setIsUploading(false);)
      if (fileInputRef.current) fileInputRef.current.value = '';    }
  }
;  const removeUploadedDocument = (documentId: string) => {
    const document = availableDocs.find(item => item.id === documentId);)
    setSelectedDocs(current => current.filter(id => id !== documentId);)
    setUploadStatus(document ? `${
document.name}
 was removed from this chat.` : null);)
  }
;  const send = async (text: string) => {
    if (!text.trim() return;    let conversationId = activeConversationId;    if (!conversationId) {
      const newConv: ChatConversation = {
        conversationId: `chat-${
Date.now()}
-${
Math.random().toString(36).substr(2, 9)}
`,        userId,        role,        title: 'New chat',        messages: [],        updatedAt: new Date().toISOString(),      }
;      setConversations(current => [newConv, ...current]);)
      setActiveConversationId(newConv.conversationId);)
      conversationId = newConv.conversationId;    }
    const userAttachments = selectedDocs      .map(id => availableDocs.find(d => d.id === id)      .filter((d): d is DocumentItem => Boolean(d)      .map(d => ({
 id: d.id, name: d.name }
);)
    const userMsg: ChatMessage = {
 id: `u${
Date.now()}
`, role: 'user', content: text, timestamp: 'Just now', attachments: userAttachments.length > 0 ? userAttachments : undefined }
;    addMessageToConversation(conversationId, userMsg);)
    setInput('');)
    setIsThinking(true);)
    try {
      const selectedDocNames = selectedDocs        .map(id => availableDocs.find(d => d.id === id)?.name)        .filter(Boolean)        .join(', ');)
      const token = typeof window !== 'undefined' ? window.localStorage.getItem('edurag-auth-token') : null;      const res = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',        headers: {
          'Content-Type': 'application/json',          ...(token ? {
 Authorization: 'Bearer ' + token }
 : {
}
),        }
,         body: JSON.stringify({
           userId,           role,           conversationId,           title: conversations.find(c => c.conversationId === conversationId)?.title || text.slice(0, 50),           name: studentProfile.name,           branch: studentProfile.program,           semester: String(studentProfile.semester),           topic: selectedDocNames || 'General Study Material',           difficulty: 'Intermediate',           question: text,           context: selectedDocNames ? `Selected Study Materials: ${
selectedDocNames}
` : 'Syllabus & Lecture Notes',           selectedMaterialIds: selectedDocs,           history: (conversations.find(c => c.conversationId === conversationId)?.messages ?? []).map(msg => ({
             role: msg.role,             content: msg.content,           }
),         }
)      }
);)
      const data = await res.json();)
      if (res.ok && data.success && data.answer) {
         const aiMsg: ChatMessage = {
           id: `a${
Date.now()}
`,           role: 'assistant',           timestamp: 'Just now',           content: data.answer,           sources: Array.isArray(data.sources) && data.sources.length > 0             ? data.sources.map((source: {
 doc?: string; page?: number }
) => ({
                 doc: source.doc ?? 'Document',                 page: source.page ?? 1,                 excerpt: 'Retrieved source material',               }
)             : [],           sourceType: data.source_type === 'document' ? 'document' : 'general',           attachments: Array.isArray(data.attachments) && data.attachments.length > 0             ? data.attachments.map((a: {
 id: string; name: string }
) => ({
 id: a.id, name: a.name }
)             : undefined,         }
;        addMessageToConversation(conversationId, aiMsg);)
      }
 else {
        throw new Error(data.error || 'Failed to fetch AI response');)
      }
     }
 catch (err) {
       const aiMsg: ChatMessage = {
         id: `a${
Date.now()}
`,         role: 'assistant',         timestamp: 'Just now',         content: 'I am temporarily unavailable to answer questions. Please check that the backend server is running and try again in a few moments.',         sources: [],         sourceType: 'general',         attachments: userAttachments.length > 0 ? userAttachments : undefined,       }
;      addMessageToConversation(conversationId, aiMsg);)
    }
 finally {
      setIsThinking(false);)
    }
  }
;  return (    <div className="space-y-6">      <SectionHeader        title="AI Study Assistant"        description="Ask questions from your documents — powered by RAG technology"      />      {
/* Top-center error notice for upload failures (ChatGPT-style banner) */}
      {
uploadStage === 'error' && uploadStatus && (        <div className="fixed top-4 left-1/2 z-50 -translate-x-1/2 animate-fade-in-up">          <div className="flex items-center gap-3 rounded-2xl border border-error-200 bg-white px-4 py-3 shadow-lg shadow-error-900/10 ring-1 ring-error-100/60 max-w-[92vw] sm:max-w-md">            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-error-50 text-error-600">              <XCircle className="h-4 w-4" />            </span>            <p className="text-sm font-medium text-error-700 flex-1">{
uploadStatus}
</p>            <button              type="button"              onClick={
dismissUploadNotice}
              aria-label="Dismiss error"              className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-error-400 hover:bg-error-50 hover:text-error-600 transition-colors"            >              <X className="h-3.5 w-3.5" />            </button>          </div>        </div>      )}
      <div className="flex min-h-[calc(100vh-200px)] rounded-3xl border border-neutral-200 overflow-hidden bg-white shadow-xl shadow-neutral-900/5">        {
/* Chat History Sidebar */}
        {
sidebarOpen && (          <div className="w-72 flex-shrink-0 border-r border-neutral-200 bg-gradient-to-b from-neutral-50 to-white">            <ChatHistorySidebar              activeConversationId={
activeConversationId}
              onSelectConversation={
handleSelectConversation}
              onNewChat={
startNewChat}
              onClose={
() => setSidebarOpen(false)}
              onConversationDeleted={
handleConversationDeleted}
              role={
role}
              userId={
userId}
            />          </div>        )}
        {
/* Chat workspace */}
        <div className="flex-1 flex flex-col min-w-0 bg-white">          {
/* Header */}
          <div className="flex items-center gap-4 px-6 py-5 border-b border-neutral-200 bg-white">            {
!sidebarOpen && (              <button                type="button"                onClick={
() => setSidebarOpen(true)}
                aria-label="Open chat history"                title="Open chat history"                className="grid place-items-center h-10 w-10 rounded-xl text-neutral-500 hover:bg-neutral-100 hover:text-primary-600 transition-colors"              >                <PanelLeft className="h-5 w-5" />              </button>            )}
            <div className="relative grid place-items-center h-12 w-12 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-lg shadow-primary-500/30 ring-1 ring-primary-400/20">              <Brain className="h-6 w-6" />              <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-success-500 border-2 border-white shadow-sm" />            </div>            <div className="flex-1 min-w-0">              <p className="font-display font-semibold text-neutral-900 text-base">EduRAG Assistant</p>              <p className="text-xs text-neutral-500 flex items-center gap-1.5 mt-0.5">                <span className="h-1.5 w-1.5 rounded-full bg-success-500 animate-pulse" />                Online · {
selectedDocs.length}
 source{
selectedDocs.length === 1 ? '' : 's'}
 active              </p>            </div>          </div>          {
/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-gradient-to-b from-white to-neutral-50/30">            {
messages.length === 0 ? (              <div className="h-full flex flex-col items-center justify-center text-center py-12">                <div className="relative grid place-items-center h-24 w-24 rounded-3xl bg-gradient-to-br from-primary-50 via-primary-100 to-primary-50 text-primary-600 mb-6 ring-1 ring-primary-200/60 shadow-lg shadow-primary-500/10">                  <BotIcon className="h-12 w-12" />                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary-500/5 to-transparent" />                </div>                <h3 className="font-display font-semibold text-neutral-900 text-xl mb-3">                  Start a new conversation                </h3>                <p className="text-sm text-neutral-500 max-w-lg leading-relaxed">                  Ask me anything about your study materials, syllabus, or course content. I'll                  provide accurate, sourced answers powered by RAG technology.                </p>                {
suggestedQuestionsDynamic.length > 0 && (                  <div className="mt-8 flex flex-wrap gap-2.5 justify-center">                    {
suggestedQuestionsDynamic.map((q) => (                      <button                        key={
q}
                        onClick={
() => send(q)}
                        className="group text-xs px-4 py-2.5 rounded-2xl bg-white text-primary-700 border border-primary-200 hover:bg-primary-50 hover:border-primary-300 hover:shadow-md hover:-translate-y-0.5 transition-all shadow-sm"                      >                        <span className="flex items-center gap-2">                          <Sparkles className="h-3.5 w-3.5 text-primary-500 group-hover:scale-110 transition-transform" />                          {
q}
                        </span>                      </button>)}
                          </div>                        )}
                        </>                      )}
              </div>            ) : (              messages.map((msg) => {
                const isUser = msg.role === 'user';                return (                  <div                    key={
msg.id}
                    className={
cn(                      'group flex gap-3 animate-fade-in-up',                      isUser && 'flex-row-reverse',                    )}
                  >                    <div                      className={
cn(                        'grid place-items-center h-10 w-10 rounded-xl shrink-0 shadow-sm ring-1',                        isUser                          ? 'bg-neutral-100 text-neutral-600 ring-neutral-200'                          : 'bg-gradient-to-br from-primary-500 to-primary-700 text-white ring-primary-400/30 shadow-md shadow-primary-500/20',                      )}
                    >                      {
isUser ? (                        <span className="text-xs font-bold">AS</span>                      ) : (                        <BotIcon className="h-5 w-5" />                      )}
                    </div>                    <div                      className={
cn(                        'max-w-[75%] rounded-2xl px-5 py-3.5 shadow-sm ring-1',                        isUser                          ? 'bg-primary-600 text-white rounded-tr-md ring-primary-700/50 shadow-primary-600/20'                          : 'bg-white text-neutral-800 rounded-tl-md ring-neutral-200 shadow-neutral-900/5',                      )}
                    >                      {
isUser && editingMessageId === msg.id ? (                        <div className="flex flex-col gap-2">                          <textarea                            value={
editingDraft}
                            onChange={
(event) => setEditingDraft(event.target.value)}
                            onKeyDown={
(event) => {
                              if (event.key === 'Enter' && !event.shiftKey) {
                                event.preventDefault();)
                                setInput(editingDraft);)
                                setEditingMessageId(null);)
                                setEditingDraft('');)
                                const form = event.currentTarget.form;                                if (form) {
                                  form.requestSubmit();)
                                }
 else {
                                  window.setTimeout(() => {
                                    const submitButton = document.querySelector<HTMLButtonElement>(                                      'form[data-ai-chat-form] button[type="submit"]',                                    );)
                                    submitButton?.click();)
                                  }
, 0);)
                                }
                              }
                              if (event.key === 'Escape') {
                                setEditingMessageId(null);)
                                setEditingDraft('');)
                              }
                            }
}
                            autoFocus                            rows={
Math.max(2, editingDraft.split('\n').length)}
                            className="w-full resize-none rounded-xl bg-white/10 border border-white/20 px-3 py-2 text-sm text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/40"                          />                          <div className="flex items-center justify-end gap-2">                            <button                              type="button"                              onClick={
() => {
                                setEditingMessageId(null);)
                                setEditingDraft('');)
                              }
}
                              className="rounded-lg px-3 py-1 text-xs font-medium text-white/80 hover:bg-white/10"                            >                              Cancel                            </button>                            <button                              type="button"                              onClick={
() => {
                                setInput(editingDraft);)
                                setEditingMessageId(null);)
                                setEditingDraft('');)
                                window.setTimeout(() => {
                                  const submitButton = document.querySelector<HTMLButtonElement>(                                    'form[data-ai-chat-form] button[type="submit"]',                                  );)
                                  submitButton?.click();)
                                }
, 0);)
                              }
}
                              className="inline-flex items-center gap-1 rounded-lg bg-white text-primary-700 px-3 py-1 text-xs font-semibold hover:bg-primary-50"                            >                              <Send className="h-3.5 w-3.5" />                              Save & Send                            </button>                          </div>                        </div>                      ) : (                        <>                            {
msg.attachments && msg.attachments.length > 0 && (                          <div className="flex flex-wrap gap-1.5 mb-3">                            {
msg.attachments.map((att) => (                              <span                                key={
att.id}
                                className={
cn(                                  'inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium',                                  isUser                                    ? 'bg-white/15 text-white border border-white/10'                                    : 'bg-neutral-50 border border-neutral-200 text-neutral-700',                                )}
                              >                                <FileText className="h-3.5 w-3.5 shrink-0" />                                <span className="max-w-[10rem] truncate">{
att.name}
</span>                              </span>                            )}
                          </div>                        )}
                        <div                          className={
cn(                            'text-sm whitespace-pre-line leading-relaxed',                            isUser ? 'text-white' : 'text-neutral-800',                          )}
                        >                          {
msg.role === 'assistant' ? (                            <StudyAnswerContent content={
msg.content}
 />                          ) : (                            msg.content                          )}
                         </div>                         {
msg.role === 'assistant' && msg.sourceType && (                           <div                             className={
cn(                               'mt-2 flex items-center gap-1.5 text-xs font-medium',                               msg.sourceType === 'document'                                 ? 'text-success-600'                                 : 'text-neutral-500',                             )}
                           >                             {
msg.sourceType === 'document' ? (                               <>                                 <FileText className="h-3.5 w-3.5" />                                 <span>Based on your uploaded document</span>                               </>                             ) : (                               <>                                 <Sparkles className="h-3.5 w-3.5" />                                 <span>Based on general knowledge</span>                               </>                             )}
                           </div>                         )}
                         {
msg.sources && msg.sources.length > 0 && (                          <div className="mt-4 pt-3 border-t border-neutral-200/60 space-y-2">                            <p                              className={
cn(                                'text-xs font-medium flex items-center gap-1.5',                                isUser ? 'text-primary-100' : 'text-neutral-500',                              )}
                            >                              <Quote className="h-3.5 w-3.5" /> Source References                            </p>                            {
msg.sources.map((src, i) => (                              <div                                key={
i}
                                className={
cn(                                  'flex items-center gap-2.5 text-xs rounded-xl px-3 py-2',                                  isUser                                    ? 'bg-white/10 border border-white/10'                                    : 'bg-neutral-50 border border-neutral-200',                                )}
                              >                                <FileText className="h-3.5 w-3.5 shrink-0 text-neutral-400" />                                <span className="font-medium truncate flex-1">{
src.doc}
</span>                                <span                                  className={
cn(                                    'shrink-0 font-mono text-xs',                                    isUser ? 'text-primary-100' : 'text-neutral-400',                                  )}
                                >                                  p.{
src.page}
                                </span>                              </div>                            )}
                          </div>                        )}
                    </div>                    {
isUser && (                      <div className="flex items-center gap-1 mt-1 self-end opacity-0 group-hover:opacity-100 transition-opacity">                        <button                          type="button"                          onClick={
() => {
                            navigator.clipboard.writeText(msg.content).then(() => {
                              setCopiedMessageId(msg.id);)
                              window.setTimeout(() => {
                                setCopiedMessageId((current) =>                                  current === msg.id ? null : current,                                );)
                              }
, 1500);)
                            }
);)
                          }
}
                          aria-label="Copy message"                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 transition-colors"                        >                          {
copiedMessageId === msg.id ? (                            <>                              <Check className="h-3.5 w-3.5" />                              <span>Copied</span>                            </>                          ) : (                            <>                              <Copy className="h-3.5 w-3.5" />                              <span>Copy</span>                            </>                          )}
                        </button>                        <button                          type="button"                          onClick={
() => {
                            setEditingMessageId(msg.id);)
                            setEditingDraft(msg.content);)
                          }
}
                          aria-label="Edit message"                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 transition-colors"                        >                          <Pencil className="h-3.5 w-3.5" />                          <span>Edit</span>                        </button>                      </div>                    )}
                      <div className="flex items-center gap-1 mt-1 self-end opacity-0 group-hover:opacity-100 transition-opacity">                        <button                          type="button"                          onClick={
() => {
                            navigator.clipboard.writeText(msg.content).then(() => {
                              setCopiedMessageId(msg.id);)
                              window.setTimeout(() => {
                                setCopiedMessageId((current) =>                                  current === msg.id ? null : current,                                );)
                              }
, 1500);)
                            }
);)
                          }
}
                          aria-label="Copy message"                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 transition-colors"                        >                          {
copiedMessageId === msg.id ? (                            <>                              <Check className="h-3.5 w-3.5" />                              <span>Copied</span>                            </>                          ) : (                            <>                              <Copy className="h-3.5 w-3.5" />                              <span>Copy</span>                            </>                          )}
                        </button>                        <button                          type="button"                          onClick={
() => {
                            setEditingMessageId(msg.id);)
                            setEditingDraft(msg.content);)
                          }
}
                          aria-label="Edit message"                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 transition-colors"                        >                          <Pencil className="h-3.5 w-3.5" />                          <span>Edit</span>                        </button>                      </div>                    )}
                  </div>                );)
              }
)            )}
            {
isThinking && (              <div className="flex gap-3 animate-fade-in">                <div className="grid place-items-center h-10 w-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-md shadow-primary-500/20 ring-1 ring-primary-400/30">                  <BotIcon className="h-5 w-5" />                </div>                <div className="bg-white rounded-2xl rounded-tl-md px-4 py-3.5 flex items-center shadow-sm ring-1 ring-neutral-200">                  <div className="animate-typing flex items-end gap-1.5" aria-label="EduRAG Assistant is thinking">                    <span className="h-2.5 w-2.5 rounded-full bg-primary-500" style={
{
 animationDelay: '0ms' }
}
 />                    <span className="h-2.5 w-2.5 rounded-full bg-primary-500" style={
{
 animationDelay: '160ms' }
}
 />                    <span className="h-2.5 w-2.5 rounded-full bg-primary-500" style={
{
 animationDelay: '320ms' }
}
 />                  </div>                </div>              </div>            )}
          </div>          {
/* Suggested questions */}
          {
messages.length <= 2 && suggestedQuestionsDynamic.length > 0 && (            <div className="px-6 pb-3 flex flex-wrap gap-2">              {
suggestedQuestionsDynamic.map((q) => (                <button                  key={
q}
                  onClick={
() => send(q)}
                  className="text-xs px-4 py-2 rounded-xl bg-white text-primary-700 border border-primary-200 hover:bg-primary-50 hover:border-primary-300 hover:shadow-md hover:-translate-y-0.5 transition-all shadow-sm"                >                  <span className="flex items-center gap-1.5">                    <Sparkles className="h-3.5 w-3.5" />                    {
q}
                  </span>                </button>              )}
            </div>          )}
          {
/* Active uploaded files — ChatGPT-style attachment chips */}
          {
selectedDocs.length > 0 && (            <div className="px-6 pb-2 flex flex-wrap gap-2">              {
selectedDocs.map((id) => {
                const doc = availableDocs.find((d) => d.id === id);)
                if (!doc) return null;                return (                  <span                    key={
id}
                    className="inline-flex items-center gap-1.5 rounded-xl pl-2.5 pr-1.5 py-1.5 text-xs font-medium bg-primary-50 border border-primary-200 text-primary-700"                  >                    <FileText className="h-3.5 w-3.5 shrink-0" />                    <span className="max-w-[12rem] truncate">{
doc.name}
</span>                    <button                      type="button"                      onClick={
() => removeUploadedDocument(id)}
                      aria-label={
emove ${
doc.name}
`}
                      className="grid h-4 w-4 place-items-center rounded-full hover:bg-primary-200/70 transition-colors"                    >                      <X className="h-3 w-3" />                    </button>                  </span>                );)
              }
)}
            </div>          )}
          {
/* Input */}
          <div className="p-5 border-t border-neutral-200 bg-gradient-to-b from-neutral-50/50 to-white">            <div className="flex items-center gap-2 bg-white rounded-2xl pl-5 pr-1.5 h-13 border border-neutral-200 shadow-sm focus-within:border-primary-400 focus-within:ring-4 focus-within:ring-primary-500/10 transition-all">              <input                ref={
fileInputRef}
                type="file"                className="sr-only"                accept=".pdf,.pptx,.docx,.txt,.md,.csv,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown,text/csv"                onChange={
(event) => {
                  const file = event.target.files?.[0];                  if (file) void uploadDocument(file);)
                }
}
              />              <button                type="button"                onClick={
() => fileInputRef.current?.click()}
                disabled={
isUploading || uploadStage !== 'idle'}
                aria-label="Add a document"                title={
uploadStage !== 'idle' ? 'Processing document…' : 'Add another document'}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-neutral-500 transition-all hover:bg-primary-50 hover:text-primary-600 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"              >                {
uploadStage !== 'idle' ? (                  <LoaderCircle className="h-4.5 w-4.5 animate-spin" />                ) : (                  <Plus className="h-4.5 w-4.5" />                )}
              </button>              <input                value={
input}
                onChange={
(e) => setInput(e.target.value)}
                onKeyDown={
(e) => e.key === 'Enter' && send(input)}
                placeholder="Ask anything from your documents…"                className="flex-1 bg-transparent text-sm outline-none text-neutral-900 placeholder:text-neutral-400"              />              <Button                size="sm"                icon={
Send}
                onClick={
() => send(input)}
                disabled={
!input.trim()}
                className="h-9 w-9 rounded-xl p-0 flex items-center justify-center"              >                <Send className="h-4 w-4" />              </Button>            </div>            {
uploadStage !== 'idle' ? (              <div className="mt-2.5 flex items-center gap-3 rounded-xl border border-primary-200/70 bg-white px-3.5 py-2 shadow-sm">                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-sm">                  <BotIcon className="h-4 w-4" />                </div>                <div className="min-w-0 flex-1">                  <div className="flex items-center gap-2">                    <span                      className={
cn(                        'truncate text-xs font-medium',                        uploadStage === 'error'                          ? 'text-error-600'                          : uploadStage === 'done'                            ? 'text-success-700'                            : 'text-neutral-700',                      )}
                    >                      {
uploadStatus}
                    </span>                    {
uploadStage === 'done' && <CheckCircle2 className="h-4 w-4 shrink-0 text-success-500" />}
                    {
uploadStage === 'error' && <XCircle className="h-4 w-4 shrink-0 text-error-500" />}
                    {
uploadStage !== 'done' && uploadStage !== 'error' && (                      <span className="animate-typing flex items-end gap-1" aria-hidden>                        <span className="h-1.5 w-1.5 rounded-full bg-primary-500" style={
{
 animationDelay: '0ms' }
}
 />                        <span className="h-1.5 w-1.5 rounded-full bg-primary-500" style={
{
 animationDelay: '160ms' }
}
 />                        <span className="h-1.5 w-1.5 rounded-full bg-primary-500" style={
{
 animationDelay: '320ms' }
}
 />                      </span>                    )}
                  </div>                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">                    <div                      className={
cn(                        'h-full rounded-full transition-all duration-500',                        uploadStage === 'error'                          ? 'bg-error-500'                          : uploadStage === 'done'                            ? 'bg-success-500'                            : 'bg-primary-500',                      )}
                      style={
{
                        width: `${
                          uploadStage === 'uploading'                            ? 20                            : uploadStage === 'extracting'                              ? 45                              : uploadStage === 'indexing'                                ? 75                                : 100                        }
%`,                      }
}
                    />                  </div>                </div>              </div>            ) : (              <p className="mt-2.5 text-xs text-neutral-500" aria-live="polite">                {
uploadStatus ??                  'Attach a PDF, PPTX, DOCX, TXT, MD, or CSV document (maximum 10 MB).'}
              </p>            )}
          </div>        </div>        {
/* Sources sidebar — searchable list of the student's documents */}
        <div className="w-72 flex-shrink-0 border-l border-neutral-200 bg-gradient-to-b from-neutral-50 to-white overflow-y-auto hidden lg:block">          <div className="p-4 space-y-4">            <Card>              <CardHeader title="Search Documents" icon={
Search}
 />              <CardBody className="pt-4 space-y-3">                <div className="flex items-center gap-2 h-10 px-3 rounded-xl bg-white border border-neutral-200 focus-within:border-primary-400 focus-within:ring-2 focus-within:ring-primary-500/20 transition-all shadow-sm">                  <Search className="h-4 w-4 text-neutral-400 shrink-0" />                  <input                    value={
docQuery}
                    onChange={
(e) => setDocQuery(e.target.value)}
                    placeholder="Search your documents…"                    className="flex-1 bg-transparent text-sm outline-none text-neutral-900 placeholder:text-neutral-400"                  />                </div>                <div className="space-y-2 max-h-72 overflow-y-auto">                  {
availableDocs.filter((d) =>                    d.name.toLowerCase().includes(docQuery.toLowerCase(),                  ).length === 0 ? (                    <p className="text-xs text-neutral-500 py-2 text-center">                      {
docQuery ? 'No documents match your search.' : 'No documents yet. Use the + button to upload.'}
                    </p>                  ) : (                    availableDocs                      .filter((d) => d.name.toLowerCase().includes(docQuery.toLowerCase())                      .map((d) => {
                        const isSelected = selectedDocs.includes(d.id);)
                        return (                          <button                            key={
d.id}
                            type="button"                            onClick={
() =>                              setSelectedDocs((current) =>                                isSelected                                  ? current.filter((id) => id !== d.id)                                  : [...new Set([...current, d.id])],                              )                            }
                            className={
cn(                              'w-full flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-colors',                              isSelected                                ? 'border-primary-300 bg-primary-50'                                : 'border-neutral-200 hover:bg-neutral-50',                            )}
                          >                            <FileText className={
cn('h-4 w-4 shrink-0', isSelected ? 'text-primary-600' : 'text-neutral-400')}
 />                            <div className="min-w-0 flex-1">                              <p className="text-sm font-medium text-neutral-800 truncate">{
d.name}
</p>                              <p className="text-xs text-neutral-400 truncate">{
d.course}
</p>                            </div>                            {
isSelected && (                              <CheckCircle2 className="h-4 w-4 text-primary-600 shrink-0" />                            )}
                          </button>                        );)
                      }
)                  )}
                </div>              </CardBody>            </Card>            <p className="text-xs text-neutral-400 px-1 leading-relaxed">              Tap a document to include it as a source. Selected files are used to ground the assistant's answers.            </p>          </div>        </div>      </div>    </div>  );)
}
/* ============ NOTES GENERATOR ============ */export function StudentNotes() {
  const [generated, setGenerated] = useState(false);)
  const [type, setType] = useState<'summary' | 'keypoints' | 'definitions' | 'formulas'>('summary');)
  const [topic, setTopic] = useState('');)
  const [courses, setCourses] = useState<any[]>([]);)
  const [docs, setDocs] = useState<any[]>([]);)
  const [uploadedDocs, setUploadedDocs] = useState<any[]>([]);)
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);)
  const [isUploading, setIsUploading] = useState(false);)
  const [isGenerating, setIsGenerating] = useState(false);)
  const [generatedNote, setGeneratedNote] = useState<{
 title: string; body: string }
 | null>(null);)
  const [recentNotes, setRecentNotes] = useState<{
 id: string; title: string; course?: string; chapter?: string; createdAt: string }
[]>([]);)
  const fileInputRef = useRef<HTMLInputElement>(null);)
  const noteTypes = [    {
 id: 'summary' as const, label: 'Chapter Summary', icon: FileText, tone: 'primary' }
,    {
 id: 'keypoints' as const, label: 'Key Points', icon: Sparkles, tone: 'accent' }
,    {
 id: 'definitions' as const, label: 'Definitions', icon: BookMarked, tone: 'secondary' }
,    {
 id: 'formulas' as const, label: 'Formula Sheet', icon: Zap, tone: 'warning' }
,  ];  useEffect(() => {
    let cancelled = false;    const load = async () => {
      const [c, d] = await Promise.all([fetchStudentCourses(), fetchDocuments()]);)
      if (!cancelled) {
        setCourses(c);)
        setDocs(d);)
      }
    }
;    load();)
    return () => {
 cancelled = true; }
;  }
, []);)
  const uploadDocument = async (file: File) => {
    const allowedExtensions = ['pdf', 'pptx', 'docx', 'txt', 'md', 'csv'];    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';    if (!allowedExtensions.includes(extension) {
      setUploadStatus('Unsupported file. Upload PDF, PPTX, DOCX, TXT, MD, or CSV files.');)
      return;    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadStatus('This file is larger than 10 MB. Please choose a smaller document.');)
      return;    }
    setIsUploading(true);)
    setUploadStatus(`Uploading ${
file.name}
…`);)
    const controller = new AbortController();)
    const timeoutId = setTimeout(() => controller.abort(), 300_000);)
    try {
      const formData = new FormData();)
      formData.append('file', file, file.name);)
      formData.append('studentId', getCurrentUserId();)
      formData.append('course', 'Personal study material');)
      setUploadStatus(`Uploading ${
file.name}
 — extracting text…`);)
      const res = await fetch('http://localhost:8000/api/materials/upload', {
        method: 'POST',        headers: {
          ...(typeof window !== 'undefined' && window.localStorage.getItem('edurag-auth-token')            ? {
 Authorization: `Bearer ${
window.localStorage.getItem('edurag-auth-token')}
` }
            : {
}
),        }
,        body: formData,        signal: controller.signal,      }
);)
      clearTimeout(timeoutId);)
      const data = await res.json();)
      if (!res.ok || !data.success || !data.material) {
        throw new Error(data.error || 'The document could not be uploaded.');)
      }
      const material = data.material;      const uploadedDoc = {
        id: material.id,        name: material.name,        type: extension === 'pptx' ? 'ppt' : extension === 'docx' ? 'doc' : extension === 'md' ? 'doc' : extension === 'csv' ? 'doc' : extension,        course: material.course,        size: `${
(file.size / 1024 / 1024).toFixed(file.size < 1024 * 1024 ? 1 : 2)}
 MB`,        uploadedAt: 'Just now',        uploadedBy: 'You',        pages: material.pages,        status: 'approved',      }
;      setUploadedDocs(current => [...current, uploadedDoc]);)
      setDocs(current => [...current, uploadedDoc]);)
      setUploadStatus(`✓ ${
file.name}
 uploaded and ready for note generation.`);)
    }
 catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setUploadStatus('Upload timed out. The file may be too large or the server is busy. Try a smaller file.');)
      }
 else if (error instanceof TypeError) {
        setUploadStatus('Could not reach the server at localhost:8000. Make sure the Python backend is running (python backend/app.py).');)
      }
 else {
        setUploadStatus(error instanceof Error ? error.message : 'The document could not be uploaded.');)
      }
    }
 finally {
      clearTimeout(timeoutId);)
      setIsUploading(false);)
      if (fileInputRef.current) fileInputRef.current.value = '';    }
  }
;  const generateNotes = async () => {
    if (uploadedDocs.length === 0 && docs.length === 0) {
      setUploadStatus('Please upload a document or select an existing one first.');)
      return;    }
    setIsGenerating(true);)
    setGenerated(false);)
    setGeneratedNote(null);)
    try {
      const selectedDoc = uploadedDocs.length > 0 ? uploadedDocs[uploadedDocs.length - 1] : docs[0];      const promptMap: Record<typeof type, string> = {
        summary: 'Generate a comprehensive chapter summary',        keypoints: 'Extract key points and highlights',        definitions: 'List important definitions and terms',        formulas: 'Create a formula sheet with all key formulas',      }
;      const payload = {
        userId: getCurrentUserId(),        role: getCurrentUserRole(),        conversationId: notes-${
Date.now()}
`,        title: `${
promptMap[type]}
 — ${
topic || selectedDoc.name}
`,        name: '',        branch: '',        semester: '',        topic: topic || selectedDoc.name,        difficulty: 'Intermediate',        question: `${
promptMap[type]}
 from the document "${
selectedDoc.name}
".${
topic ? ` Focus on the chapter/topic: ${
topic}
.` : ''}
 Format the output clearly with headings and bullet points.`,        context: `Study Material: ${
selectedDoc.name}
`,        selectedMaterialIds: [selectedDoc.id],      }
;      const token = typeof window !== 'undefined' ? window.localStorage.getItem('edurag-auth-token') : null;      const res = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',        headers: {
          'Content-Type': 'application/json',          ...(token ? {
 Authorization: 'Bearer ' + token }
 : {
}
),        }
,        body: JSON.stringify(payload),      }
);)
      const data = await res.json();)
      if (res.ok && data.success && data.answer) {
        const note = {
          id: note-${
Date.now()}
`,          title: `${
promptMap[type]}
 — ${
topic || selectedDoc.name}
`,          body: data.answer,        }
;        setGeneratedNote(note);)
        setGenerated(true);)
        setRecentNotes(current => [{
          id: note.id,          title: note.title,          course: selectedDoc.course,          chapter: topic || selectedDoc.name,          createdAt: 'Just now',        }
, ...current]);)
      }
 else {
        throw new Error(data.error || 'Failed to generate notes');)
      }
    }
 catch (err) {
      setUploadStatus(err instanceof Error ? err.message : 'Failed to generate notes. Please try again.');)
    }
 finally {
      setIsGenerating(false);)
    }
  }
;  const removeUploadedDocument = (docId: string) => {
    setUploadedDocs(current => current.filter(d => d.id !== docId);)
    setUploadStatus(null);)
  }
;  return (    <div className="space-y-6">      <SectionHeader title="Notes Generator" description="Generate smart notes from your course materials using AI" />      <div className="grid lg:grid-cols-3 gap-6">        <Card className="lg:col-span-1 border-neutral-200 shadow-sm hover:shadow-md transition-shadow">          <CardHeader title="Generate Notes" subtitle="Upload or select a document" icon={
Sparkles}
 />          <CardBody className="space-y-5">            <div>              <label className="text-sm font-semibold text-neutral-700 mb-2.5 block">Upload Document</label>              <input                ref={
fileInputRef}
                type="file"                className="sr-only"                accept=".pdf,.pptx,.docx,.txt,.md,.csv,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown,text/csv"                onChange={
event => {
                  const file = event.target.files?.[0];                  if (file) void uploadDocument(file);)
                }
}
              />              <button                type="button"                onClick={
() => fileInputRef.current?.click()}
                disabled={
isUploading}
                className="w-full flex items-center justify-center gap-2 h-11 px-4 rounded-xl border border-dashed border-neutral-300 text-sm font-semibold text-neutral-600 hover:border-primary-400 hover:text-primary-700 hover:bg-primary-50/50 transition-all disabled:cursor-not-allowed disabled:opacity-50"              >                {
isUploading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {
isUploading ? 'Uploading…' : 'Upload PDF, PPTX, DOCX, TXT, MD, CSV'}
              </button>              {
uploadStatus && (                <p className={
`mt-2.5 text-xs font-medium ${
uploadStatus?.includes('✓') ? 'text-success-600' : 'text-neutral-500'}
`}
 aria-live="polite">                  {
uploadStatus}
                </p>              )}
            </div>            {
uploadedDocs.length > 0 && (              <div className="space-y-2.5">                <label className="text-sm font-semibold text-neutral-700 mb-2 block">Uploaded Documents</label>                {
uploadedDocs.map(doc => (                  <div key={
doc.id}
 className="flex items-center gap-3 p-3 rounded-xl border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 transition-colors">                    <FileText className="h-4.5 w-4.5 text-primary-600 shrink-0" />                    <span className="flex-1 text-sm text-neutral-700 font-medium truncate">{
doc.name}
</span>                    <button                      type="button"                      onClick={
() => removeUploadedDocument(doc.id)}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-error-600 hover:bg-error-50 transition-colors"                      title="Remove"                    >                      <X className="h-4 w-4" />                    </button>                  </div>                )}
              </div>            )}
            <div>              <label className="text-sm font-semibold text-neutral-700 mb-2.5 block">Chapter or Topic</label>              <input                type="text"                value={
topic}
                onChange={
e => setTopic(e.target.value)}
                placeholder="Enter chapter or topic"                className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-sm outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"              />            </div>            <div>              <label className="text-sm font-semibold text-neutral-700 mb-2.5 block">Note Type</label>              <div className="grid grid-cols-2 gap-2.5">                {
noteTypes.map(nt => {
                  const Icon = nt.icon;                  const isActive = type === nt.id;                  return (                    <button key={
nt.id}
 onClick={
() => setType(nt.id)}
 className={
cn('flex flex-col items-center gap-2.5 p-4 rounded-xl border text-xs font-bold transition-all', isActive ? cn(`border-${
nt.tone}
-300 bg-${
nt.tone}
-50 text-${
nt.tone}
-700 shadow-md`) : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50 bg-white')}
>                      <Icon className="h-5.5 w-5.5" /> {
nt.label}
                    </button>                  );)
                }
)}
              </div>            </div>            <Button icon={
Sparkles}
 className="w-full h-11" onClick={
generateNotes}
 disabled={
isGenerating || (uploadedDocs.length === 0 && docs.length === 0)}
>              {
isGenerating ? 'Generating…' : 'Generate Smart Notes'}
            </Button>          </CardBody>        </Card>        <div className="lg:col-span-2">          {
!generated ? (            <Card className="h-full border-neutral-200 shadow-sm">              <CardBody>                <EmptyState icon={
StickyNote}
 title="No notes generated yet" description="Upload a document or select an existing one, choose a note type, then click Generate to create AI-powered study notes." />              </CardBody>            </Card>          ) : (            <Card className="h-full flex flex-col border-neutral-200 shadow-sm">              <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">                <div className="flex items-center gap-3">                  <Badge tone="primary"><Sparkles className="h-3.5 w-3.5" /> Generated by AI Assistant (RAG)</Badge>                  <span className="text-xs text-neutral-400 font-medium">Just now</span>                </div>                <div className="flex items-center gap-2">                  <Button variant="ghost" size="sm" icon={
Download}
>Export</Button>                  <Button variant="ghost" size="sm" icon={
BookmarkIcon}
>Save</Button>                </div>              </div>              <div className="p-6 flex-1 overflow-y-auto">                <h2 className="text-xl font-bold font-display text-neutral-900 mb-4">{
generatedNote?.title}
</h2>                <div className="prose prose-sm max-w-none">                  <pre className="whitespace-pre-wrap font-sans text-sm text-neutral-700 leading-relaxed">{
generatedNote?.body}
</pre>                </div>              </div>            </Card>          )}
        </div>      </div>      {
recentNotes.length > 0 && (        <Card className="border-neutral-200 shadow-sm hover:shadow-md transition-shadow">          <CardHeader title="Recently Generated Notes" icon={
StickyNote}
 />          <CardBody>            <div className="space-y-2">              {
recentNotes.map((note) => (                <div key={
note.id}
 className="flex items-center gap-4 p-4 rounded-xl border border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300 transition-all bg-white">                  <div className="grid place-items-center h-11 w-11 rounded-xl bg-primary-100 text-primary-600"><FileText className="h-5.5 w-5.5" /></div>                  <div className="flex-1 min-w-0">                    <p className="text-sm font-semibold text-neutral-900 truncate">{
note.title}
</p>                    <p className="text-xs text-neutral-500 mt-1">{
note.course}
 · {
note.chapter}
 · {
note.createdAt}
</p>                    <p className="text-xs font-bold text-primary-700 mt-1.5">Generated by AI Assistant (RAG)</p>                  </div>                  <Button variant="ghost" size="sm" icon={
Download}
>Open</Button>                </div>              )}
            </div>          </CardBody>        </Card>      )}
    </div>  );)
}



