function LegalPage({ title, updated, intro, children }) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-400/80">
        FrostWolf
      </p>
      <h1 className="mt-2 text-3xl font-bold text-white">{title}</h1>
      <p className="mt-2 text-xs text-zinc-500">Last updated: {updated}</p>
      {intro && <p className="mt-4 text-sm leading-relaxed text-zinc-400">{intro}</p>}
      <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-zinc-300">
        {children}
      </div>
    </div>
  );
}

export function LegalSection({ heading, children }) {
  return (
    <section>
      <h2 className="text-base font-semibold text-white">{heading}</h2>
      <div className="mt-2 flex flex-col gap-2">{children}</div>
    </section>
  );
}

export default LegalPage;
