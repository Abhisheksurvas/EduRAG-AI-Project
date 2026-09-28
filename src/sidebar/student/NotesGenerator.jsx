import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  StickyNote, Sparkles, Wand2, Download, Copy, FileText,
  Paperclip, X, LoaderCircle, CheckCircle2, AlertCircle,
  Eye, Trash2, Clock, BookOpen, FileDown, Database,
} from 'lucide-react';
import { Card, CardHeader, CardBody } from '@/components/ui';
import { notifyDocumentSelected } from '@/lib/dataService';

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB per file
const MAX_FILES = 10;                    // maximum simultaneous uploads

// ─── Types ────────────────────────────────────────────────────────────────────
type UploadedFile = {
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'indexing' | 'ready' | 'failed';
  pages?: number;
};

type RecentNote = {
  id: string;
  title: string;
  noteType: string;
  generatedAt: string; // ISO string
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getExt(name: string): string {
  const m = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : '';
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function NotesGenerator() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading]     = useState(false);
  const [topic, setTopic]                 = useState('');
  const [noteType, setNoteType]           = useState('Summary');
  const [rawText, setRawText]             = useState('');
  const [isGenerating, setIsGenerating]   = useState(false);
  const [toasts, setToasts]               = useState<Array<{ id: string; message: string; tone: string }>>([]);
  const [recentNotes, setRecentNotes]     = useState<RecentNote[]>([]);
  const [indexedMaterials, setIndexedMaterials] = useState<{ id: string; name: string }[]>([]);
  const [selectedIndexedId, setSelectedIndexedId] = useState<string>('all');
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);



  // Load already-indexed materials on mount and periodically
  useEffect(() => {
    let cancelled = false;
    let isFetching = false;
    let controller = null;

    const loadMaterials = async () => {
      if (isFetching || cancelled) return;
      isFetching = true;
      controller = new AbortController();
      try {
        const token = typeof window !== 'undefined' ? window.localStorage.getItem('edurag-auth-token') : null;
        const res = await fetch('http://localhost:8000/api/materials', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data?.materials ?? []);
        if (!cancelled) {
          const mapped = [];
          const seen = new Set();
          list.forEach((m) => {
            const id = m.id || m._id;
            const name = m.name || m.documentName || m.filename || m.title;
            if (id && name && !seen.has(String(name).toLowerCase())) {
              seen.add(String(name).toLowerCase());
              mapped.push({ id: String(id), name: String(name), status: m.status });
            }
          });
          setIndexedMaterials(mapped);
        }
      } catch {
        // aborted or backend offline — silently ignore
      } finally {
        isFetching = false;
      }
    };

    loadMaterials();
    const timer = window.setInterval(loadMaterials, 10000);
    const onFocus = () => { loadMaterials(); };
    window.addEventListener('focus', onFocus);

    return () => {
      cancelled = true;
      if (controller) controller.abort();
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  // ── Toast helpers ──────────────────────────────────────────────────────────
  const pushToast = useCallback((message: string, tone: string) => {
    const id = `ng-toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts(prev => [...prev, { id, message, tone }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  // ── File upload ────────────────────────────────────────────────────────────
  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      const incoming = Array.from(files);
      e.target.value = '';

      // Enforce 10-file cap
      const remaining = MAX_FILES - uploadedFiles.length;
      if (remaining <= 0) {
        pushToast('Maximum 10 files allowed. Remove a file before adding more.', 'error');
        return;
      }
      const accepted = incoming.slice(0, remaining);
      const rejected = incoming.slice(remaining);
      if (rejected.length > 0) {
        pushToast(
          `Maximum 10 files allowed. ${rejected.length} file(s) were skipped.`,
          'error',
        );
      }

      setIsUploading(true);

      for (const file of accepted) {
        if (file.size > MAX_FILE_SIZE) {
          pushToast(`"${file.name}" exceeds 10 MB. Please choose a smaller file.`, 'error');
          continue;
        }

        const pendingId = `ng-upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const pendingFile: UploadedFile = {
          id: pendingId,
          name: file.name,
          size: file.size,
          type: file.type || getExt(file.name),
          status: 'indexing',
          pages: 1,
        };
        setUploadedFiles(prev => [...prev, pendingFile]);

        try {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('studentId', '');
          formData.append('course', 'Notes Generation');

          const token =
            typeof window !== 'undefined'
              ? window.localStorage.getItem('edurag-auth-token')
              : null;

          const response = await fetch('http://localhost:8000/api/materials/upload', {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            body: formData,
          });
          const data = await response.json().catch(() => ({}));

          if (!response.ok || !data.success || !data.material?.id) {
            throw new Error(data.error || 'The file could not be uploaded.');
          }

          const uploadedFile: UploadedFile = {
            id: data.material.id,
            name: data.material.name || file.name,
            size: file.size,
            type: file.type || getExt(file.name),
            status: data.material.status === 'ready' ? 'ready' : 'indexing',
            pages: Number(data.material.pages) || 1,
          };
          setUploadedFiles(prev =>
            prev.map(item => (item.id === pendingId ? uploadedFile : item)),
          );

          if (data.material.status === 'ready') {
            pushToast(`"${file.name}" uploaded and indexed successfully.`, 'success');
          } else {
            pushToast(`"${file.name}" uploaded. Indexing in progress…`, 'warning');

            let attempt = 0;
            const maxAttempts = 60;
            const poll = async () => {
              if (attempt >= maxAttempts) {
                setUploadedFiles(prev =>
                  prev.map(f => (f.id === pendingId ? { ...f, status: 'failed' } : f)),
                );
                pushToast(`Indexing timed out for "${file.name}".`, 'error');
                return;
              }
              attempt++;
              try {
                const ctrl = new AbortController();
                const timer = setTimeout(() => ctrl.abort(), 3000);
                const statusRes = await fetch(
                  `http://localhost:8000/api/materials/status?id=${encodeURIComponent(data.material.id)}&name=${encodeURIComponent(file.name)}`,
                  {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                    signal: ctrl.signal,
                  },
                );
                clearTimeout(timer);
                if (!statusRes.ok) { setTimeout(poll, 600); return; }
                const statusData = await statusRes.json();
                if (statusData.status === 'ready' || statusData.ready || (statusData.chunks && statusData.chunks > 0)) {
                  setUploadedFiles(prev =>
                    prev.map(f => (f.id === data.material.id || f.name.toLowerCase() === file.name.toLowerCase() ? { ...f, status: 'ready' } : f)),
                  );
                  pushToast(`"${file.name}" indexed successfully.`, 'success');
                } else if (statusData.status === 'failed') {
                  setUploadedFiles(prev =>
                    prev.map(f => (f.id === data.material.id ? { ...f, status: 'failed' } : f)),
                  );
                  pushToast(`Indexing failed for "${file.name}".`, 'error');
                } else {
                  setTimeout(poll, 600);
                }
              } catch {
                setTimeout(poll, 600);
              }
            };
            setTimeout(poll, 500);
          }
        } catch (err) {
          setUploadedFiles(prev => prev.filter(item => item.id !== pendingId));
          pushToast(
            `Failed to upload "${file.name}". ${err instanceof Error ? err.message : ''}`,
            'error',
          );
        }
      }

      setIsUploading(false);
    },
    [uploadedFiles.length, pushToast],
  );

  const removeUploadedFile = useCallback((id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  // ── Generate Summary ───────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (!topic.trim()) {
      pushToast('Course / Topic / Chapter is compulsory. Please enter a unit or chapter (e.g. Unit-2).', 'error');
      return;
    }
    setIsGenerating(true);
    try {
      // TODO: wire to real API — pass selectedIndexedId as materialId when set
      await new Promise(res => setTimeout(res, 1200));

      const newNote: RecentNote = {
        id: `note-${Date.now()}`,
        title: topic.trim() || 'Untitled Notes',
        noteType,
        generatedAt: new Date().toISOString(),
      };
      setRecentNotes(prev => [newNote, ...prev]);
      pushToast('Notes generated successfully!', 'success');
    } catch (err) {
      pushToast('Failed to generate notes. Please try again.', 'error');
    } finally {
      setIsGenerating(false);
    }
  }, [topic, rawText, uploadedFiles, noteType, selectedIndexedId, pushToast]);

  // ── Recent note actions ────────────────────────────────────────────────────
  const handleViewNote = useCallback((note: RecentNote) => {
    pushToast(`Opening "${note.title}"…`, 'success');
    // TODO: open note viewer / modal
  }, [pushToast]);

  const handleDownloadNote = useCallback((note: RecentNote) => {
    pushToast(`Downloading "${note.title}"…`, 'success');
    // TODO: trigger real download
  }, [pushToast]);

  const handleDeleteNote = useCallback((id: string) => {
    setRecentNotes(prev => prev.filter(n => n.id !== id));
    pushToast('Note deleted.', 'success');
  }, [pushToast]);

  const handleDeleteAllNotes = useCallback(() => {
    if (recentNotes.length === 0) return;
    if (window.confirm(`Are you sure you want to delete all ${recentNotes.length} recently generated notes?`)) {
      setRecentNotes([]);
      pushToast('All recent notes deleted.', 'success');
    }
  }, [recentNotes.length, pushToast]);

  // ── Derived state ──────────────────────────────────────────────────────────
  const atLimit = uploadedFiles.length >= MAX_FILES;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Page heading */}
      <div>
        <h1 className="text-3xl font-bold font-display text-neutral-900 flex items-center gap-2">
          Notes Generator <Sparkles className="h-6 w-6 text-accent-500" />
        </h1>
        <p className="text-neutral-500 text-sm mt-1">
          Convert raw scribbles, transcripts, or topics into structured summaries and notes.
        </p>
      </div>

      {/* ── Main grid ── */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* Left column — Create Notes form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader title="Create Study Notes" icon={StickyNote} />
            <CardBody className="space-y-4">

              {/* Select already-indexed document */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-neutral-700 flex items-center gap-1.5">
                  <Database className="h-4 w-4 text-primary-500" />
                  Select Document Already Indexed
                  <span className="text-neutral-400 font-normal">(optional)</span>
                </label>
                <select
                  value={selectedIndexedId}
                  onChange={e => {
                    const id = e.target.value;
                    setSelectedIndexedId(id);
                    const selectedMat = indexedMaterials.find(m => m.id === id);
                    const docName = id === 'all' ? 'All Indexed Documents' : (selectedMat?.name || id);
                    notifyDocumentSelected(id, docName).catch(console.warn);
                  }}
                  className="w-full p-2.5 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-sm"
                >
                  <option value="all">All doc.</option>
                  {indexedMaterials.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
                {selectedIndexedId && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
                    <span className="truncate">
                      Selected: <strong>{selectedIndexedId === 'all' ? 'All Indexed Documents' : (indexedMaterials.find(m => m.id === selectedIndexedId)?.name || selectedIndexedId)}</strong>
                    </span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-medium">
                      Active
                    </span>
                  </div>
                )}
                {indexedMaterials.length === 0 && (
                  <p className="text-xs text-neutral-400">
                    Upload a document below to index it, then it will appear here on your next visit.
                  </p>
                )}
              </div>

              {/* Course / Topic / Chapter (Compulsory) — directly below Select Document Already Indexed */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-neutral-700 flex items-center justify-between">
                  <span>
                    Course / Topic / Chapter <span className="text-rose-600 font-bold">* (Compulsory)</span>
                  </span>
                  <span className="text-xs text-neutral-400 font-normal">e.g. Unit-2, Decision Trees</span>
                </label>
                <input
                  type="text"
                  required
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder="e.g. Unit-2, Chapter 4, Decision Trees (Compulsory)"
                  className="w-full p-2.5 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-sm"
                />
              </div>

              {/* Note type */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-neutral-700">Note Type</label>
                <select
                  value={noteType}
                  onChange={e => setNoteType(e.target.value)}
                  className="w-full p-2.5 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-sm"
                >
                  <option>Summary</option>
                  <option>Bullet Points</option>
                  <option>Outline</option>
                  <option>Flashcards</option>
                  <option>Study Guide</option>
                </select>
              </div>


              {/* File upload */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-neutral-700">
                    Upload Documents <span className="text-neutral-400 font-normal">(optional)</span>
                  </label>
                  {/* 10-file badge */}
                  {atLimit && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-error-100 text-error-700">
                      10 files maximum
                    </span>
                  )}
                  {!atLimit && uploadedFiles.length > 0 && (
                    <span className="text-xs text-neutral-400">
                      {uploadedFiles.length} / {MAX_FILES} files
                    </span>
                  )}
                </div>

                {/* Hidden file input — any file type, multiple */}
                <input
                  ref={fileInputRef}
                  type="file"
                  className="sr-only"
                  multiple
                  onChange={handleFileUpload}
                  disabled={isUploading || atLimit}
                  accept=".pdf,.pptx,.docx,.txt,.md,.csv,.ppt,.png,.jpg,.jpeg,.mp3,.wav,.m4a,.ogg,.mp4,.webm,.mov,audio/*,video/*,image/*,text/*"
                />

                {/* Dashed upload drop-zone */}
                <div
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }}
                  onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }}
                  onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDragOver(false);
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      handleFileUpload({ target: { files: e.dataTransfer.files, value: '' } } as any);
                    }
                  }}
                  onClick={() => {
                    if (!isUploading && !atLimit) {
                      fileInputRef.current?.click();
                    }
                  }}
                  className={`relative w-full rounded-2xl border-2 border-dashed transition-all cursor-pointer p-6 md:p-8 flex flex-col items-center justify-center text-center group ${
                    isDragOver
                      ? 'border-emerald-500 bg-emerald-50/70 scale-[1.01]'
                      : 'border-emerald-300/80 hover:border-emerald-500 bg-emerald-50/20 hover:bg-emerald-50/40'
                  }`}
                >
                  {/* 3 Overlapping squircle tiles */}
                  <div className="relative flex items-center justify-center w-28 h-20 mb-3 select-none pointer-events-none">
                    <div className="absolute left-1.5 w-12 h-12 rounded-2xl bg-[#ede9fe] text-[#7c3aed] flex items-center justify-center shadow-xs -rotate-8 transform transition-transform group-hover:-rotate-12">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 18V5l12-2v13" />
                        <circle cx="6" cy="18" r="3" />
                        <circle cx="18" cy="16" r="3" />
                      </svg>
                    </div>
                    <div className="absolute right-1.5 w-12 h-12 rounded-2xl bg-[#ede9fe] text-[#7c3aed] flex items-center justify-center shadow-xs rotate-8 transform transition-transform group-hover:rotate-12">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                        <circle cx="9" cy="9" r="2" />
                        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                      </svg>
                    </div>
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

                  <h3 className="text-base md:text-lg font-bold text-neutral-900 tracking-tight">
                    Drag your notes here
                  </h3>
                  <p className="text-xs text-neutral-500 mt-1 max-w-xs leading-relaxed">
                    PDF, audio, video, images or text — any language.
                  </p>

                  <button
                    type="button"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs md:text-sm font-semibold text-emerald-600 group-hover:text-emerald-700 group-hover:underline cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                  >
                    <span>Or browse your files</span>
                    <span className="text-sm leading-none">→</span>
                  </button>
                </div>

                {/* File list */}
                {uploadedFiles.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {uploadedFiles.map(file => (
                      <div
                        key={file.id}
                        className="flex items-center gap-3 p-2.5 rounded-xl border border-neutral-200 bg-neutral-50"
                      >
                        <FileText className="h-4 w-4 text-primary-600 shrink-0" />

                        {/* Name + size */}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-neutral-700 font-medium truncate">{file.name}</p>
                          <p className="text-xs text-neutral-400">{formatBytes(file.size)}</p>
                        </div>

                        {/* Status badge */}
                        {file.status === 'indexing' && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-warning-100 text-warning-700 shrink-0">
                            <LoaderCircle className="h-3 w-3 animate-spin" />
                            Processing…
                          </span>
                        )}
                        {file.status === 'ready' && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-success-100 text-success-700 shrink-0">
                            <CheckCircle2 className="h-3 w-3" />
                            Ready
                          </span>
                        )}
                        {file.status === 'failed' && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-error-100 text-error-700 shrink-0">
                            <AlertCircle className="h-3 w-3" />
                            Failed
                          </span>
                        )}

                        {/* Remove */}
                        <button
                          type="button"
                          onClick={() => removeUploadedFile(file.id)}
                          title="Remove file"
                          className="p-1 rounded text-neutral-400 hover:text-error-600 hover:bg-error-50 transition-colors shrink-0"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Raw text area */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-neutral-700">
                  Paste raw lecture transcription or topic overview
                </label>
                <textarea
                  rows={6}
                  value={rawText}
                  onChange={e => setRawText(e.target.value)}
                  placeholder="Paste class notes or topics to format..."
                  className="w-full p-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                />
              </div>

              {/* Generate button */}
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2.5 rounded-xl transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isGenerating
                  ? <><LoaderCircle className="h-5 w-5 animate-spin" /> Generating…</>
                  : <><Wand2 className="h-5 w-5" /> Generate Summary</>}
              </button>
            </CardBody>
          </Card>
        </div>

        {/* Right column — Generated Notes */}
        <div className="space-y-6">
          <Card>
            <CardHeader title="Generated Notes" />
            <CardBody className="space-y-3 pt-2 text-sm text-neutral-600">
              {recentNotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <StickyNote className="h-10 w-10 text-neutral-300 mb-2" />
                  <p className="font-medium text-neutral-700">No notes generated yet</p>
                  <p className="text-xs text-neutral-400 mt-1 max-w-xs mx-auto">
                    Fill in the details on the left and click Generate Summary to view notes here.
                  </p>
                </div>
              ) : (
                recentNotes.map(n => (
                  <div key={n.id} className="p-3 border border-neutral-100 rounded-xl hover:bg-neutral-50 transition-colors cursor-pointer">
                    <div className="font-semibold text-neutral-900">{n.title}</div>
                    <div className="text-xs text-neutral-400 mt-0.5">{n.noteType} · {formatDateTime(n.generatedAt)}</div>
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* ── Recently Generated Notes section ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary-600" />
            <h2 className="text-xl font-bold font-display text-neutral-900">Recently Generated Notes</h2>
          </div>
          {recentNotes.length > 0 && (
            <button
              type="button"
              onClick={handleDeleteAllNotes}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-error-600 border border-error-200 bg-white hover:bg-error-50 hover:border-error-300 transition-colors shadow-2xs cursor-pointer"
              title="Delete all recent notes"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete All
            </button>
          )}
        </div>

        {recentNotes.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-12 rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 text-center">
            <StickyNote className="h-10 w-10 text-neutral-300 mb-3" />
            <p className="text-neutral-400 font-medium">No recent notes yet.</p>
            <p className="text-neutral-400 text-sm mt-1">
              Generate a summary above and it will appear here.
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentNotes.map(note => (
              <div
                key={note.id}
                className="flex flex-col gap-3 p-4 rounded-2xl border border-neutral-200 bg-white shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Title */}
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-primary-500 mt-0.5 shrink-0" />
                  <p className="text-sm font-semibold text-neutral-900 leading-snug line-clamp-2">
                    {note.title}
                  </p>
                </div>

                {/* Meta */}
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  <span className="inline-flex items-center gap-1 text-xs text-primary-700 bg-primary-50 px-2 py-0.5 rounded-full font-medium">
                    {note.noteType}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-neutral-400">
                    <Clock className="h-3 w-3" />
                    {formatDateTime(note.generatedAt)}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 mt-auto pt-2 border-t border-neutral-100">
                  {/* View */}
                  <button
                    type="button"
                    onClick={() => handleViewNote(note)}
                    title="View note"
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-primary-600 hover:bg-primary-50 transition-colors"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View
                  </button>

                  {/* Download */}
                  <button
                    type="button"
                    onClick={() => handleDownloadNote(note)}
                    title="Download note"
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-neutral-600 hover:bg-neutral-100 transition-colors"
                  >
                    <FileDown className="h-3.5 w-3.5" />
                    Download
                  </button>

                  {/* Spacer */}
                  <span className="flex-1" />

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => handleDeleteNote(note.id)}
                    title="Delete note"
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-error-600 hover:bg-error-50 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Toast notifications ── */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 space-y-2 z-50">
          {toasts.map(t => (
            <div
              key={t.id}
              className={`px-4 py-2 rounded-lg text-sm font-medium shadow-lg ${
                t.tone === 'success'
                  ? 'bg-success-100 text-success-700'
                  : t.tone === 'error'
                    ? 'bg-error-100 text-error-700'
                    : 'bg-warning-100 text-warning-700'
              }`}
            >
              {t.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
