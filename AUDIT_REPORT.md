# EduRAG AI Static Data Audit Report
Generated: 2026-08-14

## CRITICAL ISSUES FOUND

### 1. Backend Issues

#### A. Hardcoded Curriculum Knowledge Base (studybuddy.py)
- **Location**: `_CURRICULUM_KB` dictionary (lines 19-227)
- **Problem**: Contains 200+ lines of hardcoded curriculum definitions
- **Impact**: AI answers come from static text, not uploaded documents
- **Fix Required**: Replace with vector embedding search from real uploaded materials

#### B. No Vector Embeddings
- **Problem**: Zero embedding generation or vector database
- **Current**: Keyword-based token matching in `rag_service.py`
- **Impact**: Poor semantic understanding, no intelligent retrieval
- **Fix Required**: Implement sentence-transformers or OpenAI embeddings

#### C. Keyword-Only RAG Retrieval (rag_service.py)
```python
def retrieve(question, chunks, selected_material_ids, limit=4):
    question_terms = Counter(tokens(question))
    # Just counts word overlaps - NO semantic understanding
```
- **Problem**: Simple word counting, not semantic similarity
- **Fix Required**: Cosine similarity on embeddings

#### D. Demo Accounts System (app.py)
- **Location**: `demo_accounts = []` (line 159)
- **Problem**: Empty but referenced throughout code
- **Fix Required**: Remove demo system, use real MongoDB users

### 2. Frontend Issues

#### A. mockData.ts (20,061 bytes of static data)
**Static Exports:**
- `student`, `teacher`, `hod` - Hardcoded profiles
- `studentCourses` (6 courses)
- `teacherCourses` (3 courses)
- `documents` (6 documents)
- `quizzes` (5 quizzes)
- `chatHistory` (4 messages)
- `notifications` (6 items)
- `recentActivity` (4 items)
- `weeklyStudyData` (7 days)
- `topicAnalysis` (8 topics)
- `aiUsageStats` (stats object)
- `bookmarks` (5 items)
- `students` (6 students)
- `teachers` (5 teachers)
- `announcements` (3 items)
- `messages` (3 messages)

#### B. Components Using Static Data

**Student Dashboard:**
- `src/pages/student/StudentPagesA.tsx` - Uses mockData for courses, docs, quizzes
- `src/pages/student/StudentPagesB.tsx` - Uses mockData for notes, bookmarks, activity
- `src/sidebar/student/*.jsx` - Multiple components with hardcoded data

**Teacher Dashboard:**
- `src/pages/teacher/TeacherPages.tsx` - Uses mockData for students, courses
- `src/sidebar/teacher/AIAssistantRAG.jsx` - Hardcoded documents

**HOD Dashboard:**
- `src/pages/hod/HODPages.tsx` - Uses mockData for teachers, students, stats

### 3. Authentication/Authorization Issues

#### Current State:
- **JWT Token**: Exists but not enforced
- **API Endpoints**: No authentication middleware
- **Data Filtering**: No role-based access control
- **Issue**: Students can see any data, no permission checks

### 4. RAG System Issues

#### Current Flow (BROKEN):
1. Student uploads document → Text extraction ✓
2. Chunks created → Keyword indexing only ✗ (NO embeddings)
3. Student asks question → Keyword search ✗ (NO semantic search)
4. AI answer → Falls back to hardcoded `_CURRICULUM_KB` ✗

#### What Should Happen:
1. Upload → Extract → **Generate Embeddings** → Store with vectors
2. Question → **Embed Query** → **Vector Search** → Retrieve top-k relevant chunks
3. **RAG with Retrieved Context ONLY** → Answer with source attribution
4. If no relevant chunks found → "Information not found in materials"

### 5. Database Schema Issues

#### Missing Collections:
- `enrollments` - Links students to courses
- No embedding fields in chunks collection
- No proper relationships between materials/courses

#### Current Collections:
- `users` - Has passwords, roles ✓
- `students`, `teachers`, `hods` - Separate profile tables ✓
- `materials`, `rag_chunks` - Exists but NO embeddings ✗
- `courses` - Missing or minimal data
- `chat_history` - Exists ✓

## PRIORITY FIX ORDER

### P0 - Critical (Blocks core functionality)
1. ✗ Add vector embedding system
2. ✗ Replace keyword search with semantic search
3. ✗ Remove `_CURRICULUM_KB` - use only retrieved context
4. ✗ Add "not found" responses when no relevant data exists

### P1 - High (Security and correctness)
5. ✗ Implement JWT authentication middleware
6. ✗ Add role-based data filtering to all API endpoints
7. ✗ Create enrollments system
8. ✗ Filter materials by student's enrolled courses

### P2 - Medium (User experience)
9. ✗ Make Student Dashboard fully dynamic (replace mockData imports)
10. ✗ Make Teacher Dashboard fully dynamic
11. ✗ Make HOD Dashboard fully dynamic
12. ✗ Add loading states and error handling

### P3 - Nice to have
13. ✗ Deprecate mockData.ts
14. ✗ Add material sharing between teachers/students
15. ✗ Add analytics and progress tracking

## FILES REQUIRING CHANGES

### Backend (7 files)
1. `backend/requirements.txt` - Add: sentence-transformers, torch, numpy, PyJWT
2. `backend/rag_service.py` - Add embeddings, semantic search
3. `backend/studybuddy.py` - Remove _CURRICULUM_KB
4. `backend/app.py` - Add auth middleware, filter by role
5. `backend/auth.py` - Add JWT functions (NEW FILE)
6. `backend/.env` - Add JWT_SECRET

### Frontend (15+ files)
1. `src/data/mockData.ts` - Mark deprecated, add warnings
2. `src/lib/dataService.ts` - Add real API fetching functions
3. `src/pages/student/StudentPagesA.tsx` - Replace static with API calls
4. `src/pages/student/StudentPagesB.tsx` - Replace static with API calls
5. `src/pages/teacher/TeacherPages.tsx` - Replace static with API calls
6. `src/pages/hod/HODPages.tsx` - Replace static with API calls
7. `src/sidebar/student/*.jsx` - Multiple components to update
8. `src/sidebar/teacher/*.jsx` - Multiple components to update
9. `src/sidebar/hod/*.jsx` - Multiple components to update

## ESTIMATED EFFORT

- Vector Embeddings: 3-4 hours
- Auth System: 2-3 hours
- Dashboard Migration: 4-5 hours
- Testing: 2-3 hours
- **Total**: 11-15 hours of development work

## VERIFICATION CHECKLIST

After fixes:
- [ ] Student uploads PDF → embeddings generated
- [ ] Student asks question → vector search returns relevant chunks
- [ ] AI answer cites sources, never hallucinates
- [ ] "Not found" message when no relevant content
- [ ] Student sees only their materials + enrolled course materials
- [ ] Teacher sees only their courses/students
- [ ] HOD sees only department data
- [ ] All dashboards load from MongoDB, no static data
- [ ] JWT tokens required for all API calls
- [ ] No unauthorized data exposure
