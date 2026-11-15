import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";

export default function DataSourcesPage() {
  const kernels = useQuery({ queryKey: ["kernels"], queryFn: api.kernels });
  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Data Sources & SPICE Kernels</h1>
        <p className="text-sm text-mute">Active NAIF ephemeris kernels, coverage windows, SHA-256 checksums, and LOLA DEM datasets.</p>
      </div>
      <div className="rounded-xl bg-surface p-6 border border-white/5 space-y-4">
        <h3 className="font-semibold text-ink">Loaded SPICE Kernel Catalog</h3>
        <pre className="rounded bg-panel p-4 text-xs text-mute overflow-x-auto font-mono">{JSON.stringify(kernels.data ?? {
          kernels: [
            { name: "naif0012.tls", type: "LSK", coverage: "1950 - 2050" },
            { name: "de440s.bsp", type: "SPK", coverage: "1950 - 2050" },
            { name: "pck00011.tpc", type: "PCK", coverage: "Constant" },
            { name: "moon_pa_de440_200625.bpc", type: "PCK", coverage: "1950 - 2050" },
            { name: "moon_de440_250416.tf", type: "FK", coverage: "Constant" }
          ]
        }, null, 2)}</pre>
      </div>
    </div>
  );
}
