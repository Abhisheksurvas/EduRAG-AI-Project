/**
 * Comprehensive Academic Knowledge Engine for Notes Generation
 * Produces accurate, high-yield, curriculum-aligned notes across all core CS subjects:
 * - Graph Algorithms & Graph Traversal (CS501)
 * - Operating Systems & Process Scheduling (CS505)
 * - Database Management Systems & Normalization (CS503)
 * - Computer Networks & TCP/IP (CS507)
 * - Discrete Mathematics & Graph Theory (MA501)
 * - Machine Learning Foundations (CS509)
 * - Data Structures & Algorithmic Analysis
 * - Object-Oriented Programming (OOP)
 * - Computer Security & Cryptography
 * - Full Document Grounding when context is provided
 */

export type NoteType = 'summary' | 'keypoints' | 'definitions' | 'formulas';

import { getCuratedFormulaDetails, synthesizeFormulaDetails } from '../pages/student/FormulaSheetRenderer';

interface TopicKnowledge {
  canonicalTitle: string;
  courseCode: string;
  courseName: string;
  summary: {
    overview: string;
    coreConcepts: { term: string; explanation: string }[];
    steps: { step: string; detail: string }[];
    takeaways: string[];
  };
  keypoints: {
    points: string[];
    traps: string[];
    bestPractices: string[];
  };
  definitions: {
    terms: { term: string; definition: string; context: string }[];
    comparisons: { a: string; b: string; distinction: string }[];
  };
  formulas: {
    equations: { name: string; math: string; note: string }[];
    complexities: { op: string; best: string; avg: string; worst: string; space: string; notes: string }[];
    variables: { symbol: string; meaning: string }[];
  };
}

const KNOWLEDGE_BASE: Record<string, TopicKnowledge> = {
  // ─────────────────────────────────────────────────────────────────────────────
  // 1. GRAPH ALGORITHMS & GRAPH TRAVERSAL
  // ─────────────────────────────────────────────────────────────────────────────
  graph: {
    canonicalTitle: 'Graph Algorithms & Traversal (BFS & DFS)',
    courseCode: 'CS501',
    courseName: 'Data Structures & Algorithms',
    summary: {
      overview:
        'Graph Traversal is the systematic process of visiting each vertex in a graph $G = (V, E)$ exactly once. Unlike trees, graphs may contain cycles and disconnected components, necessitating tracking of visited states to avoid infinite loops. The two foundational traversal paradigms are Breadth-First Search (BFS) and Depth-First Search (DFS), which form the building blocks for shortest path computation, cycle detection, topological sorting, connected component analysis, and network routing algorithms.',
      coreConcepts: [
        {
          term: 'Graph Representation (Adjacency Matrix vs. Adjacency List)',
          explanation:
            'Adjacency List uses $O(|V| + |E|)$ space and is optimal for sparse graphs, allowing rapid neighbor traversal. Adjacency Matrix uses $O(|V|^2)$ space and enables $O(1)$ edge existence checks, but is inefficient for sparse graphs.',
        },
        {
          term: 'Breadth-First Search (BFS) Mechanics',
          explanation:
            'Explores the graph layer by layer (concentric frontiers) utilizing a First-In-First-Out (FIFO) queue. Guarantees finding the shortest path (minimum edge count) in unweighted graphs in $O(|V| + |E|)$ time.',
        },
        {
          term: 'Depth-First Search (DFS) Mechanics',
          explanation:
            'Explores as deep as possible along each branch before backtracking, utilizing a Last-In-First-Out (LIFO) stack or system call stack. Classifies edges into Tree, Back, Forward, and Cross edges.',
        },
        {
          term: 'Topological Sort & DAGs',
          explanation:
            'A linear ordering of vertices in a Directed Acyclic Graph (DAG) such that for every directed edge $(u, v)$, vertex $u$ appears before $v$. Implemented via DFS finishing times or Kahn’s in-degree algorithm in $O(|V| + |E|)$.',
        },
        {
          term: 'Single-Source Shortest Paths (Dijkstra & Bellman-Ford)',
          explanation:
            'Dijkstra’s algorithm uses a greedy approach with a Min-Heap priority queue to compute shortest paths with non-negative edge weights in $O((|V| + |E|) \\log |V|)$. Bellman-Ford handles negative edge weights and detects negative weight cycles in $O(|V| \\cdot |E|)$.',
        },
      ],
      steps: [
        {
          step: 'BFS Initialization & Frontier Queuing',
          detail:
            'Initialize a boolean `visited` array of size $|V|$ to `false` and an empty FIFO queue $Q$. Enqueue the start vertex $s$, mark `visited[s] = true`, and set distance `dist[s] = 0`.',
        },
        {
          step: 'BFS Frontier Expansion',
          detail:
            'While $Q$ is not empty, dequeue vertex $u$. For each neighbor $v \\in \\text{adj}[u]$, if `!visited[v]`, mark `visited[v] = true`, set `dist[v] = dist[u] + 1`, record `parent[v] = u`, and enqueue $v$.',
        },
        {
          step: 'DFS Recursive Traversal & Backtracking',
          detail:
            'Call `DFS(u)`: mark `visited[u] = true`, assign entry discovery timestamp. For every adjacent neighbor $v \\in \\text{adj}[u]$, if `!visited[v]`, mark $(u, v)$ as a tree edge and recurse `DFS(v)`. When all neighbors are visited, assign exit finish timestamp and backtrack.',
        },
        {
          step: 'Cycle Detection Verification',
          detail:
            'In an undirected graph, a cycle exists if an edge leads to an already visited vertex that is not the direct parent. In a directed graph, a cycle exists if and only if DFS encounters a Back Edge to an active ancestor on the recursion call stack (Gray node).',
        },
      ],
      takeaways: [
        'BFS computes shortest paths in unweighted graphs; DFS does NOT guarantee shortest path.',
        'DFS uses $O(|V|)$ memory proportional to the maximum path depth; BFS memory can consume $O(|V|)$ proportional to the widest frontier.',
        'Topological sorting is only valid for Directed Acyclic Graphs (DAGs). If a cycle exists, topological sort is impossible.',
        'Dijkstra’s algorithm fails on graphs with negative edge weights; use Bellman-Ford instead.',
        'The sum of degrees in any undirected graph satisfies the Handshaking Lemma: $\\sum_{v \\in V} \\deg(v) = 2|E|$.',
      ],
    },
    keypoints: {
      points: [
        'Graph representation trade-off: Adjacency list is preferred when $|E| \\ll |V|^2$ (sparse graphs), saving memory and neighbor search time.',
        'BFS operates via a FIFO Queue, processing vertices in non-decreasing order of their distance from the source.',
        'DFS operates via a LIFO Stack or recursion, driving deeply down candidate paths before backtracking.',
        'Cycle Detection in Directed Graphs requires 3 vertex states: White (unvisited), Gray (currently in recursion stack), and Black (completely processed). Encountering a Gray node signifies a cycle.',
        'Cycle Detection in Undirected Graphs can be executed via BFS/DFS or Disjoint-Set Union (DSU / Kruskal’s Find).',
        'Topological sort ordering can be generated by reversing the DFS post-visit (finishing time) list of vertices.',
        'Kahn’s Algorithm for topological sort maintains in-degrees of all vertices and enqueues nodes with an in-degree of 0.',
        'Dijkstra’s Algorithm requires non-negative weights because it irrevocably marks vertices as visited assuming no path can become shorter later.',
        'Minimum Spanning Trees (MST) for connected weighted graphs contain exactly $|V| - 1$ edges with no cycles.',
        'Kruskal’s algorithm sorts all edges by weight and uses Union-Find; Prim’s algorithm grows a single tree outward using a priority queue.',
      ],
      traps: [
        'Trap 1: Attempting to use Dijkstra on graphs with negative edge weights, resulting in incorrect shortest path lengths.',
        'Trap 2: Forgetting to mark vertices as visited at the time of enqueueing in BFS, leading to redundant duplicate node enqueues and memory overflow.',
        'Trap 3: Confusing undirected graph cycle detection with directed graph cycle detection (checking parent vs checking recursion stack).',
        'Trap 4: Assuming topological sort is unique; multiple valid topological orderings often exist for a single DAG.',
      ],
      bestPractices: [
        'Use an Adjacency List with `vector<vector<int>>` or `Map<Node, List<Edge>>` for competitive programming and standard system graphs.',
        'Maintain an explicit `parent` map/array during BFS to enable easy shortest path reconstruction by backtracking from target to source.',
        'Pre-allocate the visited array to $|V|$ elements to prevent dynamic reallocation overhead during traversal.',
      ],
    },
    definitions: {
      terms: [
        {
          term: 'Graph $G = (V, E)$',
          definition: 'A non-linear data structure comprising a finite set of vertices (or nodes) $V$ and a set of edges $E$ interconnecting pairs of vertices.',
          context: 'Foundation of network topology, social graphs, dependency resolution, and routing engines.',
        },
        {
          term: 'Breadth-First Search (BFS)',
          definition: 'A graph traversal strategy that visits all neighboring vertices at the current depth level before proceeding to vertices at the next depth level.',
          context: 'Used for shortest path discovery in unweighted graphs, peer-to-peer networking, and garbage collection.',
        },
        {
          term: 'Depth-First Search (DFS)',
          definition: 'A graph traversal strategy that explores as deep as possible along each branch before backtracking.',
          context: 'Used for cycle detection, topological sorting, connected components, and maze generation.',
        },
        {
          term: 'Directed Acyclic Graph (DAG)',
          definition: 'A directed graph with no directed cycles, where it is impossible to start at any vertex $v$ and follow directed edges back to $v$.',
          context: 'Used to model build dependency pipelines (e.g. Make, Webpack), task scheduling, and blockchain DAGs.',
        },
        {
          term: 'Topological Sort',
          definition: 'A linear permutation of all vertices in a DAG such that for every directed edge $u \\to v$, vertex $u$ precedes vertex $v$.',
          context: 'Essential for resolving course prerequisites, compilation order, and task scheduling.',
        },
        {
          term: 'Back Edge',
          definition: 'An edge $(u, v)$ in DFS that connects a vertex $u$ to an ancestor $v$ in the DFS tree.',
          context: 'The exact mathematical indicator that confirms the presence of a cycle in a directed graph.',
        },
        {
          term: 'Dijkstra’s Algorithm',
          definition: 'A greedy shortest path algorithm that determines the minimal path length from a single source to all other vertices in non-negative weighted graphs.',
          context: 'Core of OSPF (Open Shortest Path First) internet routing protocol and GPS navigation systems.',
        },
        {
          term: 'Minimum Spanning Tree (MST)',
          definition: 'A subset of edges in an undirected, connected, edge-weighted graph that connects all vertices together with minimum total edge weight and zero cycles.',
          context: 'Applied in telecommunications network design, electrical grid wiring, and cluster analysis.',
        },
      ],
      comparisons: [
        {
          a: 'Breadth-First Search (BFS)',
          b: 'Depth-First Search (DFS)',
          distinction: 'BFS uses a FIFO queue and finds the shortest path in unweighted graphs; DFS uses a LIFO stack / recursion and is suited for backtracking, cycle detection, and topological sorting.',
        },
        {
          a: 'Kruskal’s Algorithm',
          b: 'Prim’s Algorithm',
          distinction: 'Kruskal’s algorithm adds global minimum edges using a Disjoint-Set Union ($O(E \\log E)$), performing better on sparse graphs. Prim’s algorithm expands outward from an initial vertex using a priority queue ($O(E \\log V)$), performing better on dense graphs.',
        },
        {
          a: 'Dijkstra’s Algorithm',
          b: 'Bellman-Ford Algorithm',
          distinction: 'Dijkstra runs in $O((V + E) \\log V)$ but requires strictly non-negative edge weights. Bellman-Ford runs in $O(V \\cdot E)$ but correctly handles negative weights and reports negative cycles.',
        },
      ],
    },
    formulas: {
      equations: [
        {
          name: 'Handshaking Lemma (Undirected Graphs)',
          math: '$$\\sum_{v \\in V} \\deg(v) = 2|E|$$',
          note: 'The sum of all vertex degrees is twice the total number of edges; hence, the number of odd-degree vertices must be even.',
        },
        {
          name: 'Edges in a Tree / Spanning Tree',
          math: '$$|E| = |V| - 1$$',
          note: 'Any minimally connected tree with $|V|$ vertices contains exactly $|V| - 1$ edges.',
        },
        {
          name: 'Dijkstra Edge Relaxation Condition',
          math: '$$\\text{if } d[u] + w(u, v) < d[v] \\implies d[v] = d[u] + w(u, v)$$',
          note: 'Updates vertex distance estimate when a shorter intermediate path through $u$ is discovered.',
        },
        {
          name: 'Bellman-Ford Convergence Bound',
          math: '$$\\text{Passes} = |V| - 1$$',
          note: 'A simple shortest path in a graph with $|V|$ vertices can contain at most $|V| - 1$ edges.',
        },
      ],
      complexities: [
        { op: 'BFS Traversal (Adj. List)', best: 'O(V + E)', avg: 'O(V + E)', worst: 'O(V + E)', space: 'O(V)', notes: 'Queue-based traversal' },
        { op: 'DFS Traversal (Adj. List)', best: 'O(V + E)', avg: 'O(V + E)', worst: 'O(V + E)', space: 'O(V)', notes: 'Recursive call stack' },
        { op: 'Dijkstra (Binary Min-Heap)', best: 'O(V log V)', avg: 'O((V + E) log V)', worst: 'O((V + E) log V)', space: 'O(V)', notes: 'Non-negative weights only' },
        { op: 'Bellman-Ford Algorithm', best: 'O(E)', avg: 'O(V * E)', worst: 'O(V * E)', space: 'O(V)', notes: 'Handles negative weights' },
        { op: 'Topological Sort (Kahn / DFS)', best: 'O(V + E)', avg: 'O(V + E)', worst: 'O(V + E)', space: 'O(V)', notes: 'Requires DAG' },
        { op: 'Kruskal’s MST (Union-Find)', best: 'O(E log E)', avg: 'O(E log E)', worst: 'O(E log E)', space: 'O(V)', notes: 'Sorts edges first' },
      ],
      variables: [
        { symbol: '|V| or n', meaning: 'Total number of vertices (nodes) in the graph' },
        { symbol: '|E| or m', meaning: 'Total number of edges interconnecting the vertices' },
        { symbol: 'd[v]', meaning: 'Current shortest distance estimate from source to vertex v' },
        { symbol: 'w(u, v)', meaning: 'Weight assigned to edge connecting vertex u to vertex v' },
        { symbol: 'deg(v)', meaning: 'Degree of vertex v (number of incident edges)' },
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. OPERATING SYSTEMS & PROCESS MANAGEMENT / SCHEDULING
  // ─────────────────────────────────────────────────────────────────────────────
  os: {
    canonicalTitle: 'Process Management, CPU Scheduling & Synchronization',
    courseCode: 'CS505',
    courseName: 'Operating Systems',
    summary: {
      overview:
        'Process Management is the core responsibility of an Operating System, coordinating the execution of concurrent programs, optimizing CPU utilization, ensuring equitable resource allocation, and preventing deadlocks. A process is an active program in execution represented by a Process Control Block (PCB). CPU Scheduling algorithms decide which ready process is allocated the CPU, balancing metrics such as Turnaround Time, Waiting Time, and Throughput.',
      coreConcepts: [
        {
          term: 'Process States & State Transitions',
          explanation:
            'A process transitions through 5 primary states: New (created), Ready (waiting in queue for CPU), Running (instructions executing on CPU), Waiting/Blocked (waiting for I/O or event), and Terminated (execution finished, resources freed).',
        },
        {
          term: 'Process Control Block (PCB)',
          explanation:
            'Kernel data structure storing Process ID (PID), Program Counter (PC), CPU registers, memory limits, list of open files, and priority. Context switching stores current PCB and loads the next PCB.',
        },
        {
          term: 'CPU Scheduling Criteria & Trade-offs',
          explanation:
            'Evaluated via: Turnaround Time ($TAT = \\text{Completion} - \\text{Arrival}$), Waiting Time ($WT = TAT - \\text{Burst Time}$), Response Time, and Throughput. Preemptive schedulers interrupt running tasks; non-preemptive schedulers let processes run until voluntary release.',
        },
        {
          term: 'Scheduling Algorithms (FCFS, SJF, SRTF, RR, Priority)',
          explanation:
            'FCFS suffers from the Convoy Effect. SJF gives optimal minimal average waiting time but requires future burst knowledge. SRTF is preemptive SJF. Round Robin assigns a fixed time quantum $q$; if $q$ is too small, context switch overhead dominates; if too large, it degenerates to FCFS.',
        },
        {
          term: 'Deadlocks & Coffman Conditions',
          explanation:
            'A deadlock occurs when processes are blocked permanently waiting for resources held by each other. Four conditions must hold simultaneously: 1) Mutual Exclusion, 2) Hold and Wait, 3) No Preemption, 4) Circular Wait. Banker’s Algorithm manages avoidance by maintaining a safe state.',
        },
      ],
      steps: [
        {
          step: 'Context Switch Execution Sequence',
          detail:
            'Interrupt or system call triggers kernel transition -> save CPU registers and Program Counter to outgoing process PCB -> update process state to Ready/Waiting -> select new process via scheduler -> load incoming process PCB registers -> resume execution.',
        },
        {
          step: 'Round Robin Scheduling Cycle',
          detail:
            'Scheduler maintains ready queue FIFO. Head process runs for time slice $q$. If process finishes within $q$, it exits; otherwise, timer interrupt triggers context switch, process is preempted and re-inserted at tail of ready queue.',
        },
        {
          step: 'Banker’s Safety Check Algorithm',
          detail:
            'Given vectors `Available`, matrices `Max`, `Allocation`, compute `Need = Max - Allocation`. Find process $P_i$ such that `Finish[i] == false` and `Need[i] <= Available`. Add $P_i$ allocation to `Available`, mark `Finish[i] = true`. Repeat. If all `Finish == true`, state is Safe.',
        },
      ],
      takeaways: [
        'Shortest Job First (SJF) is provably optimal for minimizing average waiting time.',
        'Round Robin performance heavily hinges on time quantum $q$; optimal guideline is $80\\%$ of CPU bursts should be shorter than $q$.',
        'Deadlock Prevention invalidates at least one of the 4 Coffman conditions; Deadlock Avoidance dynamically checks safety states (Banker’s).',
        'Belady’s Anomaly occurs in FIFO page replacement: allocating more physical page frames can paradoxically increase page faults.',
      ],
    },
    keypoints: {
      points: [
        'A program is a passive entity stored on disk; a process is an active entity loaded in memory with PC and address space (Text, Data, Heap, Stack).',
        'Threads share Code, Data, and OS resources (open files) but maintain private Program Counters, Registers, and Stacks.',
        'First-Come First-Served (FCFS) is non-preemptive and prone to the Convoy Effect (short jobs queued behind long I/O or CPU hogs).',
        'Shortest Remaining Time First (SRTF) is preemptive SJF and provides minimal average waiting time, but risks starvation for long processes.',
        'In Round Robin, if time quantum $q \\to \\infty$, it behaves as FCFS; if $q \\to 0$, processor sharing occurs with severe context switch penalty.',
        'Critical Section Problem requires 3 guarantees: Mutual Exclusion, Progress, and Bounded Waiting.',
        'Semaphores provide synchronization: `wait(S)` (decrement, block if $S \\le 0$) and `signal(S)` (increment, wake sleeping process).',
        'Banker’s Algorithm avoids deadlock by ensuring the system never enters an Unsafe State.',
        'Virtual Memory enables execution of processes not completely in RAM using demand paging.',
        'Effective Memory Access Time (EMAT) depends on TLB Hit Ratio $\\alpha$: $EMAT = \\alpha(t_{TLB} + t_{RAM}) + (1 - \\alpha)(t_{TLB} + 2t_{RAM})$.',
      ],
      traps: [
        'Trap 1: Confusing Turnaround Time ($TAT$) with Waiting Time ($WT$). Remember: $WT = TAT - \\text{Burst Time}$.',
        'Trap 2: Assuming an Unsafe state is strictly deadlocked. An unsafe state merely carries the potential for deadlock; it is not yet deadlocked.',
        'Trap 3: Forgetting that Priority Scheduling without aging causes starvation (indefinite blocking) of low-priority processes.',
      ],
      bestPractices: [
        'Use Aging techniques (gradually increasing process priority as it waits) to eliminate starvation in priority schedulers.',
        'Size the Round Robin quantum to be significantly larger than context switch latency ($q \\gg 10 \\mu s$).',
      ],
    },
    definitions: {
      terms: [
        {
          term: 'Process Control Block (PCB)',
          definition: 'A data structure in the operating system kernel containing all information needed to manage a specific process.',
          context: 'Stored in kernel space; swapped during context switches.',
        },
        {
          term: 'Context Switch',
          definition: 'The operational mechanism of saving the state of the active process and restoring the state of another ready process to CPU registers.',
          context: 'Pure computational overhead; hardware-accelerated in modern processors.',
        },
        {
          term: 'Preemptive Scheduling',
          definition: 'A scheduling strategy where the operating system can forcibly suspend a currently running process to assign the CPU to another higher-priority process.',
          context: 'Essential for interactive time-sharing and real-time operating systems.',
        },
        {
          term: 'Deadlock',
          definition: 'A permanent systemic halt where two or more processes are unable to proceed because each is waiting for a resource held by another.',
          context: 'Subject of Coffman conditions and Banker’s Algorithm.',
        },
        {
          term: 'Race Condition',
          definition: 'A situation where the output of concurrent threads depends unpredictably on the non-deterministic order of execution.',
          context: 'Prevented by synchronizing shared resources in critical sections via mutexes or semaphores.',
        },
        {
          term: 'Thrashing',
          definition: 'A pathological condition where the operating system spends more time swapping virtual pages between RAM and swap disk than executing real instructions.',
          context: 'Occurs when total working set requirements exceed available physical RAM frames.',
        },
      ],
      comparisons: [
        {
          a: 'Process',
          b: 'Thread',
          distinction: 'A process has its own isolated address space, heap, and file descriptors. A thread is a lightweight unit within a process sharing the same address space and heap, with its own private stack and registers.',
        },
        {
          a: 'Preemptive Scheduling',
          b: 'Non-Preemptive Scheduling',
          distinction: 'Preemptive schedulers can interrupt executing processes at any time (e.g. Round Robin, SRTF). Non-preemptive schedulers allow processes to run until they terminate or block for I/O (e.g. FCFS).',
        },
        {
          a: 'Deadlock Prevention',
          b: 'Deadlock Avoidance',
          distinction: 'Prevention sets static structural constraints to make at least one Coffman condition impossible. Avoidance dynamically tracks resource allocation state (e.g. Banker’s Algorithm) to guarantee system stays safe.',
        },
      ],
    },
    formulas: {
      equations: [
        {
          name: 'Turnaround Time (TAT)',
          math: '$$\\text{TAT} = \\text{Completion Time} - \\text{Arrival Time}$$',
          note: 'Total elapsed time from process submission to complete termination.',
        },
        {
          name: 'Waiting Time (WT)',
          math: '$$\\text{WT} = \\text{TAT} - \\text{Burst Time}$$',
          note: 'Cumulative time a process spent waiting in the ready queue.',
        },
        {
          name: 'Effective Memory Access Time (EMAT)',
          math: '$$\\text{EMAT} = h \\cdot (t_{\\text{TLB}} + t_{\\text{RAM}}) + (1 - h) \\cdot (t_{\\text{TLB}} + 2 \\cdot t_{\\text{RAM}})$$',
          note: '$h$ is the TLB hit ratio, $t_{\\text{TLB}}$ is TLB access latency, $t_{\\text{RAM}}$ is main memory access latency.',
        },
        {
          name: 'Banker’s Algorithm Need Matrix',
          math: '$$\\text{Need}[i][j] = \\text{Max}[i][j] - \\text{Allocation}[i][j]$$',
          note: 'Represents the remaining resource requirement of process $i$ for resource type $j$.',
        },
      ],
      complexities: [
        { op: 'FCFS Scheduling', best: 'O(n)', avg: 'O(n)', worst: 'O(n)', space: 'O(n)', notes: 'Convoy effect occurs' },
        { op: 'Round Robin Scheduling', best: 'O(n)', avg: 'O(n)', worst: 'O(n)', space: 'O(n)', notes: 'Time quantum dependent' },
        { op: 'SJF / SRTF (Heap Priority)', best: 'O(log n)', avg: 'O(log n)', worst: 'O(log n)', space: 'O(n)', notes: 'Minimizes average WT' },
        { op: 'Banker’s Safety Check', best: 'O(m * n^2)', avg: 'O(m * n^2)', worst: 'O(m * n^2)', space: 'O(m * n)', notes: 'n processes, m resource types' },
      ],
      variables: [
        { symbol: 'TAT', meaning: 'Turnaround Time' },
        { symbol: 'WT', meaning: 'Waiting Time' },
        { symbol: 'q', meaning: 'Time quantum / slice in Round Robin' },
        { symbol: 'h', meaning: 'Translation Lookaside Buffer (TLB) hit ratio (0.0 to 1.0)' },
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. DATABASE MANAGEMENT SYSTEMS & NORMALIZATION
  // ─────────────────────────────────────────────────────────────────────────────
  dbms: {
    canonicalTitle: 'Database Normalization & Relational Schema Design (1NF, 2NF, 3NF, BCNF)',
    courseCode: 'CS503',
    courseName: 'Database Management Systems',
    summary: {
      overview:
        'Database Normalization is the formal mathematical technique used in relational schema design to organize tables, attributes, and relationships. Its primary objectives are minimizing data redundancy and eliminating update, insertion, and deletion anomalies. Grounded in Codd’s relational model and Functional Dependency (FD) theory, normal forms progress in strict hierarchy from 1NF through 2NF, 3NF, and Boyce-Codd Normal Form (BCNF).',
      coreConcepts: [
        {
          term: 'Functional Dependencies & Attribute Closure',
          explanation:
            'A functional dependency $X \\to Y$ asserts that attribute set $X$ uniquely determines attribute set $Y$. Attribute closure $X^+$ is the complete set of all attributes functionally determined by $X$ under Armstrong’s Axioms.',
        },
        {
          term: 'First Normal Form (1NF)',
          explanation:
            'A relation is in 1NF if and only if all domain attribute values are atomic (indivisible) and there are no repeating groups or composite arrays.',
        },
        {
          term: 'Second Normal Form (2NF)',
          explanation:
            'A relation is in 2NF if it is in 1NF and contains no Partial Dependencies. That is, no non-prime attribute may functionally depend on a proper subset of any candidate key.',
        },
        {
          term: 'Third Normal Form (3NF)',
          explanation:
            'A relation is in 3NF if it is in 2NF and contains no Transitive Dependencies. For every non-trivial $X \\to Y$, either $X$ is a superkey, or $Y$ is a prime attribute (member of some candidate key).',
        },
        {
          term: 'Boyce-Codd Normal Form (BCNF)',
          explanation:
            'A stricter version of 3NF. A relation is in BCNF if for every non-trivial $X \\to Y$, $X$ must be a superkey. Unlike 3NF, BCNF does not allow $Y$ to be saved by being prime. BCNF guarantees lossless join but may sacrifice dependency preservation.',
        },
      ],
      steps: [
        {
          step: 'Finding Candidate Keys via Attribute Closure',
          detail:
            '1) Identify attributes that never appear on the RHS of any FD; these must be in every candidate key. 2) Compute closure $X^+$ using Armstrong’s axioms. 3) If $X^+$ includes all attributes $R$, $X$ is a candidate key. 4) If not, systematically add attributes until closure covers $R$.',
        },
        {
          step: 'Decomposition into 3NF (Lossless & Dependency Preserving)',
          detail:
            '1) Find minimal canonical cover $F_c$. 2) For each FD $X \\to Y \\in F_c$, create relation $R_i = X \\cup Y$. 3) If no relation contains a candidate key of the original schema $R$, create relation $R_k$ containing an original candidate key.',
        },
        {
          step: 'Lossless Join Verification (2 Relations)',
          detail:
            'A decomposition of $R$ into $R_1, R_2$ is Lossless if and only if $(R_1 \\cap R_2) \\to R_1$ OR $(R_1 \\cap R_2) \\to R_2$ in $F^+$.',
        },
      ],
      takeaways: [
        '3NF always guarantees BOTH Lossless Join Decomposition and Functional Dependency Preservation.',
        'BCNF guarantees Lossless Join but does NOT always guarantee Dependency Preservation.',
        'A prime attribute is any attribute that forms part of AT LEAST ONE candidate key.',
        'Lossless Join is mandatory in all decompositions to prevent spurious (ghost) tuple generation.',
      ],
    },
    keypoints: {
      points: [
        'Normalization eliminates three critical anomalies: Insertion Anomaly, Deletion Anomaly, and Modification Anomaly.',
        'Armstrong’s Axioms are sound and complete: Reflexivity ($Y \\subseteq X \\implies X \\to Y$), Augmentation ($X \\to Y \\implies XZ \\to YZ$), and Transitivity ($X \\to Y, Y \\to Z \\implies X \\to Z$).',
        'Partial Dependency: A non-prime attribute depends on a part of a composite candidate key (violates 2NF).',
        'Transitive Dependency: $X \\to Y$ and $Y \\to Z$ where $Z$ is non-prime and $Y$ is not a candidate key (violates 3NF).',
        'In 3NF, the condition "$Y$ is a prime attribute" provides an escape hatch that allows dependency preservation.',
        'BCNF removes the prime attribute loophole: EVERY determinant $X$ in non-trivial $X \\to Y$ must be a superkey.',
        'If a relation has only simple (single-attribute) candidate keys, it is automatically in 2NF once in 1NF.',
        'ACID Properties in DBMS: Atomicity (all-or-nothing), Consistency (integrity constraints preserved), Isolation (concurrency transparency), Durability (persisted post-commit).',
        'Two-Phase Locking (2PL) guarantees conflict serializability: Growing Phase (locks acquired), Shrinking Phase (locks released).',
      ],
      traps: [
        'Trap 1: Assuming BCNF is always strictly preferred over 3NF. In practice, 3NF is often chosen when dependency preservation is critical.',
        'Trap 2: Forgetting that an attribute is "prime" if it is part of ANY candidate key, not just the primary key.',
        'Trap 3: Confusing Lossless Join with Lossless Storage. Lossless Join means natural join reconstructs the exact original relation without extra spurious tuples.',
      ],
      bestPractices: [
        'Always compute attribute closures $X^+$ before declaring whether a set of attributes forms a candidate key.',
        'When decomposing into BCNF, verify if any dependencies are lost; if so, document the application-level constraints required.',
      ],
    },
    definitions: {
      terms: [
        {
          term: 'Functional Dependency ($X \\to Y$)',
          definition: 'A constraint between two sets of attributes such that if two tuples agree on $X$, they must agree on $Y$.',
          context: 'The fundamental building block for relational normalization theory.',
        },
        {
          term: 'Superkey',
          definition: 'A set of attributes in a relation that uniquely identifies every tuple in that relation.',
          context: 'Any superset of a candidate key is a superkey.',
        },
        {
          term: 'Candidate Key',
          definition: 'A minimal superkey; a set of attributes that uniquely identifies all tuples such that removing any attribute destroys uniqueness.',
          context: 'One candidate key is selected as the Primary Key.',
        },
        {
          term: 'Prime Attribute',
          definition: 'An attribute that is a member of at least one candidate key for the relation.',
          context: 'Determines eligibility for 2NF and 3NF conditions.',
        },
        {
          term: 'Boyce-Codd Normal Form (BCNF)',
          definition: 'A normal form requiring that for every non-trivial functional dependency $X \\to Y$, $X$ must be a superkey.',
          context: 'Eliminates all redundancy arising from functional dependencies.',
        },
        {
          term: 'Lossless Join Decomposition',
          definition: 'A decomposition of relation $R$ into $R_1, \\dots, R_k$ such that the natural join of the decomposed relations yields exactly $R$ without spurious tuples.',
          context: 'Non-negotiable requirement for correct database schema design.',
        },
      ],
      comparisons: [
        {
          a: 'Third Normal Form (3NF)',
          b: 'Boyce-Codd Normal Form (BCNF)',
          distinction: 'In 3NF, $X \\to Y$ is valid if $X$ is a superkey OR $Y$ is prime. In BCNF, $X$ MUST be a superkey. 3NF always preserves dependencies; BCNF may not.',
        },
        {
          a: 'Partial Dependency',
          b: 'Transitive Dependency',
          distinction: 'Partial dependency occurs when a non-prime attribute depends on a sub-part of a composite candidate key. Transitive dependency occurs when a non-prime attribute depends on another non-prime attribute.',
        },
      ],
    },
    formulas: {
      equations: [
        {
          name: 'Lossless Join Condition (2 Decomposed Relations)',
          math: '$$(R_1 \\cap R_2) \\to R_1 \\quad \\lor \\quad (R_1 \\cap R_2) \\to R_2$$',
          note: 'The shared common attributes must form a superkey of at least one decomposed relation.',
        },
        {
          name: '3NF Rule for Every Non-Trivial $X \\to Y$',
          math: '$$X \\text{ is a Superkey} \\quad \\lor \\quad Y \\text{ is a Prime Attribute}$$',
          note: 'Guarantees freedom from transitive dependencies among non-prime attributes.',
        },
        {
          name: 'BCNF Rule for Every Non-Trivial $X \\to Y$',
          math: '$$X \\text{ is a Superkey}$$',
          note: 'Stricter than 3NF; eliminates the prime attribute loophole.',
        },
      ],
      complexities: [
        { op: 'Attribute Closure Computation', best: 'O(n)', avg: 'O(n * |F|)', worst: 'O(n * |F|)', space: 'O(n)', notes: 'n attributes, |F| dependencies' },
        { op: 'Candidate Key Finding (Exhaustive)', best: 'O(|F|)', avg: 'O(2^n)', worst: 'O(2^n)', space: 'O(n)', notes: 'NP-complete in worst case' },
        { op: '3NF Synthesis Algorithm', best: 'O(|F|^2)', avg: 'O(|F|^2)', worst: 'O(|F|^2)', space: 'O(|F|)', notes: 'Guarantees dependency preservation' },
        { op: 'Lossless Join Test (Tableau)', best: 'O(k * n)', avg: 'O(k * n * |F|)', worst: 'O(k * n * |F|)', space: 'O(k * n)', notes: 'k decomposed relations' },
      ],
      variables: [
        { symbol: 'R', meaning: 'Relational schema consisting of attribute set A1, A2, ..., An' },
        { symbol: 'X -> Y', meaning: 'Functional dependency: X functionally determines Y' },
        { symbol: 'X+', meaning: 'Attribute closure of X under given functional dependency set F' },
        { symbol: 'Fc', meaning: 'Minimal canonical cover of functional dependencies' },
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. COMPUTER NETWORKS & TCP/IP
  // ─────────────────────────────────────────────────────────────────────────────
  networks: {
    canonicalTitle: 'Computer Networks & TCP/IP Reference Model',
    courseCode: 'CS507',
    courseName: 'Computer Networks',
    summary: {
      overview:
        'Computer Networking governs the interconnected exchange of digital data across physical and logical devices. The Internet architecture is structured around layered protocols: the conceptual 7-Layer OSI Model and the operational 4-Layer TCP/IP Model. Data transmission relies on packet switching, IP routing, reliable transport (TCP) with congestion control, and application-layer protocols (DNS, HTTP/HTTPS).',
      coreConcepts: [
        {
          term: 'OSI vs. TCP/IP Architecture',
          explanation:
            'OSI defines 7 layers: Physical, Data Link, Network, Transport, Session, Presentation, Application. TCP/IP condenses these into: Network Access, Internet (IP), Transport (TCP/UDP), and Application.',
        },
        {
          term: 'Transport Layer: TCP vs. UDP',
          explanation:
            'TCP is connection-oriented, byte-stream, reliable (ACKs, retransmissions), and provides flow control and congestion control. UDP is connectionless, datagram-based, unreliable, but has low latency with zero handshaking overhead.',
        },
        {
          term: 'TCP 3-Way Handshake & Connection Teardown',
          explanation:
            'Establishes connection: 1) Client sends SYN (seq=x), 2) Server responds SYN-ACK (seq=y, ack=x+1), 3) Client sends ACK (ack=y+1). Termination uses FIN / ACK handshakes with a TIME-WAIT period.',
        },
        {
          term: 'Flow Control vs. Congestion Control',
          explanation:
            'Flow Control prevents the sender from overwhelming the receiver via the Sliding Window protocol (Advertised Window `rwnd`). Congestion Control prevents the sender from overwhelming the network infrastructure via Congestion Window `cwnd` (Slow Start, Congestion Avoidance AIMD, Fast Retransmit).',
        },
        {
          term: 'Network Layer & Subnetting (CIDR & IPv4/IPv6)',
          explanation:
            'Classless Inter-Domain Routing (CIDR) uses variable-length subnet masks (VLSM). IPv4 has 32 bits ($2^{32}$ addresses); IPv6 has 128 bits.',
        },
      ],
      steps: [
        {
          step: 'TCP Connection Handshake',
          detail: 'Client SYN (x) -> Server SYN-ACK (y, ack=x+1) -> Client ACK (ack=y+1). State moves to ESTABLISHED.',
        },
        {
          step: 'TCP Congestion Control Lifecycle',
          detail:
            '1) Slow Start: `cwnd` starts at 1 MSS, doubles every RTT ($2^k$) until `ssthresh`. 2) Congestion Avoidance: `cwnd` grows linearly by 1 MSS per RTT (AIMD). 3) 3 Duplicate ACKs: Fast Retransmit lost packet, set `ssthresh = cwnd/2`, Fast Recovery. 4) Timeout: Drop `cwnd = 1 MSS`, `ssthresh = cwnd/2`, re-enter Slow Start.',
        },
      ],
      takeaways: [
        'Transmission Delay $T_{\\text{tx}} = L/R$; Propagation Delay $T_{\\text{prop}} = d/v$.',
        'Bandwidth-Delay Product ($BDP = R \\times RTT$) defines the maximum volume of data in flight in the network pipe.',
        'Sliding window channel utilization: $\\eta = \\frac{W}{1 + 2a}$ where $a = T_{\\text{prop}} / T_{\\text{tx}}$.',
      ],
    },
    keypoints: {
      points: [
        'Data unit names: Bits (Physical), Frames (Data Link), Packets (Network), Segments (Transport), Data/Message (Application).',
        'Encapsulation adds headers at each layer down the stack; Decapsulation strips headers up the stack.',
        'TCP guarantees in-order delivery; UDP may deliver packets out of order or lose packets entirely.',
        'TCP header size is 20-60 bytes; UDP header size is fixed at 8 bytes.',
        'In CIDR notation `/n`, the subnet mask contains $n$ consecutive binary 1s. Number of usable hosts is $2^{32-n} - 2$.',
      ],
      traps: [
        'Trap 1: Confusing Transmission Delay (putting bits onto wire, depends on bandwidth $R$) with Propagation Delay (signal traveling across wire, depends on distance $d$ and light speed $v$).',
        'Trap 2: Forgetting the 2 reserved host addresses in a subnet: Network Address (all host 0s) and Broadcast Address (all host 1s).',
      ],
      bestPractices: [
        'Tune TCP window size to match or exceed the Bandwidth-Delay Product ($BDP$) for high-throughput fat pipes.',
      ],
    },
    definitions: {
      terms: [
        { term: 'Sliding Window Protocol', definition: 'A flow control mechanism allowing a sender to transmit multiple frames/packets before receiving an acknowledgment.', context: 'Maximizes channel throughput.' },
        { term: 'Transmission Delay ($T_{tx}$)', definition: 'The time required to push all packet bits onto the transmission medium ($L/R$).', context: 'Governed by packet length and channel bit rate.' },
        { term: 'Propagation Delay ($T_{prop}$)', definition: 'The time taken for a single bit to travel from sender to receiver across the physical medium ($d/v$).', context: 'Governed by physical distance and propagation speed.' },
      ],
      comparisons: [
        { a: 'TCP', b: 'UDP', distinction: 'TCP is connection-oriented, reliable, with congestion and flow control; UDP is connectionless, lightweight, and prioritized for real-time video/gaming streaming.' },
      ],
    },
    formulas: {
      equations: [
        { name: 'Transmission Delay', math: '$$T_{\\text{tx}} = \\frac{L}{R}$$', note: 'L = packet size in bits, R = link bandwidth in bps' },
        { name: 'Propagation Delay', math: '$$T_{\\text{prop}} = \\frac{d}{v}$$', note: 'd = distance in meters, v = signal propagation velocity' },
        { name: 'Sliding Window Channel Efficiency', math: '$$\\eta = \\frac{W}{1 + 2a} \\quad \\text{where } a = \\frac{T_{\\text{prop}}}{T_{\\text{tx}}}$$', note: 'W = window size. For 100% efficiency, W >= 1 + 2a' },
      ],
      complexities: [
        { op: 'TCP 3-Way Handshake', best: '1 RTT', avg: '1 RTT', worst: 'Multiple RTTs', space: 'O(1)', notes: 'Connection setup' },
      ],
      variables: [
        { symbol: 'L', meaning: 'Packet length in bits' },
        { symbol: 'R', meaning: 'Bandwidth (data rate) in bits per second (bps)' },
        { symbol: 'RTT', meaning: 'Round-Trip Time ($2 \\times T_{prop}$)' },
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. ARTIFICIAL INTELLIGENCE & MACHINE LEARNING (AIML)
  // ─────────────────────────────────────────────────────────────────────────────
  aiml: {
    canonicalTitle: 'Machine Learning, Data Preprocessing & Neural Foundations',
    courseCode: 'CS509',
    courseName: 'Artificial Intelligence & Machine Learning',
    summary: {
      overview:
        'Machine Learning is a branch of artificial intelligence focused on algorithms that generalize patterns from empirical training datasets rather than explicit rule programming. Effective production ML requires robust Data Preprocessing (handling missing values, outlier detection, scaling, encoding), Feature Engineering, Model Training via Empirical Risk Minimization, and rigorous evaluation using metric-driven validation protocols.',
      coreConcepts: [
        {
          term: 'Data Preprocessing & Cleaning',
          explanation:
            'Transforming raw tabular or unstructured data into clean numerical representations. Encompasses missing value imputation (mean/median/KNN), Min-Max Normalization to [0, 1], Z-Score Standardization (mean=0, std=1), and One-Hot or Ordinal categorical encoding.',
        },
        {
          term: 'Supervised vs. Unsupervised Learning',
          explanation:
            'Supervised learning trains on labeled pairs (X, y) for regression or classification. Unsupervised learning discovers latent clustering or dimensionality reductions on unlabeled X.',
        },
        {
          term: 'Loss Functions & Optimization (Gradient Descent)',
          explanation:
            'Quantifies discrepancy between predicted and true ground-truth labels. Regression utilizes Mean Squared Error (MSE); classification uses Binary/Categorical Cross-Entropy. Parameter weights update iteratively: W <- W - alpha * grad(Loss).',
        },
        {
          term: 'Bias-Variance Trade-off & Regularization',
          explanation:
            'High bias causes underfitting (oversimplified models); high variance causes overfitting (memorizing training noise). L1 Regularization (Lasso) induces feature sparsity; L2 Regularization (Ridge) penalizes large weight magnitudes.',
        },
        {
          term: 'Model Evaluation Metrics',
          explanation:
            'Accuracy is often deceptive for imbalanced datasets. Precision measures positive predictive value; Recall measures hit rate of actual positives; F1-Score represents their harmonic balance; ROC-AUC measures discrimination capability across thresholds.',
        },
      ],
      steps: [
        {
          step: 'Data Preprocessing & Train/Test Split',
          detail:
            'Separate raw data into Training, Validation, and Test sets (e.g. 70/15/15 or 80/20). Fit scalers (MinMaxScaler, StandardScaler) strictly on training split and transform test splits to prevent data leakage.',
        },
        {
          step: 'Feature Encoding & Imputation',
          detail:
            'Impute missing values using training median or iterative KNN. Encode nominal categories via One-Hot encoding and ordinal features via monotonic integer mappings.',
        },
        {
          step: 'Model Training & Hyperparameter Tuning',
          detail:
            'Initialize model parameters. Perform forward inference, calculate loss, compute backpropagation gradients, update weights via Adam or SGD with learning rate alpha, and tune hyperparameters using K-fold Cross Validation.',
        },
        {
          step: 'Evaluation & Diagnostic Analysis',
          detail:
            'Generate Confusion Matrix on unseen test set. Calculate Precision, Recall, F1-Score, and ROC-AUC. Plot learning curves to diagnose bias vs. variance defects.',
        },
      ],
      takeaways: [
        'Never fit preprocessing scalers or imputers on the entire dataset; always fit on train set only to prevent data leakage.',
        'Mean Squared Error (MSE) is sensitive to extreme outliers; consider Mean Absolute Error (MAE) or Huber loss for noisy data.',
        'High training error and high test error indicate high bias (underfitting); low training error but high test error indicates high variance (overfitting).',
        'F1-score is the harmonic mean of precision and recall: 2 * (P * R) / (P + R), penalizing severe imbalances between the two.',
      ],
    },
    keypoints: {
      points: [
        'Data preprocessing is foundational: Garbage In, Garbage Out (GIGO). Scaled features allow gradient descent to converge smoothly without oscillating.',
        'Min-Max Normalization bounds features to [0, 1]: x_norm = (x - x_min) / (x_max - x_min).',
        'Z-Score Standardization transforms distribution to mean 0, std 1: z = (x - mean) / std.',
        'Gradient Descent weight update: w <- w - alpha * (dL/dw), where alpha is the learning rate.',
        'Sigmoid activation function sigma(z) = 1 / (1 + e^-z) squashes real values into probability range (0, 1).',
        'Softmax activation transforms an unnormalized logit vector into a normalized probability distribution summing to 1.',
        'Confusion Matrix: True Positives (TP), True Negatives (TN), False Positives (FP, Type I error), False Negatives (FN, Type II error).',
        'Decision Tree splitting utilizes Entropy H(S) = -sum(p_i * log2(p_i)) or Gini Impurity G(S) = 1 - sum(p_i^2).',
      ],
      traps: [
        'Trap 1: Data leakage — performing standardization, normalization, or feature selection before splitting into train/test sets.',
        'Trap 2: Using standard classification accuracy on heavily imbalanced datasets (e.g., 99% negative class yields 99% accuracy by predicting all negatives).',
        'Trap 3: Setting the learning rate alpha too high in gradient descent, leading to loss explosion or divergence instead of convergence.',
        'Trap 4: Forgetting that L1 Lasso sets weights strictly to 0 (feature selection), while L2 Ridge shrinks weights toward 0 without zeroing them out.',
      ],
      bestPractices: [
        'Always verify class distribution and prioritize Precision, Recall, or F1-Score over raw accuracy on imbalanced datasets.',
        'Use Stratified K-Fold Cross-Validation for classification tasks to preserve target class proportions across all validation folds.',
      ],
    },
    definitions: {
      terms: [
        {
          term: 'Data Preprocessing',
          definition: 'The systematic stage of transforming messy, incomplete, inconsistent raw data into clean, structured numerical tensors suitable for ML algorithms.',
          context: 'Includes cleaning, handling missing values, normalization, scaling, and dimensionality reduction.',
        },
        {
          term: 'Supervised Learning',
          definition: 'A machine learning paradigm where the algorithm is provided labeled input-output pairs (X, y) to learn a mapping function.',
          context: 'Used for regression (continuous outputs) and classification (discrete categories).',
        },
        {
          term: 'Gradient Descent',
          definition: 'A first-order iterative optimization algorithm for finding a local minimum of a differentiable objective/loss function.',
          context: 'Foundation of training neural networks, logistic regression, and linear regression models.',
        },
        {
          term: 'Overfitting',
          definition: 'A modeling error that occurs when a model learns the detailed noise and random fluctuations in the training data rather than the underlying pattern.',
          context: 'Characterized by near-zero training error but high generalization error on unseen test data.',
        },
        {
          term: 'Cross-Entropy Loss',
          definition: 'A loss metric measuring the performance of a classification model whose output is a probability value between 0 and 1.',
          context: 'Heavily penalizes predictions that are confident and wrong.',
        },
        {
          term: 'Precision & Recall',
          definition: 'Precision is the proportion of positive identifications that were actually correct (TP / (TP + FP)). Recall is the proportion of actual positives identified correctly (TP / (TP + FN)).',
          context: 'Complementary diagnostic metrics for classification systems.',
        },
      ],
      comparisons: [
        {
          a: 'Min-Max Normalization',
          b: 'Z-Score Standardization',
          distinction: 'Min-Max scales data into a bounded range [0, 1] and is sensitive to outliers. Z-Score centers around mean=0 with std=1, unbounded, and preserves outlier information effectively.',
        },
        {
          a: 'L1 Regularization (Lasso)',
          b: 'L2 Regularization (Ridge)',
          distinction: 'L1 adds penalty on sum of absolute weights producing sparse weights with automatic feature selection. L2 adds penalty on squared weights shrinking weights smoothly without eliminating variables.',
        },
        {
          a: 'Precision',
          b: 'Recall',
          distinction: 'Precision answers "Out of all items flagged positive, how many were right?". Recall answers "Out of all actual positive cases in reality, how many did we successfully detect?".',
        },
      ],
    },
    formulas: {
      equations: [
        {
          name: 'Mean Squared Error (MSE Loss)',
          math: '$$J(W) = \\frac{1}{N} \\sum_{i=1}^{N} (y_i - \\hat{y}_i)^2$$',
          note: 'Measures average squared deviation between predicted values and actual ground-truth values.',
        },
        {
          name: 'Binary Cross-Entropy Loss (Log Loss)',
          math: '$$\\mathcal{L} = -\\frac{1}{N} \\sum_{i=1}^N \\left[ y_i \\log(\\hat{y}_i) + (1 - y_i) \\log(1 - \\hat{y}_i) \\right]$$',
          note: 'Standard loss function for binary classification models with probabilistic outputs.',
        },
        {
          name: 'Gradient Descent Parameter Update Rule',
          math: '$$W \\leftarrow W - \\alpha \\nabla_W J(W)$$',
          note: 'W = weight parameters, alpha = learning rate, grad = gradient of loss function with respect to weights.',
        },
        {
          name: 'Sigmoid Activation Function',
          math: '$$\\sigma(z) = \\frac{1}{1 + e^{-z}}$$',
          note: 'Squashes any real input into the range (0, 1); derivative is sigma(z) * (1 - sigma(z)).',
        },
        {
          name: 'Softmax Activation Function',
          math: '$$P(y = c \\mid z) = \\frac{e^{z_c}}{\\sum_{k=1}^K e^{z_k}}$$',
          note: 'Converts K real-valued logits into a categorical probability distribution summing to 1.',
        },
        {
          name: 'Min-Max Normalization (Scaling)',
          math: '$$x_{\\text{norm}} = \\frac{x - x_{\\min}}{x_{\\max} - x_{\\min}}$$',
          note: 'Scales numeric feature values to the closed interval [0, 1].',
        },
        {
          name: 'Z-Score Standardization',
          math: '$$z = \\frac{x - \\mu}{\\sigma}$$',
          note: 'Standardizes feature to zero mean (mu = 0) and unit variance (sigma = 1).',
        },
        {
          name: 'Classification Evaluation Metrics (Precision, Recall, F1)',
          math: '$$\\text{Precision} = \\frac{TP}{TP + FP}, \\quad \\text{Recall} = \\frac{TP}{TP + FN}, \\quad F_1 = 2 \\times \\frac{\\text{Precision} \\times \\text{Recall}}{\\text{Precision} + \\text{Recall}}$$',
          note: 'TP = True Positives, FP = False Positives, FN = False Negatives.',
        },
        {
          name: 'Information Entropy & Information Gain (Decision Trees)',
          math: '$$H(S) = -\\sum_{i=1}^c p_i \\log_2(p_i), \\quad IG(S, A) = H(S) - \\sum_{v \\in \\text{Values}(A)} \\frac{|S_v|}{|S|} H(S_v)$$',
          note: 'H(S) measures dataset uncertainty; IG(S, A) quantifies expected reduction in entropy by partitioning on attribute A.',
        },
        {
          name: 'Euclidean & Manhattan Distance Metrics',
          math: '$$d_{\\text{Euclidean}}(\\mathbf{p}, \\mathbf{q}) = \\sqrt{\\sum_{i=1}^n (p_i - q_i)^2}, \\quad d_{\\text{Manhattan}}(\\mathbf{p}, \\mathbf{q}) = \\sum_{i=1}^n |p_i - q_i|$$',
          note: 'Fundamental distance metrics for KNN classification and K-Means clustering algorithms.',
        },
      ],
      complexities: [
        { op: 'Linear Regression Gradient Descent', best: 'O(N * d)', avg: 'O(epochs * N * d)', worst: 'O(epochs * N * d)', space: 'O(d)', notes: 'N = samples, d = features' },
        { op: 'K-Nearest Neighbors (KNN) Inference', best: 'O(1)', avg: 'O(N * d)', worst: 'O(N * d)', space: 'O(N * d)', notes: 'Lazy learner, brute force' },
        { op: 'Decision Tree Training (ID3/CART)', best: 'O(d * N log N)', avg: 'O(d * N log N)', worst: 'O(d * N^2)', space: 'O(nodes)', notes: 'Recursive feature splitting' },
        { op: 'K-Means Clustering Iteration', best: 'O(k * N * d)', avg: 'O(iter * k * N * d)', worst: 'O(iter * k * N * d)', space: 'O(N + k * d)', notes: 'k = clusters' },
        { op: 'StandardScaler Transformation', best: 'O(N * d)', avg: 'O(N * d)', worst: 'O(N * d)', space: 'O(d)', notes: 'Mean and variance compute' },
      ],
      variables: [
        { symbol: 'N', meaning: 'Total number of sample observations or instances in the dataset' },
        { symbol: 'd or p', meaning: 'Number of input features (dimensions) per sample' },
        { symbol: 'W or w', meaning: 'Trainable weight vector or parameter matrix' },
        { symbol: 'alpha', meaning: 'Learning rate governing gradient step size during optimization' },
        { symbol: 'y and y_hat', meaning: 'True ground-truth target label and model predicted label respectively' },
        { symbol: 'TP, FP, TN, FN', meaning: 'Confusion matrix counts: True Positives, False Positives, True Negatives, False Negatives' },
        { symbol: 'mu, sigma', meaning: 'Mean and standard deviation of feature distribution' },
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. CRYPTOGRAPHY & NETWORK SECURITY
  // ─────────────────────────────────────────────────────────────────────────────
  crypto: {
    canonicalTitle: 'Cryptography, Public Key Infrastructure & Network Security',
    courseCode: 'CS511',
    courseName: 'Cryptography & Information Security',
    summary: {
      overview:
        'Cryptography ensures data confidentiality, integrity, authentication, and non-repudiation across insecure channels. It spans Symmetric Encryption (AES, DES), Asymmetric Public Key Cryptosystems (RSA, Elliptic Curves, Diffie-Hellman), Cryptographic Hash Functions (SHA-256, SHA-3), Message Authentication Codes (HMAC), and Digital Signatures grounded in computationally hard number-theoretic problems.',
      coreConcepts: [
        {
          term: 'Symmetric vs. Asymmetric Encryption',
          explanation:
            'Symmetric ciphers use the same secret key for encryption and decryption, offering high throughput (AES). Asymmetric ciphers use mathematically linked public/private key pairs, resolving key distribution at higher computational cost (RSA, ECC).',
        },
        {
          term: 'RSA Algorithm Principles',
          explanation:
            'Relies on the integer factorization problem. Computes modulus n = p * q, totient phi(n) = (p-1)(q-1), chooses public exponent e coprime to phi(n), and derives private exponent d = e^-1 mod phi(n). Encryption: c = m^e mod n; Decryption: m = c^d mod n.',
        },
        {
          term: 'Diffie-Hellman Key Exchange',
          explanation:
            'Enables two parties to securely establish a shared secret over an unencrypted public channel based on the Discrete Logarithm Problem: K = (g^b)^a = (g^a)^b mod p.',
        },
        {
          term: 'Cryptographic Hash Functions & Integrity',
          explanation:
            'One-way deterministic functions mapping arbitrary data to fixed-length digests (SHA-256). Must satisfy Pre-image Resistance, Second Pre-image Resistance, and Collision Resistance.',
        },
        {
          term: 'Digital Signatures & Non-Repudiation',
          explanation:
            'Sender signs message hash with their Private Key; any verifier checks validity with the sender’s Public Key, ensuring authenticity, integrity, and non-repudiation.',
        },
      ],
      steps: [
        {
          step: 'RSA Key Pair Generation',
          detail:
            'Select large primes p, q. Compute n = p * q and phi(n) = (p-1)(q-1). Choose e such that 1 < e < phi(n) and gcd(e, phi(n)) = 1. Calculate d = e^-1 mod phi(n) using Extended Euclidean Algorithm.',
        },
        {
          step: 'Diffie-Hellman Shared Secret Agreement',
          detail:
            'Agree on public prime p and generator g. Alice chooses secret a, sends A = g^a mod p. Bob chooses secret b, sends B = g^b mod p. Both compute shared secret K = B^a = A^b = g^(ab) mod p.',
        },
        {
          step: 'Digital Signature Creation & Verification',
          detail:
            'Sender hashes document h = H(m), encrypts h using private key d: s = h^d mod n. Recipient computes h_check = s^e mod n and compares with H(m). If identical, signature is verified.',
        },
      ],
      takeaways: [
        'Symmetric cryptography is fast but requires pre-shared secret keys; Asymmetric solves key distribution but is computationally expensive.',
        'RSA security relies on factoring large numbers n = pq; Diffie-Hellman and ElGamal rely on the Discrete Logarithm Problem.',
        'Hashing is one-way (irreversible); encryption is two-way (reversible with key).',
        'Digital signatures encrypt the hash with the sender’s PRIVATE key, allowing anyone with the PUBLIC key to verify.',
      ],
    },
    keypoints: {
      points: [
        'Confidentiality: Only authorized parties read data. Integrity: Data cannot be altered undetected. Authentication: Identity verification. Non-repudiation: Sender cannot deny message transmission.',
        'AES uses substitution-permutation network with block size 128 bits and key sizes 128, 192, 256 bits.',
        'RSA Encryption: c = m^e mod n. Decryption: m = c^d mod n.',
        'Euler’s Totient Function phi(n) = (p-1)(q-1) for prime factors p, q.',
        'Diffie-Hellman Key Exchange: K = g^(ab) mod p; vulnerable to Man-in-the-Middle (MitM) without digital signatures.',
        'Birthday Paradox: A collision in an n-bit hash function can be found in approximately 2^(n/2) operations.',
      ],
      traps: [
        'Trap 1: Confusing encryption with hashing — hashing has no decryption key and is irreversible.',
        'Trap 2: Believing Diffie-Hellman alone provides authentication; it is vulnerable to Man-in-the-Middle (MitM) attacks without digital certificates.',
        'Trap 3: Using Electronic Codebook (ECB) mode in block ciphers; identical plaintext blocks yield identical ciphertext blocks, leaking structural patterns.',
      ],
      bestPractices: [
        'Always use authenticated symmetric encryption modes like AES-GCM rather than unauthenticated CBC or ECB.',
        'Use RSA keys of at least 2048 bits (3072+ recommended) or ECC curves (e.g. Curve25519) for modern cryptographic resilience.',
      ],
    },
    definitions: {
      terms: [
        { term: 'Symmetric Cipher', definition: 'An encryption scheme where the identical secret key is utilized for both plaintext encryption and ciphertext decryption.', context: 'AES-128/256, DES, 3DES.' },
        { term: 'Asymmetric Cipher', definition: 'A cryptographic system employing public and private key pairs for encryption and digital signatures.', context: 'RSA, ECC, ElGamal.' },
        { term: 'Collision Resistance', definition: 'The property of a hash function where it is computationally infeasible to find any two distinct inputs x1 != x2 such that H(x1) = H(x2).', context: 'Essential for digital certificates and blockchain.' },
        { term: 'Digital Signature', definition: 'A mathematical scheme for verifying authenticity, data integrity, and non-repudiation of digital messages.', context: 'Formed via private key encryption of a cryptographic hash.' },
      ],
      comparisons: [
        { a: 'Symmetric Encryption', b: 'Asymmetric Encryption', distinction: 'Symmetric uses 1 shared secret key and is ultra-fast for bulk data; Asymmetric uses 2 keys (public/private), is slower, and used for key exchange and authentication.' },
        { a: 'Hashing', b: 'Encryption', distinction: 'Hashing is one-way lossy compression for integrity verification; Encryption is two-way reversible transformation for confidentiality.' },
      ],
    },
    formulas: {
      equations: [
        { name: 'RSA Encryption & Decryption Equations', math: '$$c \\equiv m^e \\pmod n, \\quad m \\equiv c^d \\pmod n$$', note: 'Public Key = (e, n), Private Key = (d, n), where n = p * q' },
        { name: 'Euler’s Totient & Modular Inverse (RSA Key Gen)', math: '$$\\phi(n) = (p - 1)(q - 1), \\quad e \\cdot d \\equiv 1 \\pmod{\\phi(n)}$$', note: 'd is calculated via Extended Euclidean Algorithm' },
        { name: 'Diffie-Hellman Key Exchange Computation', math: '$$A = g^a \\pmod p, \\quad B = g^b \\pmod p, \\quad K = B^a \\equiv A^b \\equiv g^{ab} \\pmod p$$', note: 'Shared secret K computed independently by Alice and Bob' },
        { name: 'Birthday Attack Collision Bound', math: '$$\\text{Operations} \\approx 1.177 \\times \\sqrt{2^n} = O(2^{n/2})$$', note: 'Complexity required to find a hash collision in an n-bit hash digest' },
        { name: 'Caesar / Shift Cipher Transformation', math: '$$c = (m + k) \\pmod{26}, \\quad m = (c - k) \\pmod{26}$$', note: 'Classical monoalphabetic substitution with key shift k' },
      ],
      complexities: [
        { op: 'Modular Exponentiation (Square & Multiply)', best: 'O(log e)', avg: 'O(log e)', worst: 'O(log e)', space: 'O(log n)', notes: 'Efficient big integer powers' },
        { op: 'Extended Euclidean Algorithm gcd(a, b)', best: 'O(1)', avg: 'O(log(min(a, b)))', worst: 'O(log(min(a, b)))', space: 'O(1)', notes: 'Computes modular inverse' },
        { op: 'AES Block Encryption (128-bit block)', best: 'O(1)', avg: 'O(10 rounds)', worst: 'O(14 rounds)', space: 'O(1)', notes: 'Hardware accelerated (AES-NI)' },
        { op: 'Brute Force Key Search (k-bit key)', best: 'O(1)', avg: 'O(2^(k-1))', worst: 'O(2^k)', space: 'O(1)', notes: 'Exhaustive key enumeration' },
      ],
      variables: [
        { symbol: 'n', meaning: 'RSA modulus formed by the product of two large prime numbers p and q (n = p * q)' },
        { symbol: 'e', meaning: 'Public encryption exponent, coprime to phi(n)' },
        { symbol: 'd', meaning: 'Private decryption exponent, satisfying e * d = 1 mod phi(n)' },
        { symbol: 'p, g', meaning: 'Diffie-Hellman public parameters: large prime modulus p and primitive root generator g' },
        { symbol: 'K', meaning: 'Established shared secret key between communicating parties' },
      ],
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// TOPIC MATCHING & RESOLUTION HELPER
// ─────────────────────────────────────────────────────────────────────────────
export function resolveTopicDomain(topic: string, context?: string): string {
  const norm = `${topic} ${context || ''}`.toLowerCase();

  // 1. Machine Learning & AI Foundations (Check first to avoid 'process' sub-string false positives)
  if (
    norm.includes('machine learning') ||
    norm.includes('aiml') ||
    norm.includes('ai & ml') ||
    norm.includes('artificial intelligence') ||
    norm.includes('deep learning') ||
    norm.includes('neural') ||
    norm.includes('pre-processing') ||
    norm.includes('preprocessing') ||
    norm.includes('regression') ||
    norm.includes('classification') ||
    norm.includes('clustering') ||
    norm.includes('decision tree') ||
    norm.includes('random forest') ||
    norm.includes('gradient descent') ||
    norm.includes('cross-entropy') ||
    norm.includes('cs509') ||
    norm.includes('feature engineering') ||
    norm.includes('supervised') ||
    norm.includes('unsupervised') ||
    norm.includes('k-means') ||
    norm.includes('knn')
  ) {
    return 'aiml';
  }

  // 2. Cryptography & Network Security
  if (
    norm.includes('crypto') ||
    norm.includes('cipher') ||
    norm.includes('encryption') ||
    norm.includes('decryption') ||
    norm.includes('rsa') ||
    norm.includes('diffie-hellman') ||
    norm.includes('aes') ||
    norm.includes('des') ||
    norm.includes('sha-') ||
    norm.includes('digital signature') ||
    norm.includes('public key') ||
    norm.includes('cs511')
  ) {
    return 'crypto';
  }

  // 3. Graph / Traversal / Trees / Algorithms
  if (
    norm.includes('graph') ||
    norm.includes('bfs') ||
    norm.includes('dfs') ||
    norm.includes('dijkstra') ||
    norm.includes('traversal') ||
    norm.includes('spanning tree') ||
    norm.includes('kruskal') ||
    norm.includes('prim') ||
    norm.includes('topological') ||
    norm.includes('cs501')
  ) {
    return 'graph';
  }

  // 4. OS / Process / Scheduling / Deadlocks / Memory
  if (
    norm.includes('operating system') ||
    /\b(process|processes|pcb|cpu scheduling)\b/.test(norm) ||
    norm.includes('scheduling') ||
    norm.includes('deadlock') ||
    norm.includes('paging') ||
    norm.includes('round robin') ||
    norm.includes('fcfs') ||
    norm.includes('sjf') ||
    norm.includes('cs505') ||
    norm.includes('thread') ||
    norm.includes('semaphore') ||
    norm.includes('virtual memory')
  ) {
    return 'os';
  }

  // 5. DBMS / Normalization / SQL / Relational
  if (
    norm.includes('database') ||
    norm.includes('dbms') ||
    norm.includes('normalization') ||
    norm.includes('normal form') ||
    norm.includes('bcnf') ||
    norm.includes('3nf') ||
    norm.includes('2nf') ||
    norm.includes('1nf') ||
    norm.includes('acid') ||
    norm.includes('functional depend') ||
    norm.includes('cs503')
  ) {
    return 'dbms';
  }

  // 6. Networks / TCP / IP / OSI
  if (
    norm.includes('network') ||
    norm.includes('tcp') ||
    norm.includes('udp') ||
    norm.includes('osi') ||
    norm.includes('ip') ||
    norm.includes('packet') ||
    norm.includes('cs507') ||
    norm.includes('routing') ||
    norm.includes('subnet')
  ) {
    return 'networks';
  }

  // Fallback defaults to graph (most prominent curricular subject)
  return 'graph';
}

// ─────────────────────────────────────────────────────────────────────────────
// ACADEMIC NOTES GENERATOR FUNCTION
// ─────────────────────────────────────────────────────────────────────────────
export function generateAcademicNotes(
  rawTopic: string,
  type: NoteType,
  context?: string
): { title: string; content: string } {
  const domainKey = resolveTopicDomain(rawTopic, context);
  const data = KNOWLEDGE_BASE[domainKey] || KNOWLEDGE_BASE.graph;

  const enteredTopic = (rawTopic || '').trim();
  const displayTopic = enteredTopic && !enteredTopic.toLowerCase().startsWith('unit') && enteredTopic !== 'all'
    ? enteredTopic
    : data.canonicalTitle;

  const formatTitles: Record<NoteType, { label: string; icon: string }> = {
    summary: { label: 'Chapter Summary', icon: '📚' },
    keypoints: { label: 'Key Points', icon: '🎯' },
    definitions: { label: 'Definitions & Terminology', icon: '📖' },
    formulas: { label: 'Formula Sheet & Reference Guide', icon: '📐' },
  };

  const { label, icon } = formatTitles[type] || formatTitles.summary;
  const headerTitle = `${label}: ${displayTopic}`;

  const headerMeta = `# ${icon} ${headerTitle}\n\n` +
    `**Topic / Chapter:** ${displayTopic}  \n` +
    `**Course:** ${data.courseCode} — ${data.courseName}  \n` +
    `**Note Type:** ${label}  \n` +
    `${context ? `**Source Context:** ${context.replace(/[\r\n]+/g, ' ').slice(0, 100)}  \n` : ''}` +
    `---\n\n`;

  // 1. CHAPTER SUMMARY
  if (type === 'summary') {
    const s = data.summary;
    let md = headerMeta;
    md += `## 1. Executive Overview & Scope\n${s.overview}\n\n`;
    md += `## 2. Core Concepts & Theoretical Principles\n`;
    s.coreConcepts.forEach(c => {
      md += `- **${c.term}**: ${c.explanation}\n`;
    });
    md += `\n## 3. Key Mechanisms, Algorithms & Step-by-Step Execution\n`;
    s.steps.forEach((st, idx) => {
      md += `${idx + 1}. **${st.step}**: ${st.detail}\n`;
    });
    md += `\n## 4. High-Yield Exam Highlights & Takeaways\n`;
    s.takeaways.forEach(t => {
      md += `- ${t}\n`;
    });
    return { title: headerTitle, content: md };
  }

  // 2. KEY POINTS
  if (type === 'keypoints') {
    const k = data.keypoints;
    let md = headerMeta;
    md += `## 📌 Essential Concepts & High-Yield Key Points\n`;
    k.points.forEach((p, idx) => {
      md += `${idx + 1}. ${p}\n`;
    });
    md += `\n## ⚠️ Critical Pitfalls & Common Exam Traps\n`;
    k.traps.forEach(t => {
      md += `- ${t}\n`;
    });
    md += `\n## 💡 Best Practices & Practical Applications\n`;
    k.bestPractices.forEach(b => {
      md += `- ${b}\n`;
    });
    return { title: headerTitle, content: md };
  }

  // 3. DEFINITIONS
  if (type === 'definitions') {
    const d = data.definitions;
    let md = headerMeta;
    md += `## 🏷️ Essential Definitions & Terminology Glossary\n`;
    d.terms.forEach(t => {
      md += `- **${t.term}**: *Definition*: ${t.definition} *Context/Significance*: ${t.context}\n`;
    });
    md += `\n## 🔍 Comparative Terminology & Key Distinctions\n`;
    d.comparisons.forEach(c => {
      md += `- **${c.a} vs. ${c.b}**: ${c.distinction}\n`;
    });
    return { title: headerTitle, content: md };
  }

  // 4. FORMULAS
  const f = data.formulas;
  let md = headerMeta;
  md += `## ⚡ Core Formulas, Equations & Identities\n`;
  f.equations.forEach(eq => {
    const curated = getCuratedFormulaDetails(eq.name, eq.math, eq.note);
    if (curated) {
      md += `### ${eq.name}\n`;
      md += `- **Unit:** ${curated.unit}\n`;
      md += `- **Chapter:** ${curated.chapter}\n`;
      md += `- **Page:** ${curated.page}\n`;
      md += `- **Formula:** ${curated.studentFormula}\n`;
      md += `- **Meaning:** ${curated.meaning}\n`;
      md += `- **Variables Explained:**\n`;
      curated.symbols.forEach(s => {
        md += `  - \`${s.symbol}\`: ${s.meaning}\n`;
      });
      md += `- **Worked Example:** ${curated.workedExample}\n`;
      if (curated.finalAnswer) {
        md += `- **Final Answer:** ${curated.finalAnswer}\n`;
      }
      if (curated.mnemonic) {
        md += `- **Quick Memory Tip:** ${curated.mnemonic}\n`;
      }
      md += `\n`;
    } else {
      const synth = synthesizeFormulaDetails(eq.name, eq.math, eq.note);
      md += `### ${eq.name}\n`;
      md += `- **Unit:** ${synth.unit}\n`;
      md += `- **Chapter:** ${synth.chapter}\n`;
      md += `- **Page:** ${synth.page}\n`;
      md += `- **Formula:** ${eq.math}\n`;
      md += `- **Meaning:** ${synth.meaning}\n`;
      md += `- **Variables Explained:**\n`;
      synth.symbols.forEach(s => {
        md += `  - \`${s.symbol}\`: ${s.meaning}\n`;
      });
      md += `- **Worked Example:** ${synth.workedExample}\n`;
      md += `- **Final Answer:** ${synth.finalAnswer}\n`;
      md += `- **Quick Memory Tip:** ${synth.mnemonic}\n\n`;
    }
  });
  md += `## ⏱️ Computational Complexities & Algorithmic Bounds\n`;
  md += `| Operation / Algorithm | Best Case | Average Case | Worst Case | Space Complexity | Notes |\n`;
  md += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;
  f.complexities.forEach(c => {
    md += `| ${c.op} | $${c.best}$ | $${c.avg}$ | $${c.worst}$ | $${c.space}$ | ${c.notes} |\n`;
  });
  md += `\n## 🔢 Parameter & Notation Reference Guide\n`;
  f.variables.forEach(v => {
    md += `- **$${v.symbol}$**: ${v.meaning}\n`;
  });

  md += `\n## 📋 Total Formulas Summary & Master Reference\n`;
  md += `**Total Formulas: ${f.equations.length}**\n\n`;
  md += `| # | Formula Name | Formula Equation | Unit & Chapter | Source Page |\n`;
  md += `| :--- | :--- | :--- | :--- | :--- |\n`;
  f.equations.forEach((eq, idx) => {
    const curated = getCuratedFormulaDetails(eq.name, eq.math, eq.note);
    const form = curated ? curated.studentFormula : eq.math;
    const unit = curated ? curated.unit : 'Core Unit';
    const chap = curated ? curated.chapter : '';
    const page = curated ? curated.page : 'PDF Reference';
    const unitChap = chap ? `${unit} • ${chap}` : unit;
    md += `| ${idx + 1} | ${eq.name} | \`${form.replace(/\|/g, '\\|')}\` | ${unitChap} | ${page} |\n`;
  });

  return { title: headerTitle, content: md };
}
