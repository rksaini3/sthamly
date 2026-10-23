// app/quiz/page.tsx
import React from 'react';
import QuizClient from '@/components/quiz/QuizClient';

export default function QuizPage() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] px-4 py-6 max-w-md mx-auto flex flex-col justify-between">
      <div className="mb-6">
        <div className="flex justify-between items-center text-xs text-gray-400 font-medium uppercase tracking-wider">
          <span>Sthamly Dosha Test</span>
        </div>
      </div>

      {/* इंटरैक्टिव क्विज़ इंजन */}
      <div className="flex-1 flex flex-col justify-center">
        <QuizClient />
      </div>
    </div>
  );
}
