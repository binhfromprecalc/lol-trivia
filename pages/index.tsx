import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import socket from '@utils/socket';
import '@styles/index.css'; 

export default function Home() {
  const [riotId, setRiotId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const router = useRouter();

  useEffect(() => {
    fetch('/api/socket');
    socket.on('connect', () => console.log('Connected to WebSocket'));
    return () => {
      socket.off('connect');
    };
  }, []);

  const handleFetch = async () => {
    setLoading(true);
    setError('');

    const [gameName, tagLine] = riotId.split('#');
    if (!gameName || !tagLine) {
      setError('Please enter a Riot ID in the format Name#TAG (e.g., Faker#KR)');
      setLoading(false);
      return;
    }

    const riotIdSlug = encodeURIComponent(`${gameName}-${tagLine}`);
    localStorage.setItem('riotId', `${gameName}#${tagLine}`);
    router.push(`/user/${riotIdSlug}`);
  };

  return (
    <div className="home-container">
      <div className="home-card">
        <h1 className="home-title">Rito Account Lookup</h1>

        {/* Riot ID Input */}
        <div className="input-group">
          <input
            className="input-field"
            placeholder="Enter Riot ID (e.g. binh#NA1)"
            value={riotId}
            onChange={(e) => setRiotId(e.target.value)}
          />
          <button
            className="button blue"
            onClick={handleFetch}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Search'}
          </button>
        </div>

        {error && <p className="error-text">{error}</p>}
      </div>
    </div>
  );
}
