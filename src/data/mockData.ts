import {
  BookOpen, Brain, FileText, GraduationCap, Lightbulb, FlaskConical, Layers,
  Presentation, Calculator, Microscope, Atom, Globe, Code2, Palette, Database,
} from 'lucide-react';
import { getCurrentAccount } from '@/lib/auth';

export const student = {
  name: 'Aarav Sharma',
  id: 'STU-2024-0142',
  email: 'aarav.sharma@edurag.edu',
  program: 'B.Tech Computer Science',
  semester: 5,
  year: '3rd Year',
  avatar: undefined as string | undefined,
  joinedAt: '2023-08-15',
  goalToday: 'Complete 2 chapters of Data Structures',
  goalProgress: 65,
  streak: 14,
  credits: 96,
};

export type StudentProfile = typeof student;

export function getStudentProfile(): StudentProfile {
  const account = getCurrentAccount();

  if (!account || account.role !== 'student') {
    return student;
  }

  const details = account.details ?? {};
  const semesterValue = Number.parseInt(details.semester ?? '', 10);

  return {
    ...student,
    name: account.name || student.name,
    email: account.email || student.email,
    id: details.rollNo || student.id,
    program: details.branch
      ? `B.Tech ${details.branch}`
      : student.program,
    semester: Number.isFinite(semesterValue) ? semesterValue : student.semester,
    year: details.classYear ? `${details.classYear}` : student.year,
    joinedAt: account.createdAt && account.createdAt !== 'demo'
      ? account.createdAt.slice(0, 10)
      : student.joinedAt,
  };
}

export type Course = {
  id: string;
  code: string;
  title: string;
  instructor: string;
  icon: typeof BookOpen;
  color: string;
  progress: number;
  modules: number;
  completedModules: number;
  nextLesson: string;
  students?: number;
  credits: number;
  category: string;
  year?: string;
  department?: string;
};

export const studentCourses: Course[] = [
  { id: 'c1', code: 'CS501', title: 'Data Structures & Algorithms', instructor: 'Dr. Priya Nair', icon: Layers, color: 'primary', progress: 78, modules: 12, completedModules: 9, nextLesson: 'Graph Traversal — BFS & DFS', credits: 4, category: 'Core' },
  { id: 'c2', code: 'CS503', title: 'Database Management Systems', instructor: 'Prof. Meera Iyer', icon: Database, color: 'secondary', progress: 64, modules: 10, completedModules: 6, nextLesson: 'Normalization — 3NF & BCNF', credits: 3, category: 'Core' },
  { id: 'c3', code: 'CS505', title: 'Operating Systems', instructor: 'Dr. Vikram Singh', icon: FlaskConical, color: 'accent', progress: 52, modules: 11, completedModules: 5, nextLesson: 'Process Scheduling Algorithms', credits: 4, category: 'Core' },
  { id: 'c4', code: 'CS507', title: 'Computer Networks', instructor: 'Dr. Anjali Rao', icon: Globe, color: 'success', progress: 41, modules: 9, completedModules: 3, nextLesson: 'TCP/IP Model in Depth', credits: 3, category: 'Elective' },
  { id: 'c5', code: 'MA501', title: 'Discrete Mathematics', instructor: 'Prof. Suresh Menon', icon: Calculator, color: 'warning', progress: 88, modules: 8, completedModules: 7, nextLesson: 'Graph Theory Applications', credits: 3, category: 'Foundation' },
  { id: 'c6', code: 'CS509', title: 'Machine Learning Foundations', instructor: 'Dr. Kavya Reddy', icon: Brain, color: 'primary', progress: 35, modules: 14, completedModules: 4, nextLesson: 'Supervised Learning — Linear Regression', credits: 4, category: 'Elective' },
];

export type DocumentItem = {
  id: string;
  name: string;
  type: 'pdf' | 'ppt' | 'doc' | 'video';
  course: string;
  size: string;
  uploadedAt: string;
  uploadedBy: string;
  pages?: number;
  status?: 'approved' | 'pending' | 'rejected';
  year?: string;
  department?: string;
};

export const documents: DocumentItem[] = [
  { id: 'd1', name: 'Graph Algorithms — Complete Notes', type: 'pdf', course: 'CS501', size: '4.2 MB', uploadedAt: '2 hours ago', uploadedBy: 'Dr. Priya Nair', pages: 48, status: 'approved' },
  { id: 'd2', name: 'Normalization — Lecture Slides', type: 'ppt', course: 'CS503', size: '12.8 MB', uploadedAt: '1 day ago', uploadedBy: 'Prof. Meera Iyer', pages: 64, status: 'approved' },
  { id: 'd3', name: 'Process Scheduling — Lab Manual', type: 'doc', course: 'CS505', size: '1.1 MB', uploadedAt: '3 days ago', uploadedBy: 'Dr. Vikram Singh', pages: 22, status: 'approved' },
  { id: 'd4', name: 'TCP-IP Reference Model', type: 'pdf', course: 'CS507', size: '3.5 MB', uploadedAt: '5 days ago', uploadedBy: 'Dr. Anjali Rao', pages: 31, status: 'approved' },
  { id: 'd5', name: 'Graph Theory — Problem Set', type: 'pdf', course: 'MA501', size: '892 KB', uploadedAt: '1 week ago', uploadedBy: 'Prof. Suresh Menon', pages: 8, status: 'approved' },
  { id: 'd6', name: 'Linear Regression — Notes', type: 'pdf', course: 'CS509', size: '2.1 MB', uploadedAt: '1 week ago', uploadedBy: 'Dr. Kavya Reddy', pages: 19, status: 'approved' },
];

export type Quiz = {
  id: string;
  title: string;
  course: string;
  questions: number;
  duration: number;
  score?: number;
  status: 'upcoming' | 'completed' | 'in-progress';
  dueDate: string;
  topic: string;
};

export const quizzes: Quiz[] = [
  { id: 'q1', title: 'Graph Algorithms Quiz', course: 'CS501', questions: 20, duration: 30, score: 85, status: 'completed', dueDate: 'Completed 2d ago', topic: 'BFS, DFS, Shortest Path' },
  { id: 'q2', title: 'DBMS Normalization Quiz', course: 'CS503', questions: 15, duration: 25, score: 72, status: 'completed', dueDate: 'Completed 5d ago', topic: '1NF to BCNF' },
  { id: 'q3', title: 'Process Scheduling Quiz', course: 'CS505', questions: 25, duration: 40, status: 'upcoming', dueDate: 'Due in 2 days', topic: 'FCFS, SJF, Round Robin' },
  { id: 'q4', title: 'Discrete Math — Graph Theory', course: 'MA501', questions: 20, duration: 30, score: 92, status: 'completed', dueDate: 'Completed 1w ago', topic: 'Trees, Euler, Hamilton' },
  { id: 'q5', title: 'ML Foundations Quiz', course: 'CS509', questions: 18, duration: 30, status: 'upcoming', dueDate: 'Due in 5 days', topic: 'Regression & Classification' },
];

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: { doc: string; page: number; excerpt: string }[];
  sourceType?: 'document' | 'general';
  attachments?: { id: string; name: string }[];
  timestamp: string;
};

export const chatHistory: ChatMessage[] = [
  {
    id: 'm1', role: 'user', content: 'Explain the difference between BFS and DFS with examples.', timestamp: '10:32 AM',
  },
  {
    id: 'm2', role: 'assistant', timestamp: '10:32 AM',
    content: 'BFS (Breadth-First Search) explores all neighbors at the current depth before moving deeper, using a queue. DFS (Depth-First Search) explores as far as possible along each branch before backtracking, using a stack or recursion.\n\nExample — Graph: A→B, A→C, B→D, C→D\n• BFS from A: A, B, C, D\n• DFS from A: A, B, D, C\n\nBFS finds shortest paths in unweighted graphs. DFS is better for topological sorting and cycle detection.',
    sources: [
      { doc: 'Graph Algorithms — Complete Notes', page: 12, excerpt: 'BFS uses a queue; DFS uses a stack or recursion...' },
      { doc: 'Graph Algorithms — Complete Notes', page: 15, excerpt: 'BFS is optimal for unweighted shortest path...' },
    ],
  },
  {
    id: 'm3', role: 'user', content: 'When should I prefer DFS over BFS?', timestamp: '10:34 AM',
  },
  {
    id: 'm4', role: 'assistant', timestamp: '10:34 AM',
    content: 'Prefer DFS when:\n1. You need to detect cycles in a directed graph\n2. Topological sorting is required\n3. Finding connected components\n4. Solving puzzles like mazes (path existence)\n5. Memory is constrained (DFS uses O(depth) vs BFS O(width))\n\nPrefer BFS when shortest path matters in unweighted graphs.',
    sources: [{ doc: 'Graph Algorithms — Complete Notes', page: 18, excerpt: 'DFS is preferred for cycle detection and topological sort...' }],
  },
];

export const suggestedQuestions = [
  'Explain Dijkstra\'s algorithm with an example',
  'What is the difference between a tree and a graph?',
  'How does Kruskal\'s algorithm work?',
  'What are strongly connected components?',
  'Compare Prim\'s and Kruskal\'s MST algorithms',
];

export type Notification = {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'quiz' | 'announcement' | 'ai';
  read: boolean;
};

export const notifications: Notification[] = [
  { id: 'n2', title: 'Quiz Reminder', message: 'Process Scheduling Quiz is due in 2 days. Don\'t forget to prepare!', time: '3 hours ago', type: 'quiz', read: false },
  { id: 'n3', title: 'New Study Material', message: '"Normalization — Lecture Slides" uploaded to CS503.', time: '1 day ago', type: 'announcement', read: false },
  { id: 'n4', title: 'AI Notes Ready', message: 'Your Smart Notes for "Graph Algorithms" chapter have been generated.', time: '2 days ago', type: 'ai', read: true },
  { id: 'n5', title: 'Quiz Graded', message: 'Your Discrete Math quiz has been graded. Score: 92/100.', time: '3 days ago', type: 'quiz', read: true },
  { id: 'n6', title: 'Course Announcement', message: 'Prof. Meera Iyer: Tomorrow\'s DBMS class shifted to Lab 3.', time: '4 days ago', type: 'announcement', read: true },
];

export const recentActivity = [
  { id: 'ra1', action: 'Completed Quiz', detail: 'Graph Algorithms Quiz — scored 85%', time: '2 hours ago', icon: 'quiz' as const },
  { id: 'ra2', action: 'AI Chat Session', detail: 'Asked 4 questions on Graph Algorithms', time: '5 hours ago', icon: 'ai' as const },
  { id: 'ra3', action: 'Generated Notes', detail: 'Chapter Summary for "Process Scheduling"', time: 'Yesterday', icon: 'notes' as const },
  { id: 'ra4', action: 'Reviewed faculty material', detail: 'Normalization — Lecture Slides for CS503', time: '3 days ago', icon: 'notes' as const },
];

export type Note = {
  id: string;
  title: string;
  type: 'summary' | 'keypoints' | 'definitions' | 'formulas';
  course: string;
  chapter: string;
  content: string;
  createdAt: string;
};

export const generatedNotes: Note[] = [
  {
    id: 'note1', title: 'Graph Algorithms — Chapter Summary', type: 'summary', course: 'CS501', chapter: 'Graph Traversal',
    content: 'This chapter covers fundamental graph traversal techniques including BFS and DFS, their implementations, complexity analysis, and applications. BFS uses a queue and is optimal for unweighted shortest paths. DFS uses recursion/stack and is essential for cycle detection, topological sort, and strongly connected components. The chapter also introduces Dijkstra\'s algorithm for weighted shortest paths and Kruskal\'s/Prim\'s for minimum spanning trees.',
    createdAt: '2 days ago',
  },
];

export const weeklyStudyData = [
  { day: 'Mon', hours: 3.5 }, { day: 'Tue', hours: 4.2 }, { day: 'Wed', hours: 2.8 },
  { day: 'Thu', hours: 5.1 }, { day: 'Fri', hours: 3.9 }, { day: 'Sat', hours: 6.2 }, { day: 'Sun', hours: 4.5 },
];

export const quizScoreData = [
  { quiz: 'Graph Alg', score: 85 }, { quiz: 'DBMS Norm', score: 72 },
  { quiz: 'Disc Math', score: 92 }, { quiz: 'OS Basics', score: 68 },
  { quiz: 'Net Intro', score: 78 }, { quiz: 'ML Found', score: 81 },
];

export const topicAnalysis = {
  strong: ['Graph Theory', 'Sorting Algorithms', 'Discrete Mathematics', 'Recursion'],
  weak: ['Process Scheduling', 'Normalization (BCNF)', 'TCP/IP Layering', 'Gradient Descent'],
};

export const aiUsageStats = {
  totalQueries: 142,
  notesGenerated: 18,
  quizzesGenerated: 6,
  weeklyQueries: [
    { day: 'Mon', count: 12 }, { day: 'Tue', count: 18 }, { day: 'Wed', count: 9 },
    { day: 'Thu', count: 22 }, { day: 'Fri', count: 15 }, { day: 'Sat', count: 28 }, { day: 'Sun', count: 11 },
  ],
};

export const bookmarks = [
  { id: 'b1', type: 'answer', title: 'BFS vs DFS — Detailed comparison', detail: 'AI Chat · CS501', time: '2d ago' },
  { id: 'b2', type: 'note', title: 'Normalization — Chapter Summary', detail: 'Smart Notes · CS503', time: '5d ago' },
  { id: 'b3', type: 'document', title: 'Graph Algorithms — Complete Notes', detail: 'My Library · CS501', time: '1w ago' },
  { id: 'b4', type: 'answer', title: 'When to prefer DFS over BFS', detail: 'AI Chat · CS501', time: '1w ago' },
  { id: 'b5', type: 'note', title: 'Process Scheduling — Key Points', detail: 'Smart Notes · CS505', time: '2w ago' },
];

export const students = [
  { id: 's1', name: 'Aarav Sharma', rollNo: 'STU-2024-0142', course: 'CS501', progress: 78, avgScore: 84, avatar: undefined, email: 'aarav@edurag.edu', semester: 5 },
  { id: 's2', name: 'Ishita Verma', rollNo: 'STU-2024-0143', course: 'CS501', progress: 92, avgScore: 91, avatar: undefined, email: 'ishita@edurag.edu', semester: 5 },
  { id: 's3', name: 'Rohan Gupta', rollNo: 'STU-2024-0144', course: 'CS501', progress: 45, avgScore: 63, avatar: undefined, email: 'rohan@edurag.edu', semester: 5 },
  { id: 's4', name: 'Sneha Patel', rollNo: 'STU-2024-0145', course: 'CS501', progress: 71, avgScore: 79, avatar: undefined, email: 'sneha@edurag.edu', semester: 5 },
  { id: 's5', name: 'Karthik Nair', rollNo: 'STU-2024-0146', course: 'CS501', progress: 88, avgScore: 87, avatar: undefined, email: 'karthik@edurag.edu', semester: 5 },
  { id: 's6', name: 'Diya Reddy', rollNo: 'STU-2024-0147', course: 'CS501', progress: 62, avgScore: 75, avatar: undefined, email: 'diya@edurag.edu', semester: 5 },
];

export const announcements = [
  { id: 'an1', title: 'Mid-Semester Exam Schedule Released', body: 'The mid-sem exams will be held from Sep 5–12. Check the detailed schedule on the portal.', author: 'Prof. Rajesh Kumar', audience: 'All Students', date: 'Aug 3, 2026', status: 'sent' as const },
  { id: 'an2', title: 'AI Workshop on RAG Systems', body: 'A hands-on workshop on Retrieval-Augmented Generation will be conducted this Saturday from 10 AM to 1 PM in Auditorium 2.', author: 'Dr. Priya Nair', audience: 'CS Students', date: 'Aug 2, 2026', status: 'sent' as const },
  { id: 'an3', title: 'Library Hours Extended', body: 'The central library will remain open until 11 PM during exam weeks. Take advantage of the quiet study zones.', author: 'Prof. Rajesh Kumar', audience: 'All', date: 'Jul 30, 2026', status: 'scheduled' as const },
];

export const calendarEvents = [
  { id: 'ce2', title: 'Process Scheduling Quiz', date: 'Aug 7', type: 'quiz' as const, time: '2:00 PM' },
  { id: 'ce3', title: 'Mid-Sem Exam Begins', date: 'Sep 5', type: 'exam' as const, time: '9:00 AM' },
  { id: 'ce4', title: 'ML Foundations Quiz', date: 'Aug 10', type: 'quiz' as const, time: '10:00 AM' },
  { id: 'ce5', title: 'AI Workshop', date: 'Aug 9', type: 'event' as const, time: '10:00 AM' },
];

export const messages = [
  { id: 'msg1', from: 'Aarav Sharma', subject: 'Doubt in Red-Black Tree deletion', preview: 'I am facing difficulty understanding the deletion cases in Red-Black trees...', time: '1 hour ago', unread: true, course: 'CS501' },
  { id: 'msg2', from: 'Ishita Verma', subject: 'Clarification on BFS complexity', preview: 'Is the time complexity of BFS the same for adjacency matrix and adjacency list?', time: '4 hours ago', unread: true, course: 'CS501' },
  { id: 'msg3', from: 'Rohan Gupta', subject: 'Question about graph traversal', preview: 'Could you clarify the difference between BFS and DFS?', time: '1 day ago', unread: false, course: 'CS501' },
];

export const quizQuestions = [
  { id: 'qq1', question: 'What is the time complexity of BFS using an adjacency list?', options: ['O(V)', 'O(V + E)', 'O(V * E)', 'O(V²)'], correct: 1 },
  { id: 'qq2', question: 'Which data structure does DFS use?', options: ['Queue', 'Stack', 'Heap', 'Hash Table'], correct: 1 },
  { id: 'qq3', question: 'Dijkstra\'s algorithm is used for finding?', options: ['Minimum Spanning Tree', 'Shortest path in weighted graph', 'Maximum flow', 'Topological sort'], correct: 1 },
  { id: 'qq4', question: 'Kruskal\'s algorithm uses which data structure to detect cycles?', options: ['Stack', 'Queue', 'Union-Find', 'Hash Map'], correct: 2 },
  { id: 'qq5', question: 'What is the space complexity of DFS?', options: ['O(V)', 'O(E)', 'O(V + E)', 'O(V²)'], correct: 0 },
];

export const quizResults = [
  { id: 'qr1', quizId: 'q1', question: 'What is the time complexity of BFS using adjacency list?', yourAnswer: 'O(V + E)', correct: true },
  { id: 'qr2', quizId: 'q1', question: 'Which data structure does DFS use?', yourAnswer: 'Heap', correct: false },
  { id: 'qr3', quizId: 'q1', question: 'Dijkstra\'s algorithm is used for finding?', yourAnswer: 'Shortest path in weighted graph', correct: true },
  { id: 'qr4', quizId: 'q1', question: 'Kruskal\'s uses which data structure to detect cycles?', yourAnswer: 'Union-Find', correct: true },
  { id: 'qr5', quizId: 'q1', question: 'Space complexity of DFS?', yourAnswer: 'O(V)', correct: true },
];
