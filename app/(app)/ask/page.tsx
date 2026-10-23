// app/(app)/ask/page.tsx
import React from 'react';
import AskBox from '@/components/ask/AskBox';

export default function AskPage() {
  return (
    <div className="space-y-6">
      {/* सुबह की ग्रीटिंग और दोष डिस्प्ले */}
      <div>
        <p className="text-sm text-gray-500 uppercase tracking-wider">Good morning</p>
        <h1 className="text-3xl font-serif font-bold text-[#1E3322] mt-1">Your dosha: Pitta</h1>
      </div>

      {/* आज का ऑटोमेटेड प्लान समरी */}
      <div className="bg-[#EAF2EC] p-5 rounded-2xl border border-[#D5E4DB]">
        <h2 className="font-semibold text-lg text-[#1E3322] mb-2">Today's plan</h2>
        <p className="text-sm text-[#4A5E4C] leading-relaxed">
          Cooling lunch, moon walk, rose skincare
        </p>
      </div>

      {/* AI वैद्या आस्क बॉक्स */}
      <div className="space-y-3">
        <h3 className="font-medium text-sm text-gray-600">Ask Sthamly AI Buddy</h3>
        <AskBox />
      </div>
    </div>
  );
}
