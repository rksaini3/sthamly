// app/result/page.tsx
import React from 'react';
import ResultClient from '@/components/quiz/ResultClient';

export default function ResultPage() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] p-6 max-w-md mx-auto flex flex-col justify-between">
      <div className="text-center pt-4">
        <span className="text-xs uppercase tracking-widest text-gray-400 font-bold">Your Analysis</span>
        <h1 className="text-3xl font-serif font-bold text-[#1E3322] mt-1">Prakriti Core</h1>
      </div>

      {/* क्लाइंट-साइड स्कोर और सेव लॉजिक */}
      <div className="my-auto">
        <ResultClient />
      </div>
    </div>
  );
}
