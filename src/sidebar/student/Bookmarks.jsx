import React from 'react';
import { Bookmark, FileText, ArrowRight, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardBody } from '@/components/ui';

export default function Bookmarks() {
  const bookmarks = [
    { id: 1, title: 'B-Tree Indexing Structure Slides', source: 'DBMS Lecture 4', date: 'Saved 2d ago' },
    { id: 2, title: 'Big-O Notation Complexity Cheat Sheet', source: 'Algorithms Chapter 1', date: 'Saved 4d ago' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-display text-neutral-900">Bookmarks</h1>
        <p className="text-neutral-500 text-sm mt-1">Easily find your saved notes, slides, and learning links.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {bookmarks.map(bm => (
          <Card key={bm.id} hover>
            <CardHeader title={bm.title} subtitle={bm.source} icon={Bookmark} />
            <CardBody className="space-y-4">
              <div className="flex justify-between items-center text-xs text-neutral-400 font-semibold">
                <span>{bm.date}</span>
                <button className="text-error-600 hover:text-error-800 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <button className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-sm font-semibold bg-primary-50 text-primary-700 hover:bg-primary-100 rounded-lg transition-all">
                Open Resource <ArrowRight className="h-4 w-4" />
              </button>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
