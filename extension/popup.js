const msg = document.getElementById("msg");
const go = document.getElementById("go");

function show(text, ok) {
  msg.textContent = text;
  msg.className = ok ? "ok" : "err";
}

go.addEventListener("click", async () => {
  const code = document.getElementById("code").value.trim();
  const boss = document.getElementById("boss").value.trim().replace(/\/$/, "");
  if (!code) {
    show("Paste the connect code from LinkedIn Boss.", false);
    return;
  }
  go.disabled = true;
  show("Reading LinkedIn cookies…", true);
  try {
    const cookies = await chrome.cookies.getAll({ domain: ".linkedin.com" });
    const extra = await chrome.cookies.getAll({ domain: "www.linkedin.com" });
    const byUrl = await chrome.cookies.getAll({ url: "https://www.linkedin.com/" });
    const all = [...cookies, ...extra, ...byUrl];
    const pick = (name) => all.find((c) => c.name === name)?.value || "";
    const liAt = pick("li_at");
    const jsession = (pick("JSESSIONID") || "").replace(/^"|"$/g, "");
    const liA = pick("li_a");
    if (!liAt) {
      show("No li_at cookie. Open linkedin.com, log in, then try again.", false);
      go.disabled = false;
      return;
    }
    const res = await fetch(`${boss}/api/linkedin/extension-connect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pairCode: code,
        liAt,
        jsession,
        liA,
        userAgent: navigator.userAgent,
      }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Connect failed");
    show(`Connected as ${data.profile?.name || "you"}. Go back to LinkedIn Boss — contacts are loading.`, true);
  } catch (e) {
    show(e.message || "Could not reach LinkedIn Boss. Is it running?", false);
  } finally {
    go.disabled = false;
  }
});
