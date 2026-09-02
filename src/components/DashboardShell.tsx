import { useState, useEffect } from 'react';
import {
  Bell, Search, Menu, ChevronDown, LogOut, Settings,
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
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex transition-colors">
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
        <header className="sticky top-0 z-20 h-16 glass border-b border-neutral-200 dark:border-white/10
                           bg-white/80 dark:bg-neutral-950/70
                           text-neutral-900 dark:text-neutral-100
                           flex items-center justify-between px-4 lg:px-8 gap-4 transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setSidebarOpen(true)}
                    className="lg:hidden text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 transition-colors">
              <Menu className="h-6 w-6" />
            </button>
            <div className="min-w-0">
              <h2 className="font-display font-semibold text-neutral-900 dark:text-neutral-100 truncate transition-colors">{activeItem?.label ?? 'Dashboard'}</h2>
              <p className="text-xs text-neutral-400 dark:text-neutral-500 hidden sm:block transition-colors">{info.subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme toggle (☀️ / 🌙) */}
            <button
              onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              aria-label="Toggle dark mode"
              aria-pressed={theme === 'dark'}
              title={theme === 'dark' ? 'Switch to light mode ☀️' : 'Switch to dark mode 🌙'}
              className="relative grid place-items-center h-10 w-10 rounded-xl text-base
                         text-neutral-500 bg-transparent border border-transparent
                         hover:bg-neutral-100 hover:text-neutral-900 hover:border-neutral-200
                         dark:text-neutral-400 dark:hover:bg-white/10 dark:hover:text-amber-300 dark:hover:border-white/10
                         transition-all duration-200 active:scale-95"
            >
              <span
                className="block leading-none transition-transform duration-300"
                style={{ transform: theme === 'dark' ? 'rotate(0deg)' : 'rotate(0deg)' }}
                aria-hidden
              >
                {theme === 'dark' ? '☀️' : '🌙'}
              </span>
            </button>

            <div className="hidden md:flex items-center gap-2 h-10 px-3.5 rounded-xl
                            bg-neutral-100 border border-neutral-200
                            dark:bg-white/5 dark:border-white/10 w-64
                            focus-within:ring-2 focus-within:ring-primary-400 focus-within:border-primary-400
                            transition-colors">
              <Search className="h-4 w-4 text-neutral-400 dark:text-neutral-500" />
              <input
                placeholder="Search courses, notes, quizzes…"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-400 dark:placeholder:text-neutral-500 text-neutral-800 dark:text-neutral-100"
              />
            </div>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); }}
                className="relative grid place-items-center h-10 w-10 rounded-xl text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/10 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute top-2 right-2.5 h-2 w-2 rounded-full bg-error-500 ring-2 ring-white dark:ring-neutral-950" />
              </button>
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 card-shadow-lg overflow-hidden animate-fade-in-up z-50">
                  <div className="px-4 py-3 border-b border-neutral-200 dark:border-white/10 flex items-center justify-between">
                    <span className="font-display font-semibold text-neutral-900 dark:text-neutral-100 text-sm">Notifications</span>
                    <span className="text-xs text-primary-600 dark:text-primary-400 cursor-pointer hover:underline">Mark all read</span>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {[
                      { t: 'New faculty material', d: 'CS501 — Graph Algorithms Notes', time: '1h' },
                      { t: 'Quiz due in 2 days', d: 'Process Scheduling Quiz', time: '3h' },
                      { t: 'AI notes ready', d: 'Graph Algorithms summary', time: '2d' },
                    ].map((n, i) => (
                      <div key={i} className={cn('px-4 py-3 border-b border-neutral-100 dark:border-white/5 hover:bg-neutral-50 dark:hover:bg-white/5 cursor-pointer', i === 0 && 'bg-primary-50/40 dark:bg-primary-950/40')}>
                        <div className="flex items-start gap-3">
                          <div className="grid place-items-center h-8 w-8 rounded-lg bg-primary-100 dark:bg-primary-950 text-primary-600 dark:text-primary-400 shrink-0 mt-0.5">
                            <Bell className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{n.t}</p>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{n.d}</p>
                          </div>
                          <span className="text-xs text-neutral-400 dark:text-neutral-500 shrink-0">{n.time}</span>
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
                className="flex items-center gap-2 h-10 pl-1.5 pr-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors"
              >
                <Avatar name={user.name} size="sm" />
                <ChevronDown className="h-4 w-4 text-neutral-400 dark:text-neutral-500 hidden sm:block" />
              </button>
              {profileOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 card-shadow-lg overflow-hidden animate-fade-in-up z-50">
                  <div className="px-4 py-3 border-b border-neutral-200 dark:border-white/10">
                    <p className="font-medium text-sm text-neutral-900 dark:text-neutral-100">{user.name}</p>
                    <p className="text-xs text-neutral-400 dark:text-neutral-500 truncate">{user.email}</p>
                  </div>
                  <div className="p-1.5">
                    <button
                      onClick={() => { onPageChange('profile'); setProfileOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors"
                    >
                      <Settings className="h-4 w-4" /> Profile Settings
                    </button>
                    <button
                      onClick={onExit}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-950/40 transition-colors"
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
