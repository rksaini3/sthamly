// components/auth/SignOutButton.tsx
'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';

export default function SignOutButton() {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <button 
      onClick={handleSignOut}
      className="w-full bg-white text-[#A81C1C] border border-[#FCAFAF] py-3 rounded-xl text-sm font-medium hover:bg-[#FFF0F0] transition-all shadow-sm"
    >
      Sign Out Account
    </button>
  );
}
