export default function AboutPage() {
  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">About Lunar Landing Site Navigator</h1>
        <p className="text-sm text-mute">NASA Space Apps Challenge 2026 Submission</p>
      </div>
      <div className="rounded-xl bg-surface p-6 border border-white/5 space-y-4 text-sm text-mute leading-relaxed">
        <h3 className="text-ink font-semibold">Mission Statement</h3>
        <p>Providing mission planners, lunar scientists, and engineers with honest, scientifically validated, high-precision ephemeris, illumination, and visibility analysis for lunar landing sites.</p>
        <h3 className="text-ink font-semibold">Tech Stack</h3>
        <p>Python / FastAPI / SpiceyPy science engine, Node.js / Express / PostgreSQL backend, React / Vite / Tailwind CSS / Recharts frontend.</p>
      </div>
    </div>
  );
}
