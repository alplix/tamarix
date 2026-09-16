"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ScanForm() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Tarama başarısız oldu.");
        setLoading(false);
        return;
      }

      router.push(`/scan/${data.scan.id}`);
    } catch {
      setError("Sunucuya bağlanılamadı. Lütfen tekrar deneyin.");
      setLoading(false);
    }
  }

  return (
    <div className="flex w-full max-w-xl flex-col gap-2">
      <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--accent)]"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-[#04121a] transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Scanning…" : "Scan Website"}
        </button>
      </form>
      {error && <p className="text-sm text-[var(--fail)]">{error}</p>}
    </div>
  );
}
