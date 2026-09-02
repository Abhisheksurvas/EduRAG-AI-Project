import React from 'react';
import { LayoutDashboard, BookOpen, Clock, Award, Star } from 'lucide-react';
import { Card, CardHeader, CardBody } from '@/components/ui';

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 p-8 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/3 translate-x-1/3" />
        <div className="relative">
          <p className="text-primary-200 text-sm">Welcome back</p>
          <h1 className="text-3xl font-bold font-display mt-1">Student Dashboard</h1>
          <p className="text-primary-100 mt-2 text-sm">Track your learning journey, quizzes, and test scores here.</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card hover>
          <CardHeader title="My Courses" icon={BookOpen} subtitle="View enrolled subjects" />
          <CardBody>
            <p className="text-sm text-neutral-600">Access video modules, reference materials, slides and practice exercises.</p>
          </CardBody>
        </Card>

        <Card hover>
          <CardHeader title="Quiz Center" icon={Award} subtitle="Practice & score" />
          <CardBody>
            <p className="text-sm text-neutral-600">Take weekly quizzes, try mock exams, and review model answer sheets.</p>
          </CardBody>
        </Card>

        <Card hover>
          <CardHeader title="Recent Study" icon={Clock} subtitle="Pick up where you left" />
          <CardBody>
            <p className="text-sm text-neutral-600">Resume learning Design & Analysis of Algorithms Chapter 3.</p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
