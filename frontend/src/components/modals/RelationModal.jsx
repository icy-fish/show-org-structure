import { useState, useEffect } from 'react';

export default function RelationModal({ relation, departments, persons, mode, onSave, onClose }) {
  // mode: 'dept-relation' | 'person-report'
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [label, setLabel] = useState('');
  const [relationType, setRelationType] = useState('custom');

  useEffect(() => {
    if (relation) {
      setFromId(relation.from_dept_id || relation.person_id || '');
      setToId(relation.to_dept_id || relation.reports_to_id || '');
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

  const items = mode === 'dept-relation' ? departments : persons;
  const fromLabel = mode === 'dept-relation' ? 'From Department' : 'Person';
  const toLabel = mode === 'dept-relation' ? 'To Department' : 'Reports To';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>{mode === 'dept-relation' ? 'Department Relation' : 'Reporting Relation'}</h3>
        <form onSubmit={handleSubmit}>
          <label>{fromLabel} *</label>
          <select value={fromId} onChange={e => setFromId(e.target.value)} required>
            <option value="">Select...</option>
            {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
          <label>{toLabel} *</label>
          <select value={toId} onChange={e => setToId(e.target.value)} required>
            <option value="">Select...</option>
            {items.filter(i => i.id !== parseInt(fromId)).map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
          {mode === 'dept-relation' && (
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
            <button type="submit" className="btn-primary">Add Relation</button>
          </div>
        </form>
      </div>
    </div>
  );
}
