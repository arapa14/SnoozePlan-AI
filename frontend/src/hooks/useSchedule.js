import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

async function fetchPlans(userId) {
  const { data: plans, error: planErr } = await supabase
    .from("schedule_plans")
    .select("*")
    .eq("user_id", userId)
    .in("status", ["active", "proposed"])
    .order("created_at", { ascending: false });

  if (planErr) throw planErr;

  const activePlan = plans.find((p) => p.status === "active") || null;
  const proposedPlan = plans.find((p) => p.status === "proposed") || null;

  const fetchBlocks = async (planId) => {
    if (!planId) return [];
    const { data } = await supabase
      .from("scheduled_blocks")
      .select("*")
      .eq("plan_id", planId)
      .order("start_at");
    return data || [];
  };

  return {
    activePlan,
    activeBlocks: await fetchBlocks(activePlan?.id),
    proposedPlan,
    proposedBlocks: await fetchBlocks(proposedPlan?.id),
  };
}

export function useSchedule(userId) {
  const [activePlan, setActivePlan] = useState(null);
  const [activeBlocks, setActiveBlocks] = useState([]);
  const [proposedPlan, setProposedPlan] = useState(null);
  const [proposedBlocks, setProposedBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [warnings, setWarnings] = useState([]);

  const loadPlans = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await fetchPlans(userId);
      setActivePlan(data.activePlan);
      setActiveBlocks(data.activeBlocks);
      setProposedPlan(data.proposedPlan);
      setProposedBlocks(data.proposedBlocks);
    } catch (e) {
      setError(e.message);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    fetchPlans(userId)
      .then((data) => {
        if (cancelled) return;
        setActivePlan(data.activePlan);
        setActiveBlocks(data.activeBlocks);
        setProposedPlan(data.proposedPlan);
        setProposedBlocks(data.proposedBlocks);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e.message);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const generateSchedule = useCallback(
    async (payload) => {
      setGenerating(true);
      setError(null);
      setWarnings([]);
      try {
        const { data, error: fnError } = await supabase.functions.invoke(
          "generate-schedule",
          { body: payload },
        );

        if (fnError) {
          let detail = fnError.message || "Gagal menyusun jadwal";
          try {
            // Supabase v2 menyimpan raw Response di fnError.context
            if (fnError.context && typeof fnError.context.json === "function") {
              const body = await fnError.context.json();
              if (body?.error) detail = body.error;
              if (
                Array.isArray(body?.violations) &&
                body.violations.length > 0
              ) {
                detail += " — " + body.violations.slice(0, 3).join("; ");
              }
            }
          } catch (e) {
            console.warn("Could not parse edge function error context", e);
          }
          throw new Error(detail);
        }

        if (data?.error) throw new Error(data.error);
        if (Array.isArray(data?.warnings)) setWarnings(data.warnings);

        await loadPlans();
        return data;
      } catch (e) {
        setError(e.message);
        throw e;
      } finally {
        setGenerating(false);
      }
    },
    [loadPlans],
  );

  const approveSchedule = async () => {
    if (!proposedPlan) return;
    await supabase.rpc("activate_proposed_plan", {
      p_plan_id: proposedPlan.id,
    });
    await loadPlans();
  };

  const rejectSchedule = async () => {
    if (!proposedPlan) return;
    try {
      // Gunakan RPC agar tidak terblokir RLS
      await supabase.rpc("reject_proposed_plan", { p_plan_id: proposedPlan.id });
      await loadPlans();
    } catch (e) {
      console.error("Gagal menolak jadwal:", e);
      alert("Gagal menolak jadwal: " + e.message);
    }
  };

  return {
    activePlan,
    activeBlocks,
    proposedPlan,
    proposedBlocks,
    loading,
    generating,
    error,
    warnings,
    generateSchedule,
    approveSchedule,
    rejectSchedule,
  };
}
