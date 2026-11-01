import { useEffect, useRef, useState } from "react";
import { supabase } from "../services/supabase";

import { changedSettings, mergeWorkspace } from "../services/workspaceData";
import type { Workspace } from "../services/workspaceData";

export function useWorkspaceSync<T extends Workspace>(userId: string | undefined, snapshot: T, defaults: T,
  apply: (value: T) => void, loadLegacy: () => Promise<Partial<T>>) {
  const latest = useRef(snapshot); latest.current = snapshot;
  const applyRef = useRef(apply); applyRef.current = apply;
  const legacyRef = useRef(loadLegacy); legacyRef.current = loadLegacy;
  const defaultsRef = useRef(defaults);
  const initial = useRef(snapshot);
  const baseline = useRef<Workspace>({});
  const generation = useRef(0);
  const writing = useRef(false);
  const [loadedUser, setLoadedUser] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Loading account data…");
  const [revision, setRevision] = useState(0);
  const [retry, setRetry] = useState(0);
  const serialized = JSON.stringify(snapshot);

  useEffect(() => {
    const client = supabase;
    const version = ++generation.current;
    let active = true;
    writing.current = false;
    setLoadedUser(null); setError(""); baseline.current = {};
    if (!client || !userId) { setStatus("Saved on this device"); return; }
    setStatus("Loading account data…");
    const load = async () => {
      try {
        const { data, error: readError } = await client.from("user_settings").select("key,value").eq("user_id", userId);
        if (readError) throw readError;
        const owner = localStorage.getItem("studyday.legacySettingsOwner");
        const seed = !owner || owner === userId ? { ...initial.current, ...await legacyRef.current() } : defaultsRef.current;
        if (!active || generation.current !== version) return;
        const remote = Object.fromEntries((data || []).map((row) => [row.key, row.value]));
        const next = mergeWorkspace(defaultsRef.current, seed, remote);
        baseline.current = remote;
        applyRef.current(next);
        setLoadedUser(userId); setStatus("Saving account data…");
        if (!owner) localStorage.setItem("studyday.legacySettingsOwner", userId);
      } catch (cause) {
        if (!active) return;
        setError(`Account sync failed: ${cause instanceof Error ? cause.message : (cause as { message?: string })?.message || "Network error"}. If user_settings is missing, run supabase/migrations/20261101_workspace_sync.sql.`);
        setStatus("Account sync needs attention");
      }
    };
    void load();
    return () => { active = false; };
  }, [userId, retry]);

  useEffect(() => {
    const client = supabase;
    if (!client || !userId || loadedUser !== userId) return;
    const version = generation.current;
    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      if (writing.current) return;
      const sent = { ...latest.current };
      const keys = changedSettings(sent, baseline.current);
      if (!keys.length) { setStatus("Account data synced"); return; }
      writing.current = true; setStatus("Saving account data…");
      try {
        const { error: writeError } = await client.from("user_settings").upsert(keys.map((key) => ({ user_id: userId, key, value: sent[key] })), { onConflict: "user_id,key" });
        if (writeError) throw writeError;
        if (generation.current !== version) return;
        baseline.current = { ...baseline.current, ...Object.fromEntries(keys.map((key) => [key, sent[key]])) };
        setError(""); setStatus("Account data synced");
      } catch (cause) {
        if (generation.current !== version) return;
        setError(`Changes are not synced yet: ${(cause as { message?: string })?.message || "Network error"}. Your changes remain open here; retry before leaving.`);
        setStatus("Account sync needs attention");
      } finally {
        if (generation.current === version) {
          writing.current = false;
          if (!cancelled && changedSettings(latest.current, baseline.current).length === 0) setRevision((value) => value + 1);
          // New edits during a request need a second pass; failures wait for retry.
          if (JSON.stringify(sent) !== JSON.stringify(latest.current)) setRevision((value) => value + 1);
        }
      }
    }, 600);
    return () => { cancelled = true; window.clearTimeout(timeout); };
  }, [serialized, userId, loadedUser, revision]);

  useEffect(() => {
    const client = supabase;
    if (!client || !userId || loadedUser !== userId) return;
    const version = generation.current;
    let active = true, fetching = false;
    const refresh = async () => {
      if (document.visibilityState === "hidden" || writing.current || fetching || changedSettings(latest.current, baseline.current).length) return;
      fetching = true;
      try {
        const { data, error: readError } = await client.from("user_settings").select("key,value").eq("user_id", userId);
        if (readError) throw readError;
        if (!active || generation.current !== version || writing.current || changedSettings(latest.current, baseline.current).length) return;
        const remote = Object.fromEntries((data || []).map((row) => [row.key, row.value]));
        const next = mergeWorkspace(defaultsRef.current, latest.current, remote);
        baseline.current = next;
        if (JSON.stringify(next) !== JSON.stringify(latest.current)) applyRef.current(next);
        setError(""); setStatus("Account data synced");
      } catch (cause) { if (active) setError(`Could not refresh account data: ${(cause as { message?: string })?.message || "Network error"}`); }
      finally { fetching = false; }
    };
    const refreshVisible = () => void refresh();
    const interval = window.setInterval(refreshVisible, 30_000);
    window.addEventListener("focus", refreshVisible);
    window.addEventListener("online", refreshVisible);
    document.addEventListener("visibilitychange", refreshVisible);
    return () => { active = false; window.clearInterval(interval); window.removeEventListener("focus", refreshVisible); window.removeEventListener("online", refreshVisible); document.removeEventListener("visibilitychange", refreshVisible); };
  }, [userId, loadedUser]);

  const pending = !!userId && loadedUser === userId && changedSettings(snapshot, baseline.current).length > 0;
  useEffect(() => {
    if (!pending) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [pending]);
  return { ready: !supabase || (!!userId && loadedUser === userId), status: error ? "Account sync needs attention" : pending ? "Saving account data…" : status, error, pending,
    retry: () => { setError(""); if (loadedUser === userId) setRevision((value) => value + 1); else setRetry((value) => value + 1); } };
}
