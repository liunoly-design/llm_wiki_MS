import React, { useState } from 'react';
import { fetchApi } from '../utils/api';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const credentials = btoa(`${username}:${password}`);
    localStorage.setItem('wiki_credentials', credentials);

    try {
      await fetchApi('/health');
      onLogin();
    } catch (err) {
      setError('Invalid username or password');
      localStorage.removeItem('wiki_credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="glass login-box animate-fade-in">
        <h2>Digital Brain</h2>
        <form onSubmit={handleSubmit}>
          <input 
            type="text" 
            placeholder="Username" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            required
          />
          <input 
            type="password" 
            placeholder="Password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required
          />
          {error && <p style={{ color: 'var(--danger)', marginBottom: '16px' }}>{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Authenticating...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
