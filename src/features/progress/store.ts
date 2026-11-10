import {
  parseAttempts,
  parseProgressGeneration,
  type AttemptRecord,
} from "./model.ts";

export interface ProgressSnapshot {
  attempts: AttemptRecord[];
  hydrated: boolean;
  storageAvailable: boolean;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** One store per learner. Guest progress never silently moves between accounts. */
export function createProgressStore(
  scope: string,
  storage?: () => StorageLike | undefined,
) {
  const key = `procoderji:practice:v1:${scope}`;
  const initial: ProgressSnapshot = {
    attempts: [],
    hydrated: false,
    storageAvailable: true,
  };
  let snapshot = initial;
  let loaded = false;
  let generation: string | null = null;
  let pending = Promise.resolve();
  const createdHere = new Set<string>();
  const listeners = new Set<() => void>();
  const resolveStorage =
    storage ??
    (() => (typeof window === "undefined" ? undefined : window.localStorage));
  const emit = () => listeners.forEach((listener) => listener());
  const onStorage = (event: StorageEvent) => {
    if (event.key === key || event.key === null) {
      read();
      emit();
    }
  };

  const read = () => {
    try {
      const target = resolveStorage();
      const raw = target?.getItem(key);
      generation = null;
      let attempts: AttemptRecord[] = [];
      if (raw) {
        try {
          const value: unknown = JSON.parse(raw);
          if (Array.isArray(value) && scope === "guest")
            attempts = parseAttempts(value);
          else if (
            value &&
            typeof value === "object" &&
            "version" in value &&
            value.version === 1 &&
            "attempts" in value &&
            "generation" in value
          ) {
            attempts = parseAttempts(value.attempts);
            generation = parseProgressGeneration(value.generation);
          }
        } catch {
          /* Ignore corrupted local data. */
        }
      }
      snapshot = {
        attempts,
        hydrated: true,
        storageAvailable: Boolean(target),
      };
    } catch {
      snapshot = { ...snapshot, hydrated: true, storageAvailable: false };
    }
    loaded = true;
  };

  const getSnapshot = () => {
    if (!loaded) read();
    return snapshot;
  };

  const replace = (
    attempts: readonly AttemptRecord[],
    nextGeneration?: string | null,
  ) => {
    if (!loaded) read();
    const storedGeneration =
      nextGeneration === undefined ? generation : nextGeneration;
    const validated = parseAttempts(attempts);
    let storageAvailable = true;
    try {
      const target = resolveStorage();
      storageAvailable = Boolean(target);
      target?.setItem(
        key,
        JSON.stringify({
          version: 1,
          generation: storedGeneration,
          attempts: validated,
        }),
      );
    } catch {
      storageAvailable = false;
    }
    loaded = true;
    generation = storedGeneration;
    snapshot = { attempts: validated, hydrated: true, storageAvailable };
    emit();
  };
  const addMany = (attempts: readonly AttemptRecord[]) => {
    for (const attempt of attempts) createdHere.add(attempt.id);
    replace([...attempts, ...getSnapshot().attempts]);
  };

  return {
    key,
    getSnapshot,
    getServerSnapshot: () => initial,
    replace,
    runExclusive: (operation: () => Promise<void>) => {
      const next = pending.then(operation, operation);
      pending = next.catch(() => {});
      return next;
    },
    getGeneration: () => {
      getSnapshot();
      return generation;
    },
    getNewAttempts: () =>
      getSnapshot().attempts.filter((attempt) => createdHere.has(attempt.id)),
    addMany,
    add: (attempt: AttemptRecord) => addMany([attempt]),
    subscribe: (listener: () => void) => {
      const first = listeners.size === 0;
      listeners.add(listener);
      if (first && typeof window !== "undefined")
        window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(listener);
        if (!listeners.size && typeof window !== "undefined")
          window.removeEventListener("storage", onStorage);
      };
    },
  };
}
