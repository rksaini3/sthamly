// components/InstallPrompt.tsx
'use client';
import React, { useEffect, useState } from 'react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    });
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 bg-[#2C3E2B] text-white p-4 rounded-2xl flex justify-between items-center z-50 max-w-md mx-auto shadow-xl border border-white/10 animate-bounce">
      <div className="text-xs space-y-0.5">
        <p className="font-bold">📱 Sthamly को फोन में इंस्टॉल करें</p>
        <p className="text-white/80">बिना ऐप स्टोर के सीधे होम स्क्रीन पर चलाएं।</p>
      </div>
      <button 
        onClick={handleInstall}
        className="bg-white text-[#2C3E2B] text-xs font-bold py-2 px-3 rounded-xl shadow-md transition-all hover:bg-gray-100"
      >
        Install Now
      </button>
    </div>
  );
}
