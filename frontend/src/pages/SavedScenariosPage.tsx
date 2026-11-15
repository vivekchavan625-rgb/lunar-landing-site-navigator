export default function SavedScenariosPage() {
  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Saved Scenarios</h1>
        <p className="text-sm text-mute">Manage saved mission configurations, site parameters, and exported CSV/PDF reports.</p>
      </div>
      <div className="rounded-xl bg-surface p-8 border border-white/5 text-center space-y-3">
        <div className="text-mute">No saved scenarios found in current guest session.</div>
        <p className="text-xs text-mute max-w-md mx-auto">Run calculations in the Mission Planner to persist scenarios and generate downloadable CSV/PDF audit reports.</p>
      </div>
    </div>
  );
}
