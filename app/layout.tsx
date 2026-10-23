// app/layout.tsx
import React from 'react';
import './globals.css';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';
import InstallPrompt from '@/components/InstallPrompt';

export const metadata = {
  title: 'Sthamly - Personalised Ayurveda',
  description: 'A daily dosha plan for food, routine, yoga and skin.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#FDFBF7] min-h-screen antialiased selection:bg-[#EAF2EC]">
        {children}
        <ServiceWorkerRegister />
        <InstallPrompt />
      </body>
    </html>
  );
}
