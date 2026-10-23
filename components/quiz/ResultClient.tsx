// components/quiz/ResultClient.tsx
'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ResultClient() {
  const router = useRouter();
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    const saved = localStorage.getItem('sthamly_scores');
    if (!saved) {
      router.push('/quiz');
      return;
    }

    const scores = JSON.parse(saved);
    let primary = 'Vata';
    if (scores.pitta >= scores.vata && scores.pitta >= scores.kapha) primary = 'Pitta';
    if (scores.kapha >= scores.vata && scores.kapha >= scores.pitta) primary = 'Kapha';

    setResult({ scores, primary });

    // बैकएंड सिंक (अगर लॉग-इन है)
    fetch('/api/dosha-results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vata_score: scores.vata,
        pitta_score: scores.pitta,
        kapha_score: scores.kapha,
        primary_dosha: primary
      })
    }).catch(() => console.log('Offline/Unauthenticated save deferred'));

  }, [router]);

  if (!result) return <p className="text-center text-sm text-gray-400">कैलकुलेट किया जा रहा है...</p>;

  return (
    <div className="space-y-6 text-center">
      <div className="bg-[#EAF2EC] border border-[#D5E4DB] rounded-3xl p-8 max-w-sm mx-auto shadow-sm">
        <span className="text-sm uppercase tracking-widest text-[#5B755E] font-bold">Your Primary Dosha</span>
        <h2 className="text-5xl font-serif font-bold text-[#1E3322] mt-2 mb-4">{result.primary}</h2>
        <p className="text-xs text-[#4A5E4C] leading-relaxed">
          {result.primary === 'Pitta' && 'अग्नि और जल तत्वों से युक्त। आपका स्वभाव ऊर्जावान और पाचन तीव्र है। संतुलन बनाए रखने के लिए शीतलता आवश्यक है।'}
          {result.primary === 'Vata' && 'वायु और आकाश तत्वों से युक्त। आपका स्वभाव गतिशील और रचनात्मक है। संतुलन के लिए स्थिरता और गर्माहट आवश्यक है।'}
          {result.primary === 'Kapha' && 'पृथ्वी और जल तत्वों से युक्त। आपका स्वभाव शांत, स्थिर और सहनशील है। संतुलन के लिए सक्रियता आवश्यक है।'}
        </p>
      </div>

      <button 
        onClick={() => router.push('/ask')}
        className="w-full bg-[#2C3E2B] hover:bg-[#1E3322] text-white py-4 rounded-xl font-medium transition-all shadow-sm"
      >
        See My Personalised Plan
      </button>
    </div>
  );
}
