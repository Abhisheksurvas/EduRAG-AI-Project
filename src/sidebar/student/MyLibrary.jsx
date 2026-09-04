import React, { useEffect, useState } from 'react';
import { Library, Download, Eye, ExternalLink } from 'lucide-react';
import { Card, CardHeader, CardBody } from '@/components/ui';
import { fetchDocuments } from '@/lib/dataService';
import { useMaterials } from '@/lib/materialsStore';

const MATERIAL_FILE_URL = 'http://localhost:8000/api/materials/download';

export default function MyLibrary() {
  const [docs, setDocs] = useState([]);
  const [apiDocs, setApiDocs] = useState([]);
  const localMats = useMaterials();

  useEffect(() => {
    let cancelled = false;
    fetchDocuments().then((data) => {
      if (!cancelled) setApiDocs(data || []);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const VALID_TYPES = ['pdf', 'ppt', 'doc', 'video'];
    const normaliseType = (t) => VALID_TYPES.includes(t) ? t : 'pdf';

    const seen = new Set();
    const merged = [];
    for (const m of [...localMats, ...apiDocs]) {
      if (!seen.has(m.name)) {
        seen.add(m.name);
        merged.push({ ...m, type: normaliseType(m.type) });
      }
    }
    setDocs(merged);
  }, [localMats, apiDocs]);

  const books = docs.map((d) => ({
    id: d.id,
    title: d.name,
    author: d.uploadedBy || 'Unknown',
    file: (d.type || 'pdf').toUpperCase(),
    hasFile: Boolean(d.id),
  }));

  const openMaterial = (id, inline) => {
    if (!id) return;
    const query = inline ? '?inline=1' : '';
    window.open(`${MATERIAL_FILE_URL}/${encodeURIComponent(id)}${query}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-display text-neutral-900">My Library</h1>
        <p className="text-neutral-500 text-sm mt-1">Read reference e-books, research documents, and uploaded course guides.</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {books.map(book => (
          <Card key={book.id} hover>
            <CardHeader title={book.title} subtitle={book.author} icon={Library} />
            <CardBody className="space-y-4">
              <div className="flex justify-between items-center text-xs text-neutral-500 font-semibold bg-neutral-50 p-2 rounded">
                <span>Format:</span>
                <span className="text-primary-700">{book.file}</span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => openMaterial(book.id, true)}
                  disabled={!book.hasFile}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 px-3 text-sm font-semibold border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-all text-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Eye className="h-4 w-4" /> Preview
                </button>
                <button
                  type="button"
                  onClick={() => openMaterial(book.id, false)}
                  disabled={!book.hasFile}
                  title="Download file"
                  className="flex items-center justify-center p-1.5 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-all text-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download className="h-4.5 w-4.5" />
                </button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
