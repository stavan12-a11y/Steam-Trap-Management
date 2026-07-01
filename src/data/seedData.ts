import type { Database } from '../types';

export const DATA_VERSION = 3;

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
    // Boiler 1
    { id: "tr-0001", tag: "ST-0001", type: "Inverted Bucket", location: "Boiler 1 — Blowdown line", equipment_id: "eq-boiler-1" },
    { id: "tr-0002", tag: "ST-0002", type: "Thermodynamic", location: "Boiler 1 — Steam drum drip", equipment_id: "eq-boiler-1" },
    { id: "tr-0003", tag: "ST-0003", type: "Float & Thermostatic", location: "Boiler 1 — Economizer drain", equipment_id: "eq-boiler-1" },
    { id: "tr-0004", tag: "ST-0004", type: "Thermodynamic", location: "Boiler 1 — Feedwater preheat drip", equipment_id: "eq-boiler-1" },
    // Boiler 2
    { id: "tr-0005", tag: "ST-0005", type: "Thermodynamic", location: "Boiler 2 — Steam drum drip", equipment_id: "eq-boiler-2" },
    { id: "tr-0006", tag: "ST-0006", type: "Bimetallic", location: "Boiler 2 — Superheater drain", equipment_id: "eq-boiler-2" },
    { id: "tr-0007", tag: "ST-0007", type: "Inverted Bucket", location: "Boiler 2 — Attemperator drain", equipment_id: "eq-boiler-2" },
    { id: "tr-0008", tag: "ST-0008", type: "Float & Thermostatic", location: "Boiler 2 — Sample cooler drain", equipment_id: "eq-boiler-2" },
    // Deaerator
    { id: "tr-0009", tag: "ST-0009", type: "Float & Thermostatic", location: "Deaerator — Vent condenser", equipment_id: "eq-deaerator" },
    { id: "tr-0010", tag: "ST-0010", type: "Thermostatic", location: "Deaerator — Storage tank drip", equipment_id: "eq-deaerator" },
    { id: "tr-0011", tag: "ST-0011", type: "Thermodynamic", location: "Deaerator — Pegging steam line", equipment_id: "eq-deaerator" },
    // Turbine Building
    { id: "tr-0012", tag: "ST-0012", type: "Thermodynamic", location: "Turbine — Extraction line drip", equipment_id: "eq-turbine" },
    { id: "tr-0013", tag: "ST-0013", type: "Inverted Bucket", location: "Turbine — Gland seal condenser", equipment_id: "eq-turbine" },
    { id: "tr-0014", tag: "ST-0014", type: "Float & Thermostatic", location: "Turbine — Lube oil heater drain", equipment_id: "eq-turbine" },
    { id: "tr-0015", tag: "ST-0015", type: "Bimetallic", location: "Turbine — Casing drain pot", equipment_id: "eq-turbine" },
    // Crude Preheat
    { id: "tr-0016", tag: "ST-0016", type: "Float & Thermostatic", location: "Crude Preheat — E-101 shell drain", equipment_id: "eq-crude-preheat" },
    { id: "tr-0017", tag: "ST-0017", type: "Inverted Bucket", location: "Crude Preheat — Tracing manifold", equipment_id: "eq-crude-preheat" },
    { id: "tr-0018", tag: "ST-0018", type: "Thermodynamic", location: "Crude Preheat — E-104 drip leg", equipment_id: "eq-crude-preheat" },
    { id: "tr-0019", tag: "ST-0019", type: "Thermostatic", location: "Crude Preheat — E-102 channel drain", equipment_id: "eq-crude-preheat" },
    { id: "tr-0020", tag: "ST-0020", type: "Thermodynamic", location: "Crude Preheat — Pump seal drip", equipment_id: "eq-crude-preheat" },
    // Reboiler C-201
    { id: "tr-0021", tag: "ST-0021", type: "Float & Thermostatic", location: "Reboiler C-201 — Shell drain", equipment_id: "eq-reboiler-c201" },
    { id: "tr-0022", tag: "ST-0022", type: "Bimetallic", location: "Reboiler C-201 — Condensate header", equipment_id: "eq-reboiler-c201" },
    { id: "tr-0023", tag: "ST-0023", type: "Thermodynamic", location: "Reboiler C-201 — Column reflux drip", equipment_id: "eq-reboiler-c201" },
    { id: "tr-0024", tag: "ST-0024", type: "Inverted Bucket", location: "Reboiler C-201 — Steam inlet drip", equipment_id: "eq-reboiler-c201" },
    // Separator V-301
    { id: "tr-0025", tag: "ST-0025", type: "Inverted Bucket", location: "Separator V-301 — Boot drain", equipment_id: "eq-separator-301" },
    { id: "tr-0026", tag: "ST-0026", type: "Float & Thermostatic", location: "Separator V-301 — Flash drum drip", equipment_id: "eq-separator-301" },
    { id: "tr-0027", tag: "ST-0027", type: "Thermodynamic", location: "Separator V-301 — Tracing supply", equipment_id: "eq-separator-301" },
    { id: "tr-0028", tag: "ST-0028", type: "Thermostatic", location: "Separator V-301 — Level bridle drain", equipment_id: "eq-separator-301" },
    { id: "tr-0029", tag: "ST-0029", type: "Bimetallic", location: "Separator V-301 — Offgas condenser", equipment_id: "eq-separator-301" },
    // Main Steam Header
    { id: "tr-0030", tag: "ST-0030", type: "Thermodynamic", location: "Main Steam Header — Drip leg A", equipment_id: "eq-steam-header" },
    { id: "tr-0031", tag: "ST-0031", type: "Thermodynamic", location: "Main Steam Header — Drip leg B", equipment_id: "eq-steam-header" },
    { id: "tr-0032", tag: "ST-0032", type: "Thermostatic", location: "Main Steam Header — Tracing supply", equipment_id: "eq-steam-header" },
    { id: "tr-0033", tag: "ST-0033", type: "Inverted Bucket", location: "Main Steam Header — Expansion loop drip", equipment_id: "eq-steam-header" },
    { id: "tr-0034", tag: "ST-0034", type: "Float & Thermostatic", location: "Main Steam Header — PRV station drain", equipment_id: "eq-steam-header" },
    // Campus Heating Loop
    { id: "tr-0035", tag: "ST-0035", type: "Thermodynamic", location: "Campus Heat — Main riser drip", equipment_id: "eq-campus-heat" },
    { id: "tr-0036", tag: "ST-0036", type: "Thermostatic", location: "Campus Heat — Building A supply", equipment_id: "eq-campus-heat" },
    { id: "tr-0037", tag: "ST-0037", type: "Float & Thermostatic", location: "Campus Heat — Building B return", equipment_id: "eq-campus-heat" },
    { id: "tr-0038", tag: "ST-0038", type: "Bimetallic", location: "Campus Heat — Tunnel drain pot", equipment_id: "eq-campus-heat" },
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

  // ── UPCOMING PM (due within 14 days) ──────────────────────────────────────
  addPM("tr-0007", 352, "Working", null, "S. Patel", "Operating correctly.");
  addPM("tr-0015", 355, "Working", null, "J. Okafor", "Normal discharge.");

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

  return {
    equipment,
    traps,
    pm_records,
    maintenance_records,
    trap_types: DEFAULT_TRAP_TYPES.map((t) => ({ ...t })),
    data_version: DATA_VERSION,
  };
}

export const seedData = buildSeedDatabase();
