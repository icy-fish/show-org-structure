import { useState, useEffect } from 'react';

export default function PersonModal({ person, departments, orgId, onSave, onClose, onDelete }) {
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [email, setEmail] = useState('');
  const [deptId, setDeptId] = useState('');

  useEffect(() => {
    if (person) {
      setName(person.name);
      setTitle(person.title || '');
      setEmail(person.email || '');
      setDeptId(person.dept_id || '');
    }
  }, [person]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      org_id: orgId,
      name: name.trim(),
      title: title.trim() || null,
      email: email.trim() || null,
      dept_id: deptId || null,
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>{person ? 'Edit Person' : 'Add Person'}</h3>
        <form onSubmit={handleSubmit}>
          <label>Name *</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Person name" autoFocus />
          <label>Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Job title (optional)" />
          <label>Email</label>
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email (optional)" type="email" />
          <label>Department</label>
          <select value={deptId} onChange={e => setDeptId(e.target.value)}>
            <option value="">No department</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
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
