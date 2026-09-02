import React from 'react';
import { Bell, ShieldAlert, Award, MessageSquare } from 'lucide-react';
import { Card, CardHeader, CardBody } from '@/components/ui';

export default function Notifications() {
  const dummyNotifs = [
    { id: 1, type: 'announcement', text: 'Dr. Priya Nair posted a new study guide for DBMS Normalization.', date: '2 hours ago' },
    { id: 2, type: 'grade', text: 'Your submission for Complexity Analysis MCQ quiz has been graded (8/10).', date: '5 hours ago' },
    { id: 3, type: 'message', text: 'New direct message received from Aarav Sharma regarding group project.', date: '1 day ago' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-display text-neutral-900">Notifications</h1>
        <p className="text-neutral-500 text-sm mt-1">Stay updated with classroom announcements, grading reports, and portal activity.</p>
      </div>

      <Card>
        <CardBody className="divide-y divide-neutral-100 p-2">
          {dummyNotifs.map(notif => (
            <div key={notif.id} className="p-4 flex gap-4 hover:bg-neutral-50 rounded-xl transition-all">
              <div className="grid place-items-center h-10 w-10 bg-primary-50 text-primary-600 rounded-xl shrink-0">
                <Bell className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-800">{notif.text}</p>
                <span className="text-[10px] text-neutral-400 font-semibold block mt-1">{notif.date}</span>
              </div>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
