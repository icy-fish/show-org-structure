import { useState, useEffect } from 'react';

export default function DeptModal({ dept, departments, persons, orgId, onSave, onClose, onDelete }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [parentDeptId, setParentDeptId] = useState('');
  const [ownerId, setOwnerId] = useState('');

  useEffect(() => {
    if (dept) {
      setName(dept.name);
      setDescription(dept.description || '');
      setParentDeptId(dept.parent_dept_id || '');
      setOwnerId(dept.owner_id || '');
    }
  }, [dept]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      org_id: orgId,
      name: name.trim(),
      description: description.trim() || null,
      parent_dept_id: parentDeptId || null,
      owner_id: ownerId || null,
    });
  };

  const availableParents = departments.filter(d => !dept || d.id !== dept.id);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>{dept ? 'Edit Department' : 'Add Department'}</h3>
        <form onSubmit={handleSubmit}>
          <label>Name *</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Department name" autoFocus />
          <label>Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (optional)" rows={2} />
          <label>Parent Department</label>
          <select value={parentDeptId} onChange={e => setParentDeptId(e.target.value)}>
            <option value="">None (top-level)</option>
            {availableParents.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <label>Owner (Person)</label>
          <select value={ownerId} onChange={e => setOwnerId(e.target.value)}>
            <option value="">No owner</option>
            {persons.map(p => (
              <option key={p.id} value={p.id}>{p.name}{p.title ? ` — ${p.title}` : ''}</option>
            ))}
          </select>
          <div className="modal-actions">
            {onDelete && <button type="button" onClick={onDelete} className="btn-danger">Delete</button>}
            <span style={{ flex: 1 }} />
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}
