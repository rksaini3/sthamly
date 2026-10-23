// components/ServiceWorkerRegister.tsx
'use client';
import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator && window.location.hostname !== 'localhost') {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => console.log('Sthamly PWA Service Worker Registered', reg.scope))
        .catch((err) => console.error('Service Worker Registration Failed', err));
    }
  }, []);

  return null; // यह एक अदृश्य बैकग्राउंड यूटिलिटी कंपोनेंट है
}
