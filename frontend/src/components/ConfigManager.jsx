import React, { useState, useEffect } from 'react';
import { fetchApi } from '../utils/api';

export default function ConfigManager() {
  const [scripts, setScripts] = useState([]);
  const [cronJobs, setCronJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // New Job Form
  const [newCmd, setNewCmd] = useState('');
  const [newCron, setNewCron] = useState('');

  // Settings
  const [apiKey, setApiKey] = useState('');
  const [modelName, setModelName] = useState('');
  const [settingsLoading, setSettingsLoading] = useState(false);

  useEffect(() => {
    loadData();
    loadSettings();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const scriptRes = await fetchApi('/scripts/discover');
      setScripts(scriptRes.scripts);
      const cronRes = await fetchApi('/scripts/cron');
      setCronJobs(cronRes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const res = await fetchApi('/config/settings');
      setApiKey(res.MY_API_KEY || '');
      setModelName(res.MODEL_NAME || '');
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveSettings = async () => {
    setSettingsLoading(true);
    try {
      await fetchApi('/config/settings', {
        method: 'POST',
        body: JSON.stringify({
          settings: [
            { key: 'MY_API_KEY', value: apiKey },
            { key: 'MODEL_NAME', value: modelName }
          ]
        })
      });
      alert('Settings saved successfully!');
    } catch (e) {
      alert('Failed to save settings');
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleAddJob = async () => {
    if (!newCmd || !newCron) return;
    try {
      await fetchApi('/scripts/cron', {
        method: 'POST',
        body: JSON.stringify({ command: newCmd, cron_expression: newCron })
      });
      setNewCmd('');
      setNewCron('');
      await loadData();
    } catch (e) {
      alert('Failed to add cron job');
    }
  };

  const handleDeleteJob = async (id) => {
    try {
      await fetchApi(`/scripts/cron/${id}`, { method: 'DELETE' });
      await loadData();
    } catch (e) {
      alert('Failed to delete cron job');
    }
  };

  return (
    <div className="animate-fade-in">
      <h2>Configuration Management</h2>

      <div className="card glass">
        <h3>LLM Execution Settings</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>
          Configure the API Key and Model used by background scripts (like Cognitive Ingestor and Deep Query Router).
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '500px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', color: 'var(--text-muted)' }}>Gemini API Key</label>
            <input 
              type="password" 
              value={apiKey} 
              onChange={e => setApiKey(e.target.value)} 
              placeholder="AIzaSy..." 
              style={{ width: '100%', marginBottom: 0 }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', color: 'var(--text-muted)' }}>Model Name</label>
            <input 
              type="text" 
              value={modelName} 
              onChange={e => setModelName(e.target.value)} 
              placeholder="gemini-flash-latest" 
              style={{ width: '100%', marginBottom: 0 }}
            />
          </div>
          <button 
            className="btn btn-primary" 
            onClick={handleSaveSettings}
            disabled={settingsLoading}
            style={{ alignSelf: 'flex-start' }}
          >
            {settingsLoading ? 'Saving...' : 'Save LLM Settings'}
          </button>
        </div>
      </div>
      
      <div className="card glass">
        <h3>Scheduled Tasks (Cron Jobs)</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>
          Schedule scripts to run automatically using standard cron syntax (e.g., 0 * * * *).
        </p>
        
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', marginBottom: '24px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '8px' }}>Command</th>
              <th style={{ padding: '8px' }}>Schedule</th>
              <th style={{ padding: '8px' }}>Status</th>
              <th style={{ padding: '8px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {cronJobs.map(job => (
              <tr key={job.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '8px', fontFamily: 'monospace' }}>{job.command}</td>
                <td style={{ padding: '8px' }}>{job.cron_expression}</td>
                <td style={{ padding: '8px' }}>{job.enabled ? '🟢 Enabled' : '🔴 Disabled'}</td>
                <td style={{ padding: '8px' }}>
                  <button className="btn btn-danger" style={{ padding: '4px 8px' }} onClick={() => handleDeleteJob(job.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {cronJobs.length === 0 && (
              <tr><td colSpan="4" style={{ padding: '16px', textAlign: 'center' }}>No jobs configured.</td></tr>
            )}
          </tbody>
        </table>

        <h4>Add New Job</h4>
        <div style={{ display: 'flex', gap: '8px' }}>
          <select value={newCmd} onChange={e => setNewCmd(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-dark)', color: 'var(--text-main)', flex: 2 }}>
            <option value="">Select discovered script...</option>
            {scripts.map(s => <option key={s.path} value={s.path}>{s.name}</option>)}
          </select>
          <input 
            type="text" 
            placeholder="Cron (e.g. 0 * * * *)" 
            value={newCron} 
            onChange={e => setNewCron(e.target.value)} 
            style={{ marginBottom: 0, flex: 1 }}
          />
          <button className="btn btn-success" onClick={handleAddJob} disabled={!newCmd || !newCron}>Add</button>
        </div>
      </div>

      <div className="card glass">
        <h3>Discovered Python Scripts</h3>
        <ul style={{ paddingLeft: '20px', fontFamily: 'monospace', color: 'var(--accent)' }}>
          {scripts.map(s => (
            <li key={s.path} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <strong>{s.name}</strong> <br/>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{s.description}</span> <br/>
              <span style={{ color: '#8b5cf6', fontSize: '0.8rem' }}>{s.path}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
