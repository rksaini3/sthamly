// app/login/page.tsx
import React from 'react';
import LoginForm from '@/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col justify-center p-6 max-w-md mx-auto bg-[#FDFBF7]">
      <div className="text-center mb-8 space-y-2">
        <h1 className="text-3xl font-serif font-bold text-[#1E3322]">Welcome to Sthamly</h1>
        <p className="text-sm text-gray-500">Save your plans and securely track daily symptoms</p>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <LoginForm />
      </div>
    </div>
  );
}
