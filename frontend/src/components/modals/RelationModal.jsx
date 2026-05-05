import { useState, useEffect } from 'react';
import SearchableSelect from '../SearchableSelect';

export default function RelationModal({ relation, departments, persons, mode, onSave, onClose }) {
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [label, setLabel] = useState('');
  const [relationType, setRelationType] = useState('custom');

  useEffect(() => {
    if (relation) {
      setFromId(String(relation.from_dept_id || relation.person_id || ''));
      setToId(String(relation.to_dept_id || relation.reports_to_id || ''));
      setLabel(relation.label || '');
      setRelationType(relation.relation_type || 'custom');
    }
  }, [relation]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!fromId || !toId) return;
    if (mode === 'dept-relation') {
      onSave({ from_dept_id: parseInt(fromId), to_dept_id: parseInt(toId), label: label.trim() || null, relation_type: relationType });
    } else {
      onSave({ person_id: parseInt(fromId), reports_to_id: parseInt(toId) });
    }
  };

  const isDept = mode === 'dept-relation';
  const items = isDept ? departments : persons;
  const toItems = items.filter(i => String(i.id) !== fromId);

  const toOptions = toItems.map(i => ({
    value: String(i.id),
    label: isDept ? i.name : `${i.name}${i.title ? ` — ${i.title}` : ''}`,
  }));

  const fromOptions = items.map(i => ({
    value: String(i.id),
    label: isDept ? i.name : `${i.name}${i.title ? ` — ${i.title}` : ''}`,
  }));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>{isDept ? 'Add Department Relation' : 'Add Reporting Relation'}</h3>
        <form onSubmit={handleSubmit}>
          <label>{isDept ? 'From Department' : 'Person'} *</label>
          <SearchableSelect
            options={fromOptions}
            value={fromId}
            onChange={setFromId}
            placeholder={isDept ? 'Select department...' : 'Select person...'}
          />

          <label>{isDept ? 'To Department' : 'Reports To'} *</label>
          <SearchableSelect
            options={toOptions}
            value={toId}
            onChange={setToId}
            placeholder={isDept ? 'Select department...' : 'Select person...'}
          />

          {isDept && (
            <>
              <label>Label</label>
              <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Relation label (optional)" />
              <label>Type</label>
              <select value={relationType} onChange={e => setRelationType(e.target.value)}>
                <option value="custom">Custom</option>
                <option value="collaborates">Collaborates</option>
                <option value="supports">Supports</option>
                <option value="reports_to">Reports to</option>
                <option value="depends_on">Depends on</option>
              </select>
            </>
          )}

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={!fromId || !toId}>
              Add Relation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
