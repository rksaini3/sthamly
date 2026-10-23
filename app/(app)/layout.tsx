// app/(app)/layout.tsx
import React from 'react';
import BottomNav from '@/components/BottomNav';
import Disclaimer from '@/components/Disclaimer';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-[#FDFBF7] text-[#2C3E2B]">
      {/* मुख्य कंटेंट एरिया */}
      <main className="flex-1 pb-24 px-4 pt-6 max-w-md mx-auto w-full">
        {children}
      </main>

      {/* कानूनी सुरक्षा डिस्क्लेमर */}
      <div className="max-w-md mx-auto w-full px-4 mb-2">
        <Disclaimer />
      </div>

      {/* फिक्स बॉटम नेविगेशन */}
      <BottomNav />
    </div>
  );
}
