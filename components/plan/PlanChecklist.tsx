"use client";

import { useEffect, useState } from "react";

type PlanItem = { id: string; title: string; body_md: string };
type Section = { section: string; label: string; items: PlanItem[] };

export default function PlanChecklist({
  dateKey,
  sections,
}: {
  dateKey: string;
  sections: Section[];
}) {
  const storageKey = `sthamly:plan-done:${dateKey}`;
  const [done, setDone] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      setDone(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      setDone([]);
    }
  }, [storageKey]);

  function toggle(id: string) {
    const next = done.includes(id) ? done.filter((x) => x !== id) : [...done, id];
    setDone(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // Storage blocked: the tick works for this visit only.
    }
  }

  return (
    <div className="space-y-6">
      {sections.map((group) => (
        <section key={group.section}>
          <h2 className="text-lg font-semibold">{group.label}</h2>
          <ul className="mt-3 space-y-3">
            {group.items.map((item) => {
              const checked = done.includes(item.id);
              return (
                <li key={item.id} className="rounded-lg border border-neutral-200 bg-white p-3">
                  <label className="flex gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 h-5 w-5 accent-brand"
                      checked={checked}
                      onChange={() => toggle(item.id)}
                    />
                    <span className={checked ? "text-neutral-500 line-through" : ""}>
                      {item.title}
                    </span>
                  </label>
                  <details className="mt-2 pl-8 text-sm text-neutral-700">
                    <summary className="cursor-pointer text-brand">विवरण देखें</summary>
                    <p className="mt-2 whitespace-pre-line">{item.body_md}</p>
                  </details>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}