// app/offline/page.tsx
import React from 'react';

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-6 max-w-md mx-auto text-center bg-[#FDFBF7]">
      <div className="text-4xl mb-4">📴</div>
      <h1 className="text-2xl font-serif font-bold text-[#1E3322] mb-2">You are Offline</h1>
      <p className="text-sm text-gray-500 mb-6 leading-relaxed">
        Sthamly requires an internet connection to sync your daily AI updates. Showing cached guidelines.
      </p>
      
      <div className="w-full bg-white p-4 rounded-xl border border-gray-200 text-left space-y-2 text-xs">
        <p className="font-bold text-[#2C3E2B]">💡 General Dosha Reminder:</p>
        <p>• **Vata:** Favour warm, cooked, grounding meals.</p>
        <p>• **Pitta:** Favour cooling, sweet, and fresh foods.</p>
        <p>• **Kapha:** Favour light, warm, and spicy items.</p>
      </div>
    </div>
  );
}
