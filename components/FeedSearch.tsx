"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { useState } from "react";

export default function FeedSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get("q") ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("q", value);
    } else {
      params.delete("q");
    }
    router.push(`/?${params.toString()}#feed`);
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full sm:w-72">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-mist-400" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search projects, stacks, tags…"
        className="w-full bg-ink-800 border border-ink-600 rounded-lg pl-9 pr-3 py-2 text-sm text-mist-100 placeholder:text-mist-400 focus:border-signal-violet outline-none"
      />
    </form>
  );
}
