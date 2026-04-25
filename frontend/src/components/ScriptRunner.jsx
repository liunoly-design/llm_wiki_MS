import React, { useState, useEffect } from 'react';
import { fetchApi } from '../utils/api';
import { useLang } from '../context/LangContext.jsx';

export default function ScriptRunner({ preselectedScript, output, setOutput, diff, setDiff, onClear }) {
  const { t } = useLang();
  const ts = t.scripts;
  const [command, setCommand] = useState('');
  const [customCommand, setCustomCommand] = useState('');
  const [loading, setLoading] = useState(false);
  const [scripts, setScripts] = useState([]);

  useEffect(() => {
    fetchApi('/scripts/discover').then(res => setScripts(res.scripts)).catch(console.error);
  }, []);

  useEffect(() => {
    if (preselectedScript) {
      if (preselectedScript.startsWith('python')) {
        setCommand(preselectedScript);
        setCustomCommand('');
      } else {
        setCustomCommand(preselectedScript);
        setCommand('');
      }
    }
  }, [preselectedScript]);

  const handleRun = async (cmdToRun) => {
    if (!cmdToRun) return;
    const actualCommand = cmdToRun;

    setLoading(true);
    setDiff(null);
    setOutput('Taking pre-execution snapshot...\n');
    
    try {
      // 1. Capture Pre-Stats
      const preStats = await fetchApi('/wiki/health');
      
      // 2. Run Script
      setOutput(`$ ${actualCommand}\nRunning (backend may inject --yolo and --policy for gemini)...\n`);
      const res = await fetchApi('/scripts/run', {
        method: 'POST',
        body: JSON.stringify({ command: actualCommand })
      });
      
      // 3. Capture Post-Stats
      const postStats = await fetchApi('/wiki/health');
      
      // 4. Calculate Diff
      const diffs = [
        { label: 'Intake Backlog', before: preStats.intake_count, after: postStats.intake_count },
        { label: 'Wiki Concepts', before: preStats.concept_count, after: postStats.concept_count },
        { label: 'Total Notes', before: preStats.total_notes, after: postStats.total_notes },
        { label: 'Orphan Nodes', before: preStats.orphan_count, after: postStats.orphan_count },
        { label: 'Broken Schema', before: preStats.broken_yaml_count, after: postStats.broken_yaml_count },
        { label: 'Knowledge Contradictions', before: preStats.contradiction_count, after: postStats.contradiction_count },
        { label: 'Stray Files', before: preStats.stray_count, after: postStats.stray_count },
        { label: 'Archived Raw Memory', before: preStats.raw_memory_count, after: postStats.raw_memory_count },
      ].filter(d => d.before !== d.after);
      
      setDiff(diffs);
      const displayCmd = res.actual_command || actualCommand;
      setOutput(`$ ${displayCmd}\n\n[STDOUT]\n${res.stdout}\n[STDERR]\n${res.stderr}\n\nExit Code: ${res.returncode}`);
      
    } catch (e) {
      setOutput(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <h2>{ts.title}</h2>
      
      <div className="card glass">
        <h3>{ts.selectScript}</h3>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          <select 
            value={command} 
            onChange={e => { setCommand(e.target.value); setCustomCommand(''); }} 
            style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-dark)', color: 'var(--text-main)', flex: 2, marginBottom: 0 }}
          >
            <option value="">{ts.selectPlaceholder}</option>
            {scripts.map(s => <option key={s.path} value={s.path}>{s.name} - {s.description}</option>)}
          </select>
          <button 
            className="btn btn-primary" 
            onClick={() => handleRun(command)}
            disabled={loading || !command}
          >
            {ts.runPython}
          </button>
        </div>

        <h3>{ts.geminiSection}</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '8px' }}>
          {ts.geminiHint} <code style={{ background: 'var(--bg-dark)', padding: '2px 6px', borderRadius: '4px' }}>--yolo</code> {ts.geminiHintSuffix}
        </p>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <input 
            type="text" 
            value={customCommand}
            onChange={(e) => { setCustomCommand(e.target.value); setCommand(''); }}
            style={{ marginBottom: 0, flex: 2, fontFamily: 'monospace' }}
            placeholder={ts.geminiPlaceholder}
          />
          <button 
            className="btn btn-primary" 
            onClick={() => handleRun(customCommand)}
            disabled={loading || !customCommand}
          >
            {ts.runGemini}
          </button>
        </div>

        {/* Diff UI Panel */}
        {diff !== null && (
          <div style={{ background: 'var(--bg-dark)', padding: '16px', borderRadius: '8px', marginBottom: '16px', border: '1px solid var(--border)' }}>
            <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-main)' }}>{ts.diffTitle}</h4>
            {diff.length === 0 ? (
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>{ts.noChange}</p>
            ) : (
              <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {diff.map((d, idx) => {
                  const delta = d.after - d.before;
                  const isPositive = delta > 0;
                  const isIssueMetric = d.label.includes('Backlog') || d.label.includes('Broken') || d.label.includes('Orphan') || d.label.includes('Stray') || d.label.includes('Contradiction');
                  const color = isIssueMetric
                    ? (delta < 0 ? 'var(--success)' : 'var(--danger)')
                    : (delta > 0 ? 'var(--success)' : 'var(--warning)');
                    
                  return (
                    <li key={idx} style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{d.label}</span>
                      <span style={{ fontFamily: 'monospace' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{d.before}</span>
                        {' → '}
                        <strong style={{ color: color }}>{d.after}</strong>
                        <span style={{ marginLeft: '8px', color: color, fontSize: '0.9rem' }}>
                          ({isPositive ? '+' : ''}{delta})
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {/* Output area with Clear button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{ts.outputLabel}</span>
          <button 
            className="btn"
            onClick={onClear}
            disabled={!output}
            style={{ padding: '4px 12px', fontSize: '0.85rem', background: 'var(--bg-secondary)' }}
          >
            {ts.clearOutput}
          </button>
        </div>
        <div className="terminal" style={{ height: '400px', maxHeight: '600px' }}>
          {output || ts.outputPlaceholder}
        </div>
      </div>
    </div>
  );
}
