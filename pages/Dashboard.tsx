
import React, { useState } from 'react';
import { 
  Users, 
  TrendingUp, 
  AlertCircle, 
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Warehouse,
  CreditCard,
  Zap,
  AlertTriangle
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { useApp } from '../context/AppContext';

const data = [
  { name: 'Ian', prezenta: 92, incasari: 4500 },
  { name: 'Feb', prezenta: 88, incasari: 4200 },
  { name: 'Mar', prezenta: 95, incasari: 5100 },
  { name: 'Apr', prezenta: 91, incasari: 4800 },
  { name: 'Mai', prezenta: 94, incasari: 5300 },
  { name: 'Iun', prezenta: 85, incasari: 3900 },
];

const StatCard = ({ title, value, icon: Icon, trend, color, subtitle }: any) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon size={24} className="text-white" />
      </div>
      {trend !== undefined && (
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${trend > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
          {trend > 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
    <h3 className="text-slate-500 text-sm font-medium">{title}</h3>
    <div className="flex items-baseline gap-2 mt-1">
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      {subtitle && <span className="text-xs text-slate-400 font-medium">{subtitle}</span>}
    </div>
  </div>
);

export const Dashboard = () => {
  const { students, attendance, payments, inventory, recordAttendance } = useApp();
  const [isSuccess, setIsSuccess] = useState(false);

  const totalStudents = students.length;
  const criticalItems = inventory.filter(i => i.quantity <= i.minStock);
  const criticalStockCount = criticalItems.length;
  
  const today = new Date().toISOString().split('T')[0];
  const presentTodayCount = attendance.filter(a => a.date === today && a.status === 'PREZENT').length;
  const attendanceRate = totalStudents > 0 ? Math.round((presentTodayCount / totalStudents) * 100) : 0;
  
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthlyRevenue = payments
    .filter(p => p.month === currentMonth)
    .reduce((acc, curr) => acc + curr.amount, 0);

  const handleMarkAllPresent = () => {
    if (!confirm(`Sunteți sigur că doriți să marcați toți cei ${totalStudents} elevi ca PREZENȚI pentru astăzi?`)) return;
    
    const records = students
      .filter(s => s.active)
      .map(s => ({ studentId: s.id, status: 'PREZENT' as any }));
    
    recordAttendance(today, records);
    setIsSuccess(true);
    setTimeout(() => setIsSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Alerta Stoc Critic */}
      {criticalStockCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-4 animate-in fade-in slide-in-from-top-2 duration-500">
          <div className="p-2 bg-amber-500 text-white rounded-xl shadow-lg shadow-amber-200">
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-black text-amber-900 uppercase tracking-tight">Alertă: Stocuri Critice Detecate</h4>
            <p className="text-xs text-amber-700 font-medium mt-1">
              Următoarele produse sunt sub nivelul minim: <span className="font-bold">{criticalItems.map(i => i.name).join(', ')}</span>. 
              Vă rugăm să verificați secțiunea Magazie pentru reaprovizionare.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Elevi" 
          value={totalStudents} 
          icon={Users} 
          trend={totalStudents > 0 ? 100 : 0} 
          color="bg-blue-600" 
        />
        <StatCard 
          title="Prezență Azi" 
          value={`${presentTodayCount} elevi`} 
          subtitle={`din ${totalStudents} (${attendanceRate}%)`}
          icon={CheckCircle2} 
          trend={attendanceRate > 90 ? 5 : -2} 
          color="bg-emerald-500" 
        />
        <StatCard 
          title="Încasări Lună" 
          value={`${monthlyRevenue.toLocaleString('ro-RO')} RON`} 
          icon={TrendingUp} 
          trend={2} 
          color="bg-violet-500" 
        />
        <StatCard 
          title="Stocuri Critice" 
          value={criticalStockCount} 
          icon={AlertCircle} 
          color="bg-amber-500" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Zap size={18} className="text-amber-500" />
            Acțiuni Rapide
          </h3>
          <div className="space-y-3 flex-1">
            <button 
              onClick={handleMarkAllPresent}
              className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all active:scale-95 ${
                isSuccess 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                  : 'bg-white border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 group'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg transition-colors ${isSuccess ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-emerald-500 group-hover:text-white'}`}>
                  <CheckCircle2 size={18} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold">Marchează Toți Prezenți</p>
                  <p className="text-[10px] opacity-70">Acțiune globală (toate grupele)</p>
                </div>
              </div>
              {isSuccess && <span className="text-[10px] font-black uppercase">Gata!</span>}
            </button>

            <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100/50">
               <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest mb-2">Sumar Azi</p>
               <div className="flex justify-between items-end">
                  <div>
                     <p className="text-2xl font-black text-blue-800">{presentTodayCount}</p>
                     <p className="text-[10px] text-blue-500 font-medium italic">Elevi înregistrați</p>
                  </div>
                  <div className="text-right">
                     <p className="text-xl font-bold text-slate-700">{totalStudents - presentTodayCount}</p>
                     <p className="text-[10px] text-slate-400 font-medium">Rămași</p>
                  </div>
               </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-800">Evoluție Încasări</h3>
            <button className="text-sm text-blue-600 font-medium hover:underline">Vezi raport</button>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorIncasari" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} 
                />
                <Area type="monotone" dataKey="incasari" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorIncasari)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Clock size={18} className="text-blue-500" />
              Activitate Recentă
            </h3>
          </div>
          <div className="divide-y divide-slate-50">
            {[
              { text: "Factură generată pentru elevul Luca Popescu", time: "acum 10 min", icon: FileText, color: "text-blue-500 bg-blue-50" },
              { text: "Prezență azi înregistrată", time: "azi, 08:45", icon: CheckCircle2, color: "text-emerald-500 bg-emerald-50" },
              { text: "Actualizare stoc magazie", time: "ieri, 16:30", icon: Warehouse, color: "text-amber-500 bg-amber-50" },
              { text: "Plată nouă confirmată", time: "ieri, 14:15", icon: CreditCard, color: "text-violet-500 bg-violet-50" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors">
                <div className={`p-2 rounded-lg ${item.color}`}>
                  <item.icon size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-700">{item.text}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Calendar size={18} className="text-rose-500" />
            Evenimente Proximale
          </h3>
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-xl border-l-4 border-rose-500">
              <p className="text-sm font-bold text-slate-700">Ședință cu părinții</p>
              <p className="text-xs text-slate-500 mt-1">Vineri, 18:00 • Sala de festivități</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border-l-4 border-amber-500">
              <p className="text-sm font-bold text-slate-700">Control DSP anual</p>
              <p className="text-xs text-slate-500 mt-1">Marți, 24 Oct • Toate corpurile</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border-l-4 border-blue-500">
              <p className="text-sm font-bold text-slate-700">Excursie la fermă</p>
              <p className="text-xs text-slate-500 mt-1">Miercuri, 1 Noi • Grupa Mare</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
