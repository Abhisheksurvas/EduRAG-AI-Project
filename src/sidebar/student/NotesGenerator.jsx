import React from 'react';
import { StickyNote, Sparkles, Wand2, Download, Copy } from 'lucide-react';
import { Card, CardHeader, CardBody } from '@/components/ui';

export default function NotesGenerator() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-display text-neutral-900 flex items-center gap-2">
          Notes Generator <Sparkles className="h-6 w-6 text-accent-500" />
        </h1>
        <p className="text-neutral-500 text-sm mt-1">Convert raw scribbles, transcripts, or topics into structured summaries and notes.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader title="Create Study Notes" icon={StickyNote} />
            <CardBody className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-neutral-700">Course / Topic</label>
                <input 
                  type="text" 
                  placeholder="e.g. Design & Analysis of Algorithms"
                  className="w-full p-2.5 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-neutral-700">Paste raw lecture transcription or topic overview</label>
                <textarea 
                  rows={6}
                  placeholder="Paste class notes or topics to format..."
                  className="w-full p-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                />
              </div>

              <button className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2.5 rounded-xl transition-all shadow-sm">
                <Wand2 className="h-5 w-5" /> Generate Summary
              </button>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Generated Notebooks" />
            <CardBody className="space-y-3 pt-2 text-sm text-neutral-600">
              <div className="p-3 border border-neutral-100 rounded-xl hover:bg-neutral-50 transition-colors cursor-pointer">
                <div className="font-semibold text-neutral-900">Divide & Conquer notes</div>
                <div className="text-xs text-neutral-400 mt-0.5">Formatted yesterday · 3 pages</div>
              </div>
              <div className="p-3 border border-neutral-100 rounded-xl hover:bg-neutral-50 transition-colors cursor-pointer">
                <div className="font-semibold text-neutral-900">Database Indexing B-Trees</div>
                <div className="text-xs text-neutral-400 mt-0.5">Formatted 3d ago · 2 pages</div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
