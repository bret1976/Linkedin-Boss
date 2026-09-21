import { useEffect, useRef, useState } from "react";
import { ArrowRight, CheckCircle2, Linkedin, Loader2 } from "lucide-react";

export default function LinkedInConnectFlow({
  onConnected,
}: {
  onConnected: (profileUrl: string) => void;
}) {
  const [profileUrl, setProfileUrl] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [chromeOpen, setChromeOpen] = useState(false);
  const handedOff = useRef(false);

  const valid = /linkedin\.com\/in\//i.test(profileUrl);

  useEffect(() => {
    if (!valid) return;
    fetch(`/api/linkedin/pair-code?profileUrl=${encodeURIComponent(profileUrl.trim())}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setCode(d.code);
      })
      .catch(() => {});
  }, [valid, profileUrl]);

  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const st = await fetch("/api/linkedin/status").then((r) => r.json());
        if (st.canExtract && st.profile && !handedOff.current) {
          handedOff.current = true;
          setStatus(`Connected as ${st.profile.name}. Loading contacts…`);
          onConnected(profileUrl.trim());
        }
      } catch {
        /* ignore */
      }
    }, 2000);
    return () => clearInterval(t);
  }, [onConnected, profileUrl]);

  const openChrome = async () => {
    if (!valid) {
      setError("Enter your LinkedIn profile URL first (linkedin.com/in/you).");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/linkedin/open-chrome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileUrl: profileUrl.trim() }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Could not open Chrome");
      setChromeOpen(true);
      setStatus(data.message || "Chrome is open. Log into LinkedIn there.");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const claim = async () => {
    setError(null);
    setBusy(true);
    setStatus("Validating LinkedIn cookies…");
    try {
      const res = await fetch("/api/linkedin/claim-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileUrl: profileUrl.trim() }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Could not read LinkedIn cookies yet.");
      setStatus(`Connected as ${data.profile?.name || "you"}. Loading contacts…`);
      onConnected(profileUrl.trim());
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full bg-white text-gray-900 p-6 overflow-y-auto">
      <div className="w-full max-w-md space-y-5 py-6">
        <div className="flex items-center gap-2 text-[#0077b5] font-bold uppercase tracking-wider text-xs">
          <Linkedin className="w-4 h-4" />
          Connect your LinkedIn
        </div>
        <h1 className="text-2xl font-extrabold">Load your real contacts</h1>
        <p className="text-xs text-gray-500 leading-relaxed">
          After your account: paste your profile, connect LinkedIn in Chrome, then confirm the session so we can use your live contacts.
        </p>

        <div className="border border-[#0077b5] p-4 space-y-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">1 · Your LinkedIn profile</div>
          <input
            type="url"
            value={profileUrl}
            onChange={(e) => setProfileUrl(e.target.value)}
            placeholder="https://www.linkedin.com/in/you"
            className="w-full p-2.5 text-sm border border-gray-300"
          />
        </div>

        <div className="border border-gray-200 p-4 space-y-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">2 · Connect cookies (pick one)</div>
          <p className="text-xs text-gray-600">
            LinkedIn only exposes contacts from your logged-in session. Use your real Chrome.
          </p>
          {code && (
            <div className="bg-slate-50 border border-slate-200 p-3">
              <div className="text-[10px] uppercase tracking-wider text-gray-500">Connect code for the Chrome extension</div>
              <div className="text-2xl font-mono font-bold tracking-[0.3em] text-[#0077b5] mt-1">{code}</div>
              <p className="text-[11px] text-gray-500 mt-2 leading-relaxed">
                Chrome → chrome://extensions → Developer mode → Load unpacked → folder <code>extension</code> in this project. Log into linkedin.com, click the extension, paste this code.
              </p>
            </div>
          )}
          <button
            type="button"
            disabled={busy || !valid}
            onClick={() => void openChrome()}
            className="w-full py-3 bg-[#0077b5] text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {busy && !chromeOpen ? <Loader2 className="w-4 h-4 animate-spin" /> : <Linkedin className="w-4 h-4" />}
            Open LinkedIn in Chrome
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={busy || !valid}
            onClick={() => void claim()}
            className="w-full py-3 bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {busy && chromeOpen ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            I&apos;ve logged in — validate cookies and load contacts
          </button>
        </div>

        {status && <p className="text-xs text-sky-800">{status}</p>}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    </div>
  );
}
