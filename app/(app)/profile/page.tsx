// app/(app)/profile/page.tsx
import React from 'react';
import SignOutButton from '@/components/auth/SignOutButton';

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4 border-b border-gray-100 pb-5">
        <div className="h-16 w-16 rounded-full bg-[#2C3E2B] text-white flex items-center justify-center font-serif text-2xl font-bold">
          P
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#1E3322]">Premium User</h1>
          <p className="text-xs text-gray-500">Pitta Constitution • Active Plus Plan</p>
        </div>
      </div>

      {/* नया डॉक्टर कंसल्टेशन बुकिंग विजेट */}
      <div className="bg-[#F4F1EA] p-5 rounded-2xl border border-[#E5DEC9] space-y-3">
        <h2 className="font-serif font-bold text-lg text-[#4A4435]">Need Expert Ayurvedic Advice?</h2>
        <p className="text-xs text-[#6B624E] leading-relaxed">
          Book a 1-on-1 video consultation with certified BAMS / MD Vaidyas for complex symptom analysis.
        </p>
        <button className="w-full bg-[#4A4435] hover:bg-[#383328] text-white text-sm font-medium py-3 px-4 rounded-xl transition-all shadow-sm">
          Book Live Vaidya Consultation
        </button>
      </div>

      {/* अकाउंट सेटिंग्स सूची */}
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden shadow-sm">
        <div className="p-4 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">My Quiz Results</div>
        <div className="p-4 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">Export My Health Data (DPDP Act)</div>
        <div className="p-4 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">Privacy & Terms</div>
      </div>

      {/* साइन आउट बटन */}
      <div className="pt-4">
        <SignOutButton />
      </div>
    </div>
  );
}
