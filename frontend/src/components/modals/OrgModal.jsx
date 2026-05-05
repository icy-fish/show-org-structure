import { useState, useEffect } from 'react';

export default function OrgModal({ org, onSave, onClose }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (org) { setName(org.name); setDescription(org.description || ''); }
  }, [org]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim(), description: description.trim() });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>{org ? 'Edit Organization' : 'Add Organization'}</h3>
        <form onSubmit={handleSubmit}>
          <label>Name *</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Organization name" autoFocus />
          <label>Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (optional)" rows={3} />
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}
