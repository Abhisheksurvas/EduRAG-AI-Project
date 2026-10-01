import { useState, useEffect } from 'react';
import { Bot, Brain, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui';
import { navConfig, roleInfo, roleUser } from '@/config/nav';
import { getCurrentAccount, setCurrentAccount } from '@/lib/auth';
import type { Role } from '@/types';
import '../styles/all_sidebar.css';

interface SidebarProps {
  role: Role;
  activePage: string;
  onPageChange: (page: string) => void;
  onExit: () => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export function Sidebar({
  role,
  activePage,
  onPageChange,
  onExit,
  sidebarOpen,
  setSidebarOpen,
}: SidebarProps) {
  const nav = navConfig[role];
  const info = roleInfo[role];
  const currentAccount = getCurrentAccount();
  const activeAccount = currentAccount?.role === role ? currentAccount : null;

  const [studentRollNo, setStudentRollNo] = useState<string>(() => {
    if (role !== 'student') return '';
    return activeAccount?.details?.rollNo || (activeAccount as any)?.rollNo || '';
  });

  useEffect(() => {
    if (role !== 'student') return;
    let cancelled = false;
    const fetchProfile = async () => {
      try {
        const token = typeof window !== 'undefined' ? window.localStorage.getItem('edurag-auth-token') : null;
        const acc = getCurrentAccount();
        const uid = acc?.userId || '';
        const email = acc?.email || '';
        const res = await fetch(`http://localhost:8000/api/profile?userId=${encodeURIComponent(uid)}&email=${encodeURIComponent(email)}&role=student`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          const rNo = data?.rollNo || data?.id || data?.student_id;
          if (rNo && !cancelled) {
            setStudentRollNo(String(rNo));
            if (acc && (!acc.details?.rollNo || acc.details.rollNo !== String(rNo))) {
              acc.details = { ...(acc.details || {}), rollNo: String(rNo) };
              (acc as any).rollNo = String(rNo);
              setCurrentAccount(acc);
            }
          }
        }
      } catch (e) {
        console.warn('[Sidebar] Failed to load student profile:', e);
      }
    };
    fetchProfile();
    return () => { cancelled = true; };
  }, [role]);

  const rawRoll = studentRollNo || activeAccount?.details?.rollNo || (activeAccount as any)?.rollNo || '';
  const displayRoll = rawRoll
    ? (rawRoll.toLowerCase().startsWith('roll') ? rawRoll : `Roll: ${rawRoll}`)
    : (role === 'student' ? 'Student Account' : ((roleUser as Record<string, any>)[role]?.id || ''));

  const user = {
    name: activeAccount?.name ?? roleUser[role].name,
    email: activeAccount?.email ?? roleUser[role].email,
    id: displayRoll,
  };

  return (
    <aside className={cn('sidebar', sidebarOpen ? 'sidebar--open' : '')}>
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-content">
          <div className="sidebar-brand-icon bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-md">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="sidebar-brand-name">
              EduRAG<span className="sidebar-brand-highlight"> AI</span>
            </div>
            <div className="sidebar-brand-role">{info.name}</div>
          </div>
        </div>
        <button
          onClick={() => setSidebarOpen(false)}
          className="sidebar-close-btn lg:hidden"
          aria-label="Close sidebar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = item.id === activePage;
          const isLogout = item.id === 'logout';
          return (
            <button
              key={item.id}
              onClick={() => {
                if (isLogout) {
                  onExit();
                  return;
                }
                onPageChange(item.id);
                setSidebarOpen(false);
              }}
              className={cn(
                'sidebar-nav-item',
                isLogout && 'sidebar-nav-item--logout',
                active && !isLogout ? 'sidebar-nav-item--active' : '',
              )}
            >
              {active && !isLogout && <span className="sidebar-nav-indicator" />}
              <Icon
                className={cn(
                  'sidebar-nav-icon',
                  active && !isLogout ? 'sidebar-nav-icon--active' : '',
                )}
              />
              <span className="sidebar-nav-label">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User card */}
      <div className="sidebar-user">
        <div className="sidebar-user-card">
          <Avatar name={user.name} size="sm" />
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user.name}</div>
            <div className="sidebar-user-id">{user.id}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
