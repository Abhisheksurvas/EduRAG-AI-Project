import { Brain, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui';
import { navConfig, roleInfo, roleUser } from '@/config/nav';
import { getCurrentAccount } from '@/lib/auth';
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
  const user = {
    name: activeAccount?.name ?? roleUser[role].name,
    email: activeAccount?.email ?? roleUser[role].email,
    id: activeAccount?.details?.rollNo ?? roleUser[role].id,
  };

  return (
    <aside className={cn('sidebar', sidebarOpen ? 'sidebar--open' : '')}>
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-content">
          <div className={cn('sidebar-brand-icon', info.gradient)}>
            <Brain className="h-5 w-5" />
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
