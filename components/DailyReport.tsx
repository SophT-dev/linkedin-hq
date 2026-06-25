"use client";

import { useEffect, useState, useCallback } from "react";
import { Sparkles, RefreshCw } from "lucide-react";

interface ReportData {
  date: string;
  generated_at: string;
  report_md: string;
}

// Minimal markdown renderer (h1/h2, bullets, bold). Keeps the bundle tiny.
function renderMd(md: string) {
  const lines = md.split(/\r?\n/);
  const out: React.ReactNode[] = [];
  let bullets: React.ReactNode[] = [];
  let k = 0;
  const inline = (s: string) =>
    s.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
      p.startsWith("**") && p.endsWith("**") ? (
        <strong key={i} className="font-semibold text-gray-900">
          {p.slice(2, -2)}
        </strong>
      ) : (
        <span key={i}>{p}</span>
      )
    );
  const flush = () => {
    if (bullets.length) {
      out.push(
        <ul key={`u${k++}`} className="mb-3 space-y-1.5 pl-1">
          {bullets}
        </ul>
      );
      bullets = [];
    }
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^#\s/.test(line)) {
      flush();
      out.push(
        <h1 key={k++} className="mb-1 text-[20px] font-bold text-gray-900">
          {inline(line.replace(/^#\s/, ""))}
        </h1>
      );
    } else if (/^##\s/.test(line)) {
      flush();
      out.push(
        <h2 key={k++} className="mb-2 mt-5 text-[15px] font-bold text-gray-900">
          {inline(line.replace(/^##\s/, ""))}
        </h2>
      );
    } else if (/^[-*]\s/.test(line)) {
      bullets.push(
        <li key={k++} className="flex gap-2 text-[13.5px] leading-relaxed text-gray-700">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#b1130f]" />
          <span>{inline(line.replace(/^[-*]\s/, ""))}</span>
        </li>
      );
    } else if (line.trim() === "") {
      flush();
    } else {
      flush();
      out.push(
        <p key={k++} className="mb-2 text-[13.5px] leading-relaxed text-gray-700">
          {inline(line)}
        </p>
      );
    }
  }
  flush();
  return out;
}

function pretty(date: string) {
  try {
    return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  } catch {
    return date;
  }
}

export default function DailyReport() {
  const [dates, setDates] = useState<string[]>([]);
  const [date, setDate] = useState<string>("");
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchReport = useCallback(async (d?: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/report${d ? `?date=${d}` : ""}`, { cache: "no-store" });
      const data = await res.json();
      setDates(data.dates || []);
      setDate(data.date || "");
      setReport(data.report || null);
      return data;
    } finally {
      setLoading(false);
    }
  }, []);

  const generate = useCallback(
    async (d: string) => {
      setGenerating(true);
      try {
        const res = await fetch(`/api/report/generate${d ? `?date=${d}` : ""}`, { method: "POST" });
        const data = await res.json();
        if (data.report_md) {
          setReport({ date: data.date, generated_at: new Date().toISOString(), report_md: data.report_md });
          setDate(data.date);
          setDates((prev) => (prev.includes(data.date) ? prev : [data.date, ...prev]));
        }
      } finally {
        setGenerating(false);
      }
    },
    []
  );

  // First load: fetch latest. If today's report doesn't exist yet, auto-generate
  // it once (one cheap call/day) so the tab is never empty.
  useEffect(() => {
    fetchReport().then((data) => {
      if (data && !data.report && data.date) generate(data.date);
    });
  }, [fetchReport, generate]);

  const onPickDate = async (d: string) => {
    const data = await fetchReport(d);
    if (data && !data.report) generate(d);
  };

  return (
    <div>
      {/* Date picker row */}
      <div className="mb-4 flex items-center gap-2">
        <select
          value={date}
          onChange={(e) => onPickDate(e.target.value)}
          className="rounded-lg bg-white px-3 py-2 text-[13px] font-medium text-gray-800 shadow-sm ring-1 ring-gray-200 outline-none"
        >
          {(dates.length ? dates : date ? [date] : []).map((d) => (
            <option key={d} value={d}>
              {pretty(d)}
            </option>
          ))}
        </select>
        <button
          onClick={() => generate(date)}
          disabled={generating}
          className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-[13px] font-medium text-[#b1130f] shadow-sm ring-1 ring-gray-200 transition hover:ring-gray-300 disabled:opacity-50"
        >
          <RefreshCw size={13} className={generating ? "animate-spin" : ""} />
          {generating ? "Generating" : "Regenerate"}
        </button>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200/80">
        {loading || generating ? (
          <div className="flex items-center gap-2 py-10 text-center text-[14px] text-gray-500">
            <Sparkles size={16} className="animate-pulse text-[#b1130f]" />
            {generating ? "Writing today's report…" : "Loading…"}
          </div>
        ) : report?.report_md ? (
          <div>{renderMd(report.report_md)}</div>
        ) : (
          <div className="py-10 text-center">
            <p className="mb-3 text-[14px] text-gray-500">No report for this day yet.</p>
            <button
              onClick={() => generate(date)}
              className="rounded-lg bg-[#b1130f] px-4 py-2 text-[13px] font-medium text-white"
            >
              Generate report
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
