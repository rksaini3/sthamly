// components/SafetyNotice.tsx
import React from 'react';

export default function SafetyNotice({ message }: { message: string }) {
  return (
    <div className="bg-[#FFF0F0] border border-[#FFD1D1] text-[#A81C1C] p-4 rounded-xl text-xs flex items-start space-x-3 shadow-sm">
      <span className="text-lg">🚨</span>
      <div className="space-y-1">
        <p className="font-bold">महत्वपूर्ण चिकित्सा सूचना (Medical Notice)</p>
        <p className="leading-relaxed">{message}</p>
      </div>
    </div>
  );
}
