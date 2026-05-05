import { useState } from 'react';
import OrgModal from './modals/OrgModal';
import { orgApi } from '../api';

export default function OrgSidebar({ orgs, selectedOrg, onSelect, onOrgsChange }) {
  const [modal, setModal] = useState(null); // null | { mode: 'add' | 'edit', org?: {} }

  const handleSave = async (data) => {
    if (modal.mode === 'add') {
      await orgApi.create(data);
    } else {
      await orgApi.update(modal.org.id, data);
    }
    setModal(null);
    onOrgsChange();
  };

  const handleDelete = async (org, e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${org.name}" and all its data?`)) return;
    await orgApi.delete(org.id);
    onOrgsChange();
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>Organizations</h2>
        <button className="icon-btn" title="Add organization" onClick={() => setModal({ mode: 'add' })}>+</button>
      </div>
      <ul className="org-list">
        {orgs.map(org => (
          <li
            key={org.id}
            className={`org-item ${selectedOrg?.id === org.id ? 'selected' : ''}`}
            onClick={() => onSelect(org)}
          >
            <span className="org-name" title={org.description || org.name}>{org.name}</span>
            <span className="org-actions">
              <button
                className="icon-btn small"
                title="Edit"
                onClick={e => { e.stopPropagation(); setModal({ mode: 'edit', org }); }}
              >✎</button>
              <button
                className="icon-btn small danger"
                title="Delete"
                onClick={e => handleDelete(org, e)}
              >✕</button>
            </span>
          </li>
        ))}
        {orgs.length === 0 && <li className="empty-hint">No organizations yet.<br />Click + to add one.</li>}
      </ul>

      {modal && (
        <OrgModal
          org={modal.org}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </aside>
  );
}
