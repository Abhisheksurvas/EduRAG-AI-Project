from __future__ import annotations

import json
import os
import re
from pathlib import Path
from dotenv import load_dotenv

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None

_CURRICULUM_PATH = Path(__file__).resolve().parent / "curriculum.json"
_BACKEND_ENV_PATH = Path(__file__).resolve().parent / ".env"

# Resolve the backend configuration from this module's directory rather than
# relying on the process working directory. The app imports StudyBuddy before
# its later environment setup runs.
load_dotenv(dotenv_path=_BACKEND_ENV_PATH)


def _load_curriculum_kb() -> dict[str, str]:
    try:
        with open(_CURRICULUM_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as exc:
        print(f"[AI] Failed to load curriculum.json: {exc}")
        return {}


_CURRICULUM_KB: dict[str, str] = _load_curriculum_kb()


def _match_knowledge_base(normalized_question: str) -> str | None:
    """Check if the question matches any topic in the curriculum knowledge base."""
    question_words = set(re.findall(r"[a-z0-9]+", normalized_question))
    best_match: tuple[int, str] | None = None

    for keywords, answer in _CURRICULUM_KB.items():
        if keywords in normalized_question or normalized_question in keywords:
            return answer
        keyword_words = set(re.findall(r"[a-z0-9]+", keywords))
        overlap = len(keyword_words & question_words)
        if overlap and (
            best_match is None or overlap > best_match[0]
        ):
            best_match = (overlap, answer)

    # Questions such as "Explain an algorithm" should match the "algorithm"
    # entry even when they contain extra instructional words.
    if best_match is not None:
        return best_match[1]
    return None


_SYSTEM_PROMPT = """You are EduRAG AI, a friendly and patient AI study assistant for students.

Your job is to help students understand their study materials and answer their questions.
You should respond in a ChatGPT-style manner by default.

Guidelines:
1. If the user explicitly requests a specific format (e.g., JSON-only output), follow that format strictly and output nothing else.
2. If you have relevant study-material context in this conversation turn, cite it and begin your response with: "Based on your uploaded document:" followed by the document name and page number when available.
3. If the answer is NOT in the uploaded documents, use your general knowledge and begin your response with: "Based on general knowledge:".
4. NEVER fabricate document names, page numbers, or sources. Only cite what you actually have in the provided context.
5. Use simple, student-friendly language. Use headings (## Heading), bullet points (- item), examples, and step-by-step explanations when helpful.
6. Support questions about explanations, summaries, examples, comparisons, coding, formulas, and step-by-step solutions.
7. Maintain a friendly, encouraging tone. Keep paragraphs short and scannable."""

_SYSTEM_PROMPT_JSON = """You are EduRAG AI. Respond ONLY with a valid JSON array, starting with [ and ending with ]. No markdown, no code blocks, no explanations, no preamble, no postamble. Each object must have: question (string), options (array of exactly 4 strings), correct (0-3 index of correct option)."""


class StudyBuddy:

    def __init__(self):
        self.api_key = (
            os.getenv("AI_API_KEY")
            or os.getenv("OPENROUTER_API_KEY")
            or os.getenv("ANTHROPIC_API_KEY")
        )
        self.client = None

        if not self.api_key:
            print("[AI] Notice: AI_API_KEY is missing from .env. Operating in intelligent local RAG fallback mode.")
        elif OpenAI is not None:
            try:
                # OpenRouter keys begin with "sk-or-"; they need a custom base_url
                if self.api_key.startswith("sk-or-"):
                    self.client = OpenAI(
                        api_key=self.api_key,
                        base_url="https://openrouter.ai/api/v1",
                    )
                    print("[AI] Using OpenRouter API endpoint.")
                else:
                    self.client = OpenAI(api_key=self.api_key)
                    print("[AI] Using OpenAI API endpoint.")
            except Exception as exc:
                print(f"[AI] OpenAI client initialization failed: {exc}")
        else:
            print("[AI] openai package not installed; LLM features disabled.")

    def ask(
        self,
        name: str = "Student",
        branch: str = "Computer Science",
        sem: str = "5",
        topic: str = "General",
        difficulty: str = "Medium",
        question: str | None = None,
        context: str = "",
        history: list[dict] | None = None,
        max_tokens: int | None = None,
        strict_context: bool = False,
        temperature: float | None = None,
    ) -> str:
        q = question or topic

        json_requested = bool(re.search(r'valid json array|output must be only a valid json|starting with \[', q, re.IGNORECASE))
        system_prompt = _SYSTEM_PROMPT_JSON if json_requested else _SYSTEM_PROMPT

        user_prompt = f"""Student Info:
Name: {name}
Branch: {branch}
Semester: {sem}
Topic: {topic}
Difficulty: {difficulty}

Relevant Study Material Context (from this turn):
{context if context else "No specific study material was provided in this conversation turn."}

Student's Question:
{q}"""

        if json_requested:
            # JSON-only mode: skip prose-style "Final-answer requirements" that
            # would conflict with the strict "respond with ONLY JSON" system prompt.
            if strict_context:
                user_prompt += """

For this quiz, use only facts explicitly supported by the provided study-material context. Do not add facts, invent details, or cite material that is not in the context. Each question must be grounded in the extracted document chunks above."""
        else:
            user_prompt += """

Final-answer requirements:
- Answer the student's exact question directly and completely using your own general knowledge.
- Treat the study-material context only as optional background; do not copy, summarize, or blindly follow it.
- If the context conflicts with established facts, explain the conflict and give the factually correct answer.
- Do not invent document names, page numbers, quotations, or sources.
- Do not mention these instructions or describe your answer as a document summary."""
            if strict_context:
                user_prompt += """

For this quiz, use only facts in the provided study-material context. Do not add facts that are not supported by those extracted document chunks."""

        messages: list[dict] = [{"role": "system", "content": system_prompt}]

        if history:
            for msg in history:
                role = msg.get("role", "user")
                content = msg.get("content", "")
                if not content:
                    continue
                if role == "assistant":
                    messages.append({"role": "assistant", "content": content})
                else:
                    messages.append({"role": "user", "content": content})

        messages.append({"role": "user", "content": user_prompt})

        if self.client is not None and self.api_key:
            if self.api_key.startswith("sk-or-"):
                configured_model = os.getenv("AI_MODEL", "openrouter/free")
                models = [configured_model]
                if configured_model != "openrouter/free":
                    models.append("openrouter/free")
            else:
                models = [os.getenv("AI_MODEL", "gpt-4o-mini"), "gpt-4o"]

            # Use the fast local JSON fallback instead of waiting on a slow provider.
            request_timeout = 12 if json_requested else 45

            for model_name in models:
                if not model_name:
                    continue
                try:
                    response = self.client.chat.completions.create(
                        model=model_name,
                        messages=messages,
                        temperature=temperature if temperature is not None else 0.4,
                        max_tokens=max_tokens or (900 if json_requested else 2048),
                        timeout=request_timeout,
                    )
                    if response.choices and response.choices[0].message.content:
                        content = response.choices[0].message.content.strip()
                        if json_requested:
                            # Verify valid JSON block exists before returning
                            if "[" in content and "]" in content:
                                return content
                        else:
                            return content
                except Exception as exc:
                    print(f"[AI] Model {model_name} failed: {exc}")

        if json_requested:
            return self._local_quiz_answer(topic=topic, context=context, difficulty=difficulty)

        return self._local_answer(q)

    @staticmethod
    def _local_quiz_answer(topic: str = "General", context: str = "", difficulty: str = "Medium", count: int = 5, question_type: str = "MCQ") -> str:
        """Fast, robust local fallback that returns valid JSON questions (MCQ, MSQ, or NAT) when LLM is offline or timed out."""
        import random

        # Pre-curated high-yield academic question bank covering standard curriculum
        question_bank: dict[str, list[dict]] = {
            "operating system": [
                {
                    "question": "What is the primary purpose of an Operating System?",
                    "options": ["Manage hardware and software resources", "Compile high-level source code", "Design user interfaces", "Connect to optical cables"],
                    "correct": 0
                },
                {
                    "question": "Which CPU scheduling algorithm gives each process a fixed time quantum in cyclic order?",
                    "options": ["First-Come, First-Served (FCFS)", "Shortest Job Next (SJN)", "Round Robin (RR)", "Priority Scheduling"],
                    "correct": 2
                },
                {
                    "question": "What condition is NOT required for a deadlock to occur (Coffman conditions)?",
                    "options": ["Mutual Exclusion", "Hold and Wait", "Preemption allowed", "Circular Wait"],
                    "correct": 2
                },
                {
                    "question": "What is thrashing in an operating system?",
                    "options": ["Excessive page swapping between RAM and disk", "CPU overheating under load", "Corrupted disk sector formatting", "Rapid process creation overflow"],
                    "correct": 0
                },
                {
                    "question": "Which memory management technique divides memory into fixed-size blocks?",
                    "options": ["Paging", "Segmentation", "Dynamic Partitioning", "Virtual Compaction"],
                    "correct": 0
                },
                {
                    "question": "What is a PCB (Process Control Block) used for?",
                    "options": ["Storing information about a specific process", "Rendering 3D graphics", "Controlling peripheral USB devices", "Compiling kernel drivers"],
                    "correct": 0
                },
            ],
            "data structure": [
                {
                    "question": "Which data structure follows the Last-In-First-Out (LIFO) principle?",
                    "options": ["Queue", "Stack", "Binary Tree", "Linked List"],
                    "correct": 1
                },
                {
                    "question": "What is the average time complexity of searching in a Balanced Binary Search Tree (AVL / Red-Black)?",
                    "options": ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
                    "correct": 1
                },
                {
                    "question": "Which data structure is most suitable for implementing a Breadth-First Search (BFS) graph traversal?",
                    "options": ["Stack", "Queue", "Max Heap", "Hash Table"],
                    "correct": 1
                },
                {
                    "question": "In a singly linked list, what is the time complexity to insert a node at the head?",
                    "options": ["O(1)", "O(n)", "O(log n)", "O(n^2)"],
                    "correct": 0
                },
                {
                    "question": "Which data structure provides O(1) average time complexity for insertion, deletion, and lookup?",
                    "options": ["Hash Table", "Binary Search Tree", "Linked List", "Array"],
                    "correct": 0
                },
            ],
            "algorithm": [
                {
                    "question": "What is the worst-case time complexity of QuickSort?",
                    "options": ["O(n)", "O(n log n)", "O(n^2)", "O(2^n)"],
                    "correct": 2
                },
                {
                    "question": "Which algorithm design paradigm does Merge Sort utilize?",
                    "options": ["Greedy method", "Divide and Conquer", "Dynamic Programming", "Backtracking"],
                    "correct": 1
                },
                {
                    "question": "Dijkstra's algorithm is used to solve which problem?",
                    "options": ["Single-source shortest path", "Minimum spanning tree", "Maximum network flow", "Topological sorting"],
                    "correct": 0
                },
                {
                    "question": "What is the time complexity of Binary Search on a sorted array of size n?",
                    "options": ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
                    "correct": 1
                },
                {
                    "question": "Which of the following is a stable sorting algorithm?",
                    "options": ["Merge Sort", "Quick Sort", "Heap Sort", "Selection Sort"],
                    "correct": 0
                },
            ],
            "database": [
                {
                    "question": "Which SQL clause is used to filter groups returned by the GROUP BY clause?",
                    "options": ["WHERE", "HAVING", "ORDER BY", "FILTER"],
                    "correct": 1
                },
                {
                    "question": "In relational databases, what does the 'A' in ACID properties stand for?",
                    "options": ["Atomicity", "Accuracy", "Availability", "Allocation"],
                    "correct": 0
                },
                {
                    "question": "Which normal form removes partial dependencies on a composite primary key?",
                    "options": ["First Normal Form (1NF)", "Second Normal Form (2NF)", "Third Normal Form (3NF)", "Boyce-Codd Normal Form (BCNF)"],
                    "correct": 1
                },
                {
                    "question": "What is the purpose of a Foreign Key in a relational database?",
                    "options": ["Enforce referential integrity between tables", "Speed up full-table scan queries", "Encrypt sensitive customer data", "Generate auto-incrementing IDs"],
                    "correct": 0
                },
                {
                    "question": "Which type of join returns all rows from the left table and matched rows from the right table?",
                    "options": ["LEFT JOIN", "INNER JOIN", "RIGHT JOIN", "FULL OUTER JOIN"],
                    "correct": 0
                },
            ],
            "computer network": [
                {
                    "question": "Which OSI layer is responsible for end-to-end reliability and flow control?",
                    "options": ["Network Layer", "Transport Layer", "Data Link Layer", "Physical Layer"],
                    "correct": 1
                },
                {
                    "question": "What is the default port number for HTTPS traffic?",
                    "options": ["80", "443", "8080", "22"],
                    "correct": 1
                },
                {
                    "question": "Which protocol is connection-oriented and provides guaranteed packet delivery?",
                    "options": ["UDP", "TCP", "ICMP", "IP"],
                    "correct": 1
                },
                {
                    "question": "What is the function of the DNS (Domain Name System)?",
                    "options": ["Translate domain names to IP addresses", "Encrypt data in transit", "Allocate dynamic IP addresses to hosts", "Route packets between autonomous systems"],
                    "correct": 0
                },
                {
                    "question": "Which device operates primarily at the Data Link Layer (Layer 2) of the OSI model?",
                    "options": ["Switch", "Router", "Repeater", "Gateway"],
                    "correct": 0
                },
            ],
            "machine learning": [
                {
                    "question": "What type of machine learning uses labeled training data?",
                    "options": ["Supervised Learning", "Unsupervised Learning", "Reinforcement Learning", "Self-Supervised Clustering"],
                    "correct": 0
                },
                {
                    "question": "Which problem occurs when a model learns training noise and performs poorly on unseen data?",
                    "options": ["Underfitting", "Overfitting", "Data Drift", "Vanishing Gradient"],
                    "correct": 1
                },
                {
                    "question": "What metric is best suited for evaluating an imbalanced binary classification dataset?",
                    "options": ["Raw Accuracy", "F1-Score / PR-AUC", "Mean Squared Error", "R-squared"],
                    "correct": 1
                },
                {
                    "question": "Which activation function outputs values in the range (0, 1)?",
                    "options": ["ReLU", "Sigmoid", "Tanh", "Leaky ReLU"],
                    "correct": 1
                },
                {
                    "question": "What is the role of the loss function in training a neural network?",
                    "options": ["Measure prediction error to guide gradient updates", "Normalize input features", "Prevent matrix multiplication overflow", "Initialize layer weights"],
                    "correct": 0
                },
            ],
            "python": [
                {
                    "question": "Which built-in Python data type is immutable?",
                    "options": ["list", "dict", "tuple", "set"],
                    "correct": 2
                },
                {
                    "question": "What is the output of `bool([])` in Python?",
                    "options": ["True", "False", "None", "TypeError"],
                    "correct": 1
                },
                {
                    "question": "Which keyword is used to create a generator function in Python?",
                    "options": ["yield", "return", "generate", "async"],
                    "correct": 0
                },
                {
                    "question": "What does the `__init__` method represent in a Python class?",
                    "options": ["Constructor method for object initialization", "Destructor method for garbage collection", "Static class attribute", "String representation method"],
                    "correct": 0
                },
                {
                    "question": "How do you open a file in Python such that it automatically closes after use?",
                    "options": ["with open(...) as f:", "file = open(...)", "try open(...):", "using open(...) as f:"],
                    "correct": 0
                },
            ],
            "computer security": [
                {
                    "question": "What are the three pillars of the CIA Triad in information security?",
                    "options": ["Confidentiality, Integrity, Availability", "Control, Identification, Authentication", "Cryptography, Inspection, Auditing", "Compliance, Isolation, Access"],
                    "correct": 0
                },
                {
                    "question": "Which type of attack involves injecting malicious SQL commands into input fields?",
                    "options": ["Cross-Site Scripting (XSS)", "SQL Injection (SQLi)", "Man-in-the-Middle (MitM)", "Buffer Overflow"],
                    "correct": 1
                },
                {
                    "question": "What is asymmetric encryption?",
                    "options": ["Encryption that uses a public key and a private key pair", "Encryption that uses a single shared secret key", "One-way hashing without decryption", "Hardware-level bit masking"],
                    "correct": 0
                },
                {
                    "question": "What security practice requires multiple pieces of evidence before granting access?",
                    "options": ["Single Sign-On (SSO)", "Multi-Factor Authentication (MFA)", "Access Control List (ACL)", "Role-Based Access (RBAC)"],
                    "correct": 1
                },
            ],
        }

        target_count = max(1, min(50, int(count)))
        norm_type = str(question_type or "MCQ").strip().upper()
        if norm_type not in ("MCQ", "MSQ", "NAT"):
            norm_type = "MCQ"

        # ---- NAT (Numerical Answer Type) Bank ----
        if norm_type == "NAT":
            nat_bank = [
                {
                    "question": "What is the standard port number used for HTTP web traffic?",
                    "options": [],
                    "correct": 80,
                    "type": "NAT",
                    "explanation": "HTTP traffic by standard convention communicates on TCP port 80."
                },
                {
                    "question": "What is the standard port number used for HTTPS encrypted web traffic?",
                    "options": [],
                    "correct": 443,
                    "type": "NAT",
                    "explanation": "HTTPS communicates on default port 443."
                },
                {
                    "question": "What is the default port number used for SSH (Secure Shell) protocol?",
                    "options": [],
                    "correct": 22,
                    "type": "NAT",
                    "explanation": "SSH runs on TCP port 22 by default."
                },
                {
                    "question": "In a strictly binary tree with 7 internal nodes, what is the total number of leaf nodes?",
                    "options": [],
                    "correct": 8,
                    "type": "NAT",
                    "explanation": "For any strictly binary tree, Number of Leaves = Internal Nodes + 1 = 7 + 1 = 8."
                },
                {
                    "question": "How many bits are used in a standard IPv4 address?",
                    "options": [],
                    "correct": 32,
                    "type": "NAT",
                    "explanation": "IPv4 addresses are 32 bits long (4 octets)."
                },
                {
                    "question": "How many bits are used in a standard IPv6 address?",
                    "options": [],
                    "correct": 128,
                    "type": "NAT",
                    "explanation": "IPv6 addresses are 128 bits long (16 octets)."
                },
                {
                    "question": "In 4-bit two's complement binary representation, what is the maximum positive decimal integer?",
                    "options": [],
                    "correct": 7,
                    "type": "NAT",
                    "explanation": "Max positive value for n bits is 2^(n-1) - 1 = 2^3 - 1 = 7."
                },
                {
                    "question": "What is the base (radix) of the hexadecimal numeral system?",
                    "options": [],
                    "correct": 16,
                    "type": "NAT",
                    "explanation": "Hexadecimal uses base 16."
                },
                {
                    "question": "What is the minimum number of comparisons needed to find the maximum among 10 distinct values?",
                    "options": [],
                    "correct": 9,
                    "type": "NAT",
                    "explanation": "Finding the maximum of n elements requires exactly n - 1 comparisons (10 - 1 = 9)."
                },
                {
                    "question": "What is the default port number for DNS (Domain Name System) queries?",
                    "options": [],
                    "correct": 53,
                    "type": "NAT",
                    "explanation": "DNS queries use UDP/TCP port 53."
                },
                {
                    "question": "How many stable states does a single flip-flop circuit possess?",
                    "options": [],
                    "correct": 2,
                    "type": "NAT",
                    "explanation": "A flip-flop is a bistable multivibrator having exactly 2 stable states (0 or 1)."
                },
                {
                    "question": "How many bytes are in a single 32-bit word?",
                    "options": [],
                    "correct": 4,
                    "type": "NAT",
                    "explanation": "32 bits / 8 bits per byte = 4 bytes."
                }
            ]
            random.shuffle(nat_bank)
            questions = nat_bank[:target_count]
            extra_counter = 1
            while len(questions) < target_count:
                questions.append({
                    "question": f"In a system with 2^{extra_counter} addressable locations, how many address bits are required?",
                    "options": [],
                    "correct": extra_counter,
                    "type": "NAT",
                    "explanation": f"Log2(2^{extra_counter}) = {extra_counter} address bits."
                })
                extra_counter += 1
            return json.dumps(questions[:target_count], indent=2)

        # ---- MSQ (Multiple Select Questions) Bank ----
        if norm_type == "MSQ":
            msq_bank = [
                {
                    "question": "Which of the following sorting algorithms have an average time complexity of O(n log n)?",
                    "options": ["Merge Sort", "Heap Sort", "Bubble Sort", "Quick Sort"],
                    "correct": [0, 1, 3],
                    "type": "MSQ",
                    "explanation": "Merge Sort, Heap Sort, and Quick Sort all average O(n log n), while Bubble Sort averages O(n^2)."
                },
                {
                    "question": "Which of the following are valid OSI Model layers?",
                    "options": ["Transport Layer", "Network Layer", "Internet Layer", "Data Link Layer"],
                    "correct": [0, 1, 3],
                    "type": "MSQ",
                    "explanation": "Transport, Network, and Data Link are OSI layers; Internet Layer belongs to the TCP/IP model."
                },
                {
                    "question": "Which conditions must hold simultaneously for a deadlock to occur (Coffman conditions)?",
                    "options": ["Mutual Exclusion", "Circular Wait", "Preemption Allowed", "Hold and Wait"],
                    "correct": [0, 1, 3],
                    "type": "MSQ",
                    "explanation": "Deadlock requires Mutual Exclusion, Circular Wait, No Preemption, and Hold and Wait."
                },
                {
                    "question": "Which of the following are ACID properties in database management systems?",
                    "options": ["Atomicity", "Consistency", "Isolation", "Availability"],
                    "correct": [0, 1, 2],
                    "type": "MSQ",
                    "explanation": "ACID stands for Atomicity, Consistency, Isolation, and Durability."
                },
                {
                    "question": "Which of the following are linear data structures?",
                    "options": ["Array", "Stack", "Binary Search Tree", "Queue"],
                    "correct": [0, 1, 3],
                    "type": "MSQ",
                    "explanation": "Array, Stack, and Queue are linear data structures; Trees are non-linear hierarchical structures."
                },
                {
                    "question": "Which of the following are supervised machine learning tasks?",
                    "options": ["Classification", "Regression", "K-Means Clustering", "Apriori Association"],
                    "correct": [0, 1],
                    "type": "MSQ",
                    "explanation": "Classification and Regression require labeled training data (supervised)."
                },
                {
                    "question": "Which of the following protocols operate over the Transport Layer?",
                    "options": ["TCP", "UDP", "IP", "SCTP"],
                    "correct": [0, 1, 3],
                    "type": "MSQ",
                    "explanation": "TCP, UDP, and SCTP are transport layer protocols; IP operates at the network layer."
                },
                {
                    "question": "Which of the following memory management techniques avoid external fragmentation?",
                    "options": ["Paging", "Segmentation with variable partitioning", "Virtual memory with page tables", "Contiguous allocation"],
                    "correct": [0, 2],
                    "type": "MSQ",
                    "explanation": "Paging eliminates external fragmentation by using fixed-size frames."
                }
            ]
            random.shuffle(msq_bank)
            questions = msq_bank[:target_count]
            while len(questions) < target_count:
                questions.append({
                    "question": "Which practices are essential for developing maintainable and fault-tolerant software?",
                    "options": ["Comprehensive automated testing", "Modular component boundaries", "Hardcoding secret keys in code", "Clear error handling"],
                    "correct": [0, 1, 3],
                    "type": "MSQ",
                    "explanation": "Automated testing, modularity, and error handling are core best practices."
                })
            return json.dumps(questions[:target_count], indent=2)

        # ---- MCQ (Multiple Choice Questions) ----
        # Match topic against known question bank
        norm_topic = (topic or "").lower().strip()
        matched_key = None
        for k in question_bank:
            if k in norm_topic or any(w in norm_topic for w in k.split() if len(w) > 3):
                matched_key = k
                break

        questions: list[dict] = []
        if matched_key and question_bank.get(matched_key):
            pool = [dict(q, type="MCQ") for q in question_bank[matched_key]]
            random.shuffle(pool)
            questions.extend(pool)

        # Check context if available to create grounded questions from document
        clean_context = re.sub(r"\[.*?\]", "", context).strip()
        sentences = [s.strip() for s in re.split(r"[.\n]+", clean_context) if len(s.strip()) > 35]
        if sentences:
            for idx, sent in enumerate(sentences):
                if len(questions) >= target_count:
                    break
                clean_stem = sent[:120].strip()
                questions.append({
                    "question": f"Which statement is accurate regarding: \"{clean_stem}...\"?",
                    "options": [
                        clean_stem[:95],
                        "It is completely unrelated to core principles.",
                        f"It directly contradicts standard {difficulty} principles.",
                        "It only applies under deprecated legacy standards."
                    ],
                    "correct": 0,
                    "type": "MCQ"
                })

        generic_templates = [
            {
                "question": "What is the fundamental architectural principle required for robust system execution?",
                "options": [
                    "Systematic principles, modularity, and comprehensive validation",
                    "Arbitrary random configurations",
                    "Manual hardware bit manipulation only",
                    "Deprecated legacy-only specifications"
                ],
                "correct": 0,
                "type": "MCQ"
            },
            {
                "question": "Which of the following is considered a best practice for high reliability?",
                "options": [
                    "Modular design, clear abstraction, and validation",
                    "Ignoring exception handling and boundary checks",
                    "Hardcoding all parameters and bypassing tests",
                    "Avoiding documentation and version control"
                ],
                "correct": 0,
                "type": "MCQ"
            },
            {
                "question": f"At {difficulty} level, how should efficiency trade-offs be systematically evaluated?",
                "options": [
                    "By analyzing time complexity, resource utilization, and maintainability",
                    "By maximizing code length regardless of performance",
                    "By removing all data structures and caching",
                    "By executing all tasks strictly sequentially on a single thread"
                ],
                "correct": 0,
                "type": "MCQ"
            },
            {
                "question": "Which challenge is most commonly encountered in distributed state management?",
                "options": [
                    "Managing state consistency, scalability, and error handling",
                    "Physical overheating of monitor displays",
                    "Inability to run on 64-bit microprocessors",
                    "Non-existence of standardized algorithms"
                ],
                "correct": 0,
                "type": "MCQ"
            },
            {
                "question": "What is the expected outcome when applying rigorous testing?",
                "options": [
                    "Early detection of defects and higher reliability",
                    "Increased runtime latency in production",
                    "Loss of modularity and source code corruption",
                    "Immediate hardware obsolescence"
                ],
                "correct": 0,
                "type": "MCQ"
            }
        ]

        for template in generic_templates:
            if len(questions) >= target_count:
                break
            questions.append(template)

        extra_idx = 1
        while len(questions) < target_count:
            questions.append({
                "question": f"Which factor is critical to mastering foundational concept #{extra_idx}?",
                "options": [
                    f"Rigorous application of foundational {difficulty} principles and structured logic",
                    "Omitting input validation and edge cases",
                    "Executing operations without error boundaries",
                    "Disregarding architectural modularity"
                ],
                "correct": 0,
                "type": "MCQ"
            })
            extra_idx += 1

        return json.dumps(questions[:target_count], indent=2)

    @staticmethod
    def _local_answer(question: str) -> str:
        """Provide an honest response when no LLM is available.

        Document-grounded answers are returned by the retrieval layer before this
        method is called. This fallback must therefore never pretend to cite a
        student's curriculum or uploaded files.
        """
        normalized_question = re.sub(r"\s+", " ", question.strip().lower()).rstrip("?.!")

        kb_answer = _match_knowledge_base(normalized_question)
        if kb_answer:
            return kb_answer

        return (
            f"## Answer\n\n"
            f"Your question is about **{question.strip()}**. "
            "The AI provider is currently unavailable, and this topic is not "
            "included in the local study knowledge base. Please add the relevant "
            "course material or configure a working AI model to receive a "
            "complete explanation."
        )

