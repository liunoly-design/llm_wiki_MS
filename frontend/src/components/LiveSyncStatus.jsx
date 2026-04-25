import React, { useState, useEffect } from 'react';
import { fetchApi } from '../utils/api';

export default function LiveSyncStatus() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const res = await fetchApi('/livesync/status');
      setStatus(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleLog = async () => {
    if (!status) return;
    setToggling(true);
    try {
      const newState = !status.write_log_enabled;
      await fetchApi(`/livesync/toggle-log?enable=${newState}`, { method: 'POST' });
      await loadStatus();
    } catch (e) {
      console.error(e);
      alert('Failed to toggle setting');
    } finally {
      setToggling(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!status) return <div>Failed to load LiveSync status.</div>;

  return (
    <div className="animate-fade-in">
      <h2>LiveSync Status</h2>
      
      <div className="card glass">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3>Plugin Configured: {status.configured ? '✅' : '❌'}</h3>
            <p>Log writing to file: <strong>{status.write_log_enabled ? 'Enabled' : 'Disabled'}</strong></p>
          </div>
          <button 
            className={`btn ${status.write_log_enabled ? 'btn-danger' : 'btn-success'}`}
            onClick={toggleLog}
            disabled={toggling || !status.configured}
          >
            {status.write_log_enabled ? 'Disable Logging' : 'Enable Logging'}
          </button>
        </div>

        <h3>Recent Logs (livesync.log)</h3>
        <div className="terminal">
          {status.log_content}
        </div>
      </div>
    </div>
  );
}
