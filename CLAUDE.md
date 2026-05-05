# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the app

Both servers must run simultaneously:

```bash
# Backend (port 3001)
cd backend && node server.js
# or with auto-reload:
cd backend && npm run dev

# Frontend (port 3000)
cd frontend && npm run dev -- --port 3000

# Both at once
./start.sh
```

Frontend build check:
```bash
cd frontend && npx vite build
```

Lint frontend:
```bash
cd frontend && npm run lint
```

Build and run with Docker Compose:
```bash
docker compose up --build
```

There are no automated tests. Verify API behaviour with curl against `http://localhost:3001/api`.

## Architecture

### Backend (`backend/`)

Express + SQLite (via the `sqlite` async wrapper over `sqlite3`). A single `database.js` opens the DB on first call and returns a cached handle via `getDb()`. All routes are async and `await getDb()` at the top of each handler — there is no connection pool.

Schema lives entirely in `database.js`. New columns are added with a `try/catch ALTER TABLE` migration block after the `CREATE TABLE IF NOT EXISTS` statements — this is the established pattern for migrations. The DB path is controlled by the `DB_PATH` env var (defaults to `org_structure.db` beside `database.js`); in Docker it is set to `/data/org_structure.db` on a named volume.

Route modules under `routes/` map 1-to-1 with entities:
- `organizations.js` — CRUD only
- `departments.js` — CRUD + `PATCH /:id/position`; the GET query joins to `persons` to return `owner_name`, `owner_title`, `owner_email`, `owner_description` inline
- `persons.js` — CRUD + `PATCH /:id/position` + `/reports` sub-resource for person→person reporting edges
- `relations.js` — CRUD for custom department→department edges

### Frontend (`frontend/src/`)

React 19 + Vite. No state management library — all data lives in `OrgGraph` component state and is reloaded with a single `loadData()` call after any mutation.

**Data flow:** `App` holds the selected org and passes it to `OrgGraph`. `OrgGraph` owns all graph data (departments, persons, relations), calls the API on mount/org-change, and rebuilds nodes + edges from scratch on each reload.

**Graph rendering:** `@xyflow/react` (ReactFlow). `OrgGraph.jsx` contains two pure functions:
- `buildColorMap(departments)` — assigns hex colors so that sibling departments (same `parent_dept_id`) share one color; top-level departments each get a unique color
- `buildNodes/buildEdges` — convert API data to ReactFlow node/edge arrays

Four edge types are visually distinct by colour and dash style: hierarchy (grey solid), dept-relation (orange dashed animated), belongs-to (green dashed), reports-to (pink animated).

**Node types** are custom React components registered in `nodeTypes`:
- `DeptNode` — coloured header + optional description + embedded owner mini-card (avatar, name, title, description, email)
- `PersonNode` — avatar initials + name, title, description, dept, email

**Modals** are rendered conditionally inside `OrgGraph` by a `modal` state object `{ mode, dept?, person? }`. Clicking a node opens an edit modal; toolbar buttons open add modals.

**`SearchableSelect`** (`components/SearchableSelect.jsx`) is a controlled dropdown with live keyword filtering. Used in `RelationModal` for department and person pickers. Accepts `options: [{value, label}]`, `value`, `onChange`, `placeholder`, and optional `emptyLabel` for a "none" option.

**API client** (`src/api/index.js`) exports four objects (`orgApi`, `deptApi`, `personApi`, `relationApi`), each a thin axios wrapper. The base URL comes from `VITE_API_BASE_URL` (set to `http://localhost:3001/api` in `frontend/.env` for local dev; set to `/api` at Docker build time so nginx can proxy it).

Node drag positions are persisted via debounced `PATCH /:id/position` calls (500 ms timer per node, stored in a `useRef` map to avoid stale closures).
