import React, { useState, useEffect } from 'react';
import { fetchApi } from '../utils/api';
import { useLang } from '../context/LangContext.jsx';

export default function GitManager() {
  const { t } = useLang();
  const tg = t.git;
  const [status, setStatus] = useState('');
  const [commits, setCommits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commitMsg, setCommitMsg] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadGitData();
  }, []);

  const loadGitData = async () => {
    setLoading(true);
    try {
      const statusRes = await fetchApi('/git/status');
      setStatus(statusRes.status_output);
      const logRes = await fetchApi('/git/log');
      setCommits(logRes.commits);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const doCommit = async () => {
    if (!commitMsg) return;
    setActionLoading(true);
    try {
      await fetchApi(`/git/commit?message=${encodeURIComponent(commitMsg)}`, { method: 'POST' });
      setCommitMsg('');
      await loadGitData();
    } catch (e) {
      console.error(e);
      alert('Commit failed');
    } finally {
      setActionLoading(false);
    }
  };

  const doRevert = async (hash) => {
    const confirmed = window.confirm(tg.revertConfirm(hash));
    if (!confirmed) return;
    setActionLoading(true);
    try {
      await fetchApi(`/git/revert?commit_hash=${encodeURIComponent(hash)}`, { method: 'POST' });
      await loadGitData();
      alert(tg.revertSuccess(hash));
    } catch (e) {
      console.error(e);
      alert(tg.revertFail);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <h2>{tg.title}</h2>
      
      <div className="card glass">
        <h3>{tg.currentStatus}</h3>
        {loading ? <p>{tg.loading}</p> : <div className="terminal" style={{ minHeight: 'auto', maxHeight: '200px' }}>{status}</div>}
        
        <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
          <input 
            type="text" 
            placeholder={tg.commitPlaceholder} 
            value={commitMsg}
            onChange={(e) => setCommitMsg(e.target.value)}
            style={{ marginBottom: 0, flex: 1 }}
          />
          <button 
            className="btn btn-success" 
            onClick={doCommit} 
            disabled={actionLoading || !commitMsg}
          >
            {tg.commitAll}
          </button>
        </div>
      </div>

      <div className="card glass">
        <h3>{tg.historyTitle}</h3>
        {loading ? <p>Loading...</p> : (
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '12px' }}>{tg.hash}</th>
                <th style={{ padding: '12px' }}>{tg.message}</th>
                <th style={{ padding: '12px' }}>{tg.author}</th>
                <th style={{ padding: '12px' }}>{tg.datetime}</th>
                <th style={{ padding: '12px' }}>{tg.action}</th>
              </tr>
            </thead>
            <tbody>
              {commits.map((c, i) => (
                <tr key={c.hash} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px', fontFamily: 'monospace', color: 'var(--accent)' }}>{c.hash.substring(0,7)}</td>
                  <td style={{ padding: '12px' }}>
                    {i === 0 && <span style={{ background: 'var(--success)', color: '#000', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8rem', marginRight: '8px', fontWeight: 'bold' }}>HEAD</span>}
                    {c.message}
                  </td>
                  <td style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{c.author}</td>
                  <td style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '0.9rem', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{c.date}</td>
                  <td style={{ padding: '12px' }}>
                    <button 
                      className="btn btn-danger" 
                      style={{ padding: '6px 12px', fontSize: '0.85rem' }} 
                      onClick={() => doRevert(c.hash)}
                      disabled={actionLoading}
                    >
                      {tg.revertBtn}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
