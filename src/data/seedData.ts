import type { Database, KPISnapshot, Trap, TrapTypeName } from '../types';
import { CONNECTION_TYPES, DEFAULT_TRAP_DATASHEET } from '../types';
import { buildKPISnapshot } from '../utils/kpiSnapshots';

export const DATA_VERSION = 6;

const TYPE_SPECS: Record<TrapTypeName, { manufacturers: string[]; models: string[] }> = {
  'Float & Thermostatic': {
    manufacturers: ['Spirax Sarco', 'Armstrong', 'Gestra'],
    models: ['FT-14', 'FT-30', 'FT-C32', 'FA-125'],
  },
  'Inverted Bucket': {
    manufacturers: ['Armstrong', 'Spirax Sarco', 'Watson McDaniel'],
    models: ['IB-15', 'IB-1210', '2011-B', 'I-631'],
  },
  Thermodynamic: {
    manufacturers: ['TLV', 'Spirax Sarco', 'Velan'],
    models: ['A3N', 'TD-42', 'TD52M', 'J3X'],
  },
  Thermostatic: {
    manufacturers: ['Spirax Sarco', 'TLV', 'Armstrong'],
    models: ['BN-3', 'ATC-175', 'TSS-7', 'NPT-33'],
  },
  Bimetallic: {
    manufacturers: ['Armstrong', 'Watson McDaniel', 'Gestra'],
    models: ['CD-33S', 'BM-599', 'BK-37', 'MK-45'],
  },
};

const TRAP_SIZES = ['1/2"', '3/4"', '1"', '1-1/2"', '2"'] as const;

function datasheetFor(
  tag: string,
  type: TrapTypeName,
): Pick<Trap, 'manufacturer' | 'model' | 'connection_type' | 'trap_size' | 'serial_number' | 'install_date'> {
  const num = parseInt(tag.replace('ST-', ''), 10) || 1;
  const spec = TYPE_SPECS[type];
  const manufacturer = spec.manufacturers[num % spec.manufacturers.length];
  const model = spec.models[num % spec.models.length];
  const connection_type = CONNECTION_TYPES[num % CONNECTION_TYPES.length];
  const trap_size = TRAP_SIZES[num % TRAP_SIZES.length];
  const year = 2015 + (num % 10);
  const month = String((num % 12) + 1).padStart(2, '0');
  const day = String((num % 28) + 1).padStart(2, '0');
  const prefix = manufacturer
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  const serial_number = `${prefix}-${year}-${String(1000 + num).slice(-4)}`;
  const install_date = `${year}-${month}-${day}`;

  return { manufacturer, model, connection_type, trap_size, serial_number, install_date };
}

function trap(
  id: string,
  tag: string,
  type: TrapTypeName,
  location: string,
  equipment_id: string,
): Trap {
  return {
    id,
    tag,
    type,
    location,
    equipment_id,
    ...DEFAULT_TRAP_DATASHEET,
    ...datasheetFor(tag, type),
  };
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

function ts(daysOffset: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysOffset);
  return d.toISOString();
}

/**
 * Expanded demo dataset — ~38 traps across 9 equipment assets with a rich mix
 * of priorities, issue types, and plant areas for dashboard analytics.
 */
export function buildSeedDatabase(): Database {
  const equipment: Database["equipment"] = [
    { id: "eq-boiler-1", name: "Boiler 1", area: "Utilities" },
    { id: "eq-boiler-2", name: "Boiler 2", area: "Utilities" },
    { id: "eq-deaerator", name: "Deaerator", area: "Utilities" },
    { id: "eq-turbine", name: "Turbine Building", area: "Utilities" },
    { id: "eq-crude-preheat", name: "Crude Preheat Train", area: "Process — Unit 100" },
    { id: "eq-reboiler-c201", name: "Reboiler C-201", area: "Process — Unit 200" },
    { id: "eq-separator-301", name: "Separator V-301", area: "Process — Unit 300" },
    { id: "eq-steam-header", name: "Main Steam Header", area: "Distribution" },
    { id: "eq-campus-heat", name: "Campus Heating Loop", area: "Distribution" },
  ];

  const traps: Database["traps"] = [
    trap("tr-0001", "ST-0001", "Inverted Bucket", "Boiler 1 — Blowdown line", "eq-boiler-1"),
    trap("tr-0002", "ST-0002", "Thermodynamic", "Boiler 1 — Steam drum drip", "eq-boiler-1"),
    trap("tr-0003", "ST-0003", "Float & Thermostatic", "Boiler 1 — Economizer drain", "eq-boiler-1"),
    trap("tr-0004", "ST-0004", "Thermodynamic", "Boiler 1 — Feedwater preheat drip", "eq-boiler-1"),
    trap("tr-0005", "ST-0005", "Thermodynamic", "Boiler 2 — Steam drum drip", "eq-boiler-2"),
    trap("tr-0006", "ST-0006", "Bimetallic", "Boiler 2 — Superheater drain", "eq-boiler-2"),
    trap("tr-0007", "ST-0007", "Inverted Bucket", "Boiler 2 — Attemperator drain", "eq-boiler-2"),
    trap("tr-0008", "ST-0008", "Float & Thermostatic", "Boiler 2 — Sample cooler drain", "eq-boiler-2"),
    trap("tr-0009", "ST-0009", "Float & Thermostatic", "Deaerator — Vent condenser", "eq-deaerator"),
    trap("tr-0010", "ST-0010", "Thermostatic", "Deaerator — Storage tank drip", "eq-deaerator"),
    trap("tr-0011", "ST-0011", "Thermodynamic", "Deaerator — Pegging steam line", "eq-deaerator"),
    trap("tr-0012", "ST-0012", "Thermodynamic", "Turbine — Extraction line drip", "eq-turbine"),
    trap("tr-0013", "ST-0013", "Inverted Bucket", "Turbine — Gland seal condenser", "eq-turbine"),
    trap("tr-0014", "ST-0014", "Float & Thermostatic", "Turbine — Lube oil heater drain", "eq-turbine"),
    trap("tr-0015", "ST-0015", "Bimetallic", "Turbine — Casing drain pot", "eq-turbine"),
    trap("tr-0016", "ST-0016", "Float & Thermostatic", "Crude Preheat — E-101 shell drain", "eq-crude-preheat"),
    trap("tr-0017", "ST-0017", "Inverted Bucket", "Crude Preheat — Tracing manifold", "eq-crude-preheat"),
    trap("tr-0018", "ST-0018", "Thermodynamic", "Crude Preheat — E-104 drip leg", "eq-crude-preheat"),
    trap("tr-0019", "ST-0019", "Thermostatic", "Crude Preheat — E-102 channel drain", "eq-crude-preheat"),
    trap("tr-0020", "ST-0020", "Thermodynamic", "Crude Preheat — Pump seal drip", "eq-crude-preheat"),
    trap("tr-0021", "ST-0021", "Float & Thermostatic", "Reboiler C-201 — Shell drain", "eq-reboiler-c201"),
    trap("tr-0022", "ST-0022", "Bimetallic", "Reboiler C-201 — Condensate header", "eq-reboiler-c201"),
    trap("tr-0023", "ST-0023", "Thermodynamic", "Reboiler C-201 — Column reflux drip", "eq-reboiler-c201"),
    trap("tr-0024", "ST-0024", "Inverted Bucket", "Reboiler C-201 — Steam inlet drip", "eq-reboiler-c201"),
    trap("tr-0025", "ST-0025", "Inverted Bucket", "Separator V-301 — Boot drain", "eq-separator-301"),
    trap("tr-0026", "ST-0026", "Float & Thermostatic", "Separator V-301 — Flash drum drip", "eq-separator-301"),
    trap("tr-0027", "ST-0027", "Thermodynamic", "Separator V-301 — Tracing supply", "eq-separator-301"),
    trap("tr-0028", "ST-0028", "Thermostatic", "Separator V-301 — Level bridle drain", "eq-separator-301"),
    trap("tr-0029", "ST-0029", "Bimetallic", "Separator V-301 — Offgas condenser", "eq-separator-301"),
    trap("tr-0030", "ST-0030", "Thermodynamic", "Main Steam Header — Drip leg A", "eq-steam-header"),
    trap("tr-0031", "ST-0031", "Thermodynamic", "Main Steam Header — Drip leg B", "eq-steam-header"),
    trap("tr-0032", "ST-0032", "Thermostatic", "Main Steam Header — Tracing supply", "eq-steam-header"),
    trap("tr-0033", "ST-0033", "Inverted Bucket", "Main Steam Header — Expansion loop drip", "eq-steam-header"),
    trap("tr-0034", "ST-0034", "Float & Thermostatic", "Main Steam Header — PRV station drain", "eq-steam-header"),
    trap("tr-0035", "ST-0035", "Thermodynamic", "Campus Heat — Main riser drip", "eq-campus-heat"),
    trap("tr-0036", "ST-0036", "Thermostatic", "Campus Heat — Building A supply", "eq-campus-heat"),
    trap("tr-0037", "ST-0037", "Float & Thermostatic", "Campus Heat — Building B return", "eq-campus-heat"),
    trap("tr-0038", "ST-0038", "Bimetallic", "Campus Heat — Tunnel drain pot", "eq-campus-heat"),
  ];

  const pm_records: Database["pm_records"] = [];
  let pmSeq = 1;
  const addPM = (
    trap_id: string,
    dateDaysAgo: number,
    status: "Working" | "Issue",
    issue_type: "Blowing" | "Blocked" | "Leak" | "Cycling" | null,
    technician: string,
    notes: string,
  ) => {
    pm_records.push({
      id: `pm-${String(pmSeq++).padStart(4, "0")}`,
      trap_id,
      date: daysAgo(dateDaysAgo),
      status,
      issue_type: status === "Issue" ? issue_type : null,
      technician,
      notes,
      created_at: ts(dateDaysAgo),
    });
  };

  // ── ACTIVE ISSUES (10 traps) ──────────────────────────────────────────────
  // ST-0001 — Blowing (Utilities) · eng review + repeat failure
  addPM("tr-0001", 900, "Issue", "Blowing", "R. Alvarez", "Live steam blow-through.");
  addPM("tr-0001", 600, "Working", null, "R. Alvarez", "Repaired seat, re-tested OK.");
  addPM("tr-0001", 400, "Issue", "Blowing", "R. Alvarez", "Blowing again after 6 months.");
  addPM("tr-0001", 200, "Working", null, "M. Chen", "Seat lapped, normal discharge.");
  addPM("tr-0001", 30, "Issue", "Blowing", "R. Alvarez", "Continuous live steam blow-through.");

  // ST-0005 — Cycling (Utilities)
  addPM("tr-0005", 300, "Working", null, "S. Patel", "Normal operation.");
  addPM("tr-0005", 10, "Issue", "Cycling", "S. Patel", "Rapid cycling, suspect worn disc.");

  // ST-0008 — Leak (Utilities)
  addPM("tr-0008", 60, "Issue", "Leak", "J. Okafor", "External body leak at gasket.");

  // ST-0014 — Blocked (Utilities / Turbine)
  addPM("tr-0014", 20, "Issue", "Blocked", "R. Alvarez", "No discharge, downstream cold.");

  // ST-0020 — Cycling (Process 100)
  addPM("tr-0020", 180, "Working", null, "M. Chen", "Cycling normally.");
  addPM("tr-0020", 8, "Issue", "Cycling", "M. Chen", "Intermittent rapid cycling.");

  // ST-0022 — Leak (Process 200)
  addPM("tr-0022", 45, "Issue", "Leak", "S. Patel", "Body leak at bonnet flange.");

  // ST-0025 — Blowing (Process 300) · repeat failure
  addPM("tr-0025", 400, "Issue", "Blowing", "J. Okafor", "Blow-through detected.");
  addPM("tr-0025", 250, "Working", null, "J. Okafor", "Seat serviced.");
  addPM("tr-0025", 90, "Issue", "Blowing", "J. Okafor", "Blowing returned after 5 months.");
  addPM("tr-0025", 14, "Issue", "Blowing", "J. Okafor", "Still blowing — tag for replacement.");

  // ST-0028 — Blocked (Process 300)
  addPM("tr-0028", 18, "Issue", "Blocked", "M. Chen", "Plugged orifice, cold trap body.");

  // ST-0030 — Blocked (Distribution)
  addPM("tr-0030", 12, "Issue", "Blocked", "R. Alvarez", "No condensate discharge.");

  // ST-0033 — Cycling (Distribution)
  addPM("tr-0033", 300, "Working", null, "S. Patel", "Normal.");
  addPM("tr-0033", 5, "Issue", "Cycling", "S. Patel", "Continuous rapid cycling.");

  // ── HEALTHY TRAPS (recent PM, on schedule) ──────────────────────────────
  const healthyRecent: string[] = [
    "tr-0002", "tr-0003", "tr-0004", "tr-0006",
    "tr-0009", "tr-0010", "tr-0012", "tr-0016",
    "tr-0017", "tr-0021", "tr-0023", "tr-0026",
    "tr-0029", "tr-0032", "tr-0034", "tr-0035",
    "tr-0036", "tr-0037",
  ];
  const techs = ["R. Alvarez", "M. Chen", "S. Patel", "J. Okafor"];
  healthyRecent.forEach((id, i) => {
    addPM(id, 15 + (i % 40), "Working", null, techs[i % 4], "Normal discharge, operating correctly.");
  });

  // ── OVERDUE PM ────────────────────────────────────────────────────────────
  addPM("tr-0011", 200, "Working", null, "M. Chen", "Cycling normally.");
  addPM("tr-0018", 260, "Working", null, "M. Chen", "Discharging well.");
  addPM("tr-0019", 310, "Working", null, "J. Okafor", "Normal.");
  addPM("tr-0024", 400, "Working", null, "R. Alvarez", "Good.");
  addPM("tr-0027", 180, "Working", null, "S. Patel", "Operating correctly.");
  addPM("tr-0031", 220, "Working", null, "R. Alvarez", "Cycling normally.");

  // ── UPCOMING PM (due within 14 days, 90-day interval) ─────────────────────
  addPM("tr-0007", 82, "Working", null, "S. Patel", "Operating correctly.");
  addPM("tr-0015", 85, "Working", null, "J. Okafor", "Normal discharge.");

  // tr-0013, tr-0038 — never inspected (no records)

  // ST-0029 resolved issue history (now healthy)
  addPM("tr-0029", 200, "Issue", "Blocked", "M. Chen", "Plugged.");
  addPM("tr-0029", 100, "Working", null, "M. Chen", "Cleaned, discharging.");

  // tr-0013, tr-0038 never inspected — no records

  const maintenance_records: Database["maintenance_records"] = [
    {
      id: "mnt-0001",
      trap_id: "tr-0001",
      date: daysAgo(600),
      action: "Repair",
      technician: "R. Alvarez",
      description: "Replaced seat and disc assembly",
      parts_replaced: "Seat/disc kit",
      cost: 285,
      notes: "Trap was blowing live steam. Restored to service.",
      created_at: ts(600),
    },
    {
      id: "mnt-0002",
      trap_id: "tr-0001",
      date: daysAgo(200),
      action: "Maintenance",
      technician: "M. Chen",
      description: "Lapped seat, cleaned strainer",
      parts_replaced: "",
      cost: null,
      notes: "Routine corrective maintenance after second failure.",
      created_at: ts(200),
    },
    {
      id: "mnt-0003",
      trap_id: "tr-0025",
      date: daysAgo(250),
      action: "Repair",
      technician: "J. Okafor",
      description: "Seat and disc replacement",
      parts_replaced: "Repair kit",
      cost: 195,
      notes: "Addressed first blowing incident.",
      created_at: ts(250),
    },
    {
      id: "mnt-0004",
      trap_id: "tr-0018",
      date: daysAgo(150),
      action: "Maintenance",
      technician: "M. Chen",
      description: "Cleared blockage in orifice",
      parts_replaced: "",
      cost: null,
      notes: "Downstream line was cold. Trap cycling normally after cleaning.",
      created_at: ts(150),
    },
    {
      id: "mnt-0005",
      trap_id: "tr-0022",
      date: daysAgo(30),
      action: "Repair",
      technician: "S. Patel",
      description: "Re-torqued bonnet, replaced gasket",
      parts_replaced: "Gasket set",
      cost: 45,
      notes: "Leak persisted — re-inspection flagged active issue.",
      created_at: ts(30),
    },
    {
      id: "mnt-0006",
      trap_id: "tr-0030",
      date: daysAgo(400),
      action: "Replacement",
      technician: "R. Alvarez",
      description: "Full trap replacement",
      parts_replaced: "Thermodynamic trap",
      cost: 380,
      notes: "Previous trap blocked repeatedly.",
      created_at: ts(400),
    },
  ];

  const shutdown_deferrals: Database["shutdown_deferrals"] = [
    {
      id: "sd-0001",
      trap_id: "tr-0018",
      recorded_date: daysAgo(14),
      pm_due_date: daysAgo(10),
      technician: "M. Chen",
      notes: "Crude preheat train outage — PM deferred until equipment returns to service.",
      created_at: ts(14),
    },
    {
      id: "sd-0002",
      trap_id: "tr-0027",
      recorded_date: daysAgo(5),
      pm_due_date: daysAgo(2),
      technician: "S. Patel",
      notes: "Separator V-301 shutdown for catalyst change.",
      created_at: ts(5),
    },
  ];

  function buildHistoricalKPISnapshots(): KPISnapshot[] {
    const snaps: KPISnapshot[] = [];
    for (let d = 84; d >= 7; d -= 7) {
      const date = daysAgo(d);
      const progress = (84 - d) / 84;
      const active = Math.max(4, Math.round(14 - progress * 4 + (d % 3)));
      const overdue = Math.max(2, Math.round(10 - progress * 4));
      const reliability = Math.min(97, Math.round(65 + progress * 27));
      snaps.push({
        id: `kpi-hist-${date}`,
        date,
        total_traps: 36 + Math.round(progress * 2),
        active_issues: active,
        overdue_pm: overdue,
        fleet_reliability_rate: reliability,
        due_soon_pm: 2 + (d % 4),
        on_track_pm: 18 + Math.round(progress * 8),
        never_inspected: Math.max(1, 4 - Math.round(progress * 2)),
        healthy_count: 12 + Math.round(progress * 6),
        upcoming_count: 2,
        issue_priority_count: active,
        blowing_issues: Math.round(active * 0.35),
        blocked_issues: Math.round(active * 0.25),
        leak_issues: Math.round(active * 0.2),
        cycling_issues: Math.max(0, active - Math.round(active * 0.8)),
        engineering_review_count: progress > 0.5 ? 2 : 1,
        smart_alert_count: progress > 0.6 ? 3 : 2,
        priority_breakdown: {
          Issue: active,
          Overdue: overdue,
          Upcoming: 2,
          Healthy: 12 + Math.round(progress * 6),
          'Never inspected': Math.max(1, 4 - Math.round(progress * 2)),
        },
        created_at: ts(d),
      });
    }
    return snaps;
  }

  const partial: Omit<Database, 'kpi_snapshots' | 'data_version'> = {
    equipment,
    traps,
    pm_records,
    maintenance_records,
    shutdown_deferrals,
  };

  const historical = buildHistoricalKPISnapshots();
  const todaySnap = buildKPISnapshot({ ...partial, kpi_snapshots: historical });
  const kpi_snapshots = [
    ...historical.filter((s) => s.date !== todaySnap.date),
    todaySnap,
  ].sort((a, b) => a.date.localeCompare(b.date));

  return {
    ...partial,
    kpi_snapshots,
    data_version: DATA_VERSION,
  };
}

export const seedData = buildSeedDatabase();
