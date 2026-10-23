// components/quiz/QuizClient.tsx
'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

const SAMPLE_QUESTIONS = [
  { id: 1, text: "आपका शारीरिक ढांचा (Body Build) कैसा है?", options: [{ text: "दुबला-पतला, लंबा या बहुत छोटा", type: "vata" }, { text: "मध्यम, गठीला शरीर", type: "pitta" }, { text: "भारी, चौड़ा और मजबूत", type: "kapha" }] },
  { id: 2, text: "आपकी त्वचा (Skin) कैसी रहती है?", options: [{ text: "रूखी, ठंडी, खुरदरी", type: "vata" }, { text: "तैलीय, संवेदनशील, गर्म", type: "pitta" }, { text: "सॉफ्ट, मोटी, थोड़ी नम", type: "kapha" }] },
  { id: 3, text: "आपकी भूख और पाचन (Appetite) कैसा है?", options: [{ text: "अनियमित, कभी ज्यादा कभी कम", type: "vata" }, { text: "तेज भूख, सहन न होना", type: "pitta" }, { text: "धीमी लेकिन स्थिर भूख", type: "kapha" }] }
];

export default function QuizClient() {
  const router = useRouter();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [scores, setScores] = useState({ vata: 0, pitta: 0, kapha: 0 });

  const handleAnswer = (type: 'vata' | 'pitta' | 'kapha') => {
    const nextScores = { ...scores, [type]: scores[type] + 1 };
    setScores(nextScores);

    if (currentIdx < SAMPLE_QUESTIONS.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      // परिणाम को लोकल स्टोरेज में रखें और रिजल्ट पेज पर भेजें
      localStorage.setItem('sthamly_scores', JSON.stringify(nextScores));
      router.push('/result');
    }
  };

  const progress = ((currentIdx + 1) / SAMPLE_QUESTIONS.length) * 100;

  return (
    <div className="space-y-6">
      {/* प्रोग्रेस बार */}
      <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
        <div className="bg-[#2C3E2B] h-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-serif font-bold text-[#1E3322] leading-snug">
          {SAMPLE_QUESTIONS[currentIdx].text}
        </h2>
        
        <div className="space-y-2">
          {SAMPLE_QUESTIONS[currentIdx].options.map((opt, i) => (
            <button
              key={i}
              onClick={() => handleAnswer(opt.type as any)}
              className="w-full bg-white border border-gray-200 hover:border-[#2C3E2B] hover:bg-[#F2F7F4] text-left p-4 rounded-xl text-sm font-medium transition-all shadow-sm text-gray-700"
            >
              {opt.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
