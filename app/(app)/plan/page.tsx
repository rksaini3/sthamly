// app/(app)/plan/page.tsx
'use client';
import React, { useState } from 'react';

export default function PlanPage() {
  const [tasks, setTasks] = useState([
    { id: 1, text: 'Cooling lunch with fresh greens', category: 'Food', checked: false },
    { id: 2, text: 'Midday rest & avoiding direct sun', category: 'Routine', checked: false },
    { id: 3, text: 'Calming pranayama (Sheetali)', category: 'Yoga', checked: false },
    { id: 4, text: 'Rose water skin mist', category: 'Skin', checked: false },
  ]);

  const toggleTask = (id: number) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, checked: !t.checked } : t));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold text-[#1E3322]">Today's Routine</h1>
        <p className="text-xs text-gray-500 mt-1">Tailored for Pitta Constitution</p>
      </div>

      <div className="space-y-3">
        {tasks.map(task => (
          <div 
            key={task.id} 
            onClick={() => toggleTask(task.id)}
            className={`flex items-center p-4 rounded-xl border transition-all cursor-pointer ${
              task.checked ? 'bg-[#F2F7F4] border-[#D5E4DB] opacity-70' : 'bg-white border-gray-200 shadow-sm'
            }`}
          >
            <input 
              type="checkbox" 
              checked={task.checked}
              onChange={() => {}} 
              className="h-5 w-5 rounded text-[#2C3E2B] focus:ring-[#2C3E2B] border-gray-300"
            />
            <div className="ml-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[#5B755E] block">{task.category}</span>
              <span className={`text-sm ${task.checked ? 'line-through text-gray-400' : 'text-gray-800'}`}>{task.text}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
