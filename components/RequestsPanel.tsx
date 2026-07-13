"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { JoinRequest } from "@/lib/types";
import { Check, X } from "lucide-react";

export default function RequestsPanel({
  projectId,
  onAccepted,
}: {
  projectId: string;
  onAccepted: () => void;
}) {
  const supabase = createClient();
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase
      .from("join_requests")
      .select("*, requester:profiles(*)")
      .eq("project_id", projectId)
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    setRequests((data as JoinRequest[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const respond = async (id: string, status: "accepted" | "rejected") => {
    await supabase.from("join_requests").update({ status }).eq("id", id);
    setRequests((prev) => prev.filter((r) => r.id !== id));
    if (status === "accepted") onAccepted();
  };

  if (loading) return null;
  if (requests.length === 0) {
    return <p className="text-mist-400 text-sm">No pending requests.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {requests.map((r) => (
        <div key={r.id} className="border border-ink-700 rounded-xl p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-mist-100">
              @{r.requester?.username}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => respond(r.id, "accepted")}
                className="w-7 h-7 rounded-md bg-signal-green/15 text-signal-green hover:bg-signal-green/25 flex items-center justify-center"
                aria-label="Accept"
              >
                <Check size={14} />
              </button>
              <button
                onClick={() => respond(r.id, "rejected")}
                className="w-7 h-7 rounded-md bg-signal-coral/15 text-signal-coral hover:bg-signal-coral/25 flex items-center justify-center"
                aria-label="Reject"
              >
                <X size={14} />
              </button>
            </div>
          </div>
          <p className="text-sm text-mist-300 mt-2">{r.message}</p>
        </div>
      ))}
    </div>
  );
}
