// app/page.tsx
import React from 'react';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col justify-between p-6 max-w-md mx-auto bg-[#FDFBF7]">
      {/* हेडर / लोगो */}
      <div className="pt-12 text-center">
        <h1 className="text-4xl font-serif font-bold text-[#1E3322] tracking-wide">Sthamly</h1>
        <p className="text-xs text-[#5B755E] tracking-widest uppercase mt-2">Est. 2026</p>
      </div>

      {/* मुख्य वैल्यू प्रपोजिशन */}
      <div className="space-y-4 text-center my-auto">
        <h2 className="text-2xl font-serif text-[#2C3E2B] leading-tight">
          Ayurveda, personalised.
        </h2>
        <p className="text-sm text-gray-600 leading-relaxed px-4">
          Find your unique Prakriti and unlock a tailored daily dosha plan for your food, routine, yoga, and skincare.
        </p>
      </div>

      {/* एक्शन बटन */}
      <div className="space-y-3 pb-8">
        <Link href="/quiz" className="block w-full bg-[#2C3E2B] hover:bg-[#1E3322] text-white text-center font-medium py-4 px-6 rounded-xl transition-all shadow-sm">
          Find Your Dosha (Take Quiz)
        </Link>
        <Link href="/login" className="block w-full bg-white hover:bg-gray-50 text-[#2C3E2B] text-center font-medium py-4 px-6 rounded-xl border border-gray-200 transition-all shadow-sm">
          Sign In to My Account
        </Link>
      </div>
    </div>
  );
}
