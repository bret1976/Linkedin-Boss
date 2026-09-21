import { useState } from "react";
import { ArrowRight, CheckCircle2, Linkedin, Loader2 } from "lucide-react";

export default function LinkedInConnectFlow({
  onConnected,
}: {
  onConnected: (profileUrl: string) => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [profileUrl, setProfileUrl] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const valid = /linkedin\.com\/in\//i.test(profileUrl);

  const openChrome = async () => {
    if (!valid) {
      setError("Enter your LinkedIn profile URL first (linkedin.com/in/you).");
      return;
    }
    setError(null);
    setBusy(true);
    setStatus("Opening Google Chrome…");
    try {
      const res = await fetch("/api/linkedin/open-chrome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileUrl: profileUrl.trim() }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Could not open Chrome");
      setStatus(data.message || "Chrome is open. Log into LinkedIn there.");
      setStep(2);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const claim = async () => {
    setError(null);
    setBusy(true);
    setStatus("Reading your LinkedIn session cookies…");
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
    <div className="flex flex-col items-center justify-center w-full h-full bg-white text-gray-900 p-6">
      <div className="w-full max-w-md space-y-5">
        <div className="flex items-center gap-2 text-[#0077b5] font-bold uppercase tracking-wider text-xs">
          <Linkedin className="w-4 h-4" />
          Connect your LinkedIn
        </div>
        <h1 className="text-2xl font-extrabold">Two steps after your account</h1>
        <p className="text-xs text-gray-500 leading-relaxed">
          Enter your profile, open LinkedIn in Chrome, log in, then confirm. We take the session cookies from that window so we can load your real contacts.
        </p>

        <div className={`border p-4 space-y-3 ${step === 1 ? "border-[#0077b5]" : "border-gray-200"}`}>
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Step 1 · Profile + open LinkedIn</div>
          <input
            type="url"
            value={profileUrl}
            onChange={(e) => setProfileUrl(e.target.value)}
            placeholder="https://www.linkedin.com/in/you"
            className="w-full p-2.5 text-sm border border-gray-300"
          />
          <button
            type="button"
            disabled={busy || !valid}
            onClick={() => void openChrome()}
            className="w-full py-3 bg-[#0077b5] text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {busy && step === 1 ? <Loader2 className="w-4 h-4 animate-spin" /> : <Linkedin className="w-4 h-4" />}
            Open LinkedIn in Chrome
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className={`border p-4 space-y-3 ${step === 2 ? "border-[#0077b5]" : "border-gray-200 opacity-70"}`}>
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Step 2 · Confirm cookies</div>
          <p className="text-xs text-gray-600 leading-relaxed">
            In the Chrome window, log into LinkedIn if it asks. When you can see your feed or profile, come back here and click below. That reads the live session cookies LinkedIn requires.
          </p>
          <button
            type="button"
            disabled={busy || step !== 2}
            onClick={() => void claim()}
            className="w-full py-3 bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {busy && step === 2 ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            I&apos;ve logged in — use my contacts
          </button>
        </div>

        {status && <p className="text-xs text-sky-800">{status}</p>}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    </div>
  );
}
