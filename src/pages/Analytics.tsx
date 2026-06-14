import React, { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useHistoryStore } from '../store/historyStore';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';

export const Analytics: React.FC = () => {
  const { user } = useAuthStore();
  const { history, fetchHistory, loading } = useHistoryStore();

  useEffect(() => {
    if (user?.id) {
      fetchHistory(user.id);
    }
  }, [user?.id, fetchHistory]);

  // Compute metrics
  const stats = useMemo(() => {
    if (history.length === 0) return null;

    let totalBeforeScore = 0;
    let totalAfterScore = 0;
    let maxScore = 0;
    const roles: Record<string, number> = {};
    const companies: Record<string, number> = {};
    const skills: Record<string, number> = {};

    history.forEach((run) => {
      totalBeforeScore += run.ats_score?.before || 0;
      totalAfterScore += run.ats_score?.after || 0;
      
      const scoreAfter = run.ats_score?.after || 0;
      if (scoreAfter > maxScore) {
        maxScore = scoreAfter;
      }

      // Track roles
      const role = run.job_title || 'Untitled';
      roles[role] = (roles[role] || 0) + 1;

      // Track companies
      const comp = run.company_name || 'Unknown';
      companies[comp] = (companies[comp] || 0) + 1;

      // Track skills/tech
      if (run.tailored_resume?.skills) {
        run.tailored_resume.skills.forEach((s: string) => {
          const cleanSkill = s.trim();
          if (cleanSkill) {
            skills[cleanSkill] = (skills[cleanSkill] || 0) + 1;
          }
        });
      }
    });

    const avgBefore = Math.round(totalBeforeScore / history.length);
    const avgAfter = Math.round(totalAfterScore / history.length);

    // Find top applied role
    const topRole = Object.entries(roles).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
    
    // Convert charts data
    const trendData = [...history]
      .reverse()
      .map((run) => ({
        date: new Date(run.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        Before: run.ats_score?.before || 0,
        After: run.ats_score?.after || 0,
        role: run.job_title,
        company: run.company_name,
      }));

    const roleData = Object.entries(roles)
      .map(([name, value]) => ({ name, value }))
      .slice(0, 5);

    const companyData = Object.entries(companies)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const skillData = Object.entries(skills)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    return {
      avgBefore,
      avgAfter,
      maxScore,
      totalRuns: history.length,
      topRole,
      trendData,
      roleData,
      companyData,
      skillData,
    };
  }, [history]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-zinc-200 dark:border-zinc-800 border-t-zinc-950 dark:border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="max-w-md mx-auto px-6 py-20 text-center flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 flex items-center justify-center mb-4 text-zinc-500">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
          </svg>
        </div>
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-white mb-2">No Analysis Data Yet</h2>
        <p className="text-xs text-zinc-500 mb-6 leading-relaxed">
          Your analytics report will update dynamically once you run job description tailoring and analysis runs.
        </p>
        <Link
          to="/analyze"
          className="bg-zinc-950 dark:bg-white text-white dark:text-[#0f0f0f] hover:bg-zinc-800 dark:hover:bg-zinc-200 text-xs px-4 py-2 rounded-lg font-semibold transition-all shadow-lg active:scale-95 cursor-pointer"
        >
          Analyze First Job
        </Link>
      </div>
    );
  }

  const COLORS = ['#10B981', '#6366F1', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6'];

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-8 text-zinc-950 dark:text-zinc-200 transition-colors">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Analytics Dashboard</h1>
        <p className="text-xs text-zinc-550 dark:text-zinc-450 mt-1">
          Monitor your tailoring metrics, ATS improvements, and job search targeting.
        </p>
      </div>

      {/* Grid: 4 Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Avg ATS Improvement */}
        <div className="bg-white dark:bg-[#121212] border border-zinc-200 dark:border-zinc-900 rounded-xl p-5 flex flex-col justify-between transition-colors shadow-sm">
          <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-450 dark:text-zinc-500">
            Avg ATS Improvement
          </span>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-zinc-900 dark:text-white">
              {stats?.avgAfter}%
            </span>
            <span className="text-[10px] text-emerald-500 font-bold">
              +{Math.max(0, (stats?.avgAfter || 0) - (stats?.avgBefore || 0))}pts
            </span>
          </div>
          <span className="text-[9px] text-zinc-500 mt-2 block">
            Compared to {stats?.avgBefore}% baseline score
          </span>
        </div>

        {/* Card 2: Total Tailorings */}
        <div className="bg-white dark:bg-[#121212] border border-zinc-200 dark:border-zinc-900 rounded-xl p-5 flex flex-col justify-between transition-colors shadow-sm">
          <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-450 dark:text-zinc-500">
            Total Tailorings
          </span>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-zinc-900 dark:text-white">
              {stats?.totalRuns}
            </span>
          </div>
          <span className="text-[9px] text-zinc-500 mt-2 block">
            Resumes optimized using AI
          </span>
        </div>

        {/* Card 3: Top Targeted Role */}
        <div className="bg-white dark:bg-[#121212] border border-zinc-200 dark:border-zinc-900 rounded-xl p-5 flex flex-col justify-between transition-colors shadow-sm">
          <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-450 dark:text-zinc-500">
            Top Targeted Role
          </span>
          <div className="mt-3 truncate">
            <span className="text-lg font-bold text-zinc-900 dark:text-white truncate block">
              {stats?.topRole}
            </span>
          </div>
          <span className="text-[9px] text-zinc-500 mt-2 block">
            Most frequent job title analyzed
          </span>
        </div>

        {/* Card 4: Highest ATS Score */}
        <div className="bg-white dark:bg-[#121212] border border-zinc-200 dark:border-zinc-900 rounded-xl p-5 flex flex-col justify-between transition-colors shadow-sm">
          <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-450 dark:text-zinc-500">
            Highest ATS Score
          </span>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-zinc-900 dark:text-white">
              {stats?.maxScore}%
            </span>
          </div>
          <span className="text-[9px] text-zinc-500 mt-2 block">
            Best optimization score achieved
          </span>
        </div>
      </div>

      {/* Grid: Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Line Chart: ATS Score Trend (Span 8) */}
        <div className="lg:col-span-8 bg-white dark:bg-[#121212] border border-zinc-200 dark:border-zinc-900 rounded-xl p-5 space-y-4 transition-colors shadow-sm">
          <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-300 uppercase tracking-wider">
            ATS Score Optimization Trend
          </h3>
          <div className="h-64 w-full text-[10px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats?.trendData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
                <XAxis dataKey="date" stroke="#888888" />
                <YAxis domain={[0, 100]} stroke="#888888" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0, 0, 0, 0.85)',
                    border: '1px solid #333',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                />
                <Legend wrapperStyle={{ paddingTop: 10 }} />
                <Line
                  type="monotone"
                  dataKey="Before"
                  stroke="#6366F1"
                  strokeWidth={2}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="After"
                  stroke="#10B981"
                  strokeWidth={2}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart: Role Distribution (Span 4) */}
        <div className="lg:col-span-4 bg-white dark:bg-[#121212] border border-zinc-200 dark:border-zinc-900 rounded-xl p-5 space-y-4 transition-colors shadow-sm">
          <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-300 uppercase tracking-wider">
            Target Role Mix
          </h3>
          <div className="h-60 w-full flex items-center justify-center text-[10px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats?.roleData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {stats?.roleData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0, 0, 0, 0.85)',
                    border: '1px solid #333',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Pie Chart Legends */}
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            {stats?.roleData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-1.5 truncate">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="truncate text-zinc-650 dark:text-zinc-400 font-medium">
                  {entry.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Grid: Bar Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vertical Bar Chart: Most Used Keywords / Skills */}
        <div className="bg-white dark:bg-[#121212] border border-zinc-200 dark:border-zinc-900 rounded-xl p-5 space-y-4 transition-colors shadow-sm">
          <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-300 uppercase tracking-wider">
            Most Tailored Tech & Skills
          </h3>
          <div className="h-60 w-full text-[10px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.skillData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
                <XAxis dataKey="name" stroke="#888888" />
                <YAxis stroke="#888888" allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0, 0, 0, 0.85)',
                    border: '1px solid #333',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                />
                <Bar dataKey="count" fill="#10B981" radius={[4, 4, 0, 0]}>
                  {stats?.skillData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Horizontal Bar Chart: Top Targeted Companies */}
        <div className="bg-white dark:bg-[#121212] border border-zinc-200 dark:border-zinc-900 rounded-xl p-5 space-y-4 transition-colors shadow-sm">
          <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-300 uppercase tracking-wider">
            Top Companies Targeted
          </h3>
          <div className="h-60 w-full text-[10px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={stats?.companyData}
                margin={{ top: 5, right: 10, left: -15, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
                {/* Recharts layout="vertical" has XAxis as quantitative and YAxis as category */}
                <XAxis type="number" stroke="#888888" allowDecimals={false} />
                <YAxis dataKey="name" type="category" stroke="#888888" width={80} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0, 0, 0, 0.85)',
                    border: '1px solid #333',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                />
                <Bar dataKey="count" fill="#6366F1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white dark:bg-[#121212] border border-zinc-200 dark:border-zinc-900 rounded-xl p-5 space-y-4 transition-colors shadow-sm">
        <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-300 uppercase tracking-wider">
          Tailoring Execution History
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-850 text-zinc-400">
                <th className="py-2.5 font-semibold">Date</th>
                <th className="py-2.5 font-semibold">Role</th>
                <th className="py-2.5 font-semibold">Company</th>
                <th className="py-2.5 font-semibold text-center">ATS Baseline</th>
                <th className="py-2.5 font-semibold text-center">ATS Optimized</th>
                <th className="py-2.5 font-semibold text-center">Keywords Missing</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-850/60">
              {history.map((run) => (
                <tr key={run.id} className="text-zinc-750 dark:text-zinc-350 hover:bg-zinc-50 dark:hover:bg-zinc-950/40 transition-colors">
                  <td className="py-3 font-medium">
                    {new Date(run.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 font-semibold text-zinc-900 dark:text-white">
                    {run.job_title}
                  </td>
                  <td className="py-3">{run.company_name}</td>
                  <td className="py-3 text-center text-zinc-500 font-medium">
                    {run.ats_score?.before}%
                  </td>
                  <td className="py-3 text-center text-emerald-500 font-bold">
                    {run.ats_score?.after}%
                  </td>
                  <td className="py-3 text-center text-zinc-400 dark:text-zinc-500 font-medium">
                    {run.missing_keywords?.length || 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
