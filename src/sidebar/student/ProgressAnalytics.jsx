import React from 'react';
import { BarChart3, TrendingUp, BookOpen, Clock } from 'lucide-react';
import { Card, CardHeader, CardBody } from '@/components/ui';

export default function ProgressAnalytics() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-display text-neutral-900">Progress Analytics</h1>
        <p className="text-neutral-500 text-sm mt-1">Detailed statistics on your learning progress, test grades, and hours spent.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card hover>
          <CardHeader title="CGPA Grade" icon={TrendingUp} subtitle="Overall Semester CGPA" />
          <CardBody className="space-y-2">
            <div className="text-3xl font-bold text-neutral-900">9.12 / 10</div>
            <p className="text-xs text-success-600 font-medium">Top 5% in department</p>
          </CardBody>
        </Card>

        <Card hover>
          <CardHeader title="Study Hours" icon={Clock} subtitle="Total hours logged this month" />
          <CardBody className="space-y-2">
            <div className="text-3xl font-bold text-neutral-900">42 Hours</div>
            <p className="text-xs text-neutral-500">Average 1.4h / day</p>
          </CardBody>
        </Card>

        <Card hover>
          <CardHeader title="Tasks Completed" icon={BookOpen} subtitle="quizzes & Quizzes finished" />
          <CardBody className="space-y-2">
            <div className="text-3xl font-bold text-neutral-900">18 / 20</div>
            <p className="text-xs text-primary-600 font-medium">90% completion rate</p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Weekly Performance Trend" icon={BarChart3} />
        <CardBody className="h-64 flex items-end justify-between gap-2 pt-6">
          {[80, 85, 75, 90, 88, 92, 95, 89, 91, 93].map((val, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center gap-2">
              <div 
                className="w-full bg-primary-500/80 hover:bg-primary-600 rounded-t-lg transition-all" 
                style={{ height: `${val * 1.8}px` }} 
              />
              <span className="text-xs text-neutral-400">W{idx + 1}</span>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
