import React, { useState } from 'react';
import { Bot, Send, Sparkles, BookOpen, ExternalLink, Paperclip, FileText, X } from 'lucide-react';
import { Card, CardHeader, CardBody } from '@/components/ui';

const STREAMLIT_APP_URL = 'http://localhost:8501';

export default function AIStudyAssistant() {
  const [messages, setMessages] = useState([
    { id: 1, sender: 'bot', text: 'Hi! Ask me anything about your syllabus, lecture slides, or exam reference files.' },
  ]);
  const [input, setInput] = useState('');
  const [attachment, setAttachment] = useState(null);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    const userQuery = input;
    const newMsg = { id: messages.length + 1, sender: 'user', text: userQuery };
    setMessages(prev => [...prev, newMsg]);
    setInput('');

    const loadingId = messages.length + 2;
    setMessages(prev => [...prev, { id: loadingId, sender: 'bot', text: 'EduRAG AI is thinking...' }]);

    try {
      const token = typeof window !== 'undefined' ? window.localStorage.getItem('edurag-auth-token') : null;
      const res = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: 'Bearer ' + token } : {}),
        },
        body: JSON.stringify({
          name: 'Student',
          branch: 'Computer Science',
          semester: '5',
          topic: 'Algorithms and Course Materials',
          difficulty: 'Intermediate',
          question: userQuery,
          context: 'Course Syllabus and Lecture Notes'
        })
      });

      const data = await res.json();
      if (res.ok && data.success && data.answer) {
        setMessages(prev => prev.map(msg => msg.id === loadingId ? { id: loadingId, sender: 'bot', text: data.answer } : msg));
      } else {
        throw new Error(data.error || 'API failed');
      }
    } catch (err) {
      setMessages(prev => prev.map(msg => msg.id === loadingId ? {
        id: loadingId,
        sender: 'bot',
        text: 'I could not reach the study-assistant service. Please ensure the backend is running, then try again.'
      } : msg));
    }
  };

  const handleFileChange = (e) => {
    const [file] = e.target.files || [];
    if (file) setAttachment(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold font-display text-neutral-900 flex items-center gap-2">
            AI Study Assistant (RAG) <Bot className="h-7 w-7 text-primary-600 animate-bounce" />
          </h1>
          <p className="text-neutral-500 text-sm mt-1">Get precise answers directly retrieved from your curriculum text and files.</p>
        </div>
        <a
          href={STREAMLIT_APP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition-all shadow-sm shrink-0"
        >
          <Sparkles className="h-4 w-4" /> Connect to Streamlit
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <Card className="h-[500px] flex flex-col justify-between overflow-hidden">
            <CardHeader title="Study Assistant Chat" icon={Bot} />
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-2xl p-3.5 text-sm ${
                    msg.sender === 'user' 
                      ? 'bg-primary-600 text-white rounded-br-none' 
                      : 'bg-neutral-100 text-neutral-800 rounded-bl-none'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={handleSend} className="aisa-composer-wrap">
              {attachment && (
                <div className="aisa-attachments" aria-live="polite">
                  <div className="aisa-attachment-chip">
                    <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="max-w-[14rem] truncate">{attachment.name}</span>
                    <button type="button" onClick={() => setAttachment(null)} aria-label={`Remove ${attachment.name}`}>
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              )}
              <div className="aisa-composer">
                <label className="aisa-composer-tool-btn" title="Attach a file">
                  <Paperclip className="h-5 w-5" aria-hidden="true" />
                  <span className="sr-only">Attach a file</span>
                  <input className="aisa-file-input" type="file" accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg" onChange={handleFileChange} />
                </label>
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      e.currentTarget.form?.requestSubmit();
                    }
                  }}
                  rows={1}
                  placeholder="Ask anything about your studies..."
                  aria-label="Message the AI Study Assistant"
                  className="aisa-composer-textarea"
                />
                <button type="submit" className="aisa-composer-send" disabled={!input.trim()} aria-label="Send message">
                  <Send className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </form>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Referenced files" icon={BookOpen} />
            <CardBody className="space-y-3 pt-2 text-xs text-neutral-600">
              <div className="p-2 bg-neutral-50 rounded-lg">
                <div className="font-semibold text-neutral-900 truncate">Algorithms_Ch3.pdf</div>
                <div className="text-neutral-400 mt-0.5">Chapters 1-5 covered</div>
              </div>
              <div className="p-2 bg-neutral-50 rounded-lg">
                <div className="font-semibold text-neutral-900 truncate">DBMS_NormalForms.pdf</div>
                <div className="text-neutral-400 mt-0.5">Practice slide booklet</div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
