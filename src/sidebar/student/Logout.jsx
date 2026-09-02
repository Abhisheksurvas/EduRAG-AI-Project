import React from 'react';
import { LogOut } from 'lucide-react';
import { Card, CardHeader, CardBody } from '@/components/ui';

export default function Logout() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Card className="max-w-md w-full text-center">
        <CardBody className="py-8 space-y-6 flex flex-col items-center">
          <div className="h-16 w-16 bg-error-50 text-error-600 rounded-full grid place-items-center">
            <LogOut className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-neutral-900">Logging out...</h2>
            <p className="text-sm text-neutral-500 mt-1">Please confirm if you want to sign out of your account.</p>
          </div>
          <div className="flex gap-3 w-full">
            <button className="flex-1 py-2.5 px-4 text-sm font-semibold border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-colors">
              Cancel
            </button>
            <button className="flex-1 py-2.5 px-4 text-sm font-semibold bg-error-600 hover:bg-error-700 text-white rounded-xl transition-all shadow-sm">
              Sign Out
            </button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
