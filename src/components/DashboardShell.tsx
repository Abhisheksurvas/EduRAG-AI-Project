import { useState, useEffect } from 'react';
import {
  Bell, Search, Menu, ChevronDown, LogOut, Settings, Sun, Moon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui';
import { navConfig, roleInfo, roleUser } from '@/config/nav';
import type { Role } from '@/types';
import { getCurrentAccount } from '@/lib/auth';
import { Sidebar } from './Sidebar';

export default function DashboardShell({
  role,
  activePage,
  onPageChange,
  onExit,
  children,
}: {
  role: Role;
  activePage: string;
  onPageChange: (page: string) => void;
  onExit: () => void;
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(
    () => (localStorage.getItem('edurag-theme') === 'dark' ? 'dark' : 'light'),
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('edurag-theme', theme);
  }, [theme]);

  // Enable smooth theme transitions only after first paint (prevents a flash
  // when the saved theme is applied by the pre-paint inline script).
  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      document.documentElement.classList.add('theme-ready');
    });
    return () => window.cancelAnimationFrame(id);
  }, []);

  const nav = navConfig[role];
  const info = roleInfo[role];
  const currentAccount = getCurrentAccount();
  const activeAccount = currentAccount?.role === role ? currentAccount : null;
  const user = {
    name: activeAccount?.name ?? roleUser[role].name,
    email: activeAccount?.email ?? roleUser[role].email,
    id: activeAccount?.details?.rollNo ?? roleUser[role].id,
  };
  const activeItem = nav.find((n) => n.id === activePage);

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar
        role={role}
        activePage={activePage}
        onPageChange={onPageChange}
        onExit={onExit}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      {/* Main */}
      <div className="flex-1 lg:ml-72 min-w-0 flex flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-20 h-16 bg-white/80 glass border-b border-neutral-200 flex items-center justify-between px-4 lg:px-8 gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-neutral-500 hover:text-neutral-900">
              <Menu className="h-6 w-6" />
            </button>
            <div className="min-w-0">
              <h2 className="font-display font-semibold text-neutral-900 truncate">{activeItem?.label ?? 'Dashboard'}</h2>
              <p className="text-xs text-neutral-400 hidden sm:block">{info.subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <button
              onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              aria-label="Toggle dark mode"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="relative grid place-items-center h-10 w-10 rounded-xl text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition-colors dark:hover:bg-white/10 dark:hover:text-neutral-100"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            <div className="hidden md:flex items-center gap-2 h-10 px-3.5 rounded-xl bg-neutral-100 border border-neutral-200 w-64">
              <Search className="h-4 w-4 text-neutral-400" />
              <input
                placeholder="Search courses, notes, quizzes…"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-400"
              />
            </div>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); }}
                className="relative grid place-items-center h-10 w-10 rounded-xl text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute top-2 right-2.5 h-2 w-2 rounded-full bg-error-500 ring-2 ring-white" />
              </button>
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-white border border-neutral-200 card-shadow-lg overflow-hidden animate-fade-in-up z-50">
                  <div className="px-4 py-3 border-b border-neutral-200 flex items-center justify-between">
                    <span className="font-display font-semibold text-neutral-900 text-sm">Notifications</span>
                    <span className="text-xs text-primary-600 cursor-pointer hover:underline">Mark all read</span>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {[
                      { t: 'New faculty material', d: 'CS501 — Graph Algorithms Notes', time: '1h' },
                      { t: 'Quiz due in 2 days', d: 'Process Scheduling Quiz', time: '3h' },
                      { t: 'AI notes ready', d: 'Graph Algorithms summary', time: '2d' },
                    ].map((n, i) => (
                      <div key={i} className={cn('px-4 py-3 border-b border-neutral-100 hover:bg-neutral-50 cursor-pointer', i === 0 && 'bg-primary-50/40')}>
                        <div className="flex items-start gap-3">
                          <div className="grid place-items-center h-8 w-8 rounded-lg bg-primary-100 text-primary-600 shrink-0 mt-0.5">
                            <Bell className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-neutral-900 truncate">{n.t}</p>
                            <p className="text-xs text-neutral-500 truncate">{n.d}</p>
                          </div>
                          <span className="text-xs text-neutral-400 shrink-0">{n.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Profile */}
            <div className="relative">
              <button
                onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); }}
                className="flex items-center gap-2 h-10 pl-1.5 pr-2 rounded-xl hover:bg-neutral-100 transition-colors"
              >
                <Avatar name={user.name} size="sm" />
                <ChevronDown className="h-4 w-4 text-neutral-400 hidden sm:block" />
              </button>
              {profileOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white border border-neutral-200 card-shadow-lg overflow-hidden animate-fade-in-up z-50">
                  <div className="px-4 py-3 border-b border-neutral-200">
                    <p className="font-medium text-sm text-neutral-900">{user.name}</p>
                    <p className="text-xs text-neutral-400 truncate">{user.email}</p>
                  </div>
                  <div className="p-1.5">
                    <button
                      onClick={() => { onPageChange('profile'); setProfileOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-neutral-600 hover:bg-neutral-100 transition-colors"
                    >
                      <Settings className="h-4 w-4" /> Profile Settings
                    </button>
                    <button
                      onClick={onExit}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-error-600 hover:bg-error-50 transition-colors"
                    >
                      <LogOut className="h-4 w-4" /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-8 max-w-[1400px] w-full mx-auto" onClick={() => { setNotifOpen(false); setProfileOpen(false); }}>
          <div className="animate-fade-in-up">{children}</div>
        </main>
      </div>
    </div>
  );
}
