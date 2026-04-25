import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import GitManager from './components/GitManager';
import ScriptRunner from './components/ScriptRunner';
import LiveSyncStatus from './components/LiveSyncStatus';
import ConfigManager from './components/ConfigManager';
import { fetchApi } from './utils/api';
import { useLang } from './context/LangContext.jsx';

function App() {
  const { lang, switchLang, t } = useLang();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [preselectedScript, setPreselectedScript] = useState('');
  const [scriptOutput, setScriptOutput] = useState('');
  const [scriptDiff, setScriptDiff] = useState(null);

  const navigateToScript = (scriptCommand) => {
    setPreselectedScript(scriptCommand);
    setActiveTab('scripts');
  };

  const clearScriptOutput = () => {
    setScriptOutput('');
    setScriptDiff(null);
  };

  useEffect(() => {
    const checkAuth = async () => {
      if (localStorage.getItem('wiki_credentials')) {
        try {
          await fetchApi('/health');
          setIsAuthenticated(true);
        } catch (e) {
          setIsAuthenticated(false);
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  if (loading) return null;

  if (!isAuthenticated) {
    return <Login onLogin={() => setIsAuthenticated(true)} />;
  }

  const handleLogout = () => {
    localStorage.removeItem('wiki_credentials');
    setIsAuthenticated(false);
  };

  return (
    <div className="app-container">
      <div className="sidebar glass">
        <div className="sidebar-brand">{t.appTitle}</div>
        
        <div 
          className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          {t.nav.dashboard}
        </div>
        <div 
          className={`nav-item ${activeTab === 'scripts' ? 'active' : ''}`}
          onClick={() => setActiveTab('scripts')}
        >
          {t.nav.scripts}
        </div>
        <div 
          className={`nav-item ${activeTab === 'git' ? 'active' : ''}`}
          onClick={() => setActiveTab('git')}
        >
          {t.nav.git}
        </div>
        <div 
          className={`nav-item ${activeTab === 'livesync' ? 'active' : ''}`}
          onClick={() => setActiveTab('livesync')}
        >
          {t.nav.livesync}
        </div>
        <div 
          className={`nav-item ${activeTab === 'config' ? 'active' : ''}`}
          onClick={() => setActiveTab('config')}
        >
          {t.nav.config}
        </div>

        <div style={{ flex: 1 }}></div>
        <div style={{ display: 'flex', gap: '4px', padding: '8px 16px' }}>
          <button
            onClick={() => switchLang('en')}
            style={{ flex: 1, padding: '6px', borderRadius: '6px', border: '1px solid var(--border)', background: lang === 'en' ? 'var(--accent)' : 'transparent', color: lang === 'en' ? '#fff' : 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem' }}
          >EN</button>
          <button
            onClick={() => switchLang('zh')}
            style={{ flex: 1, padding: '6px', borderRadius: '6px', border: '1px solid var(--border)', background: lang === 'zh' ? 'var(--accent)' : 'transparent', color: lang === 'zh' ? '#fff' : 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem' }}
          >中文</button>
        </div>
        <div className="nav-item" onClick={handleLogout} style={{ color: 'var(--danger)' }}>
          {t.nav.logout}
        </div>
      </div>

      <div className="main-content">
        {activeTab === 'dashboard' && <Dashboard navigateToScript={navigateToScript} />}
        {activeTab === 'scripts' && <ScriptRunner 
          preselectedScript={preselectedScript}
          output={scriptOutput}
          setOutput={setScriptOutput}
          diff={scriptDiff}
          setDiff={setScriptDiff}
          onClear={clearScriptOutput}
        />}
        {activeTab === 'git' && <GitManager />}
        {activeTab === 'livesync' && <LiveSyncStatus />}
        {activeTab === 'config' && <ConfigManager />}
      </div>
    </div>
  );
}

export default App;
