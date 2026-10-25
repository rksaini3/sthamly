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
      // Storage बंद हो तो tick सिर्फ़ इसी visit में रहेगा
    }
  }

  const total = sections.reduce((n, s) => n + s.items.length, 0);
  const doneCount = sections.reduce(
    (n, s) => n + s.items.filter((i) => done.includes(i.id)).length,
    0
  );
  const percent = total === 0 ? 0 : Math.round((doneCount / total) * 100);

  return (
    <div className="space-y-8">
      {/* Progress: छोटी जीत दिखे तो लोग लौटते हैं */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-ink">आज का progress</span>
          <span className="font-medium text-brand">
            {doneCount} / {total} पूरे
          </span>
        </div>
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-line"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${percent}%` }} />
        </div>
      </div>

      {sections.map((group) => (
        <section key={group.section} className="space-y-3">
          <h2 className="text-base font-semibold text-ink">{group.label}</h2>
          <ul className="space-y-3">
            {group.items.map((item) => {
              const checked = done.includes(item.id);
              return (
                <li key={item.id} className="card p-4">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 h-5 w-5 shrink-0 accent-brand"
                      checked={checked}
                      onChange={() => toggle(item.id)}
                    />
                    <span className={checked ? "text-muted line-through" : "text-ink"}>
                      {item.title}
                    </span>
                  </label>
                  <details className="mt-3 pl-8 text-sm text-muted">
                    <summary className="cursor-pointer text-brand">विवरण देखें</summary>
                    <p className="mt-2 whitespace-pre-line leading-relaxed text-ink/80">{item.body_md}</p>
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