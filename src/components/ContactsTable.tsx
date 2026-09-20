import { useMemo, useState } from 'react';
import { LinkedInMatchProfile } from '../types/knowledgeGraph';

function downloadCsv(profiles: LinkedInMatchProfile[]) {
  const esc = (v: string) => `"${String(v || "").replace(/"/g, '""')}"`;
  const header = "First Name,Last Name,URL,Company,Position,Degree,Industry,Match %";
  const lines = profiles.map((p) => {
    const parts = p.name.split(/\s+/);
    return [parts[0] || "", parts.slice(1).join(" "), p.profileUrl, p.company, p.headline, p.connectionDegree, p.industry, String(p.matchScore)]
      .map(esc)
      .join(",");
  });
  const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "linkedin-contacts.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function ContactsTable({
  profiles,
  onSelect,
}: {
  profiles: LinkedInMatchProfile[];
  onSelect: (p: LinkedInMatchProfile) => void;
}) {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return profiles;
    return profiles.filter(
      (p) =>
        p.name.toLowerCase().includes(needle) ||
        p.headline.toLowerCase().includes(needle) ||
        p.company.toLowerCase().includes(needle),
    );
  }, [profiles, q]);
  const rows = filtered.slice(0, 2500);

  if (!profiles.length) return null;

  return (
    <div className="absolute right-6 top-24 z-30 w-[min(28rem,calc(100vw-3rem))] max-h-[min(52vh,28rem)] overflow-hidden bg-slate-900/95 border border-slate-700 shadow-xl">
      <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between gap-2">
        <div className="text-[10px] font-bold uppercase tracking-wider text-sky-400">
          Contacts · {profiles.length}
          {filtered.length !== profiles.length ? ` · ${filtered.length} shown` : ""}
        </div>
        <button
          type="button"
          onClick={() => downloadCsv(profiles)}
          className="text-[10px] text-sky-300 underline"
        >
          Download CSV
        </button>
      </div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search name, title, company"
        className="w-full bg-slate-950 text-xs px-3 py-2 border-b border-slate-800 outline-none"
      />
      <div className="overflow-y-auto max-h-[min(40vh,22rem)]">
        {rows.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect(p)}
            className="w-full text-left px-3 py-2 border-b border-slate-800/80 hover:bg-slate-800 flex items-center justify-between gap-2"
          >
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white truncate">{p.name}</div>
              <div className="text-[10px] text-slate-400 truncate">
                {p.headline || p.company} · {p.connectionDegree}
              </div>
            </div>
            <div
              className={`text-[11px] font-bold shrink-0 ${
                p.matchScore >= 70 ? 'text-emerald-400' : p.matchScore >= 40 ? 'text-sky-300' : 'text-slate-400'
              }`}
            >
              {p.matchScore}%
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
