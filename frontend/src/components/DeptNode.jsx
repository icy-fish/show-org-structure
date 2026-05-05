import { Handle, Position } from '@xyflow/react';

function initials(name) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function DeptNode({ data }) {
  const { dept, color } = data;
  return (
    <div className="dept-node" style={{ borderColor: color }}>
      <Handle type="target" position={Position.Top} />

      <div className="dept-node-header" style={{ background: color }}>
        <span className="dept-icon">🏢</span>
        <span className="dept-name">{dept.name}</span>
      </div>

      {dept.description && (
        <div className="dept-desc">{dept.description}</div>
      )}

      {dept.owner_name && (
        <div className="dept-owner-card">
          <div className="dept-owner-label">Owner</div>
          <div className="dept-owner-body">
            <div className="dept-owner-avatar" style={{ background: color }}>
              {initials(dept.owner_name)}
            </div>
            <div className="dept-owner-details">
              <div className="dept-owner-name">{dept.owner_name}</div>
              {dept.owner_title && <div className="dept-owner-title">{dept.owner_title}</div>}
              {dept.owner_description && (
                <div className="dept-owner-desc">{dept.owner_description}</div>
              )}
              {dept.owner_email && (
                <div className="dept-owner-email">✉ {dept.owner_email}</div>
              )}
            </div>
          </div>
        </div>
      )}

      <Handle type="source" position={Position.Bottom} />
      <Handle type="source" id="left" position={Position.Left} />
      <Handle type="source" id="right" position={Position.Right} />
      <Handle type="target" id="left-in" position={Position.Left} />
      <Handle type="target" id="right-in" position={Position.Right} />
    </div>
  );
}
