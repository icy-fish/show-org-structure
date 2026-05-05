import { Handle, Position } from '@xyflow/react';

function initials(name) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function PersonNode({ data }) {
  const { person } = data;
  return (
    <div className="person-node">
      <Handle type="target" position={Position.Top} />
      <div className="person-avatar">{initials(person.name)}</div>
      <div className="person-info">
        <div className="person-name">{person.name}</div>
        {person.title && <div className="person-title">{person.title}</div>}
        {person.description && <div className="person-desc">{person.description}</div>}
        {person.dept_name && <div className="person-dept">📂 {person.dept_name}</div>}
        {person.email && <div className="person-email">✉ {person.email}</div>}
      </div>
      <Handle type="source" position={Position.Bottom} />
      <Handle type="source" id="left" position={Position.Left} />
      <Handle type="source" id="right" position={Position.Right} />
      <Handle type="target" id="left-in" position={Position.Left} />
      <Handle type="target" id="right-in" position={Position.Right} />
    </div>
  );
}
