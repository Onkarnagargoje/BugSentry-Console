import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function RiskGraph() {
  const data = [15, 25, 45, 30, 60, 40, 20];
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const width = 600;
  const height = 120;
  const dx = width / (data.length - 1);
  const max = 100;
  const dy = height / max;

  let pathLine = `M 0 ${height - data[0] * dy}`;
  let pathArea = `M 0 ${height} L 0 ${height - data[0] * dy}`;

  data.forEach((val, i) => {
    if (i > 0) {
      pathLine += ` L ${i * dx} ${height - val * dy}`;
      pathArea += ` L ${i * dx} ${height - val * dy}`;
    }
  });
  pathArea += ` L ${width} ${height} Z`;

  return (
    <div className="dev-activity-card" style={{ marginBottom: '24px' }}>
      <div className="dev-feed-header" style={{ marginBottom: '32px' }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Repository Risk Trend</h3>
        <span style={{ background: 'rgba(210, 153, 34, 0.1)', color: '#d29922', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', border: '1px solid rgba(210, 153, 34, 0.2)' }}>
          Medium Risk
        </span>
      </div>
      <div style={{ width: '100%', height: 'auto', paddingBottom: '12px' }}>
        <svg viewBox={`0 -10 ${width} ${height + 40}`} style={{ width: '100%', overflow: 'visible' }}>
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d29922" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#d29922" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <path d={pathArea} fill="url(#areaGrad)" />
          <path d={pathLine} fill="none" stroke="#d29922" strokeWidth="3" style={{ filter: 'drop-shadow(0 4px 6px rgba(210, 153, 34, 0.3))' }} />
          {data.map((val, i) => (
            <g key={i}>
              <circle cx={i * dx} cy={height - val * dy} r="5" fill="#000" stroke="#d29922" strokeWidth="2" />
              <text x={i * dx} y={height - val * dy - 15} fill="#fff" fontSize="12" textAnchor="middle" fontWeight="bold">{val}%</text>
              <text x={i * dx} y={height + 25} fill="rgba(255,255,255,0.5)" fontSize="12" textAnchor="middle">{labels[i]}</text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

const riskData = [
  { name: 'Mon', risk: 400, vulnerabilities: 24 },
  { name: 'Tue', risk: 300, vulnerabilities: 13 },
  { name: 'Wed', risk: 550, vulnerabilities: 8 },
  { name: 'Thu', risk: 280, vulnerabilities: 39 },
  { name: 'Fri', risk: 890, vulnerabilities: 48 },
  { name: 'Sat', risk: 490, vulnerabilities: 38 },
  { name: 'Sun', risk: 1490, vulnerabilities: 43 },
];

export function RepositoryRiskChart() {
  return (
    <div className="dev-activity-card" style={{ marginBottom: '32px' }}>
      <div className="activity-card-header">
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#fff' }}>Repository Risk Overview</h3>
      </div>
      <div style={{ width: '100%', height: 260 }}>
        <ResponsiveContainer>
          <AreaChart data={riskData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f85149" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#f85149" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
              itemStyle={{ color: '#fff' }}
            />
            <Area type="monotone" dataKey="risk" stroke="#f85149" fillOpacity={1} fill="url(#colorRisk)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
