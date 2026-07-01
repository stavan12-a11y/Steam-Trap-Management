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
  Trap,
  TrapStatus,
  TrapTypeName,
} from '../types';
import { ISSUE_TYPES, TRAP_TYPES } from '../types';
import { seedData } from '../data/seedData';
import { todayISO } from '../utils/logic';
import { uid } from '../utils/id';
import { isSupabaseConfigured, STATE_ROW_ID, STATE_TABLE, supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthContext';

const STORAGE_KEY = 'steam-trap-data-v1';

export type SyncStatus = 'local' | 'loading' | 'saving' | 'saved' | 'error';

function normalizeData(raw: AppData): AppData {
  return {
    equipment: (raw.equipment ?? []).map(({ id, name, area }) => ({ id, name, area })),
    traps: raw.traps ?? [],
    pm_records: raw.pm_records ?? [],
    maintenance_records: raw.maintenance_records ?? [],
    trap_types: raw.trap_types ?? [],
  };
}

function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppData;
      if (parsed?.equipment && parsed?.traps && parsed?.pm_records) {
        return normalizeData(parsed);
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

  deleteMaintenance: (id: string) => void;

  updateTrapTypeInterval: (type: TrapTypeName, pm_interval_days: number) => void;
  resetToSeed: () => void;
  clearAll: () => void;
}

const SteamTrapContext = createContext<SteamTrapContextValue | null>(null);

const EMPTY_DATA: AppData = {
  equipment: [],
  traps: [],
  pm_records: [],
  maintenance_records: [],
  trap_types: [],
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
        setData(normalizeData(row.data as AppData));
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
            setData(normalizeData(incoming));
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
    setData((d) => ({ ...d, equipment: [...d.equipment, created] }));
    return created;
  }, []);

  const updateEquipment = useCallback((id: string, patch: Partial<Omit<Equipment, 'id'>>) => {
    setData((d) => ({
      ...d,
      equipment: d.equipment.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }));
  }, []);

  const deleteEquipment = useCallback((id: string) => {
    setData((d) => {
      const trapIds = new Set(d.traps.filter((t) => t.equipment_id === id).map((t) => t.id));
      return {
        equipment: d.equipment.filter((e) => e.id !== id),
        traps: d.traps.filter((t) => t.equipment_id !== id),
        pm_records: d.pm_records.filter((r) => !trapIds.has(r.trap_id)),
        maintenance_records: d.maintenance_records.filter((r) => !trapIds.has(r.trap_id)),
        trap_types: d.trap_types,
      };
    });
  }, []);

  const addTrap = useCallback((t: Omit<Trap, 'id'>) => {
    const created: Trap = { ...t, id: uid('tr') };
    setData((d) => ({ ...d, traps: [...d.traps, created] }));
    return created;
  }, []);

  const deleteTrap = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      traps: d.traps.filter((t) => t.id !== id),
      pm_records: d.pm_records.filter((r) => r.trap_id !== id),
      maintenance_records: d.maintenance_records.filter((r) => r.trap_id !== id),
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

      setData((d) => {
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
      setData((d) => ({
        ...d,
        maintenance_records: [...d.maintenance_records, record],
      }));
      return record;
    },
    [],
  );

  const deleteMaintenance = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      maintenance_records: d.maintenance_records.filter((r) => r.id !== id),
    }));
  }, []);

  const updateTrapTypeInterval = useCallback((type: TrapTypeName, pm_interval_days: number) => {
    if (!TRAP_TYPES.includes(type)) return;
    const interval = Math.round(pm_interval_days);
    setData((d) => {
      const existing = d.trap_types.find((t) => t.type === type);
      if (existing) {
        return {
          ...d,
          trap_types: d.trap_types.map((t) =>
            t.type === type ? { ...t, pm_interval_days: interval } : t,
          ),
        };
      }
      return { ...d, trap_types: [...d.trap_types, { type, pm_interval_days: interval }] };
    });
  }, []);

  const resetToSeed = useCallback(() => setData(structuredClone(seedData)), []);
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
      deleteTrap,
      addPM,
      addMaintenance,
      deleteMaintenance,
      updateTrapTypeInterval,
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
      deleteTrap,
      addPM,
      addMaintenance,
      deleteMaintenance,
      updateTrapTypeInterval,
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
