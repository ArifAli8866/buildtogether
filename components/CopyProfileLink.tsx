"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";

export default function CopyProfileLink() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 text-xs font-medium border border-ink-600 hover:border-mist-400 text-mist-300 px-3 py-1.5 rounded-lg transition-colors shrink-0"
    >
      {copied ? <Check size={14} className="text-signal-green" /> : <Share2 size={14} />}
      {copied ? "Copied" : "Share as resume"}
    </button>
  );
}
