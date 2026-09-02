/**
 * materialsStore.ts
 * -----------------
 * Client-side shared store for course materials / notes uploaded by students or faculty.
 * Persists in localStorage so any page (student) reads the same data
 * within the same browser session.
 */

const LS_KEY = 'edurag_uploaded_materials';

export type UploadedMaterial = {
  id: string;
  name: string;
  type: 'pdf' | 'ppt' | 'doc' | 'txt' | string;
  course: string;       // course code e.g. 'CS501'
  courseId?: string;
  size: string;         // human-readable e.g. '4.2 MB'
  uploadedAt: string;   // e.g. 'Just now'
  uploadedBy: string;   // uploader name
  pages?: number;
  status: 'approved' | 'pending';
  year?: string;
  department?: string;
  description?: string;
};

function read(): UploadedMaterial[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as UploadedMaterial[]) : [];
  } catch {
    return [];
  }
}

function write(items: UploadedMaterial[]): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(items));
    // Dispatch a custom event so other tabs/components re-render
    window.dispatchEvent(new StorageEvent('storage', { key: LS_KEY }));
  } catch {
    // storage quota exceeded – silently ignore
  }
}

/** Add (or replace if same id) a material to the store. */
export function saveMaterial(mat: UploadedMaterial): void {
  const existing = read();
  const idx = existing.findIndex(m => m.id === mat.id);
  if (idx !== -1) {
    existing[idx] = mat;
  } else {
    existing.unshift(mat); // newest first
  }
  write(existing);
}

/** Remove a material by id. */
export function removeMaterial(id: string): void {
  write(read().filter(m => m.id !== id));
}

/** Get all materials, optionally filtered by course code. */
export function getMaterials(courseCode?: string): UploadedMaterial[] {
  const all = read();
  if (!courseCode) return all;
  return all.filter(m => m.course === courseCode);
}

/** React hook — returns materials and auto-refreshes when localStorage changes. */
import { useState, useEffect } from 'react';

export function useMaterials(courseCode?: string): UploadedMaterial[] {
  const [items, setItems] = useState<UploadedMaterial[]>(() => getMaterials(courseCode));

  useEffect(() => {
    const refresh = () => setItems(getMaterials(courseCode));
    window.addEventListener('storage', refresh);
    // Also listen to a custom event fired within the same tab
    window.addEventListener('edurag-materials-updated', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('edurag-materials-updated', refresh);
    };
  }, [courseCode]);

  return items;
}

/** Trigger local refresh (same-tab update). */
export function notifyMaterialsUpdated(): void {
  window.dispatchEvent(new Event('edurag-materials-updated'));
}
