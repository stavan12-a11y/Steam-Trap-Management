import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type {
  AppData,
  Equipment,
  IssueType,
  MaintenanceAction,
  MaintenanceRecord,
  PMRecord,
  ShutdownDeferral,
  Trap,
  TrapStatus,
} from '../types';
import { ISSUE_TYPES, DEFAULT_TRAP_DATASHEET } from '../types';
import { seedData, DATA_VERSION } from '../data/seedData';
import { todayISO } from '../utils/logic';
import { upsertTodayKPISnapshot } from '../utils/kpiSnapshots';
import { uid } from '../utils/id';
import { isSupabaseConfigured, STATE_ROW_ID, STATE_TABLE, supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthContext';

const STORAGE_KEY = 'steam-trap-data-v8';

export type SyncStatus = 'local' | 'loading' | 'saving' | 'saved' | 'error';

function normalizeTrap(
  t: Partial<Trap> & Pick<Trap, 'id' | 'tag' | 'type' | 'location' | 'equipment_id'>,
): Trap {
  return {
    ...DEFAULT_TRAP_DATASHEET,
    ...t,
    id: t.id,
    tag: t.tag,
    type: t.type,
    location: t.location,
    equipment_id: t.equipment_id,
  };
}

function normalizeData(raw: AppData): AppData {
  return {
    equipment: (raw.equipment ?? []).map(({ id, name, area }) => ({ id, name, area })),
    traps: (raw.traps ?? []).map((t) => normalizeTrap(t)),
    pm_records: raw.pm_records ?? [],
    maintenance_records: raw.maintenance_records ?? [],
    shutdown_deferrals: raw.shutdown_deferrals ?? [],
    kpi_snapshots: raw.kpi_snapshots ?? [],
    data_version: raw.data_version ?? 1,
  };
}

export function isStaleData(data: AppData): boolean {
  return (data.data_version ?? 1) < DATA_VERSION;
}

function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppData;
      if (parsed?.equipment && parsed?.traps && parsed?.pm_records) {
        const normalized = normalizeData(parsed);
        if (!isStaleData(normalized)) {
          return normalized;
        }
      }
    }
  } catch {
    // fall through
  }
  return structuredClone(seedData);
}

interface SteamTrapContextValue {
  data: AppData;
  syncStatus: SyncStatus;

  getEquipment: (id: string) => Equipment | undefined;
  getTrap: (id: string) => Trap | undefined;
  trapsForEquipment: (equipmentId: string) => Trap[];

  addEquipment: (e: Omit<Equipment, 'id'>) => Equipment;
  updateEquipment: (id: string, patch: Partial<Omit<Equipment, 'id'>>) => void;
  deleteEquipment: (id: string) => void;

  addTrap: (t: Omit<Trap, 'id'>) => Trap;
  updateTrap: (id: string, patch: Partial<Omit<Trap, 'id'>>) => void;
  deleteTrap: (id: string) => void;

  addPM: (
    trapId: string,
    input: {
      date?: string;
      status: TrapStatus;
      issue_type?: IssueType | null;
      technician?: string;
      notes?: string;
    },
  ) => { ok: true; record: PMRecord } | { ok: false; error: string };

  updatePM: (
    id: string,
    input: {
      date?: string;
      status?: TrapStatus;
      issue_type?: IssueType | null;
      technician?: string;
      notes?: string;
    },
  ) => { ok: true } | { ok: false; error: string };

  deletePM: (id: string) => void;

  addMaintenance: (
    trapId: string,
    input: {
      date?: string;
      action: MaintenanceAction;
      technician?: string;
      description?: string;
      parts_replaced?: string;
      cost?: number | null;
      notes?: string;
    },
  ) => MaintenanceRecord;

  updateMaintenance: (
    id: string,
    input: {
      date?: string;
      action?: MaintenanceAction;
      technician?: string;
      description?: string;
      parts_replaced?: string;
      cost?: number | null;
      notes?: string;
    },
  ) => void;

  deleteMaintenance: (id: string) => void;

  addShutdownDeferral: (
    trapId: string,
    input: {
      recorded_date?: string;
      pm_due_date?: string;
      technician?: string;
      notes?: string;
    },
  ) => ShutdownDeferral;

  updateShutdownDeferral: (
    id: string,
    input: {
      recorded_date?: string;
      pm_due_date?: string;
      technician?: string;
      notes?: string;
    },
  ) => void;

  deleteShutdownDeferral: (id: string) => void;

  resetToSeed: () => void;
  clearAll: () => void;
}

const SteamTrapContext = createContext<SteamTrapContextValue | null>(null);

const EMPTY_DATA: AppData = {
  equipment: [],
  traps: [],
  pm_records: [],
  maintenance_records: [],
  shutdown_deferrals: [],
  kpi_snapshots: [],
  data_version: DATA_VERSION,
};

export function SteamTrapProvider({ children }: { children: ReactNode }) {
  const { authed } = useAuth();
  const cloud = isSupabaseConfigured;

  const [data, setData] = useState<AppData>(() =>
    cloud ? structuredClone(EMPTY_DATA) : loadData(),
  );
  const [synced, setSynced] = useState(!cloud);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(cloud ? 'loading' : 'local');
  const applyingRemote = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const commitData = useCallback((updater: (d: AppData) => AppData) => {
    setData((d) => upsertTodayKPISnapshot(updater(d)));
  }, []);

  useEffect(() => {
    if (cloud) return;
    setData((d) => upsertTodayKPISnapshot(d));
  }, [cloud]);

  useEffect(() => {
    if (cloud) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // non-fatal
    }
  }, [data, cloud]);

  useEffect(() => {
    if (!cloud || !authed || !supabase) return;
    const sb = supabase;
    let active = true;
    setSyncStatus('loading');

    (async () => {
      const { data: row, error } = await sb
        .from(STATE_TABLE)
        .select('data')
        .eq('id', STATE_ROW_ID)
        .maybeSingle();
      if (!active) return;

      if (!error && row?.data) {
        applyingRemote.current = true;
        const normalized = normalizeData(row.data as AppData);
        setData(isStaleData(normalized) ? structuredClone(seedData) : normalized);
      } else if (!error) {
        const seed = structuredClone(seedData);
        await sb.from(STATE_TABLE).upsert({
          id: STATE_ROW_ID,
          data: seed,
          updated_at: new Date().toISOString(),
        });
        applyingRemote.current = true;
        setData(seed);
      }
      setSynced(true);
      setSyncStatus(error ? 'error' : 'saved');
    })();

    const channel = sb
      .channel('steam_trap_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: STATE_TABLE, filter: `id=eq.${STATE_ROW_ID}` },
        (payload) => {
          const incoming = (payload.new as { data?: AppData } | null)?.data;
          if (incoming) {
            applyingRemote.current = true;
            const normalized = normalizeData(incoming);
            setData(isStaleData(normalized) ? structuredClone(seedData) : normalized);
            setSyncStatus('saved');
          }
        },
      )
      .subscribe();

    return () => {
      active = false;
      sb.removeChannel(channel);
    };
  }, [cloud, authed]);

  useEffect(() => {
    if (!cloud || !authed || !synced || !supabase) return;
    if (applyingRemote.current) {
      applyingRemote.current = false;
      return;
    }
    const sb = supabase;
    setSyncStatus('saving');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const snapshot = data;
    saveTimer.current = setTimeout(() => {
      sb.from(STATE_TABLE)
        .upsert({ id: STATE_ROW_ID, data: snapshot, updated_at: new Date().toISOString() })
        .then(({ error }) => setSyncStatus(error ? 'error' : 'saved'));
    }, 400);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [data, cloud, authed, synced]);

  const getEquipment = useCallback(
    (id: string) => data.equipment.find((e) => e.id === id),
    [data.equipment],
  );
  const getTrap = useCallback((id: string) => data.traps.find((t) => t.id === id), [data.traps]);
  const trapsForEquipment = useCallback(
    (equipmentId: string) => data.traps.filter((t) => t.equipment_id === equipmentId),
    [data.traps],
  );

  const addEquipment = useCallback((e: Omit<Equipment, 'id'>) => {
    const created: Equipment = { ...e, id: uid('eq') };
    commitData((d) => ({ ...d, equipment: [...d.equipment, created] }));
    return created;
  }, []);

  const updateEquipment = useCallback((id: string, patch: Partial<Omit<Equipment, 'id'>>) => {
    commitData((d) => ({
      ...d,
      equipment: d.equipment.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }));
  }, []);

  const deleteEquipment = useCallback((id: string) => {
    commitData((d) => {
      const trapIds = new Set(d.traps.filter((t) => t.equipment_id === id).map((t) => t.id));
      return {
        ...d,
        equipment: d.equipment.filter((e) => e.id !== id),
        traps: d.traps.filter((t) => t.equipment_id !== id),
        pm_records: d.pm_records.filter((r) => !trapIds.has(r.trap_id)),
        maintenance_records: d.maintenance_records.filter((r) => !trapIds.has(r.trap_id)),
        shutdown_deferrals: d.shutdown_deferrals.filter((r) => !trapIds.has(r.trap_id)),
      };
    });
  }, []);

  const addTrap = useCallback((t: Omit<Trap, 'id'>) => {
    const created: Trap = { ...DEFAULT_TRAP_DATASHEET, ...t, id: uid('tr') };
    commitData((d) => ({ ...d, traps: [...d.traps, created] }));
    return created;
  }, []);

  const updateTrap = useCallback((id: string, patch: Partial<Omit<Trap, 'id'>>) => {
    commitData((d) => ({
      ...d,
      traps: d.traps.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }));
  }, []);

  const deleteTrap = useCallback((id: string) => {
    commitData((d) => ({
      ...d,
      traps: d.traps.filter((t) => t.id !== id),
      pm_records: d.pm_records.filter((r) => r.trap_id !== id),
      maintenance_records: d.maintenance_records.filter((r) => r.trap_id !== id),
      shutdown_deferrals: d.shutdown_deferrals.filter((r) => r.trap_id !== id),
    }));
  }, []);

  const addPM = useCallback(
    (
      trapId: string,
      input: {
        date?: string;
        status: TrapStatus;
        issue_type?: IssueType | null;
        technician?: string;
        notes?: string;
      },
    ): { ok: true; record: PMRecord } | { ok: false; error: string } => {
      let result: { ok: true; record: PMRecord } | { ok: false; error: string } = {
        ok: false,
        error: 'Trap not found',
      };

      commitData((d) => {
        const trap = d.traps.find((t) => t.id === trapId);
        if (!trap) return d;
        if (input.status === 'Issue') {
          const it = input.issue_type;
          if (!it || !ISSUE_TYPES.includes(it)) {
            result = { ok: false, error: "Issue type is required when status is 'Issue'" };
            return d;
          }
        }

        const record: PMRecord = {
          id: uid('pm'),
          trap_id: trapId,
          date: (input.date ?? '').trim() || todayISO(),
          status: input.status,
          issue_type: input.status === 'Issue' ? (input.issue_type ?? null) : null,
          technician: (input.technician ?? '').trim() || 'Unknown',
          notes: (input.notes ?? '').trim(),
          created_at: new Date().toISOString(),
        };
        result = { ok: true, record };
        return { ...d, pm_records: [...d.pm_records, record] };
      });

      return result;
    },
    [],
  );

  const updatePM = useCallback(
    (
      id: string,
      input: {
        date?: string;
        status?: TrapStatus;
        issue_type?: IssueType | null;
        technician?: string;
        notes?: string;
      },
    ): { ok: true } | { ok: false; error: string } => {
      let result: { ok: true } | { ok: false; error: string } = { ok: true };

      commitData((d) => {
        const existing = d.pm_records.find((r) => r.id === id);
        if (!existing) {
          result = { ok: false, error: 'PM record not found' };
          return d;
        }

        const status = input.status ?? existing.status;
        const issue_type = status === 'Issue' ? (input.issue_type ?? existing.issue_type) : null;

        if (status === 'Issue') {
          const it = issue_type;
          if (!it || !ISSUE_TYPES.includes(it)) {
            result = { ok: false, error: "Issue type is required when status is 'Issue'" };
            return d;
          }
        }

        return {
          ...d,
          pm_records: d.pm_records.map((r) =>
            r.id === id
              ? {
                  ...r,
                  date: (input.date ?? r.date).trim() || r.date,
                  status,
                  issue_type,
                  technician: (input.technician ?? r.technician).trim() || r.technician,
                  notes: (input.notes ?? r.notes).trim(),
                }
              : r,
          ),
        };
      });

      return result;
    },
    [],
  );

  const deletePM = useCallback((id: string) => {
    commitData((d) => ({
      ...d,
      pm_records: d.pm_records.filter((r) => r.id !== id),
    }));
  }, []);

  const addMaintenance = useCallback(
    (
      trapId: string,
      input: {
        date?: string;
        action: MaintenanceAction;
        technician?: string;
        description?: string;
        parts_replaced?: string;
        cost?: number | null;
        notes?: string;
      },
    ): MaintenanceRecord => {
      const record: MaintenanceRecord = {
        id: uid('mnt'),
        trap_id: trapId,
        date: (input.date ?? '').trim() || todayISO(),
        action: input.action,
        technician: (input.technician ?? '').trim() || 'Unknown',
        description: (input.description ?? '').trim(),
        parts_replaced: (input.parts_replaced ?? '').trim(),
        cost: input.cost ?? null,
        notes: (input.notes ?? '').trim(),
        created_at: new Date().toISOString(),
      };
      commitData((d) => ({
        ...d,
        maintenance_records: [...d.maintenance_records, record],
      }));
      return record;
    },
    [],
  );

  const updateMaintenance = useCallback(
    (
      id: string,
      input: {
        date?: string;
        action?: MaintenanceAction;
        technician?: string;
        description?: string;
        parts_replaced?: string;
        cost?: number | null;
        notes?: string;
      },
    ) => {
      commitData((d) => ({
        ...d,
        maintenance_records: d.maintenance_records.map((r) =>
          r.id === id
            ? {
                ...r,
                date: (input.date ?? r.date).trim() || r.date,
                action: input.action ?? r.action,
                technician: (input.technician ?? r.technician).trim() || r.technician,
                description: (input.description ?? r.description).trim(),
                parts_replaced: (input.parts_replaced ?? r.parts_replaced).trim(),
                cost: input.cost !== undefined ? input.cost : r.cost,
                notes: (input.notes ?? r.notes).trim(),
              }
            : r,
        ),
      }));
    },
    [],
  );

  const deleteMaintenance = useCallback((id: string) => {
    commitData((d) => ({
      ...d,
      maintenance_records: d.maintenance_records.filter((r) => r.id !== id),
    }));
  }, []);

  const addShutdownDeferral = useCallback(
    (
      trapId: string,
      input: {
        recorded_date?: string;
        pm_due_date?: string;
        technician?: string;
        notes?: string;
      },
    ): ShutdownDeferral => {
      const record: ShutdownDeferral = {
        id: uid('sd'),
        trap_id: trapId,
        recorded_date: (input.recorded_date ?? '').trim() || todayISO(),
        pm_due_date: (input.pm_due_date ?? '').trim() || todayISO(),
        technician: (input.technician ?? '').trim() || 'Unknown',
        notes: (input.notes ?? '').trim(),
        created_at: new Date().toISOString(),
      };
      commitData((d) => ({
        ...d,
        shutdown_deferrals: [...d.shutdown_deferrals, record],
      }));
      return record;
    },
    [],
  );

  const updateShutdownDeferral = useCallback(
    (
      id: string,
      input: {
        recorded_date?: string;
        pm_due_date?: string;
        technician?: string;
        notes?: string;
      },
    ) => {
      commitData((d) => ({
        ...d,
        shutdown_deferrals: d.shutdown_deferrals.map((r) =>
          r.id === id
            ? {
                ...r,
                recorded_date: (input.recorded_date ?? r.recorded_date).trim() || r.recorded_date,
                pm_due_date: (input.pm_due_date ?? r.pm_due_date).trim() || r.pm_due_date,
                technician: (input.technician ?? r.technician).trim() || r.technician,
                notes: (input.notes ?? r.notes).trim(),
              }
            : r,
        ),
      }));
    },
    [],
  );

  const deleteShutdownDeferral = useCallback((id: string) => {
    commitData((d) => ({
      ...d,
      shutdown_deferrals: d.shutdown_deferrals.filter((r) => r.id !== id),
    }));
  }, []);

  const resetToSeed = useCallback(
    () => setData(structuredClone(seedData)),
    [],
  );
  const clearAll = useCallback(() => setData(structuredClone(EMPTY_DATA)), []);

  const value = useMemo<SteamTrapContextValue>(
    () => ({
      data,
      syncStatus,
      getEquipment,
      getTrap,
      trapsForEquipment,
      addEquipment,
      updateEquipment,
      deleteEquipment,
      addTrap,
      updateTrap,
      deleteTrap,
      addPM,
      updatePM,
      deletePM,
      addMaintenance,
      updateMaintenance,
      deleteMaintenance,
      addShutdownDeferral,
      updateShutdownDeferral,
      deleteShutdownDeferral,
      resetToSeed,
      clearAll,
    }),
    [
      data,
      syncStatus,
      getEquipment,
      getTrap,
      trapsForEquipment,
      addEquipment,
      updateEquipment,
      deleteEquipment,
      addTrap,
      updateTrap,
      deleteTrap,
      addPM,
      updatePM,
      deletePM,
      addMaintenance,
      updateMaintenance,
      deleteMaintenance,
      addShutdownDeferral,
      updateShutdownDeferral,
      deleteShutdownDeferral,
      resetToSeed,
      clearAll,
    ],
  );

  return <SteamTrapContext.Provider value={value}>{children}</SteamTrapContext.Provider>;
}

export function useSteamTrap(): SteamTrapContextValue {
  const ctx = useContext(SteamTrapContext);
  if (!ctx) throw new Error('useSteamTrap must be used within a SteamTrapProvider');
  return ctx;
}
