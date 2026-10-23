// app/(app)/track/page.tsx
import React from 'react';
import LogForm from '@/components/track/LogForm';

export default function TrackPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold text-[#1E3322]">Symptom Tracker</h1>
        <p className="text-xs text-gray-500 mt-1">Log today to dynamically optimize your dosha plan</p>
      </div>

      {/* एसिडिटी स्पेशल विजेट */}
      <div className="bg-[#FFF3EC] p-5 rounded-2xl border border-[#FCDED0]">
        <h2 className="font-medium text-sm text-[#843D1A] mb-3">Daily Pulse Check</h2>
        <p className="text-base text-[#5C270E] font-medium mb-4">How is your acidity today?</p>
        
        <div className="grid grid-cols-3 gap-2">
          {['None', 'Mild', 'Severe'].map((level) => (
            <button 
              key={level}
              className="bg-white hover:bg-[#FCDED0] border border-[#F7C6B0] text-sm text-[#843D1A] py-2 px-3 rounded-xl font-medium transition-all shadow-sm"
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {/* विस्तृत लॉग फॉर्म */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
        <h3 className="font-semibold text-[#1E3322] mb-4">Log Other Symptoms</h3>
        <LogForm />
      </div>
    </div>
  );
}
