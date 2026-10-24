"use client";

import { useEffect, useState } from "react";

const EARLY_MS = 10 * 60 * 1000;
const LATE_MS = 35 * 60 * 1000;

export default function JoinButton({
  consultationId,
  startsAt,
}: {
  consultationId: string;
  startsAt: string;
}) {
  // 0 until the first client render, so server and client markup match.
  const [now, setNow] = useState(0);

  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(timer);
  }, []);

  if (now === 0) return null;

  const start = new Date(startsAt).getTime();
  const open = now >= start - EARLY_MS && now <= start + LATE_MS;
  const tooEarly = now < start - EARLY_MS;

  if (open) {
    return (
      <div className="space-y-2">
        <a
          href={`/api/consult/room?id=${consultationId}`}
          className="block rounded-md bg-brand px-4 py-3 text-center text-sm font-medium text-white"
        >
          Video session में जुड़ें
        </a>
        <p className="text-xs text-neutral-600">इस session में recording नहीं होती।</p>
      </div>
    );
  }

  if (tooEarly) {
    return (
      <p className="text-sm text-neutral-700">
        Video link session से 10 मिनट पहले खुलेगा।
      </p>
    );
  }

  return <p className="text-sm text-neutral-700">इस session का समय खत्म हो गया है।</p>;
}