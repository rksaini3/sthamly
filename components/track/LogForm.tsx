// components/track/LogForm.tsx
'use client';
import React, { useState } from 'react';

export default function LogForm() {
  const [gas, setGas] = useState('None');
  const [fatigue, setFatigue] = useState('None');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Saving...');

    try {
      const res = await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acidity_level: 'Checked via Widget',
          gas_level: gas,
          fatigue_level: fatigue,
          notes
        })
      });
      if (res.ok) {
        setStatus('✅ लॉग सफलतापूर्वक सुरक्षित हुआ!');
        setNotes('');
      } else {
        setStatus('❌ सेव करने में विफल (लॉगिन आवश्यक)');
      }
    } catch (err) {
      setStatus('❌ इंटरनेट त्रुटि');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-sm text-gray-700">
      <div className="space-y-2">
        <label className="font-medium text-xs uppercase tracking-wider text-gray-400 block">Gas / Bloating</label>
        <div className="flex gap-2">
          {['None', 'Mild', 'Severe'].map(l => (
            <button type="button" key={l} onClick={() => setGas(l)} className={`flex-1 py-2 px-3 border rounded-xl font-medium shadow-sm transition-all ${gas === l ? 'bg-[#2C3E2B] text-white border-[#2C3E2B]' : 'bg-white border-gray-200'}`}>{l}</button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="font-medium text-xs uppercase tracking-wider text-gray-400 block">Fatigue / Low Energy</label>
        <div className="flex gap-2">
          {['None', 'Mild', 'Severe'].map(l => (
            <button type="button" key={l} onClick={() => setFatigue(l)} className={`flex-1 py-2 px-3 border rounded-xl font-medium shadow-sm transition-all ${fatigue === l ? 'bg-[#2C3E2B] text-white border-[#2C3E2B]' : 'bg-white border-gray-200'}`}>{l}</button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <label className="font-medium text-xs uppercase tracking-wider text-gray-400 block">Additional Notes</label>
        <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="आज के खान-पान या स्वास्थ्य से जुड़ी कोई विशेष बात..." className="w-full border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-[#2C3E2B]" />
      </div>

      <button type="submit" className="w-full bg-[#2C3E2B] text-white py-3 rounded-xl font-medium hover:bg-[#1E3322] transition-all shadow-sm">Save Symptom Log</button>
      {status && <p className="text-center text-xs text-gray-500 font-medium mt-1">{status}</p>}
    </form>
  );
}
