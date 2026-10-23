// components/auth/LoginForm.tsx
'use client';
import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/browser';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setMessage(`त्रुटि: ${error.message}`);
    } else {
      setMessage('✅ लॉगिन लिंक आपके ईमेल पर भेज दिया गया है! कृपया अपना इनबॉक्स चेक करें।');
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block mb-1">Email Address</label>
        <input 
          type="email" 
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com" 
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#2C3E2B]"
        />
      </div>
      <button 
        type="submit" 
        disabled={loading}
        className="w-full bg-[#2C3E2B] text-white py-3 rounded-xl font-medium hover:bg-[#1E3322] disabled:opacity-50 transition-all shadow-sm"
      >
        {loading ? 'Sending Link...' : 'Send Magic Login Link'}
      </button>
      {message && <p className="text-xs text-center text-gray-600 mt-2 leading-relaxed">{message}</p>}
    </form>
  );
}
