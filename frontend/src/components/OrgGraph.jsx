import { useCallback, useEffect, useState, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  MarkerType,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import DeptNode from './DeptNode';
import PersonNode from './PersonNode';
import DeptModal from './modals/DeptModal';
import PersonModal from './modals/PersonModal';
import RelationModal from './modals/RelationModal';
import { deptApi, personApi, relationApi } from '../api';

const nodeTypes = { department: DeptNode, person: PersonNode };

const DEPT_COLORS = ['#4f8ef7', '#6c63ff', '#2cb67d', '#f7a440', '#e05c7e', '#00b4d8'];

function buildNodes(departments, persons) {
  const deptNodes = departments.map((d, i) => ({
    id: `dept-${d.id}`,
    type: 'department',
    position: { x: d.pos_x || (i % 4) * 260 + 80, y: d.pos_y || Math.floor(i / 4) * 180 + 80 },
    data: {
      dept: d,
      color: DEPT_COLORS[i % DEPT_COLORS.length],
    },
  }));

  const personNodes = persons.map((p, i) => ({
    id: `person-${p.id}`,
    type: 'person',
    position: { x: p.pos_x || (i % 5) * 200 + 80, y: p.pos_y || Math.floor(i / 5) * 140 + 500 },
    data: { person: p },
  }));

  return [...deptNodes, ...personNodes];
}

function buildEdges(departments, persons, relations) {
  const edges = [];

  // Department hierarchy (parent -> child)
  departments.forEach(d => {
    if (d.parent_dept_id) {
      edges.push({
        id: `hierarchy-${d.parent_dept_id}-${d.id}`,
        source: `dept-${d.parent_dept_id}`,
        target: `dept-${d.id}`,
        type: 'smoothstep',
        animated: false,
        label: 'parent',
        style: { stroke: '#888', strokeWidth: 2 },
        labelStyle: { fontSize: 10, fill: '#666' },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#888' },
        data: { edgeType: 'hierarchy' },
      });
    }
  });

  // Custom department relations
  relations.forEach(r => {
    edges.push({
      id: `rel-${r.id}`,
      source: `dept-${r.from_dept_id}`,
      target: `dept-${r.to_dept_id}`,
      type: 'smoothstep',
      animated: true,
      label: r.label || r.relation_type,
      style: { stroke: '#f7a440', strokeWidth: 2, strokeDasharray: '6 3' },
      labelStyle: { fontSize: 10, fill: '#b86e00', fontWeight: 600 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#f7a440' },
      data: { edgeType: 'dept-relation', relationId: r.id },
    });
  });

  // Person belongs to department
  persons.forEach(p => {
    if (p.dept_id) {
      edges.push({
        id: `belongs-${p.id}`,
        source: `dept-${p.dept_id}`,
        target: `person-${p.id}`,
        type: 'straight',
        style: { stroke: '#2cb67d', strokeWidth: 1.5, strokeDasharray: '4 4' },
        markerEnd: { type: MarkerType.Arrow, color: '#2cb67d' },
        data: { edgeType: 'belongs' },
      });
    }
  });

  // Person reports-to person
  persons.forEach(p => {
    (p.reports_to || []).forEach(rt => {
      edges.push({
        id: `report-${p.id}-${rt.id}-${rt.rel_id}`,
        source: `person-${p.id}`,
        target: `person-${rt.id}`,
        type: 'smoothstep',
        animated: true,
        label: 'reports to',
        style: { stroke: '#e05c7e', strokeWidth: 1.5 },
        labelStyle: { fontSize: 10, fill: '#9c2747' },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#e05c7e' },
        data: { edgeType: 'report', relId: rt.rel_id },
      });
    });
  });

  return edges;
}

export default function OrgGraph({ org, onRefresh }) {
  const [departments, setDepartments] = useState([]);
  const [persons, setPersons] = useState([]);
  const [relations, setRelations] = useState([]);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [modal, setModal] = useState(null);
  const posUpdateTimer = useRef({});

  const loadData = useCallback(async () => {
    if (!org) return;
    const [depts, ps, rels] = await Promise.all([
      deptApi.listByOrg(org.id),
      personApi.listByOrg(org.id),
      relationApi.listByOrg(org.id),
    ]);
    setDepartments(depts);
    setPersons(ps);
    setRelations(rels);
    setNodes(buildNodes(depts, ps));
    setEdges(buildEdges(depts, ps, rels));
  }, [org]);

  useEffect(() => { loadData(); }, [loadData]);

  const onNodeDragStop = useCallback((_, node) => {
    const { x, y } = node.position;
    const id = node.id;
    clearTimeout(posUpdateTimer.current[id]);
    posUpdateTimer.current[id] = setTimeout(() => {
      if (node.type === 'department') {
        const deptId = parseInt(id.replace('dept-', ''));
        deptApi.updatePosition(deptId, x, y);
      } else {
        const personId = parseInt(id.replace('person-', ''));
        personApi.updatePosition(personId, x, y);
      }
    }, 500);
  }, []);

  const onEdgeClick = useCallback((_, edge) => {
    if (edge.data?.edgeType === 'dept-relation') {
      if (window.confirm(`Delete relation "${edge.label}"?`)) {
        relationApi.delete(edge.data.relationId).then(loadData);
      }
    } else if (edge.data?.edgeType === 'report') {
      if (window.confirm('Remove this reporting relation?')) {
        personApi.deleteReport(edge.data.relId).then(loadData);
      }
    }
  }, [loadData]);

  const onNodeClick = useCallback((_, node) => {
    if (node.type === 'department') {
      const dept = departments.find(d => d.id === parseInt(node.id.replace('dept-', '')));
      setModal({ mode: 'edit-dept', dept });
    } else {
      const person = persons.find(p => p.id === parseInt(node.id.replace('person-', '')));
      setModal({ mode: 'edit-person', person });
    }
  }, [departments, persons]);

  const handleSaveDept = async (data) => {
    if (modal.dept) {
      await deptApi.update(modal.dept.id, { ...data, pos_x: modal.dept.pos_x, pos_y: modal.dept.pos_y });
    } else {
      await deptApi.create(data);
    }
    setModal(null);
    loadData();
  };

  const handleDeleteDept = async (deptId) => {
    if (!window.confirm('Delete this department?')) return;
    await deptApi.delete(deptId);
    setModal(null);
    loadData();
  };

  const handleSavePerson = async (data) => {
    if (modal.person) {
      await personApi.update(modal.person.id, { ...data, pos_x: modal.person.pos_x, pos_y: modal.person.pos_y });
    } else {
      await personApi.create(data);
    }
    setModal(null);
    loadData();
  };

  const handleDeletePerson = async (personId) => {
    if (!window.confirm('Delete this person?')) return;
    await personApi.delete(personId);
    setModal(null);
    loadData();
  };

  const handleSaveRelation = async (data) => {
    if (modal.mode === 'add-dept-relation') {
      await relationApi.create(data);
    } else {
      await personApi.addReport(data.person_id, data.reports_to_id);
    }
    setModal(null);
    loadData();
  };

  if (!org) return (
    <div className="graph-empty">
      <p>Select an organization from the left panel to view its structure.</p>
    </div>
  );

  return (
    <div className="graph-container">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        onEdgeClick={onEdgeClick}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
      >
        <Background color="#e5e7eb" gap={20} />
        <Controls />
        <MiniMap nodeColor={n => n.type === 'department' ? '#4f8ef7' : '#2cb67d'} />
        <Panel position="top-right">
          <div className="graph-toolbar">
            <button className="btn-primary small" onClick={() => setModal({ mode: 'add-dept' })}>+ Department</button>
            <button className="btn-success small" onClick={() => setModal({ mode: 'add-person' })}>+ Person</button>
            <button className="btn-warning small" onClick={() => setModal({ mode: 'add-dept-relation' })}>+ Dept Relation</button>
            <button className="btn-danger-outline small" onClick={() => setModal({ mode: 'add-person-report' })}>+ Report Relation</button>
          </div>
        </Panel>
      </ReactFlow>

      {/* Legend */}
      <div className="graph-legend">
        <span className="legend-item"><span className="legend-line hierarchy"></span> Hierarchy</span>
        <span className="legend-item"><span className="legend-line dept-rel"></span> Dept Relation</span>
        <span className="legend-item"><span className="legend-line belongs"></span> Belongs To</span>
        <span className="legend-item"><span className="legend-line reports"></span> Reports To</span>
      </div>

      {modal?.mode === 'add-dept' && (
        <DeptModal
          departments={departments}
          persons={persons}
          orgId={org.id}
          onSave={handleSaveDept}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.mode === 'edit-dept' && (
        <DeptModal
          dept={modal.dept}
          departments={departments}
          persons={persons}
          orgId={org.id}
          onSave={handleSaveDept}
          onClose={() => setModal(null)}
          onDelete={() => handleDeleteDept(modal.dept.id)}
        />
      )}
      {modal?.mode === 'add-person' && (
        <PersonModal
          departments={departments}
          orgId={org.id}
          onSave={handleSavePerson}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.mode === 'edit-person' && (
        <PersonModal
          person={modal.person}
          departments={departments}
          orgId={org.id}
          onSave={handleSavePerson}
          onClose={() => setModal(null)}
          onDelete={() => handleDeletePerson(modal.person.id)}
        />
      )}
      {modal?.mode === 'add-dept-relation' && (
        <RelationModal
          departments={departments}
          persons={persons}
          mode="dept-relation"
          onSave={handleSaveRelation}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.mode === 'add-person-report' && (
        <RelationModal
          departments={departments}
          persons={persons}
          mode="person-report"
          onSave={handleSaveRelation}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
