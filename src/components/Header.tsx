import Link from "next/link";

export function Header() {
  return (
    <header className="border-b border-[var(--border)] bg-[var(--surface)]/60 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--accent)]/15 text-[var(--accent)]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M12 2 4 5v6c0 5 3.4 9 8 11 4.6-2 8-6 8-11V5l-8-3Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path d="m8.5 12 2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="text-lg font-semibold tracking-tight">Tamarix</span>
        </Link>
        <span className="hidden text-sm text-[var(--muted)] sm:block">Website Security Scanner</span>
      </div>
    </header>
  );
}
