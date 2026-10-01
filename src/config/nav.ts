import {
  LayoutDashboard, Bot, StickyNote, HelpCircle,
  Bell, User, LogOut,
} from 'lucide-react';
import type { NavItem, Role } from '@/types';

export const navConfig: Record<Role, NavItem[]> = {
  student: [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'ai-assistant', label: 'AI Study Assistant (RAG)', icon: Bot },
    { id: 'notes', label: 'Notes Generator', icon: StickyNote },
    { id: 'quizzes', label: 'Quiz Center', icon: HelpCircle },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'logout', label: 'Logout', icon: LogOut },
  ],
};

export const roleInfo: Record<Role, { name: string; subtitle: string; gradient: string }> = {
  student: { name: 'Student Portal', subtitle: 'Learn. Practice. Excel.', gradient: 'from-primary-500 to-primary-700' },
};

export const roleUser: Record<Role, { name: string; id: string; email: string; subtitle: string }> = {
  student: { name: 'Student', id: '', email: 'student@edurag.edu', subtitle: 'B.Tech CSE' },
};
