import React from 'react';
import { User, Award, Mail, BookOpen } from 'lucide-react';
import { Card, CardHeader, CardBody } from '@/components/ui';

export default function Profile() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-display text-neutral-900">My Profile</h1>
        <p className="text-neutral-500 text-sm mt-1">Manage your student credentials and portal details.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="text-center lg:col-span-1">
          <CardBody className="py-8 space-y-4 flex flex-col items-center">
            <div className="h-24 w-24 bg-primary-100 text-primary-700 rounded-full grid place-items-center font-bold text-2xl">
              AS
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900 font-display">Aarav Sharma</h2>
              <p className="text-sm text-neutral-500">Roll: STU-2024-0142</p>
            </div>
            <span className="inline-block px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-xs font-semibold">Student Account</span>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Student Details" icon={User} />
          <CardBody className="grid sm:grid-cols-2 gap-6 text-sm text-neutral-700">
            <div className="space-y-1">
              <span className="text-xs text-neutral-400 font-semibold uppercase">Email Address</span>
              <div className="font-semibold text-neutral-900">aarav.sharma@edurag.edu</div>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-neutral-400 font-semibold uppercase">Enrollment Number</span>
              <div className="font-semibold text-neutral-900">ENR-3012024</div>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-neutral-400 font-semibold uppercase">Branch & Batch</span>
              <div className="font-semibold text-neutral-900">B.Tech Computer Science (2024-2028)</div>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-neutral-400 font-semibold uppercase">Current Semester</span>
              <div className="font-semibold text-neutral-900">5th Semester</div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
