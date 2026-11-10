"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  readAccountSession,
  type AccountSession,
  type LearnerUser,
} from "@/features/account/client";
import {
  parseAttempts,
  parseProgressGeneration,
  type AttemptRecord,
} from "./model";
import { createProgressStore } from "./store";

type SyncStatus = "idle" | "syncing" | "synced" | "error";
interface LearnerContextValue {
  attempts: AttemptRecord[];
  ready: boolean;
  storageAvailable: boolean;
  user: LearnerUser | null;
  accountConfigured: boolean;
  csrfToken: string | null;
  refreshAccount: () => Promise<void>;
  syncStatus: SyncStatus;
  syncError: string;
  saveAttempt: (attempt: AttemptRecord) => void;
  sync: () => Promise<void>;
  clearProgress: () => Promise<void>;
  importGuestProgress: () => Promise<void>;
}

const LearnerContext = createContext<LearnerContextValue | null>(null);

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<AccountSession>({
    configured: false,
    user: null,
    csrfToken: null,
  });
  const [accountLoading, setAccountLoading] = useState(true);
  const accountRequest = useRef(0);
  const user = account.user;
  const [syncState, setSyncState] = useState({
    scope: "guest",
    status: "idle" as SyncStatus,
    error: "",
  });
  const scope = user?.id ?? "guest";
  const store = useMemo(() => createProgressStore(scope), [scope]);
  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );
  const runExclusive = store.runExclusive;

  const refreshAccount = useCallback(async () => {
    const version = ++accountRequest.current;
    try {
      const result = await readAccountSession();
      if (accountRequest.current === version) {
        setAccount(result);
        setAccountLoading(false);
      }
    } catch {
      if (accountRequest.current === version) setAccountLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active) return refreshAccount();
    });
    const refresh = () => {
      void refreshAccount();
    };
    const changed = (event: StorageEvent) => {
      if (event.key === "procoderji:auth-change") refresh();
    };
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", changed);
    window.addEventListener("procoderji-auth-change", refresh);
    return () => {
      active = false;
      accountRequest.current += 1;
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", changed);
      window.removeEventListener("procoderji-auth-change", refresh);
    };
  }, [refreshAccount]);

  const synchronize = useCallback(
    (importing?: readonly AttemptRecord[]) =>
      runExclusive(async () => {
        if (!user) return;
        setSyncState({ scope, status: "syncing", error: "" });
        const headers = {
          "Content-Type": "application/json",
          "x-account-id": user.id,
          "X-CSRF-Token": account.csrfToken ?? "",
        };
        try {
          const initial = await fetch("/api/platform/progress", {
            headers,
            cache: "no-store",
          });
          if (!initial.ok) throw new Error("Progress could not be downloaded.");
          const initialBody = await initial.json();
          const generation = parseProgressGeneration(initialBody.generation);
          if (!generation) throw new Error("Invalid progress response.");
          const previousGeneration = store.getGeneration();
          if (previousGeneration !== generation) {
            const fresh =
              previousGeneration === null ? store.getNewAttempts() : [];
            store.replace(
              [...fresh, ...parseAttempts(initialBody.attempts)],
              generation,
            );
          }
          if (importing) store.addMany(importing);
          const local = store.getSnapshot().attempts;
          if (local.length) {
            const write = await fetch("/api/platform/progress", {
              method: "POST",
              headers,
              body: JSON.stringify({ attempts: local, generation }),
            });
            if (!write.ok) throw new Error("Progress could not be uploaded.");
          }
          const response = await fetch("/api/platform/progress", {
            headers,
            cache: "no-store",
          });
          if (!response.ok)
            throw new Error("Progress could not be downloaded.");
          const body = await response.json();
          const latestGeneration = parseProgressGeneration(body.generation);
          if (!latestGeneration) throw new Error("Invalid progress response.");
          const remote = parseAttempts(body.attempts);
          store.replace(
            latestGeneration === generation
              ? [...remote, ...store.getSnapshot().attempts]
              : remote,
            latestGeneration,
          );
          if (importing && latestGeneration !== generation)
            throw new Error("Progress changed during import.");
          setSyncState({ scope, status: "synced", error: "" });
        } catch {
          setSyncState({
            scope,
            status: "error",
            error:
              "Cloud sync is unavailable. Your progress is still available on this device.",
          });
          if (importing)
            throw new Error(
              "Guest import could not be completed. Your guest history is still saved separately; try importing again.",
            );
        }
      }),
    [account.csrfToken, runExclusive, scope, store, user],
  );
  const sync = useCallback(() => synchronize(), [synchronize]);

  useEffect(() => {
    if (user && snapshot.hydrated) void Promise.resolve().then(sync);
  }, [user, snapshot.hydrated, sync]);

  const saveAttempt = useCallback(
    (attempt: AttemptRecord) => {
      store.add(attempt);
      if (user) void sync();
    },
    [store, sync, user],
  );

  const clearProgress = useCallback(
    () =>
      runExclusive(async () => {
        const deleting = new Set(
          store.getSnapshot().attempts.map((attempt) => attempt.id),
        );
        let generation = store.getGeneration();
        if (user) {
          const response = await fetch("/api/platform/progress", {
            method: "DELETE",
            headers: {
              "x-account-id": user.id,
              "X-CSRF-Token": account.csrfToken ?? "",
            },
          });
          if (!response.ok)
            throw new Error(
              "Cloud progress could not be deleted. Please try again.",
            );
          const body = await response.json();
          generation = parseProgressGeneration(body.generation);
          if (!generation)
            throw new Error(
              "Deletion could not be verified. Please refresh and try again.",
            );
        }
        store.replace(
          store
            .getSnapshot()
            .attempts.filter((attempt) => !deleting.has(attempt.id)),
          generation,
        );
      }),
    [account.csrfToken, runExclusive, store, user],
  );

  const importGuestProgress = useCallback(async () => {
    if (!user) return;
    const guest = createProgressStore("guest").getSnapshot().attempts;
    await synchronize(guest);
  }, [synchronize, user]);

  return (
    <LearnerContext.Provider
      value={{
        attempts: snapshot.attempts,
        ready: snapshot.hydrated && !accountLoading,
        storageAvailable: snapshot.storageAvailable,
        user,
        accountConfigured: account.configured,
        csrfToken: account.csrfToken,
        refreshAccount,
        syncStatus: syncState.scope === scope ? syncState.status : "idle",
        syncError: syncState.scope === scope ? syncState.error : "",
        saveAttempt,
        sync,
        clearProgress,
        importGuestProgress,
      }}
    >
      {children}
    </LearnerContext.Provider>
  );
}

export function useProgress() {
  const value = useContext(LearnerContext);
  if (!value)
    throw new Error("useProgress must be used within ProgressProvider");
  return value;
}
