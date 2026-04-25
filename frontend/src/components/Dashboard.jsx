import React, { useState, useEffect } from 'react';
import { fetchApi } from '../utils/api';
import { useLang } from '../context/LangContext.jsx';

export default function Dashboard({ navigateToScript }) {
  const { t } = useLang();
  const td = t.dashboard;
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      const data = await fetchApi('/wiki/health');
      setStats(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStats();
    const interval = setInterval(() => loadStats(false), 10000);
    return () => clearInterval(interval);
  }, []);

    if (loading && !stats) return <div className="animate-fade-in" style={{ padding: '24px' }}>{td.loading}</div>;
  if (!stats) return <div className="animate-fade-in" style={{ padding: '24px', color: 'var(--danger)' }}>{td.error}</div>;

  const intakeColor = stats.intake_count === 0 ? 'var(--success)' : (stats.intake_count > 10 ? 'var(--danger)' : 'var(--warning)');
  const orphanColor = stats.orphan_count === 0 ? 'var(--success)' : 'var(--warning)';
  const contradictColor = stats.contradiction_count === 0 ? 'var(--success)' : 'var(--danger)';
  const yamlColor = stats.broken_yaml_count === 0 ? 'var(--success)' : 'var(--warning)';
  const strayColor = stats.stray_count === 0 ? 'var(--success)' : 'var(--danger)';
  
  const graphIssues = stats.orphan_count + stats.contradiction_count + stats.broken_yaml_count;
  const graphColor = graphIssues === 0 ? 'var(--success)' : 'var(--danger)';

  // Node styles
  const nodeStyle = (color) => ({
    padding: '16px 24px',
    borderRadius: '12px',
    border: `2px solid ${color}`,
    background: 'rgba(0,0,0,0.3)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minWidth: '200px',
    position: 'relative',
    boxShadow: `0 0 15px ${color}33`
  });

  const badgeStyle = (color) => ({
    position: 'absolute',
    top: '-12px',
    right: '-12px',
    background: color,
    color: '#fff',
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '0.8rem',
    fontWeight: 'bold',
    boxShadow: '0 2px 5px rgba(0,0,0,0.5)'
  });

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2>{td.title}</h2>
        <button 
          className="btn btn-primary" 
          onClick={() => loadStats(true)}
          disabled={refreshing}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          {refreshing ? td.refreshing : td.refresh}
        </button>
      </div>

      {/* Visual Architecture Map */}
      <div className="card glass" style={{ marginBottom: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', padding: '32px' }}>
        <h3 style={{ margin: 0, color: 'var(--text-muted)' }}>{td.flowTitle}</h3>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
          
          {/* Intake Node */}
          <div style={nodeStyle(intakeColor)}>
            {stats.intake_count > 0 && <span style={badgeStyle(intakeColor)}>{stats.intake_count} {td.backlog}</span>}
            <strong>000_Intake</strong>
            <small style={{ color: 'var(--text-muted)', marginTop: '4px' }}>Input Queue</small>
          </div>

          <div style={{ color: 'var(--text-muted)' }}>
            <svg width="40" height="24" viewBox="0 0 40 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0 12H36M36 12L28 4M36 12L28 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          {/* Wiki Graph Node */}
          <div style={nodeStyle(graphColor)}>
            {graphIssues > 0 && <span style={badgeStyle(graphColor)}>{graphIssues} {td.issues}</span>}
            <strong>200_Wiki_Graph</strong>
            <small style={{ color: 'var(--text-muted)', marginTop: '4px' }}>AI Brain</small>
          </div>
        </div>

        <div style={{ color: 'var(--text-muted)' }}>
          <svg width="24" height="40" viewBox="0 0 24 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 0V36M12 36L4 28M12 36L20 28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        {/* Raw Memory Node */}
        <div style={nodeStyle('var(--accent)')}>
          <span style={badgeStyle('var(--accent)')}>{stats.raw_memory_count} {td.files}</span>
          <strong>100_Raw_Memory</strong>
          <small style={{ color: 'var(--text-muted)', marginTop: '4px' }}>Archive Storage</small>
        </div>
      </div>

      {/* Pillar A: Intake */}
      <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>{td.sections.intake}</h3>
      <div className="grid" style={{ marginBottom: '32px' }}>
        <div className="card glass" style={{ borderLeft: `4px solid ${intakeColor}`, display: 'flex', flexDirection: 'column' }}>
          <h3>{td.cards.intakeBacklog}</h3>
          <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: intakeColor }}>{stats.intake_count}</p>
          <div style={{ marginTop: 'auto', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '12px' }}>
              <strong>{td.cards.guide}:</strong> {td.cards.intakeGuide}
            </p>
            <button 
              className="btn btn-primary" 
              onClick={() => navigateToScript('python 400_System_Kernel/410_Skills/ingest.py')}
              style={{ width: '100%' }}
            >
              {td.cards.intakeAction}
            </button>
          </div>
        </div>
      </div>

      {/* Pillar B: Knowledge Integrity */}
      <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>{td.sections.integrity}</h3>
      <div className="grid" style={{ marginBottom: '32px' }}>
        <div className="card glass" style={{ borderLeft: `4px solid ${contradictColor}`, display: 'flex', flexDirection: 'column' }}>
          <h3>{td.cards.contradictions}</h3>
          <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: contradictColor }}>{stats.contradiction_count}</p>
          <div style={{ marginTop: 'auto', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '12px' }}>
              <strong>{td.cards.guide}:</strong> {td.cards.contradictionsGuide}
            </p>
            <button 
              className="btn btn-primary" 
              onClick={() => navigateToScript('gemini -p "Fix contradictions in 200_Wiki_Graph"')}
              style={{ width: '100%' }}
            >
              {td.cards.contradictionsAction}
            </button>
          </div>
        </div>
        
        <div className="card glass" style={{ borderLeft: `4px solid ${orphanColor}`, display: 'flex', flexDirection: 'column' }}>
          <h3>{td.cards.orphans}</h3>
          <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: orphanColor }}>{stats.orphan_count}</p>
          <div style={{ marginTop: 'auto', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '12px' }}>
              <strong>{td.cards.guide}:</strong> {td.cards.orphansGuide}
            </p>
            <button className="btn btn-primary" onClick={() => navigateToScript('python 400_System_Kernel/410_Skills/lint.py')} style={{ width: '100%' }}>
              {td.cards.orphansAction}
            </button>
          </div>
        </div>

        <div className="card glass" style={{ borderLeft: `4px solid ${yamlColor}`, display: 'flex', flexDirection: 'column' }}>
          <h3>{td.cards.brokenSchema}</h3>
          <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: yamlColor }}>{stats.broken_yaml_count}</p>
          <div style={{ marginTop: 'auto', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '12px' }}>
              <strong>{td.cards.guide}:</strong> {td.cards.brokenSchemaGuide}
            </p>
            <button className="btn btn-primary" onClick={() => navigateToScript('python 400_System_Kernel/410_Skills/lint.py')} style={{ width: '100%' }}>
              {td.cards.brokenSchemaAction}
            </button>
          </div>
        </div>
      </div>

      {/* Pillar C: Storage & Hygiene */}
      <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>{td.sections.hygiene}</h3>
      <div className="grid" style={{ marginBottom: '32px' }}>
        <div className="card glass" style={{ borderLeft: `4px solid ${strayColor}`, display: 'flex', flexDirection: 'column' }}>
          <h3>{td.cards.strayFiles}</h3>
          <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: strayColor }}>{stats.stray_count}</p>
          <div style={{ marginTop: 'auto', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '12px' }}>
              <strong>{td.cards.guide}:</strong> {td.cards.strayFilesGuide}
            </p>
            <button className="btn btn-primary" onClick={() => navigateToScript('python 400_System_Kernel/410_Skills/lint.py')} style={{ width: '100%' }}>
              {td.cards.strayFilesAction}
            </button>
          </div>
        </div>

        <div className="card glass" style={{ borderLeft: `4px solid var(--accent)`, display: 'flex', flexDirection: 'column' }}>
          <h3>{td.cards.archivedMemory}</h3>
          <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--accent)' }}>{stats.raw_memory_count}</p>
          <div style={{ marginTop: 'auto', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '12px' }}>
              <strong>{td.cards.info}:</strong> {td.cards.archivedMemoryInfo}
            </p>
          </div>
        </div>
      </div>

      {/* General Metrics & Execution */}
      <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>{td.sections.metrics}</h3>
      <div className="grid" style={{ marginBottom: '24px' }}>
        <div className="card glass">
          <h3>{td.cards.totalConcepts}</h3>
          <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#8b5cf6' }}>{stats.concept_count}</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{td.cards.totalConceptsNote(stats.total_notes)}</p>
        </div>
        <div className="card glass">
          <h3>{td.cards.successRate}</h3>
          <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: stats.success_rate > 80 ? 'var(--success)' : 'var(--warning)' }}>
            {stats.success_rate.toFixed(1)}%
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{td.cards.successRateNote}</p>
        </div>
      </div>

      <div className="grid">
        <div className="card glass">
          <h3>{td.cards.recentNotes}</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {stats.recent_notes.map((note, idx) => (
              <li key={idx} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                {note.path} 
                <span style={{ float: 'right', color: 'var(--text-muted)' }}>
                  {new Date(note.mtime * 1000).toLocaleString()}
                </span>
              </li>
            ))}
            {stats.recent_notes.length === 0 && <li style={{ padding: '8px 0' }}>{td.cards.noRecentNotes}</li>}
          </ul>
        </div>

        <div className="card glass">
          <h3>{td.cards.latestExec}</h3>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '8px' }}>{td.table.command}</th>
                <th style={{ padding: '8px' }}>{td.table.status}</th>
                <th style={{ padding: '8px' }}>{td.table.time}</th>
              </tr>
            </thead>
            <tbody>
              {stats.latest_executions.map(exec => (
                <tr key={exec.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px', fontFamily: 'monospace', fontSize: '0.9rem' }}>{exec.command}</td>
                  <td style={{ padding: '8px', color: exec.status === 'success' ? 'var(--success)' : (exec.status === 'failed' ? 'var(--danger)' : 'var(--warning)') }}>
                    {exec.status.toUpperCase()}
                  </td>
                  <td style={{ padding: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {new Date(exec.start_time + 'Z').toLocaleString()}
                  </td>
                </tr>
              ))}
              {stats.latest_executions.length === 0 && (
                <tr><td colSpan="3" style={{ padding: '16px', textAlign: 'center' }}>{td.cards.noExec}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
