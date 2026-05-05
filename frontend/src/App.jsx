import { useState, useEffect, useCallback } from 'react';
import OrgSidebar from './components/OrgSidebar';
import OrgGraph from './components/OrgGraph';
import { orgApi } from './api';
import './App.css';

export default function App() {
  const [orgs, setOrgs] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState(null);

  const loadOrgs = useCallback(async () => {
    const data = await orgApi.list();
    setOrgs(data);
    setSelectedOrg(prev => {
      if (!prev) return data[0] || null;
      return data.find(o => o.id === prev.id) || data[0] || null;
    });
  }, []);

  useEffect(() => { loadOrgs(); }, [loadOrgs]);

  return (
    <div className="app-layout">
      <OrgSidebar
        orgs={orgs}
        selectedOrg={selectedOrg}
        onSelect={setSelectedOrg}
        onOrgsChange={loadOrgs}
      />
      <main className="main-panel">
        {selectedOrg && (
          <div className="org-header">
            <h1>{selectedOrg.name}</h1>
            {selectedOrg.description && <p className="org-desc">{selectedOrg.description}</p>}
          </div>
        )}
        <OrgGraph org={selectedOrg} />
      </main>
    </div>
  );
}
