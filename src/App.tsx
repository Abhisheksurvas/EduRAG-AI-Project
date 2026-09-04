import { useState, useEffect } from 'react';
import type { Role } from '@/types';
import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/LoginPage';
import SignupPage from '@/pages/SignupPage';
import DashboardShell from '@/components/DashboardShell';
import { clearCurrentAccount, getCurrentAccount, setCurrentAccount, syncAccountsFromBackend, type AuthAccount } from '@/lib/auth';

// Student pages
import {
  StudentDashboard, StudentCourses, StudentAIAssistant, StudentNotes,
} from '@/pages/student/StudentPagesA';
import {
  StudentQuizzes, StudentAnalytics, StudentNotifications, StudentProfile,
} from '@/pages/student/StudentPagesB';

type PageProps = {
  onNavigate?: (page: string) => void;
};

type PageComponentType = React.ComponentType<PageProps>;

const studentPages: Record<string, PageComponentType> = {
  dashboard: StudentDashboard,
  courses: StudentCourses,
  'ai-assistant': StudentAIAssistant,
  notes: StudentNotes,
  quizzes: StudentQuizzes,
  analytics: StudentAnalytics,
  notifications: StudentNotifications,
  profile: StudentProfile,
};

const pageMaps: Record<Role, Record<string, PageComponentType>> = {
  student: studentPages,
};

type View = 'landing' | 'login' | 'signup' | 'dashboard';

type AppRoute = {
  view: View;
  role: Role | null;
  page: string;
  loginRole: Role | null;
};

function dashboardPath(role: Role, page = 'dashboard') {
  return page === 'dashboard' ? `/${role}-dashboard` : `/${role}-dashboard/${page}`;
}

function normalizePath(pathname: string) {
  const trimmed = pathname.replace(/\/+$/, '');
  return trimmed.length > 0 ? trimmed : '/';
}

function routeFromLocation(): AppRoute {
  const pathname = normalizePath(window.location.pathname);
  const session = getCurrentAccount();

  if (pathname === '/' || pathname === '') {
    return session
      ? { view: 'dashboard', role: session.role, page: 'dashboard', loginRole: session.role }
      : { view: 'landing', role: null, page: 'dashboard', loginRole: null };
  }

  if (pathname === '/login') {
    return { view: 'login', role: null, page: 'dashboard', loginRole: session?.role ?? null };
  }

  if (pathname === '/signup') {
    return { view: 'signup', role: null, page: 'dashboard', loginRole: session?.role ?? null };
  }

  const dashboardMatch = pathname.match(/^\/student-dashboard(?:\/([^/]+))?$/);
  if (dashboardMatch) {
    const page = dashboardMatch[1] ?? 'dashboard';
    if (session?.role === 'student') {
      return { view: 'dashboard', role: 'student', page, loginRole: 'student' };
    }

    return { view: 'login', role: null, page: 'dashboard', loginRole: 'student' };
  }

  return session
    ? { view: 'dashboard', role: session.role, page: 'dashboard', loginRole: session.role }
    : { view: 'landing', role: null, page: 'dashboard', loginRole: null };
}

export default function App() {
  const [route, setRoute] = useState<AppRoute>(() => routeFromLocation());

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [route.view, route.role, route.page]);

  useEffect(() => {
    syncAccountsFromBackend().catch(console.warn);

    const syncRoute = () => {
      setRoute(routeFromLocation());
    };

    window.addEventListener('popstate', syncRoute);
    window.addEventListener('storage', syncRoute);
    return () => {
      window.removeEventListener('popstate', syncRoute);
      window.removeEventListener('storage', syncRoute);
    };
  }, []);

  const goTo = (nextRoute: AppRoute, replace = false) => {
    setRoute(nextRoute);

    const nextPath =
      nextRoute.view === 'landing'
        ? '/'
        : nextRoute.view === 'login'
          ? '/login'
          : nextRoute.view === 'signup'
            ? '/signup'
            : dashboardPath(nextRoute.role ?? 'student', nextRoute.page);

    if (replace) {
      window.history.replaceState({}, '', nextPath);
    } else {
      window.history.pushState({}, '', nextPath);
    }
  };

  if (route.view === 'landing') {
    return (
      <LandingPage
        onLogin={() => { goTo({ view: 'login', role: null, page: 'dashboard', loginRole: null }); }}
        onChooseRole={(selectedRole) => { goTo({ view: 'login', role: null, page: 'dashboard', loginRole: selectedRole }); }}
      />
    );
  }

  if (route.view === 'login') {
    return (
      <LoginPage
        initialRole={route.loginRole ?? 'student'}
        onBack={() => { goTo({ view: 'landing', role: null, page: 'dashboard', loginRole: null }); }}
        onSignup={(selectedRole) => { goTo({ view: 'signup', role: null, page: 'dashboard', loginRole: selectedRole }); }}
        onLoginSuccess={(account: AuthAccount) => {
          setCurrentAccount(account);
          goTo({ view: 'dashboard', role: account.role, page: 'dashboard', loginRole: account.role });
        }}
      />
    );
  }

  if (route.view === 'signup') {
    return (
      <SignupPage
        initialRole={route.loginRole ?? 'student'}
        onBack={() => { goTo({ view: 'login', role: null, page: 'dashboard', loginRole: route.loginRole }); }}
        onSignupSuccess={(account: AuthAccount) => {
          goTo({ view: 'landing', role: null, page: 'dashboard', loginRole: null });
        }}
      />
    );
  }

  const activeAccount = getCurrentAccount();
  const activeRole = activeAccount?.role === route.role ? activeAccount.role : route.role;

  if (!activeRole) {
    return (
      <LandingPage
        onLogin={() => { goTo({ view: 'landing', role: null, page: 'dashboard', loginRole: null }); }}
        onChooseRole={(selectedRole) => { goTo({ view: 'login', role: null, page: 'dashboard', loginRole: selectedRole }); }}
      />
    );
  }

  if (route.view === 'dashboard' && activeAccount?.role !== activeRole) {
    return (
      <LoginPage
        initialRole={route.loginRole ?? activeRole}
        onBack={() => { goTo({ view: 'landing', role: null, page: 'dashboard', loginRole: null }); }}
        onSignup={(selectedRole) => { goTo({ view: 'signup', role: null, page: 'dashboard', loginRole: selectedRole }); }}
        onLoginSuccess={(account: AuthAccount) => {
          setCurrentAccount(account);
          goTo({ view: 'dashboard', role: account.role, page: 'dashboard', loginRole: account.role });
        }}
      />
    );
  }

  const pages = pageMaps[activeRole];
  const PageComponent = pages[route.page] ?? pages.dashboard;

  return (
      <DashboardShell
        role={activeRole}
        activePage={route.page}
        onPageChange={(nextPage) => {
          goTo({ view: 'dashboard', role: activeRole, page: nextPage, loginRole: activeRole });
        }}
        onExit={() => {
          clearCurrentAccount();
          goTo({ view: 'landing', role: null, page: 'dashboard', loginRole: null });
        }}
      >
        <PageComponent
          onNavigate={(nextPage: string) => {
            goTo({ view: 'dashboard', role: activeRole, page: nextPage, loginRole: activeRole });
          }}
        />
      </DashboardShell>
  );
}
