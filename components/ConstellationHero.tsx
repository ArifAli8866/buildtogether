"use client";

import { motion } from "framer-motion";

// The signature visual: a small constellation of "builder" nodes (circles)
// linking to "project" nodes (diamonds), animating into place on load.
// It's a literal picture of the product's core idea: people connecting to ideas.

type Node = { x: number; y: number; kind: "person" | "project"; r?: number };

const nodes: Node[] = [
  { x: 60, y: 90, kind: "person" },
  { x: 140, y: 40, kind: "person" },
  { x: 130, y: 160, kind: "person" },
  { x: 260, y: 70, kind: "project" },
  { x: 250, y: 190, kind: "project" },
  { x: 380, y: 40, kind: "person" },
  { x: 400, y: 140, kind: "person" },
  { x: 470, y: 90, kind: "project" },
  { x: 20, y: 190, kind: "person" },
];

const links: [number, number][] = [
  [0, 3],
  [1, 3],
  [2, 3],
  [2, 4],
  [3, 6],
  [5, 7],
  [6, 7],
  [4, 6],
  [8, 4],
];

export default function ConstellationHero() {
  return (
    <svg
      viewBox="0 0 500 230"
      className="w-full h-full"
      role="img"
      aria-label="Diagram of builders connecting to project nodes"
    >
      <defs>
        <linearGradient id="linkGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7C6FF0" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#3FD3E0" stopOpacity="0.35" />
        </linearGradient>
      </defs>

      {links.map(([a, b], i) => {
        const na = nodes[a];
        const nb = nodes[b];
        return (
          <motion.line
            key={i}
            x1={na.x}
            y1={na.y}
            x2={nb.x}
            y2={nb.y}
            stroke="url(#linkGrad)"
            strokeWidth={1.25}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.1, delay: 0.15 + i * 0.06, ease: "easeOut" }}
          />
        );
      })}

      {nodes.map((n, i) =>
        n.kind === "person" ? (
          <motion.circle
            key={i}
            cx={n.x}
            cy={n.y}
            r={6}
            fill="#0B0E14"
            stroke="#9C90FF"
            strokeWidth={1.75}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 + i * 0.05, type: "spring" }}
          />
        ) : (
          <motion.rect
            key={i}
            x={n.x - 7}
            y={n.y - 7}
            width={14}
            height={14}
            rx={3}
            fill="#3FD3E0"
            fillOpacity={0.15}
            stroke="#3FD3E0"
            strokeWidth={1.75}
            transform={`rotate(45 ${n.x} ${n.y})`}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 + i * 0.05, type: "spring" }}
          />
        )
      )}
    </svg>
  );
}
