import { useEffect, useState } from 'react';
import { useSteamTrap } from '../../store/SteamTrapContext';
import { CONNECTION_TYPES, DEFAULT_TRAP_DATASHEET, ORIENTATIONS, TRAP_TYPES } from '../../types';
import { normalizePmIntervalDays } from '../../utils/logic';
import { Modal } from '../Modal';
import { Field } from '../Field';

interface TrapFormModalProps {
  open: boolean;
  onClose: () => void;
  defaultEquipmentId?: string;
  trapId?: string;
}

export function TrapFormModal({ open, onClose, defaultEquipmentId, trapId }: TrapFormModalProps) {
  const { data, addTrap, updateTrap } = useSteamTrap();
  const editing = trapId ? data.traps.find((t) => t.id === trapId) : undefined;

  const [tag, setTag] = useState('');
  const [type, setType] = useState('');
  const [location, setLocation] = useState('');
  const [equipmentId, setEquipmentId] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [model, setModel] = useState('');
  const [connectionType, setConnectionType] = useState('');
  const [trapSize, setTrapSize] = useState('');
  const [orientation, setOrientation] = useState('');
  const [linePressure, setLinePressure] = useState('');
  const [pmIntervalDays, setPmIntervalDays] = useState(String(DEFAULT_TRAP_DATASHEET.pm_interval_days));
  const [serialNumber, setSerialNumber] = useState('');
  const [installDate, setInstallDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setTag(editing.tag);
      setType(editing.type);
      setLocation(editing.location);
      setEquipmentId(editing.equipment_id);
      setManufacturer(editing.manufacturer);
      setModel(editing.model);
      setConnectionType(editing.connection_type);
      setTrapSize(editing.trap_size);
      setOrientation(editing.orientation);
      setLinePressure(editing.line_pressure);
      setPmIntervalDays(String(normalizePmIntervalDays(editing.pm_interval_days)));
      setSerialNumber(editing.serial_number);
      setInstallDate(editing.install_date ?? '');
    } else {
      setTag('');
      setType('');
      setLocation('');
      setEquipmentId(defaultEquipmentId ?? data.equipment[0]?.id ?? '');
      setManufacturer('');
      setModel('');
      setConnectionType('');
      setTrapSize('');
      setOrientation('');
      setLinePressure('');
      setPmIntervalDays(String(DEFAULT_TRAP_DATASHEET.pm_interval_days));
      setSerialNumber('');
      setInstallDate('');
    }
    setError(null);
  }, [open, defaultEquipmentId, data.equipment, editing]);

  const canSave = tag.trim() !== '' && type.trim() !== '' && equipmentId !== '';

  const handleSave = () => {
    if (!canSave) return;
    const duplicate = data.traps.some(
      (t) => t.tag.toLowerCase() === tag.trim().toLowerCase() && t.id !== trapId,
    );
    if (duplicate) {
      setError(`Tag ${tag} already exists.`);
      return;
    }

    const interval = Number(pmIntervalDays);
    if (!Number.isFinite(interval) || interval < 1) {
      setError('PM frequency must be at least 1 day.');
      return;
    }

    const payload = {
      tag: tag.trim(),
      type: type.trim(),
      location: location.trim() || 'Unspecified',
      equipment_id: equipmentId,
      manufacturer: manufacturer.trim(),
      model: model.trim(),
      connection_type: connectionType.trim(),
      trap_size: trapSize.trim(),
      orientation: orientation.trim(),
      line_pressure: linePressure.trim(),
      pm_interval_days: normalizePmIntervalDays(interval),
      serial_number: serialNumber.trim(),
      install_date: installDate.trim() || null,
    };

    if (trapId) {
      updateTrap(trapId, payload);
    } else {
      addTrap(payload);
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={trapId ? 'Edit trap' : 'Add trap'}
      size="lg"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleSave} disabled={!canSave}>
            {trapId ? 'Save changes' : 'Add trap'}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {error && <p className="text-sm font-medium text-red-600 sm:col-span-2">{error}</p>}
        <Field label="Trap ID" required>
          <input className="input" value={tag} onChange={(e) => setTag(e.target.value)} placeholder="ST-0017" />
        </Field>
        <Field label="Trap type" required>
          <input
            className="input"
            list="trap-type-suggestions"
            value={type}
            onChange={(e) => setType(e.target.value)}
            placeholder="e.g. Bucket, Inverted Bucket"
          />
          <datalist id="trap-type-suggestions">
            {TRAP_TYPES.map((t) => (
              <option key={t} value={t} />
            ))}
            <option value="Bucket" />
          </datalist>
        </Field>
        <Field label="Equipment" required>
          <select className="input" value={equipmentId} onChange={(e) => setEquipmentId(e.target.value)}>
            {data.equipment.map((eq) => (
              <option key={eq.id} value={eq.id}>
                {eq.name} ({eq.area || 'No area'})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Location">
          <input
            className="input"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Boiler 1 — Drip leg"
          />
        </Field>
        <Field label="Orientation">
          <input
            className="input"
            list="orientation-suggestions"
            value={orientation}
            onChange={(e) => setOrientation(e.target.value)}
            placeholder="e.g. Horizontal"
          />
          <datalist id="orientation-suggestions">
            {ORIENTATIONS.map((o) => (
              <option key={o} value={o} />
            ))}
          </datalist>
        </Field>
        <Field label="Line pressure">
          <input
            className="input"
            value={linePressure}
            onChange={(e) => setLinePressure(e.target.value)}
            placeholder="e.g. 150 psig"
          />
        </Field>
        <Field label="PM frequency (days)">
          <input
            type="number"
            min={1}
            max={3650}
            step={1}
            className="input"
            value={pmIntervalDays}
            onChange={(e) => setPmIntervalDays(e.target.value)}
            placeholder="90"
          />
          <p className="mt-1 text-xs text-slate-500">
            Days between PM inspections for this trap. Default is 90 (~3 months).
          </p>
        </Field>
        <Field label="Manufacturer">
          <input
            className="input"
            value={manufacturer}
            onChange={(e) => setManufacturer(e.target.value)}
            placeholder="e.g. Spirax Sarco"
          />
        </Field>
        <Field label="Trap model">
          <input
            className="input"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="e.g. IB-15"
          />
        </Field>
        <Field label="Trap connection">
          <input
            className="input"
            list="connection-suggestions"
            value={connectionType}
            onChange={(e) => setConnectionType(e.target.value)}
            placeholder="e.g. NPT Threaded"
          />
          <datalist id="connection-suggestions">
            {CONNECTION_TYPES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
        <Field label="Size (inch)">
          <input
            className="input"
            value={trapSize}
            onChange={(e) => setTrapSize(e.target.value)}
            placeholder={'e.g. 3/4'}
          />
        </Field>
        <Field label="Serial number">
          <input
            className="input"
            value={serialNumber}
            onChange={(e) => setSerialNumber(e.target.value)}
            placeholder="e.g. SS-2019-4412"
          />
        </Field>
        <Field label="Install date">
          <input
            type="date"
            className="input"
            value={installDate}
            onChange={(e) => setInstallDate(e.target.value)}
          />
        </Field>
      </div>
    </Modal>
  );
}
