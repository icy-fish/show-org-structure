import { Handle, Position } from '@xyflow/react';

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
        <div className="dept-owner">
          <span className="owner-label">Owner:</span>
          <span className="owner-name">{dept.owner_name}</span>
          {dept.owner_title && <span className="owner-title">({dept.owner_title})</span>}
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
