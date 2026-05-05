# Org Structure Viewer

A web application for managing and visualising the structure of organisations — departments, people, and the relationships between them.

## Features

- **Organizations** — maintain multiple organisations; switch between them from the sidebar
- **Departments** — hierarchical structure with parent/child relationships; sibling departments share a background colour for quick visual grouping
- **Persons** — each person has a name, title, email, description, and an optional department assignment
- **Department owners** — a department can have one owner; the owner's full info is embedded directly inside the department card
- **Reporting relations** — a person can report to multiple people; shown as directed edges in the graph
- **Custom department relations** — arbitrary labelled edges between departments (e.g. "Collaborates", "Depends on")
- **Interactive graph** — drag nodes to rearrange; positions are persisted automatically
- **Searchable selects** — all person/department pickers include live keyword filtering

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, @xyflow/react (ReactFlow), Axios |
| Backend | Node.js, Express |
| Database | SQLite (`sqlite3` + `sqlite` async wrapper) |

## Getting started

### Prerequisites

- Node.js ≥ 18

### Install dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### Run

```bash
# Start both servers together
./start.sh

# Or separately:
cd backend && node server.js        # API on http://localhost:3001
cd frontend && npm run dev -- --port 3000   # UI on http://localhost:3000
```

Open **http://localhost:3000** in your browser.

The SQLite database file (`backend/org_structure.db`) is created automatically on first run.

## API overview

All endpoints are under `http://localhost:3001/api`.

| Resource | Endpoints |
|---|---|
| Organizations | `GET/POST /organizations`, `PUT/DELETE /organizations/:id` |
| Departments | `GET /departments/org/:orgId`, `POST /departments`, `PUT/DELETE /departments/:id`, `PATCH /departments/:id/position` |
| Persons | `GET /persons/org/:orgId`, `POST /persons`, `PUT/DELETE /persons/:id`, `PATCH /persons/:id/position`, `POST /persons/reports`, `DELETE /persons/reports/:id` |
| Dept relations | `GET /relations/org/:orgId`, `POST /relations`, `PUT/DELETE /relations/:id` |

## Data model

```
Organization
  └── Department (parent_dept_id → Department, owner_id → Person)
        └── Department (nested, any depth)
  └── Person (dept_id → Department)
        └── person_reports (person_id → reports_to_id, many-to-many self-join)

department_relations (from_dept_id → to_dept_id, with label and type)
```

## Graph visualisation

Nodes and edges in the graph:

| Element | Meaning | Style |
|---|---|---|
| Blue/coloured box | Department | Solid border, coloured header |
| Green rounded box | Person | Avatar initials, dept badge |
| Grey solid arrow | Department hierarchy (parent → child) | Solid |
| Orange dashed arrow | Custom department relation | Animated dashes |
| Green dashed arrow | Person belongs to department | Dashed |
| Pink animated arrow | Person reports to person | Animated |

Click any node to edit or delete it. Click a relation edge to delete it. Use the toolbar (top-right) to add new entities and relations.
