"use client";

import { useState, type FormEvent } from "react";

export type RecordRow = {
  id: string;
  title: string;
  kind: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
};

const MAX_BYTES = 4 * 1024 * 1024;

const KINDS: { value: string; label: string }[] = [
  { value: "report", label: "जाँच रिपोर्ट" },
  { value: "xray", label: "एक्स-रे / स्कैन" },
  { value: "prescription", label: "पर्चा" },
  { value: "other", label: "अन्य" },
];

const ERRORS: Record<string, string> = {
  unauthorized: "फिर से login करें।",
  consent_required: "पहले सहमति दें।",
  unsupported_type: "सिर्फ़ PDF, JPG या PNG चलेगी।",
  too_large: "फ़ाइल 4 MB से छोटी होनी चाहिए।",
  invalid_meta: "नाम भरें।",
};

const GENERIC = "कुछ गड़बड़ हुई। फिर कोशिश करें।";

function kindLabel(kind: string): string {
  return KINDS.find((k) => k.value === kind)?.label ?? "अन्य";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("hi-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

async function readError(res: Response): Promise<string> {
  const data = await res.json().catch(() => ({}));
  return ERRORS[data?.error] ?? GENERIC;
}

export default function RecordsClient({
  initialConsent,
  initialRecords,
}: {
  initialConsent: boolean;
  initialRecords: RecordRow[];
}) {
  const [consented, setConsented] = useState(initialConsent);
  const [records, setRecords] = useState<RecordRow[]>(initialRecords);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("report");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    const res = await fetch("/api/records", { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as { records: RecordRow[] };
      setRecords(data.records);
    }
  }

  async function agree() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose: "medical_records", action: "grant" }),
      });
      if (!res.ok) {
        setError(await readError(res));
        return;
      }
      setConsented(true);
      await reload();
    } catch {
      setError(GENERIC);
    } finally {
      setBusy(false);
    }
  }

  async function upload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const input = form.elements.namedItem("file") as HTMLInputElement | null;
    const file = input?.files?.[0];

    if (!file) {
      setError("पहले फ़ाइल चुनें।");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(ERRORS.too_large);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("title", (title.trim() || file.name).slice(0, 80));
      body.append("kind", kind);

      const res = await fetch("/api/records", { method: "POST", body });
      if (!res.ok) {
        setError(await readError(res));
        return;
      }
      setTitle("");
      form.reset();
      await reload();
    } catch {
      setError(GENERIC);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("यह रिपोर्ट हमेशा के लिए हट जाएगी। पक्का?")) return;

    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/records?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) {
        setError(await readError(res));
        return;
      }
      setRecords((prev) => prev.filter((r) => r.id !== id));
    } catch {
      setError(GENERIC);
    } finally {
      setBusy(false);
    }
  }

  if (!consented) {
    return (
      <section className="card space-y-4">
        <h2 className="text-lg font-semibold text-ink">सिर्फ़ आपके लिए</h2>
        <p className="text-sm text-muted">Reports encrypted रहेंगी। सिर्फ़ आप देख सकेंगे।</p>
        <p className="text-xs text-muted">medical सलाह नहीं। डॉक्टर से ही पूछें।</p>
        {error && (
          <p role="alert" className="error-box">
            {error}
          </p>
        )}
        <button type="button" className="btn-primary" onClick={agree} disabled={busy}>
          {busy ? "रुकें..." : "सहमत हूँ"}
        </button>
      </section>
    );
  }

  return (
    <div className="space-y-8">
      <form onSubmit={upload} className="card space-y-4">
        <div className="space-y-2">
          <label htmlFor="rec-title" className="text-sm font-medium text-ink">
            नाम
          </label>
          <input
            id="rec-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={80}
            placeholder="जैसे: मार्च की blood test"
            className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-ink"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="rec-kind" className="text-sm font-medium text-ink">
            प्रकार
          </label>
          <select
            id="rec-kind"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-ink"
          >
            {KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="rec-file" className="text-sm font-medium text-ink">
            फ़ाइल
          </label>
          <input
            id="rec-file"
            name="file"
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            required
            className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-brand-soft file:px-4 file:py-2 file:text-brand"
          />
          <p className="text-xs text-muted">PDF, JPG या PNG · 4 MB तक</p>
        </div>

        {error && (
          <p role="alert" className="error-box">
            {error}
          </p>
        )}

        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? "अपलोड हो रहा है..." : "अपलोड करें"}
        </button>
      </form>

      <section className="space-y-3">
        {records.length === 0 ? (
          <p className="text-center text-sm text-muted">अभी कोई report नहीं है।</p>
        ) : (
          <ul className="space-y-3">
            {records.map((r) => (
              <li key={r.id} className="card flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{r.title}</p>
                  <p className="text-xs text-muted">
                    {kindLabel(r.kind)} · {formatDate(r.created_at)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <a
                    href={`/api/records/file?id=${r.id}`}
                    target="_blank"
                    rel="noopener"
                    className="btn-link"
                  >
                    खोलें
                  </a>
                  <button
                    type="button"
                    onClick={() => remove(r.id)}
                    disabled={busy}
                    className="btn-link text-danger"
                  >
                    हटाएँ
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}