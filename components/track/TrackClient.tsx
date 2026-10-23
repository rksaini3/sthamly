"use client";

import { useCallback, useEffect, useState } from "react";
import LogForm from "@/components/track/LogForm";
import { weekChange, topSymptoms } from "@/lib/trend";
import { SYMPTOM_LABELS, type Symptom } from "@/lib/symptoms";

type LogEntry = {
  id: string;
  logged_on: string;
  symptoms: string[];
  severity: number;
  note: string | null;
  red_flag: boolean;
};

const CHANGE_TEXT = {
  more: "पिछले हफ्ते से ज़्यादा",
  fewer: "पिछले हफ्ते से कम",
  same: "पिछले हफ्ते जितना ही",
} as const;

function labelFor(symptom: string): string {
  return SYMPTOM_LABELS[symptom as Symptom] ?? symptom;
}

export default function TrackClient() {
  const [logs, setLogs] = useState<LogEntry[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/logs", { cache: "no-store" });
    if (!res.ok) {
      setLoadError("Logs लोड नहीं हुए। पेज दोबारा खोलें।");
      return;
    }
    const data = (await res.json()) as { logs: LogEntry[] };
    setLoadError(null);
    setLogs(data.logs);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const trendRows = logs ?? [];
  const top = topSymptoms(trendRows);

  return (
    <>
      <section>
        <h1 className="text-2xl font-semibold text-brand">आज कैसा लग रहा है?</h1>
        <p className="mt-1 text-sm text-neutral-700">
          जो भी महसूस हो, उसे चुनें। Note वैकल्पिक है।
        </p>
        <div className="mt-4">
          <LogForm onSaved={load} />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">पिछले 14 दिन</h2>

        {loadError ? (
          <p role="alert" className="mt-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
            {loadError}
          </p>
        ) : null}

        {logs && top.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-700">अभी कोई pattern नहीं है। कुछ दिन log करें।</p>
        ) : null}

        <ul className="mt-3 space-y-3">
          {top.map((t) => {
            const change = weekChange(trendRows, t.symptom);
            return (
              <li key={t.symptom} className="rounded-lg border border-neutral-200 bg-white p-3">
                <p className="font-medium">{labelFor(t.symptom)}</p>
                <p className="text-sm text-neutral-700">
                  14 में से {t.days} दिन दर्ज किया गया, {CHANGE_TEXT[change]}।
                </p>
              </li>
            );
          })}
        </ul>

        <p className="mt-3 text-xs text-neutral-600">
          ये patterns हैं, diagnosis नहीं। कोई लक्षण लगातार बना रहे तो practitioner से बात करें।
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold">हाल के logs</h2>
        <ul className="mt-3 space-y-3">
          {(logs ?? []).map((log) => (
            <li key={log.id} className="rounded-lg border border-neutral-200 bg-white p-3">
              <p className="text-sm text-neutral-600">
                {log.logged_on} · गंभीरता {log.severity}/5
              </p>
              <p className="mt-1">{log.symptoms.map(labelFor).join(", ")}</p>
              {log.note ? <p className="mt-2 text-sm text-neutral-800">{log.note}</p> : null}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}