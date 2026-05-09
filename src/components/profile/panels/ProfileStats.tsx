import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { CreatorProfile } from "@/lib/mockData";

interface ProfileStatsProps {
  profile: CreatorProfile;
}

export function ProfileStats({ profile }: ProfileStatsProps) {
  // Mock data for charts
  const submissionTrendData = [
    { month: "Jan", submissions: 12, approved: 10 },
    { month: "Feb", submissions: 15, approved: 13 },
    { month: "Mar", submissions: 18, approved: 16 },
    { month: "Apr", submissions: 22, approved: 19 },
    { month: "May", submissions: 25, approved: 23 },
    { month: "Jun", submissions: 28, approved: 26 },
  ];

  const platformData = [
    { name: "TikTok", value: profile.followers.tiktok, color: "#000000" },
    { name: "Instagram", value: profile.followers.instagram, color: "#E4405F" },
    { name: "YouTube", value: profile.followers.youtube, color: "#FF0000" },
    { name: "X", value: profile.followers.x, color: "#1DA1F2" },
  ];

  const statusData = [
    { name: "Approved", value: profile.statistics.approvedSubmissions, color: "#22c55e" },
    { name: "Rejected", value: profile.statistics.rejectedSubmissions, color: "#ef4444" },
    { name: "Pending", value: profile.statistics.totalSubmissions - profile.statistics.approvedSubmissions - profile.statistics.rejectedSubmissions, color: "#eab308" },
  ];

  return (
    <div className="space-y-6">
      {/* Key Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Total Submissions</p>
          <p className="text-3xl font-bold text-white">{profile.statistics.totalSubmissions}</p>
          <p className="text-xs text-slate-500 mt-2">Lifetime</p>
        </div>
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Approval Rate</p>
          <p className="text-3xl font-bold text-green-400">{((profile.statistics.approvedSubmissions / profile.statistics.totalSubmissions) * 100).toFixed(1)}%</p>
          <p className="text-xs text-slate-500 mt-2">{profile.statistics.approvedSubmissions} approved</p>
        </div>
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Avg. Engagement</p>
          <p className="text-3xl font-bold text-blue-400">{profile.statistics.averageEngagement.toFixed(1)}%</p>
          <p className="text-xs text-slate-500 mt-2">Per submission</p>
        </div>
      </div>

      {/* Submission Trend Chart */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Submission Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={submissionTrendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis stroke="#94a3b8" style={{ fontSize: "12px" }} />
            <YAxis stroke="#94a3b8" style={{ fontSize: "12px" }} />
            <Tooltip 
              contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569", borderRadius: "8px" }}
              labelStyle={{ color: "#f1f5f9" }}
            />
            <Legend />
            <Line type="monotone" dataKey="submissions" stroke="#3b82f6" strokeWidth={2} />
            <Line type="monotone" dataKey="approved" stroke="#22c55e" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Platform Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Platform Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={platformData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {platformData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => (value / 1000).toFixed(0) + "k"} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Submission Status</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                dataKey="value"
                label={({ name, value }) => `${name} ${value}`}
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Earnings Chart */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Monthly Earnings</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={[
            { month: "Jan", earnings: 800 },
            { month: "Feb", earnings: 1200 },
            { month: "Mar", earnings: 1500 },
            { month: "Apr", earnings: 2000 },
            { month: "May", earnings: 2200 },
            { month: "Jun", earnings: 2300 },
          ]}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis stroke="#94a3b8" style={{ fontSize: "12px" }} />
            <YAxis stroke="#94a3b8" style={{ fontSize: "12px" }} />
            <Tooltip 
              contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569", borderRadius: "8px" }}
              labelStyle={{ color: "#f1f5f9" }}
              formatter={(value) => "$" + value}
            />
            <Bar dataKey="earnings" fill="#eab308" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
