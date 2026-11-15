import React, { useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import * as THREE from "three";

export interface Lunar3DViewerProps {
  sites?: Array<{ id: string; name: string; latitude: number; longitude: number; elevationM?: number | null; missionCategory?: string; verified?: boolean }>;
  selectedSiteId?: string;
  onSelectSite?: (site: { id: string; name: string; latitude: number; longitude: number }) => void;
  solarAzimuthDeg?: number;
  solarElevationDeg?: number;
  earthAzimuthDeg?: number;
  earthElevationDeg?: number;
}

function latLonToVector3(latDeg: number, lonDeg: number, radius = 2) {
  const phi = (90 - latDeg) * (Math.PI / 180);
  const theta = (lonDeg + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

function azElToVector3(azDeg: number, elDeg: number, radius = 3.5) {
  const azRad = azDeg * (Math.PI / 180);
  const elRad = elDeg * (Math.PI / 180);
  const x = radius * Math.cos(elRad) * Math.sin(azRad);
  const y = radius * Math.sin(elRad);
  const z = -radius * Math.cos(elRad) * Math.cos(azRad);
  return new THREE.Vector3(x, y, z);
}

export default function Lunar3DViewer({
  sites = [],
  selectedSiteId,
  onSelectSite,
  solarAzimuthDeg = 90,
  solarElevationDeg = 15,
  earthAzimuthDeg = 180,
  earthElevationDeg = 45,
}: Lunar3DViewerProps) {
  const sunPos = azElToVector3(solarAzimuthDeg, solarElevationDeg, 4);
  const earthPos = azElToVector3(earthAzimuthDeg, earthElevationDeg, 3.8);
  const controlsRef = useRef<any>(null);

  const focusSouthPole = () => {
    if (controlsRef.current) {
      controlsRef.current.object.position.set(0, -5, 1.5);
      controlsRef.current.target.set(0, -1, 0);
      controlsRef.current.update();
    }
  };

  const resetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.object.position.set(0, 0, 6);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  };

  return (
    <div className="relative w-full h-[460px] rounded-xl overflow-hidden bg-[#030509] border border-white/10 shadow-2xl">
      <div className="absolute top-3 left-3 z-10 bg-surface/80 backdrop-blur px-3 py-1.5 rounded-lg border border-white/10 text-xs text-ink flex items-center gap-3">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-solar inline-block shadow-[0_0_8px_#FFBF69]"></span>
          Sun ({solarAzimuthDeg.toFixed(1)}°, {solarElevationDeg.toFixed(1)}°)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-earth inline-block shadow-[0_0_8px_#4C91FF]"></span>
          Earth ({earthAzimuthDeg.toFixed(1)}°, {earthElevationDeg.toFixed(1)}°)
        </span>
      </div>
      <div className="absolute top-3 right-3 z-10 flex gap-2">
        <button onClick={focusSouthPole} className="bg-surface/80 hover:bg-cyan/20 text-cyan border border-cyan/30 px-2.5 py-1 rounded text-xs transition">South Pole</button>
        <button onClick={resetCamera} className="bg-surface/80 hover:bg-white/10 text-ink border border-white/10 px-2.5 py-1 rounded text-xs transition">Reset</button>
      </div>
      <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
        <ambientLight intensity={0.25} />
        <directionalLight position={[sunPos.x, sunPos.y, sunPos.z]} intensity={2.5} />
        <pointLight position={[5, 5, 5]} intensity={0.4} />
        
        <mesh>
          <sphereGeometry args={[2, 64, 64]} />
          <meshStandardMaterial color="#8c929d" roughness={0.85} metalness={0.1} wireframe={false} />
        </mesh>
        <mesh>
          <sphereGeometry args={[2.001, 24, 12]} />
          <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.04} />
        </mesh>

        {/* Sun Marker */}
        <mesh position={sunPos}>
          <sphereGeometry args={[0.14, 16, 16]} />
          <meshBasicMaterial color="#FFBF69" />
        </mesh>

        {/* Earth Marker */}
        <mesh position={earthPos}>
          <sphereGeometry args={[0.11, 16, 16]} />
          <meshBasicMaterial color="#4C91FF" />
        </mesh>

        {/* Site Markers */}
        {sites.map((site) => {
          const pos = latLonToVector3(site.latitude, site.longitude, 2.02);
          const isSelected = site.id === selectedSiteId;
          return (
            <group key={site.id} position={pos}>
              <mesh onClick={(e) => { e.stopPropagation(); onSelectSite?.(site); }}>
                <sphereGeometry args={[isSelected ? 0.065 : 0.038, 16, 16]} />
                <meshBasicMaterial color={isSelected ? "#00F0FF" : site.verified ? "#4ade80" : "#fbbf24"} />
              </mesh>
              <Html distanceFactor={8}>
                <div
                  className={`cursor-pointer px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap border shadow-md transition ${
                    isSelected ? "bg-cyan text-space font-bold border-cyan" : "bg-surface/90 text-ink border-white/20 hover:bg-cyan hover:text-space"
                  }`}
                  onClick={() => onSelectSite?.(site)}
                >
                  {site.name}
                </div>
              </Html>
            </group>
          );
        })}

        <OrbitControls ref={controlsRef} enablePan={true} enableZoom={true} minDistance={2.8} maxDistance={10} rotateSpeed={0.8} />
      </Canvas>
    </div>
  );
}