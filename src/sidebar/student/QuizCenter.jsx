import React from 'react';
import { HelpCircle, Play, CheckCircle, Award } from 'lucide-react';
import { Card, CardHeader, CardBody } from '@/components/ui';

export default function QuizCenter() {
  const quizzes = [
    { id: 1, title: 'Complexity Analysis MCQ', course: 'CSE-301', status: 'Available', qCount: 10, time: '15 mins' },
    { id: 2, title: 'SQL Joins & Indexes Quiz', course: 'CSE-302', status: 'Completed', score: '8/10', qCount: 10 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-display text-neutral-900">Quiz Center</h1>
        <p className="text-neutral-500 text-sm mt-1">Take assessments, solve MCQs, and check your scoring reports.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {quizzes.map(quiz => (
          <Card key={quiz.id} hover>
            <CardHeader title={quiz.title} subtitle={quiz.course} icon={HelpCircle} />
            <CardBody className="space-y-4">
              <div className="flex justify-between items-center text-sm text-neutral-600">
                <span>Status:</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  quiz.status === 'Available' ? 'bg-success-50 text-success-700' : 'bg-neutral-100 text-neutral-600'
                }`}>
                  {quiz.status}
                </span>
              </div>
              <div className="flex justify-between text-sm text-neutral-600">
                <span>Details:</span>
                <span className="font-semibold text-neutral-900">
                  {quiz.status === 'Completed' ? `Scored: ${quiz.score}` : `${quiz.qCount} MCQs · ${quiz.time}`}
                </span>
              </div>
              {quiz.status === 'Available' ? (
                <button className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-sm font-semibold bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-all shadow-sm">
                  <Play className="h-4 w-4" /> Start Quiz
                </button>
              ) : (
                <button className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-sm font-semibold border border-neutral-200 text-neutral-700 hover:bg-neutral-50 rounded-lg transition-all">
                  <Award className="h-4 w-4" /> Review Answers
                </button>
              )}
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
