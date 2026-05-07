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

### Docker (recommended)

Requires Docker with the Compose plugin.

```bash
docker compose up --build
```

Open **http://localhost** in your browser. nginx serves the frontend and proxies all `/api` traffic to the backend container internally, so no hostname configuration is needed — it works the same whether accessed from `localhost`, a LAN IP, or a public domain.

The SQLite database is stored in a named Docker volume (`db-data`) and persists across restarts.

```bash
# Run in background
docker compose up --build -d

# Change the external port (e.g. to avoid conflict with another service on port 80)
HOST_PORT=8080 docker compose up --build -d
# or: copy .env.example → .env and set HOST_PORT=8080

# View logs
docker compose logs -f

# Stop
docker compose down

# Stop and delete database volume
docker compose down -v
```

### Local development

Requires Node.js ≥ 18.

```bash
cd backend && npm install
cd ../frontend && npm install
```

```bash
# Local machine
./start.sh

# Remote host — pass the hostname so the browser finds the backend
./start.sh --host myserver.example.com
./start.sh --host 192.168.1.50

# Custom ports
./start.sh --host myserver.example.com --backend-port 4001 --frontend-port 4000

# Equivalent via environment variables
HOST=myserver.example.com ./start.sh
```

The Vite dev server binds to `0.0.0.0` automatically when a `--host` other than localhost is used, making it reachable from other machines.

Open **http://\<host\>:3000** in your browser.

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
