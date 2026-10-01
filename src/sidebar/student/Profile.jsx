import { useState, useEffect } from 'react';
import { User } from 'lucide-react';
import { Card, CardHeader, CardBody } from '@/components/ui';
import { getCurrentAccount } from '@/lib/auth';

export default function Profile() {
  const account = getCurrentAccount();
  const [profile, setProfile] = useState({
    name: account?.name || 'Student',
    email: account?.email || 'student@edurag.edu',
    rollNo: account?.details?.rollNo || (account as any)?.rollNo || '',
    program: account?.details?.branch ? `B.Tech ${account.details.branch}` : 'B.Tech CSE',
    semester: account?.details?.semester || '5th Semester',
    enrollmentNo: account?.details?.enrollmentNo || (account?.userId ? `ENR-${account.userId.slice(-7)}` : 'ENR-3012024'),
  });

  useEffect(() => {
    let cancelled = false;
    const loadProfile = async () => {
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
          if (data && !cancelled) {
            const rNo = data.rollNo || data.id || data.student_id || '';
            setProfile(prev => ({
              ...prev,
              name: data.name || prev.name,
              email: data.email || prev.email,
              rollNo: rNo || prev.rollNo,
              program: data.program || prev.program,
              semester: data.semester ? (typeof data.semester === 'number' ? `${data.semester}th Semester` : data.semester) : prev.semester,
            }));
          }
        }
      } catch (err) {
        console.warn('[Profile] Failed to load from backend:', err);
      }
    };
    loadProfile();
    return () => { cancelled = true; };
  }, []);

  const initials = (profile.name || 'ST')
    .split(' ')
    .filter(Boolean)
    .map(p => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-display text-neutral-900 dark:text-neutral-100">My Profile</h1>
        <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">Manage your student credentials and portal details.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="text-center lg:col-span-1">
          <CardBody className="py-8 space-y-4 flex flex-col items-center">
            <div className="h-24 w-24 bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300 rounded-full grid place-items-center font-bold text-2xl">
              {initials}
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 font-display">{profile.name}</h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {profile.rollNo ? `Roll: ${profile.rollNo}` : 'Student Account'}
              </p>
            </div>
            <span className="inline-block px-3 py-1 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-xs font-semibold">Student Account</span>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Student Details" icon={User} />
          <CardBody className="grid sm:grid-cols-2 gap-6 text-sm text-neutral-700 dark:text-neutral-300">
            <div className="space-y-1">
              <span className="text-xs text-neutral-400 font-semibold uppercase">Email Address</span>
              <div className="font-semibold text-neutral-900 dark:text-neutral-100">{profile.email}</div>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-neutral-400 font-semibold uppercase">Roll / Student ID</span>
              <div className="font-semibold text-neutral-900 dark:text-neutral-100">{profile.rollNo || 'Not Assigned'}</div>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-neutral-400 font-semibold uppercase">Branch & Batch</span>
              <div className="font-semibold text-neutral-900 dark:text-neutral-100">{profile.program}</div>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-neutral-400 font-semibold uppercase">Current Semester</span>
              <div className="font-semibold text-neutral-900 dark:text-neutral-100">{profile.semester}</div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
