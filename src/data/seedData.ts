import type { Database } from '../types';

/** Default PM intervals per trap type (days). */
export const DEFAULT_TRAP_TYPES: Database["trap_types"] = [
  { type: "Float & Thermostatic", pm_interval_days: 180 },
  { type: "Inverted Bucket", pm_interval_days: 365 },
  { type: "Thermodynamic", pm_interval_days: 120 },
  { type: "Thermostatic", pm_interval_days: 270 },
  { type: "Bimetallic", pm_interval_days: 365 },
];

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
 * Builds the demo dataset. Designed so the dashboard immediately shows a mix
 * of priorities: active issues, overdue PMs, upcoming PMs, never-inspected and
 * healthy traps across several pieces of equipment.
 */
export function buildSeedDatabase(): Database {
  const equipment: Database["equipment"] = [
    { id: "eq-boiler-1", name: "Boiler 1", area: "Utilities" },
    { id: "eq-boiler-2", name: "Boiler 2", area: "Utilities" },
    { id: "eq-deaerator", name: "Deaerator", area: "Utilities" },
    { id: "eq-crude-preheat", name: "Crude Preheat Train", area: "Process — Unit 100" },
    { id: "eq-reboiler-c201", name: "Reboiler C-201", area: "Process — Unit 200" },
    { id: "eq-steam-header", name: "Main Steam Header", area: "Distribution" },
  ];

  const traps: Database["traps"] = [
    { id: "tr-0001", tag: "ST-0001", type: "Inverted Bucket", location: "Boiler 1 — Blowdown line", equipment_id: "eq-boiler-1" },
    { id: "tr-0002", tag: "ST-0002", type: "Thermodynamic", location: "Boiler 1 — Steam drum drip", equipment_id: "eq-boiler-1" },
    { id: "tr-0003", tag: "ST-0003", type: "Float & Thermostatic", location: "Boiler 1 — Economizer drain", equipment_id: "eq-boiler-1" },
    { id: "tr-0004", tag: "ST-0004", type: "Thermodynamic", location: "Boiler 2 — Steam drum drip", equipment_id: "eq-boiler-2" },
    { id: "tr-0005", tag: "ST-0005", type: "Bimetallic", location: "Boiler 2 — Superheater drain", equipment_id: "eq-boiler-2" },
    { id: "tr-0006", tag: "ST-0006", type: "Float & Thermostatic", location: "Deaerator — Vent condenser", equipment_id: "eq-deaerator" },
    { id: "tr-0007", tag: "ST-0007", type: "Thermostatic", location: "Deaerator — Storage tank drip", equipment_id: "eq-deaerator" },
    { id: "tr-0008", tag: "ST-0008", type: "Float & Thermostatic", location: "Crude Preheat — E-101 shell drain", equipment_id: "eq-crude-preheat" },
    { id: "tr-0009", tag: "ST-0009", type: "Inverted Bucket", location: "Crude Preheat — Tracing manifold", equipment_id: "eq-crude-preheat" },
    { id: "tr-0010", tag: "ST-0010", type: "Thermodynamic", location: "Crude Preheat — E-104 drip leg", equipment_id: "eq-crude-preheat" },
    { id: "tr-0011", tag: "ST-0011", type: "Float & Thermostatic", location: "Reboiler C-201 — Shell drain", equipment_id: "eq-reboiler-c201" },
    { id: "tr-0012", tag: "ST-0012", type: "Bimetallic", location: "Reboiler C-201 — Condensate header", equipment_id: "eq-reboiler-c201" },
    { id: "tr-0013", tag: "ST-0013", type: "Thermodynamic", location: "Main Steam Header — Drip leg A", equipment_id: "eq-steam-header" },
    { id: "tr-0014", tag: "ST-0014", type: "Thermodynamic", location: "Main Steam Header — Drip leg B", equipment_id: "eq-steam-header" },
    { id: "tr-0015", tag: "ST-0015", type: "Thermostatic", location: "Main Steam Header — Tracing supply", equipment_id: "eq-steam-header" },
    { id: "tr-0016", tag: "ST-0016", type: "Inverted Bucket", location: "Main Steam Header — Expansion loop drip", equipment_id: "eq-steam-header" },
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

  // ST-0001 Inverted Bucket (365d) — currently an ISSUE (blowing), 3 failures in 36mo → engineering review
  addPM("tr-0001", 900, "Issue", "Blowing", "R. Alvarez", "Live steam blow-through.");
  addPM("tr-0001", 600, "Working", null, "R. Alvarez", "Repaired seat, re-tested OK.");
  addPM("tr-0001", 400, "Issue", "Blowing", "R. Alvarez", "Blowing again after 6 months.");
  addPM("tr-0001", 200, "Working", null, "M. Chen", "Seat lapped, normal discharge.");
  addPM("tr-0001", 30, "Issue", "Blowing", "R. Alvarez", "Continuous live steam blow-through. Tag for repair.");

  // ST-0002 Thermodynamic (120d) — OVERDUE (last PM 200d ago)
  addPM("tr-0002", 200, "Working", null, "M. Chen", "Cycling normally.");

  // ST-0003 Float & Thermostatic (180d) — healthy, recent
  addPM("tr-0003", 20, "Working", null, "M. Chen", "Good condensate discharge.");

  // ST-0004 Thermodynamic (120d) — ISSUE (cycling) recorded recently
  addPM("tr-0004", 300, "Working", null, "S. Patel", "Normal operation.");
  addPM("tr-0004", 12, "Issue", "Cycling", "S. Patel", "Rapid cycling, suspect worn disc.");

  // ST-0005 Bimetallic (365d) — UPCOMING (due in ~10 days)
  addPM("tr-0005", 355, "Working", null, "S. Patel", "Operating correctly.");

  // ST-0006 Float & Thermostatic (180d) — OVERDUE
  addPM("tr-0006", 240, "Working", null, "R. Alvarez", "Discharging well.");

  // ST-0007 Thermostatic (270d) — healthy
  addPM("tr-0007", 40, "Working", null, "J. Okafor", "Normal.");

  // ST-0008 Float & Thermostatic (180d) — ISSUE (leak)
  addPM("tr-0008", 90, "Issue", "Leak", "J. Okafor", "External body leak at gasket.");

  // ST-0009 Inverted Bucket (365d) — never inspected (no records)

  // ST-0010 Thermodynamic (120d) — OVERDUE + previous issue resolved
  addPM("tr-0010", 260, "Issue", "Blocked", "M. Chen", "Plugged, cold downstream.");
  addPM("tr-0010", 150, "Working", null, "M. Chen", "Cleaned and re-tested, discharging.");

  // ST-0011 Float & Thermostatic (180d) — healthy
  addPM("tr-0011", 60, "Working", null, "S. Patel", "Good.");

  // ST-0012 Bimetallic — never inspected

  // ST-0013 Thermodynamic (120d) — UPCOMING (due in ~7 days)
  addPM("tr-0013", 113, "Working", null, "R. Alvarez", "Cycling normally.");

  // ST-0014 Thermodynamic (120d) — ISSUE (blocked)
  addPM("tr-0014", 15, "Issue", "Blocked", "R. Alvarez", "No discharge, downstream cold.");

  // ST-0015 Thermostatic (270d) — healthy
  addPM("tr-0015", 80, "Working", null, "J. Okafor", "Normal discharge.");

  // ST-0016 Inverted Bucket (365d) — never inspected

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
      trap_id: "tr-0010",
      date: daysAgo(150),
      action: "Maintenance",
      technician: "M. Chen",
      description: "Cleared blockage in orifice",
      parts_replaced: "",
      cost: null,
      notes: "Downstream line was cold. Trap cycling normally after cleaning.",
      created_at: ts(150),
    },
  ];

  return {
    equipment,
    traps,
    pm_records,
    maintenance_records,
    trap_types: DEFAULT_TRAP_TYPES.map((t) => ({ ...t })),
  };
}

export const seedData = buildSeedDatabase();
