// components/BottomNav.tsx
'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNav() {
  const pathname = usePathname();
  
  const tabs = [
    { name: 'Home', path: '/ask', icon: '🏠' },
    { name: 'Plan', path: '/plan', icon: '📋' },
    { name: 'Track', path: '/track', icon: '📊' },
    { name: 'Recipes', path: '/recipes', icon: '🍳' }, // भविष्य का फीचर
    { name: 'Profile', path: '/profile', icon: '👤' }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-100 max-w-md mx-auto w-full z-50 shadow-lg">
      <div className="flex justify-around items-center h-16">
        {tabs.map((tab) => {
          const isActive = pathname === tab.path;
          return (
            <Link 
              key={tab.name} 
              href={tab.path}
              className={`flex flex-col items-center justify-center w-full h-full transition-all ${
                isActive ? 'text-[#2C3E2B] font-bold scale-105' : 'text-gray-400 font-medium'
              }`}
            >
              <span className="text-xl mb-0.5">{tab.icon}</span>
              <span className="text-[10px] tracking-wide uppercase">{tab.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
