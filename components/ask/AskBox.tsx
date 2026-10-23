// components/ask/AskBox.tsx
'use client';
import React, { useState } from 'react';
import SafetyNotice from '../SafetyNotice';

export default function AskBox() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [safetyAlert, setSafetyAlert] = useState('');

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    setAnswer('');
    setSafetyAlert('');

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
      });
      const data = await res.json();
      
      if (data.answer.includes('⚠️')) {
        setSafetyAlert(data.answer);
      } else {
        setAnswer(data.answer);
      }
    } catch (err) {
      setAnswer('क्षमा करें, AI वैद्या से संपर्क नहीं हो सका। कृपया बाद में प्रयास करें।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleAsk} className="flex gap-2">
        <input 
          type="text" 
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="पूछें: आज एसिडिटी के लिए क्या खाएं?" 
          className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#2C3E2B] transition-all"
        />
        <button 
          type="submit" 
          disabled={loading}
          className="bg-[#2C3E2B] text-white px-4 py-3 rounded-xl text-sm font-medium hover:bg-[#1E3322] disabled:opacity-50 transition-all shadow-sm"
        >
          {loading ? '...' : 'पूछें'}
        </button>
      </form>

      {safetyAlert && <SafetyNotice message={safetyAlert} />}

      {answer && (
        <div className="bg-white border border-gray-100 p-4 rounded-xl text-sm leading-relaxed text-gray-700 shadow-sm border-l-4 border-l-[#5B755E]">
          <p className="whitespace-pre-wrap">{answer}</p>
        </div>
      )}
    </div>
  );
}
