import React, { useState } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Flame, AlertTriangle, Download, Search } from 'lucide-react';

const PRESETS = [
  { name: 'Hyderabad, India', lat: 17.3850, lon: 78.4867 },
  { name: 'New Delhi, India', lat: 28.6139, lon: 77.2090 },
  { name: 'Phoenix, USA', lat: 33.4484, lon: -112.0740 },
  { name: 'Madrid, Spain', lat: 40.4168, lon: -3.7038 },
];

export default function App() {
  const [lat, setLat] = useState(17.3850);
  const [lon, setLon] = useState(78.4867);
  const [startYear, setStartYear] = useState(1990);
  const [endYear, setEndYear] = useState(2023);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const fetchAnalysis = async (cLat = lat, cLon = lon) => {
    setLoading(true);
    setError('');
    try {
      const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const res = await fetch(`${backendUrl}/api/analyze?lat=${cLat}&lon=${cLon}&start_year=${startYear}&end_year=${endYear}`);
      if (!res.ok) throw new Error('Failed to retrieve climate analysis');
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handlePreset = (p) => {
    setLat(p.lat);
    setLon(p.lon);
    fetchAnalysis(p.lat, p.lon);
  };

  const exportCSV = () => {
    if (!result?.yearly_records) return;
    const headers = 'Year,Heatwave Events,Total Days\n';
    const rows = result.yearly_records.map(r => `${r.year},${r.event_count},${r.heatwave_days}`).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `climate_trends_${lat}_${lon}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 md:p-10 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
              <Flame className="text-orange-500" /> Climate Hazard Trend Analyzer
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Historical heatwave event tracking & statistical trend modeling (1950–Present)
            </p>
          </div>
          {result && (
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-sm px-4 py-2 rounded-lg border border-slate-700 transition cursor-pointer"
            >
              <Download size={16} /> Export CSV
            </button>
          )}
        </header>

        {/* Query Controls */}
        <div className="bg-slate-800/60 p-6 rounded-xl border border-slate-700/60 space-y-4">
          <div className="flex flex-wrap gap-2 items-center text-sm">
            <span className="text-slate-400">Quick Select:</span>
            {PRESETS.map((p) => (
              <button
                key={p.name}
                onClick={() => handlePreset(p)}
                className="bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded text-xs transition cursor-pointer"
              >
                {p.name}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Latitude</label>
              <input
                type="number"
                step="0.01"
                value={lat}
                onChange={(e) => setLat(parseFloat(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Longitude</label>
              <input
                type="number"
                step="0.01"
                value={lon}
                onChange={(e) => setLon(parseFloat(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Start Year</label>
              <input
                type="number"
                value={startYear}
                onChange={(e) => setStartYear(parseInt(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">End Year</label>
              <input
                type="number"
                value={endYear}
                onChange={(e) => setEndYear(parseInt(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <button
            onClick={() => fetchAnalysis()}
            disabled={loading}
            className="w-full bg-orange-600 hover:bg-orange-500 font-medium py-2.5 rounded-lg flex justify-center items-center gap-2 transition disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Analyzing Historical Data...' : <><Search size={18} /> Analyze Trends</>}
          </button>
          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
        </div>

        {/* Results Section */}
        {result && (
          <div className="space-y-6">
            
            {/* Summary Banner */}
            <div className="bg-gradient-to-r from-orange-950/40 to-slate-800 p-5 rounded-xl border border-orange-800/40 flex items-start gap-3">
              <AlertTriangle className="text-orange-400 mt-0.5 flex-shrink-0" size={20} />
              <div>
                <h3 className="font-semibold text-white">Summary Finding</h3>
                <p className="text-slate-300 text-sm mt-1">{result.trends.insight}</p>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/60">
                <p className="text-xs text-slate-400">95th Percentile Threshold</p>
                <p className="text-2xl font-bold text-orange-400 mt-1">{result.metadata.threshold_c} °C</p>
                <p className="text-xs text-slate-500 mt-1">Baseline daily max temperature cutoff</p>
              </div>
              <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/60">
                <p className="text-xs text-slate-400">Total Heatwave Events</p>
                <p className="text-2xl font-bold text-white mt-1">{result.metadata.total_events}</p>
                <p className="text-xs text-slate-500 mt-1">Spanning {result.metadata.start_year}–{result.metadata.end_year}</p>
              </div>
              <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/60">
                <p className="text-xs text-slate-400">Trend Rate (Slope)</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {result.trends.slope > 0 ? `+${result.trends.slope}` : result.trends.slope} <span className="text-sm font-normal text-slate-400">events/yr</span>
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {result.trends.statistically_significant ? 'Statistically significant (p < 0.05)' : 'Not statistically significant (p ≥ 0.05)'}
                </p>
              </div>
            </div>

            {/* Visualizations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-slate-800/60 p-5 rounded-xl border border-slate-700/60">
                <h4 className="text-sm font-semibold mb-4 text-slate-200">Yearly Heatwave Frequency (Events)</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={result.yearly_records}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="year" stroke="#94a3b8" fontSize={12} />
                      <YAxis stroke="#94a3b8" fontSize={12} />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569' }} />
                      <Bar dataKey="event_count" fill="#f97316" radius={[4, 4, 0, 0]} name="Events" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-slate-800/60 p-5 rounded-xl border border-slate-700/60">
                <h4 className="text-sm font-semibold mb-4 text-slate-200">Annual Extreme Temperature Days</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={result.yearly_records}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="year" stroke="#94a3b8" fontSize={12} />
                      <YAxis stroke="#94a3b8" fontSize={12} />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569' }} />
                      <Line type="monotone" dataKey="heatwave_days" stroke="#fb923c" strokeWidth={2} dot={false} name="Total Days" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}