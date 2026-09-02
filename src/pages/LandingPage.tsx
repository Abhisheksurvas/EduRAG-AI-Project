import { useState } from 'react';
import {
  Brain, GraduationCap, Users, Sparkles, ArrowRight, CheckCircle2, LogIn,
  FileText, MessageSquare, BarChart3, Shield, Zap,
} from 'lucide-react';
import type { Role } from '@/types';

const roleCards: {
  role: Role;
  title: string;
  icon: typeof GraduationCap;
  description: string;
  features: string[];
  tone: string;
  gradient: string;
}[] = [
  {
    role: 'student',
    title: 'Student',
    icon: GraduationCap,
    description: 'Access AI study assistant, quizzes, notes generator, and track your learning progress.',
    features: ['AI Study Assistant (RAG)', 'Smart Notes Generator', 'Quiz Center', 'Progress Analytics'],
    tone: 'primary',
    gradient: 'from-primary-500 to-primary-700',
  },
];

const features = [
  { icon: Brain, title: 'RAG-Powered AI Assistant', desc: 'Ask questions from your uploaded documents and get sourced, verified answers.' },
  { icon: Sparkles, title: 'Smart Notes Generator', desc: 'Generate chapter summaries, key points, definitions, and formula sheets instantly.' },
  { icon: FileText, title: 'AI Quiz', desc: 'Auto-generate quizzes from course materials for focused practice.' },
  { icon: BarChart3, title: 'Progress Analytics', desc: 'Track study hours, quiz scores, and identify strong & weak topics with AI insights.' },
];

export default function LandingPage({
  onLogin,
  onChooseRole,
}: {
  onLogin: () => void;
  onChooseRole: (role: Role) => void;
}) {
  const [hovered, setHovered] = useState<Role | null>(null);

  const handleLoginClick = () => {
    onLogin();
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-neutral-200/60">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="grid place-items-center h-9 w-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-lg shadow-primary-600/30">
              <Brain className="h-5 w-5" />
            </div>
            <span className="font-display font-bold text-lg text-neutral-900">EduRAG<span className="text-primary-600"> AI</span></span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-sm text-neutral-500">Intelligent Learning Platform</span>
            <button
              onClick={handleLoginClick}
              className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-white px-4 py-2 text-sm font-medium text-primary-700 shadow-sm transition-colors hover:bg-primary-50"
            >
              <LogIn className="h-4 w-4" />
              Login
            </button>
            <span className="grid place-items-center h-8 w-8 rounded-full bg-success-100 text-success-700">
              <Zap className="h-4 w-4" />
            </span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary-50/50 via-transparent to-transparent" />
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-primary-200/30 rounded-full blur-3xl animate-floaty" />
        <div className="absolute top-40 right-1/4 w-80 h-80 bg-secondary-200/30 rounded-full blur-3xl animate-floaty" style={{ animationDelay: '2s' }} />
        <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-12 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-50 border border-primary-200 text-primary-700 text-sm font-medium mb-6 animate-fade-in">
            <Sparkles className="h-4 w-4" />
            Powered by Retrieval-Augmented Generation
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold font-display text-neutral-900 max-w-4xl mx-auto leading-[1.1] animate-fade-in-up">
            Learn smarter with your
            <span className="bg-gradient-to-r from-primary-600 via-secondary-500 to-primary-600 bg-clip-text text-transparent"> AI study companion</span>
          </h1>
          <p className="text-lg text-neutral-500 mt-6 max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            EduRAG AI transforms your course materials into an interactive learning experience — ask questions, generate notes, take quizzes, and track progress, all powered by AI that reads your documents.
          </p>
        </div>
      </section>

      {/* Role Selection */}
      <section id="role-login" className="relative max-w-7xl mx-auto px-6 pb-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold font-display text-neutral-900">Choose your role to continue</h2>
          <p className="text-neutral-500 mt-2">Each dashboard is tailored to what you need</p>
        </div>
        <div className="grid md:grid-cols-1 max-w-md mx-auto gap-6">
          {roleCards.map((card, idx) => {
            const Icon = card.icon;
            const isActive = hovered === card.role;
            return (
              <button
                key={card.role}
                onClick={() => onChooseRole(card.role)}
                onMouseEnter={() => setHovered(card.role)}
                onMouseLeave={() => setHovered(null)}
                className="group relative text-left rounded-3xl bg-white border border-neutral-200 p-8 card-shadow hover:card-shadow-lg transition-all duration-300 hover:-translate-y-1.5 animate-fade-in-up overflow-hidden"
                style={{ animationDelay: `${idx * 0.08}s` }}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500`} />
                <div className={`relative grid place-items-center h-16 w-16 rounded-2xl bg-gradient-to-br ${card.gradient} text-white shadow-lg mb-6 transition-transform duration-300 group-hover:scale-110`}>
                  <Icon className="h-8 w-8" />
                </div>
                <h3 className="relative font-display font-bold text-2xl text-neutral-900 mb-2">{card.title}</h3>
                <p className="relative text-neutral-500 text-sm leading-relaxed mb-6">{card.description}</p>
                <ul className="relative space-y-2.5 mb-6">
                  {card.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-neutral-700">
                      <CheckCircle2 className="h-4.5 w-4.5 text-success-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="relative flex items-center gap-2 font-medium text-sm text-primary-600 group-hover:gap-3 transition-all">
                  Login as {card.title}
                  <ArrowRight className="h-4.5 w-4.5 transition-transform group-hover:translate-x-1" />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 py-16 border-t border-neutral-200">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold font-display text-neutral-900">Everything you need to learn & teach</h2>
          <p className="text-neutral-500 mt-3">One platform, AI-powered, built for the entire academic ecosystem</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.title}
                className="group rounded-2xl bg-white border border-neutral-200 p-6 card-shadow hover:card-shadow-lg transition-all duration-300 hover:-translate-y-1 animate-fade-in-up"
                style={{ animationDelay: `${idx * 0.06}s` }}
              >
                <div className="grid place-items-center h-12 w-12 rounded-xl bg-primary-50 text-primary-600 mb-4 group-hover:bg-primary-600 group-hover:text-white transition-all duration-300">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-display font-semibold text-neutral-900 mb-1.5">{feat.title}</h3>
                <p className="text-sm text-neutral-500 leading-relaxed">{feat.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Stats bar */}
      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="rounded-3xl bg-gradient-to-r from-neutral-900 to-neutral-800 p-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { label: 'Active Students', value: '2,400+', icon: GraduationCap },
            { label: 'Faculty Members', value: '180+', icon: Users },
            { label: 'AI Queries Answered', value: '58K+', icon: MessageSquare },
            { label: 'Documents Indexed', value: '12K+', icon: FileText },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label}>
                <Icon className="h-7 w-7 text-primary-400 mx-auto mb-2" />
                <p className="text-3xl font-bold font-display text-white">{stat.value}</p>
                <p className="text-sm text-neutral-400 mt-1">{stat.label}</p>
              </div>
            );
          })}
        </div>
      </section>

      <footer className="border-t border-neutral-200 py-8">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2 text-neutral-500">
            <Brain className="h-5 w-5 text-primary-600" />
            <span className="font-display font-semibold text-neutral-700">EduRAG AI</span>
            <span className="text-sm">— Intelligent Learning Platform</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-neutral-400">
            <Shield className="h-4 w-4" />
            Secure · RAG-Powered · Built for Education
          </div>
        </div>
      </footer>
    </div>
  );
}
