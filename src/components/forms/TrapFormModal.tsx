import { useEffect, useState } from 'react';
import { useSteamTrap } from '../../store/SteamTrapContext';
import { CONNECTION_TYPES, TRAP_TYPES, type TrapTypeName } from '../../types';
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
  const [type, setType] = useState<TrapTypeName>(TRAP_TYPES[0]);
  const [location, setLocation] = useState('');
  const [equipmentId, setEquipmentId] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [model, setModel] = useState('');
  const [connectionType, setConnectionType] = useState('');
  const [trapSize, setTrapSize] = useState('');
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
      setSerialNumber(editing.serial_number);
      setInstallDate(editing.install_date ?? '');
    } else {
      setTag('');
      setType(TRAP_TYPES[0]);
      setLocation('');
      setEquipmentId(defaultEquipmentId ?? data.equipment[0]?.id ?? '');
      setManufacturer('');
      setModel('');
      setConnectionType('');
      setTrapSize('');
      setSerialNumber('');
      setInstallDate('');
    }
    setError(null);
  }, [open, defaultEquipmentId, data.equipment, editing]);

  const canSave = tag.trim() !== '' && equipmentId !== '';

  const handleSave = () => {
    if (!canSave) return;
    const duplicate = data.traps.some(
      (t) => t.tag.toLowerCase() === tag.trim().toLowerCase() && t.id !== trapId,
    );
    if (duplicate) {
      setError(`Tag ${tag} already exists.`);
      return;
    }

    const payload = {
      tag: tag.trim(),
      type,
      location: location.trim() || 'Unspecified',
      equipment_id: equipmentId,
      manufacturer: manufacturer.trim(),
      model: model.trim(),
      connection_type: connectionType.trim(),
      trap_size: trapSize.trim(),
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
        <Field label="Tag" required>
          <input className="input" value={tag} onChange={(e) => setTag(e.target.value)} placeholder="ST-0017" />
        </Field>
        <Field label="Type" required>
          <select className="input" value={type} onChange={(e) => setType(e.target.value as TrapTypeName)}>
            {TRAP_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Equipment" required>
          <select className="input" value={equipmentId} onChange={(e) => setEquipmentId(e.target.value)}>
            {data.equipment.map((eq) => (
              <option key={eq.id} value={eq.id}>
                {eq.name}
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
        <Field label="Manufacturer">
          <input
            className="input"
            value={manufacturer}
            onChange={(e) => setManufacturer(e.target.value)}
            placeholder="e.g. Spirax Sarco"
          />
        </Field>
        <Field label="Model">
          <input
            className="input"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="e.g. IB-15"
          />
        </Field>
        <Field label="Connection type">
          <select
            className="input"
            value={connectionType}
            onChange={(e) => setConnectionType(e.target.value)}
          >
            <option value="">— Select —</option>
            {CONNECTION_TYPES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Trap size">
          <input
            className="input"
            value={trapSize}
            onChange={(e) => setTrapSize(e.target.value)}
            placeholder={'e.g. 3/4"'}
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
