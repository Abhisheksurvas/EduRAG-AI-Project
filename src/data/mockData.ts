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

export type Assignment = {
  id: string;
  title: string;
  course: string;
  dueDate: string;
  status: 'pending' | 'submitted' | 'graded';
  priority: 'high' | 'medium' | 'low';
};

export const assignments: Assignment[] = [
  { id: 'a1', title: 'Graph Algorithms Assignment', course: 'CS501', dueDate: 'Due in 2 days', status: 'pending', priority: 'high' },
  { id: 'a2', title: 'DBMS Normalization Report', course: 'CS503', dueDate: 'Due in 5 days', status: 'pending', priority: 'medium' },
  { id: 'a3', title: 'OS Process Scheduling Lab', course: 'CS505', dueDate: 'Due tomorrow', status: 'pending', priority: 'high' },
  { id: 'a4', title: 'Computer Networks Mini Project', course: 'CS507', dueDate: 'Due in 1 week', status: 'submitted', priority: 'medium' },
  { id: 'a5', title: 'Discrete Mathematics Problem Set', course: 'MA501', dueDate: 'Due in 3 days', status: 'pending', priority: 'low' },
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
  attempted?: boolean;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  sourceName?: string;
  isDocumentBased?: boolean;
  createdAt?: string;
  createdDate?: string;
};

export const quizzes: Quiz[] = [
  { id: 'q1', title: 'Graph Algorithms Quiz', course: 'CS501', questions: 5, duration: 10, score: 85, status: 'completed', dueDate: 'Completed 2d ago', topic: 'BFS, DFS, Shortest Path', difficulty: 'Medium', createdAt: '2026-09-21T10:00:00Z' },
  { id: 'q2', title: 'DBMS Normalization Quiz', course: 'CS503', questions: 5, duration: 10, score: 72, status: 'completed', dueDate: 'Completed 5d ago', topic: '1NF to BCNF', difficulty: 'Medium', createdAt: '2026-09-18T14:30:00Z' },
  { id: 'q3', title: 'Process Scheduling Quiz', course: 'CS505', questions: 5, duration: 10, status: 'upcoming', dueDate: 'Due in 2 days', topic: 'FCFS, SJF, Round Robin', difficulty: 'Hard', createdAt: '2026-09-23T11:15:00Z' },
  { id: 'q4', title: 'Discrete Math — Graph Theory', course: 'MA501', questions: 5, duration: 10, score: 92, status: 'completed', dueDate: 'Completed 1w ago', topic: 'Trees, Euler, Hamilton', difficulty: 'Hard', createdAt: '2026-09-16T09:00:00Z' },
  { id: 'q5', title: 'ML Foundations Quiz', course: 'CS509', questions: 5, duration: 10, status: 'upcoming', dueDate: 'Due in 5 days', topic: 'Regression & Classification', difficulty: 'Medium', createdAt: '2026-09-22T16:45:00Z' },
];

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  materialAnswer?: string;
  aiAnswer?: string;
  sources?: { doc: string; page: number; excerpt: string }[];
  sourceType?: 'document' | 'general';
  attachments?: { id: string; name: string; status?: 'indexing' | 'ready' | 'failed' }[];
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
  // q1: Graph Algorithms Quiz
  { id: 'qq1', quizId: 'q1', question: 'What is the time complexity of BFS using an adjacency list?', options: ['O(V)', 'O(V + E)', 'O(V * E)', 'O(V²)'], correct: 1, explanation: 'BFS visits every vertex and explores every edge once in an adjacency list representation.' },
  { id: 'qq2', quizId: 'q1', question: 'Which data structure does DFS primarily use for traversal?', options: ['Queue', 'Stack / Recursion', 'Min-Heap', 'Hash Table'], correct: 1, explanation: 'DFS uses a LIFO stack or recursive call stack to backtrack after reaching dead ends.' },
  { id: 'qq3', quizId: 'q1', question: 'Dijkstra\'s algorithm is used for finding?', options: ['Minimum Spanning Tree', 'Single-source shortest path in non-negative weighted graph', 'Maximum network flow', 'Topological ordering'], correct: 1, explanation: 'Dijkstra calculates shortest paths from a single source to all other vertices with non-negative edge weights.' },
  { id: 'qq4', quizId: 'q1', question: 'Kruskal\'s algorithm uses which data structure to detect cycles efficiently?', options: ['Stack', 'Queue', 'Union-Find (Disjoint Set)', 'Hash Map'], correct: 2, explanation: 'Disjoint-set (Union-Find) with path compression checks if adding an edge connects already-connected vertices.' },
  { id: 'qq5', quizId: 'q1', question: 'What is the auxiliary space complexity of DFS on a graph with V vertices?', options: ['O(V)', 'O(E)', 'O(V + E)', 'O(1)'], correct: 0, explanation: 'In the worst case (e.g., a path graph), recursion or stack stores up to V vertices.' },

  // q2: DBMS Normalization Quiz
  { id: 'qq6', quizId: 'q2', question: 'Which normal form eliminates partial dependencies on candidate keys?', options: ['First Normal Form (1NF)', 'Second Normal Form (2NF)', 'Third Normal Form (3NF)', 'Boyce-Codd Normal Form (BCNF)'], correct: 1, explanation: '2NF requires 1NF and guarantees that no non-prime attribute is partially dependent on any candidate key.' },
  { id: 'qq7', quizId: 'q2', question: 'What is the primary condition for a relation to be in 1NF?', options: ['No multivalued or composite attributes (atomic values only)', 'No transitive dependencies', 'Every determinant is a candidate key', 'No foreign keys'], correct: 0, explanation: '1NF mandates that domain values are atomic and repeating groups are eliminated.' },
  { id: 'qq8', quizId: 'q2', question: 'A relation is in 3NF if for every functional dependency X -> Y, which condition holds?', options: ['X is a superkey OR Y is a prime attribute', 'X is a prime attribute and Y is a superkey', 'Y must be a foreign key', 'X and Y must be identical'], correct: 0, explanation: '3NF allows non-trivial dependencies only if the determinant is a superkey or the dependent attribute is prime.' },
  { id: 'qq9', quizId: 'q2', question: 'How is Boyce-Codd Normal Form (BCNF) stricter than 3NF?', options: ['BCNF does not allow Y to be a prime attribute when X is not a superkey', 'BCNF requires multi-valued dependencies', 'BCNF does not guarantee lossless decomposition', 'BCNF only applies to numeric columns'], correct: 0, explanation: 'In BCNF, for every functional dependency X -> Y, X must strictly be a superkey.' },
  { id: 'qq10', quizId: 'q2', question: 'Which decomposition property ensures that the natural join of decomposed relations yields the original relation?', options: ['Dependency Preservation', 'Lossless-Join Decomposition', 'Referential Integrity', 'ACID Atomicity'], correct: 1, explanation: 'Lossless join ensures no spurious tuples are created upon rejoining decomposed tables.' },

  // q3: Process Scheduling Quiz (Unattempted)
  { id: 'qq11', quizId: 'q3', question: 'What is the primary downside of First-Come, First-Served (FCFS) CPU scheduling?', options: ['High scheduling overhead', 'Convoy Effect where short jobs wait behind long jobs', 'Frequent context switching', 'Starvation of high-priority processes'], correct: 1, explanation: 'The Convoy Effect occurs when a CPU-bound process holds the CPU, causing I/O-bound processes to wait.' },
  { id: 'qq12', quizId: 'q3', question: 'Which scheduling algorithm is provably optimal for minimizing average waiting time?', options: ['Round Robin (RR)', 'Shortest Job First (SJF / SRTF)', 'Priority Scheduling', 'Multilevel Queue'], correct: 1, explanation: 'SJF gives the lowest average waiting time because shorter jobs complete first, reducing overall wait times.' },
  { id: 'qq13', quizId: 'q3', question: 'In Round Robin scheduling, what happens if the time quantum is chosen to be extremely large?', options: ['It degenerates into First-Come First-Served (FCFS)', 'It behaves like Shortest Remaining Time First', 'Context switches increase exponentially', 'Processes starve indefinitely'], correct: 0, explanation: 'With an arbitrarily large quantum, each process runs to completion on its first turn, behaving like FCFS.' },
  { id: 'qq14', quizId: 'q3', question: 'How is Turnaround Time calculated for a process?', options: ['Completion Time - Arrival Time', 'Burst Time - Waiting Time', 'Waiting Time + Context Switch Time', 'Arrival Time + Burst Time'], correct: 0, explanation: 'Turnaround Time measures the entire interval from when the process arrives until its final completion.' },
  { id: 'qq15', quizId: 'q3', question: 'Which technique is commonly used to prevent indefinite blocking (starvation) in priority scheduling?', options: ['Aging (gradually increasing priority of waiting processes)', 'Decreasing the time quantum', 'Switching to non-preemptive mode', 'Spooling'], correct: 0, explanation: 'Aging gradually increases the priority of processes that wait in the system for long periods.' },

  // q4: Discrete Math — Graph Theory
  { id: 'qq16', quizId: 'q4', question: 'A connected graph has an Eulerian circuit if and only if:', options: ['Every vertex has an even degree', 'Exactly two vertices have odd degree', 'It is a bipartite complete graph', 'It contains no cycles'], correct: 0, explanation: 'Euler proved that a connected graph has an Eulerian circuit if and only if every vertex has an even degree.' },
  { id: 'qq17', quizId: 'q4', question: 'How many edges does a tree with n vertices have?', options: ['n', 'n - 1', 'n + 1', 'n * (n - 1) / 2'], correct: 1, explanation: 'A basic theorem of trees states that any tree on n vertices has exactly n - 1 edges.' },
  { id: 'qq18', quizId: 'q4', question: 'A Hamiltonian cycle in a graph is a closed loop that visits:', options: ['Every edge exactly once', 'Every vertex exactly once (except start/end)', 'Only vertices of odd degree', 'The minimum spanning tree edges'], correct: 1, explanation: 'A Hamiltonian cycle visits every vertex of the graph exactly once and returns to the start vertex.' },
  { id: 'qq19', quizId: 'q4', question: 'What is the maximum number of edges in a simple undirected graph with n vertices?', options: ['n', 'n * (n - 1) / 2', '2^n', 'n!'], correct: 1, explanation: 'The complete graph Kn has n choose 2 = n*(n-1)/2 edges.' },
  { id: 'qq20', quizId: 'q4', question: 'A graph is bipartite if and only if it does NOT contain any:', options: ['Cycles of odd length', 'Self loops', 'Even cycles', 'Cut vertices'], correct: 0, explanation: 'König theorem states that a graph is 2-colorable (bipartite) iff it contains no odd cycles.' },

  // q5: ML Foundations Quiz (Unattempted)
  { id: 'qq21', quizId: 'q5', question: 'What distinguishes Supervised Learning from Unsupervised Learning?', options: ['Supervised uses labeled training data with ground-truth targets', 'Supervised requires neural networks with backpropagation', 'Supervised learning does not need loss functions', 'Unsupervised learning only works on numerical data'], correct: 0, explanation: 'Supervised learning trains on pairs of inputs and target labels to learn a mapping function.' },
  { id: 'qq22', quizId: 'q5', question: 'Which problem occurs when a model performs extremely well on training data but poorly on unseen test data?', options: ['High Bias (Underfitting)', 'High Variance (Overfitting)', 'Vanishing Gradient', 'Data Leakage'], correct: 1, explanation: 'Overfitting occurs when a model memorizes noise and specific patterns in the training data rather than generalizing.' },
  { id: 'qq23', quizId: 'q5', question: 'What loss function is most commonly used for Linear Regression?', options: ['Categorical Cross-Entropy', 'Mean Squared Error (MSE)', 'Hinge Loss', 'Kullback-Leibler Divergence'], correct: 1, explanation: 'Mean Squared Error measures the average of the squares of errors between predicted and actual values.' },
  { id: 'qq24', quizId: 'q5', question: 'Logistic Regression is primarily used for which type of task?', options: ['Continuous value prediction', 'Binary Classification', 'Dimensionality Reduction', 'Clustering'], correct: 1, explanation: 'Logistic regression applies a sigmoid activation to model probabilities for binary classification tasks.' },
  { id: 'qq25', quizId: 'q5', question: 'In Gradient Descent, what parameter controls the size of steps taken towards the minimum of the loss function?', options: ['Regularization parameter (lambda)', 'Learning rate (alpha)', 'Momentum constant', 'Batch size'], correct: 1, explanation: 'The learning rate alpha determines the step size taken along the negative gradient direction.' },
];

export const quizResults = [
  { id: 'qr1', quizId: 'q1', question: 'What is the time complexity of BFS using adjacency list?', yourAnswer: 'O(V + E)', correct: true },
  { id: 'qr2', quizId: 'q1', question: 'Which data structure does DFS use?', yourAnswer: 'Heap', correct: false },
  { id: 'qr3', quizId: 'q1', question: 'Dijkstra\'s algorithm is used for finding?', yourAnswer: 'Shortest path in weighted graph', correct: true },
  { id: 'qr4', quizId: 'q1', question: 'Kruskal\'s uses which data structure to detect cycles?', yourAnswer: 'Union-Find', correct: true },
  { id: 'qr5', quizId: 'q1', question: 'Space complexity of DFS?', yourAnswer: 'O(V)', correct: true },
];
