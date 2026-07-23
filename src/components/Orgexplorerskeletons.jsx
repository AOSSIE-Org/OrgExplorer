import React, { useState } from "react";

const Bar = ({ w = "100%", h = "0.75rem", className = "" }) => (
  <div
    className={`animate-pulse rounded bg-neutral-800 ${className}`}
    style={{ width: w, height: h }}
  />
);

const Box = ({ className = "", children }) => (
  <div
    className={`rounded-lg border border-neutral-800 bg-neutral-900 p-4 ${className}`}
  >
    {children}
  </div>
);

const Circle = ({ size = 40 }) => (
  <div
    className="animate-pulse rounded-full bg-neutral-800 shrink-0"
    style={{ width: size, height: size }}
  />
);

const Pill = ({ w = "4rem" }) => (
  <div className="animate-pulse rounded-full bg-neutral-800 h-5" style={{ width: w }} />
);

/* Overview */
export function OverviewSkeleton() {
  return (
    <div className="min-h-screen p-6 space-y-6 w-295 mx-auto">
      {/* header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Circle size={40} />
          <div className="space-y-2">
            <Bar w="140px" h="1rem" />
            <Bar w="240px" h="0.65rem" />
          </div>
        </div>
        <div className="flex gap-2">
          <Bar w="110px" h="2.25rem" className="rounded-md" />
          <Bar w="80px" h="2.25rem" className="rounded-md" />
        </div>
      </div>

      {/* stat cards */}
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Box key={i} className="space-y-3">
            <Bar w="70%" h="0.6rem" />
            <Bar w="40%" h="1.5rem" />
          </Box>
        ))}
      </div>

      {/* language distribution + high impact repos */}
      <div className="grid grid-cols-2 gap-4">
        <Box className="space-y-4">
          <Bar w="55%" h="0.9rem" />
          <Bar w="35%" h="0.6rem" />
          <Bar w="100%" h="0.9rem" className="rounded-full" />
          <div className="flex gap-4 flex-wrap">
            {Array.from({ length: 6 }).map((_, i) => (
              <Pill key={i} w="60px" />
            ))}
          </div>
        </Box>
        <Box className="space-y-4">
          <Bar w="45%" h="0.9rem" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Bar w="30%" h="0.7rem" />
              <div className="flex items-center gap-2">
                <Bar w="80%" h="0.5rem" className="rounded-full" />
                <Bar w="24px" h="0.7rem" />
              </div>
            </div>
          ))}
        </Box>
      </div>

      {/* nav cards */}
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Box key={i} className="space-y-2">
            <Bar w="50%" h="0.9rem" />
            <Bar w="90%" h="0.6rem" />
            <Bar w="90%" h="0.6rem" />
            <Bar w="35%" h="0.6rem" />
          </Box>
        ))}
      </div>
    </div>
  );
}

/* Repository Explorer */
export function RepositorySkeleton() {
  return (
    <div className="min-h-screen w-295 p-6 space-y-6 mx-auto">
      <div className="flex items-center justify-between">
        <Bar w="200px" h="1.25rem" />
        <Bar w="70px" h="1.25rem" />
      </div>

      <div className="flex gap-3">
        <Bar w="100%" h="2.25rem" className="rounded-md flex-1" />
        <Bar w="140px" h="2.25rem" className="rounded-md" />
        <Bar w="90px" h="2.25rem" className="rounded-md" />
      </div>

      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Bar key={i} w="90px" h="2rem" className="rounded-md" />
        ))}
      </div>

      <Box className="divide-y divide-neutral-800 p-0">
        {Array.from({ length: 15 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between px-4 py-3">
            <div className="space-y-2 w-1/4">
              <Bar w="70%" h="0.8rem" />
              <Bar w="40%" h="0.55rem" />
            </div>
            <Bar w="40px" h="0.7rem" />
            <Bar w="40px" h="0.7rem" />
            <Bar w="40px" h="0.7rem" />
            <Bar w="120px" h="0.5rem" className="rounded-full" />
            <Bar w="80px" h="1.4rem" className="rounded-full" />
          </div>
        ))}
      </Box>
    </div>
  );
}

/* Contributor Intelligence */
export function ContributorSkeleton() {
  return (
    <div className="min-h-screen w-295 p-6 space-y-6 mx-auto">
      <div className="space-y-2">
        <Bar w="280px" h="1.25rem" />
        <Bar w="420px" h="0.65rem" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Box className="space-y-3">
          <Bar w="35%" h="0.6rem" />
          <Bar w="45%" h="1.5rem" />
          <Bar w="100%" h="0.5rem" className="rounded-full" />
        </Box>
        <Box className="space-y-3">
          <Bar w="35%" h="0.6rem" />
          <div className="flex items-center gap-3">
            <Circle size={56} />
            <div className="space-y-2 flex-1">
              <Bar w="60%" h="0.7rem" />
              <Bar w="80%" h="0.55rem" />
            </div>
          </div>
        </Box>
      </div>

      <Bar w="160px" h="2.25rem" className="rounded-md" />

      <Box className="divide-y divide-neutral-800 p-0">
        {Array.from({ length: 15 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3 w-1/4">
              <Circle size={28} />
              <Bar w="70%" h="0.75rem" />
            </div>
            <Bar w="60px" h="0.7rem" />
            <Bar w="30px" h="0.7rem" />
            <Bar w="20px" h="0.7rem" />
            <Bar w="70px" h="0.7rem" />
            <Bar w="60px" h="1.3rem" className="rounded-full" />
          </div>
        ))}
      </Box>
    </div>
  );
}

/* Contributor-Repository Network */
export function NetworkSkeleton() {
  const nodes = Array.from({ length: 26 }).map(() => ({
    x: 8 + Math.random() * 84,
    y: 10 + Math.random() * 75,
    size: 8 + Math.random() * 10,
  }));

  return (
    <div className="min-h-screen w-295 p-6 space-y-4 mx-auto">
      <div className="space-y-2">
        <Bar w="320px" h="1.25rem" />
        <Bar w="480px" h="0.65rem" />
      </div>

      <div className="flex gap-2">
        <Bar w="100px" h="2rem" className="rounded-md" />
        <Bar w="100px" h="2rem" className="rounded-md" />
      </div>

      <Bar w="380px" h="0.6rem" />

      <div className="relative h-96 rounded-lg border border-neutral-800 bg-neutral-950 overflow-hidden">
        {nodes.map((n, i) => (
          <div
            key={i}
            className="absolute animate-pulse rounded-full bg-neutral-800"
            style={{
              left: `${n.x}%`,
              top: `${n.y}%`,
              width: n.size,
              height: n.size,
            }}
          />
        ))}
      </div>
    </div>
  );
}

/* Analytics */
export function AnalyticsSkeleton() {
  return (
    <div className="min-h-screen w-295 p-6 space-y-8 mx-auto">
      <div className="space-y-2">
        <Bar w="180px" h="1.25rem" />
        <Bar w="380px" h="0.65rem" />
      </div>

      <div className="flex gap-3">
        <Bar w="120px" h="2.25rem" className="rounded-md" />
        <Bar w="100px" h="2.25rem" className="rounded-md" />
        <Bar w="100px" h="2.25rem" className="rounded-md" />
        <Bar w="180px" h="2.25rem" className="rounded-md" />
      </div>

      <Box className="h-56 flex items-center justify-center">
        <Bar w="220px" h="0.8rem" />
      </Box>

      <div className="space-y-2">
        <Bar w="220px" h="1.1rem" />
        <Bar w="400px" h="0.6rem" />
      </div>

      <div className="flex gap-3">
        <Bar w="160px" h="2.25rem" className="rounded-md" />
        <Bar w="200px" h="2.25rem" className="rounded-md" />
      </div>

      <Box className="h-56 flex items-center justify-center">
        <Bar w="220px" h="0.8rem" />
      </Box>
    </div>
  );
}

/* Governance Audit */
export function GovernanceSkeleton() {
  return (
    <div className="min-h-screen w-295 p-6 space-y-6 mx-auto">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Bar w="220px" h="1.25rem" />
          <Bar w="360px" h="0.65rem" />
        </div>
        <Bar w="120px" h="2.25rem" className="rounded-md" />
      </div>

      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Box key={i} className="space-y-3">
            <Bar w="70%" h="0.6rem" />
            <Bar w="40%" h="1.5rem" />
            <Bar w="50%" h="0.55rem" />
          </Box>
        ))}
      </div>

      <Box className="space-y-4">
        <Bar w="220px" h="0.9rem" />
        <Bar w="320px" h="0.6rem" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="space-y-1">
              <Bar w="120px" h="0.7rem" />
              <Bar w="70px" h="0.55rem" />
            </div>
            <Bar w="70px" h="0.6rem" />
          </div>
        ))}
      </Box>

      <div className="flex gap-6 border-b border-neutral-800 pb-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Bar key={i} w="90px" h="0.75rem" />
        ))}
      </div>

      <Box className="h-40 flex flex-col items-center justify-center gap-2">
        <Bar w="180px" h="0.8rem" />
        <Bar w="240px" h="0.6rem" />
      </Box>
    </div>
  );
}

