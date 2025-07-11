import { useState } from 'react';

export default function Home() {
  const [name, setName] = useState('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFetch = async () => {
    setLoading(true);
    setError('');
    setData(null);
    try {
      const res = await fetch(`/api/summoner?name=${encodeURIComponent(name)}`);
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Unknown error');
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Summoner Lookup</h1>
      <input
        className="border px-2 py-1 mr-2"
        placeholder="Enter summoner name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <button
        className="bg-blue-500 text-white px-4 py-1"
        onClick={handleFetch}
        disabled={loading}
      >
        {loading ? 'Loading...' : 'Search'}
      </button>

      {error && <p className="text-red-500 mt-4">{error}</p>}

      {data && (
        <div className="mt-6 border rounded p-4">
          <h2 className="text-xl font-semibold">{data.name}</h2>
          <p>Level: {data.level}</p>
          <h3 className="mt-2 font-medium">Top Champions:</h3>
          <ul className="list-disc ml-6">
            {data.topChampions.map((c: any, i: number) => (
              <li key={i}>
                Champion ID: {c.champId}, Mastery: {c.masteryPoints.toLocaleString()}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}