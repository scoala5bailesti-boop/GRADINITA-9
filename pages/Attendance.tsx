
import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { AttendanceStatus } from '../types';
import * as XLSX from 'xlsx';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight,
  Download,
  Printer,
  Check,
  X as XIcon,
  FileText,
  Clock,
  Filter,
  UserCheck,
  LayoutGrid,
  List
} from 'lucide-react';

export const Attendance = () => {
  const { students, attendance, recordAttendance, config } = useApp();
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedGroup, setSelectedGroup] = useState(config.groups[0] || '');

  // Efect pentru a asigura că grupa selectată există în config
  useEffect(() => {
    if (!config.groups.includes(selectedGroup) && config.groups.length > 0) {
      setSelectedGroup(config.groups[0]);
    }
  }, [config.groups, selectedGroup]);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [year, month] = currentMonth.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const studentsInGroup = useMemo(() => 
    students.filter(s => s.group === selectedGroup && s.active), 
  [students, selectedGroup]);

  const getAttendanceStatus = (studentId: string, dateStr: string): AttendanceStatus | 'NONE' => {
    const record = attendance.find(a => a.studentId === studentId && a.date === dateStr);
    return record ? record.status : 'NONE';
  };

  const handleStatusChange = (studentId: string, dateStr: string) => {
    const currentStatus = getAttendanceStatus(studentId, dateStr);
    
    let nextStatus: AttendanceStatus;
    if (currentStatus === 'NONE' || currentStatus === 'ABSENT') nextStatus = 'PREZENT';
    else if (currentStatus === 'PREZENT') nextStatus = 'MOTIVAT';
    else nextStatus = 'ABSENT';

    recordAttendance(dateStr, [{ studentId, status: nextStatus }]);
  };

  const markAllPresentToday = () => {
    if (!confirm(`Doriți să marcați toți elevii din grupa ${selectedGroup} ca PREZENȚI pentru azi?`)) return;
    const records = studentsInGroup.map(s => ({ studentId: s.id, status: 'PREZENT' as AttendanceStatus }));
    recordAttendance(todayStr, records);
  };

  const handlePrevMonth = () => {
    const d = new Date(year, month - 2, 1);
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const d = new Date(year, month, 1);
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    const data = studentsInGroup.map(s => {
      const row: any = { 'Nume Elev': `${s.lastName} ${s.firstName}` };
      let presentCount = 0;
      let absentCount = 0;
      let motivatedCount = 0;

      daysArray.forEach(d => {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const status = getAttendanceStatus(s.id, dateStr);
        row[d] = status === 'NONE' ? '-' : status;
        if (status === 'PREZENT') presentCount++;
        else if (status === 'ABSENT') absentCount++;
        else if (status === 'MOTIVAT') motivatedCount++;
      });

      row['TOTAL PREZENT'] = presentCount;
      row['TOTAL ABSENT'] = absentCount;
      row['TOTAL MOTIVAT'] = motivatedCount;
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [{ wch: 25 }, ...daysArray.map(() => ({ wch: 4 })), { wch: 15 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, ws, "Prezență Lunară");
    XLSX.writeFile(wb, `prezenta_${selectedGroup}_${currentMonth}.xlsx`);
  };

  const monthName = new Date(year, month - 1).toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6 print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex p-1 bg-slate-100 rounded-2xl">
              <button 
                onClick={() => setViewMode('daily')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'daily' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <UserCheck size={16} />
                Zilnică
              </button>
              <button 
                onClick={() => setViewMode('monthly')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'monthly' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <LayoutGrid size={16} />
                Lunară
              </button>
            </div>
            
            <div className="h-8 w-[1px] bg-slate-200 hidden sm:block"></div>

            <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100 shadow-inner">
              <button onClick={handlePrevMonth} className="p-2 hover:bg-white rounded-lg transition-all text-slate-600 shadow-sm"><ChevronLeft size={18} /></button>
              <div className="px-4 font-black text-slate-800 uppercase text-[10px] tracking-widest min-w-[120px] text-center">{monthName}</div>
              <button onClick={handleNextMonth} className="p-2 hover:bg-white rounded-lg transition-all text-slate-600 shadow-sm"><ChevronRight size={18} /></button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
             <button onClick={() => window.print()} className="flex items-center gap-2 text-slate-600 hover:bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-black uppercase tracking-widest transition-all">
              <Printer size={16} />
              Print
            </button>
            <button onClick={handleExportExcel} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20 active:scale-95">
              <Download size={16} />
              Export XLSX
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
          {config.groups.map(group => (
            <button
              key={group}
              onClick={() => setSelectedGroup(group)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest ${selectedGroup === group ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
            >
              {group}
            </button>
          ))}
        </div>
      </div>

      {viewMode === 'daily' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-6 rounded-3xl border border-slate-200 shadow-sm print:hidden">
            <div>
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Prezență Azi</h2>
              <p className="text-xs text-slate-400 font-medium">{new Date().toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
            <button 
              onClick={markAllPresentToday}
              className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest border border-emerald-100 transition-all active:scale-95"
            >
              Marchează toți prezenți
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {studentsInGroup.map(student => {
              const status = getAttendanceStatus(student.id, todayStr);
              return (
                <div key={student.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-blue-300 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-400 uppercase tracking-tighter">
                      {student.lastName[0]}{student.firstName[0]}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800">{student.lastName} {student.firstName}</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Grupa {student.group}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    <button 
                      onClick={() => recordAttendance(todayStr, [{ studentId: student.id, status: 'PREZENT' }])}
                      title="Prezent"
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${status === 'PREZENT' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' : 'bg-slate-50 text-slate-300 hover:bg-emerald-50 hover:text-emerald-500'}`}
                    >
                      <Check size={20} />
                    </button>
                    <button 
                      onClick={() => recordAttendance(todayStr, [{ studentId: student.id, status: 'ABSENT' }])}
                      title="Absent"
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${status === 'ABSENT' ? 'bg-rose-500 text-white shadow-lg shadow-rose-100' : 'bg-slate-50 text-slate-300 hover:bg-rose-50 hover:text-rose-500'}`}
                    >
                      <XIcon size={20} />
                    </button>
                    <button 
                      onClick={() => recordAttendance(todayStr, [{ studentId: student.id, status: 'MOTIVAT' }])}
                      title="Motivat"
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${status === 'MOTIVAT' ? 'bg-blue-500 text-white shadow-lg shadow-blue-100' : 'bg-slate-50 text-slate-300 hover:bg-blue-50 hover:text-blue-500'}`}
                    >
                      <FileText size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto relative">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 sticky top-0 z-20 print:bg-white">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 min-w-[200px] sticky left-0 bg-slate-50 z-30 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.05)] print:bg-white">
                    Nume Elev
                  </th>
                  {daysArray.map(day => (
                    <th key={day} className="px-2 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 text-center min-w-[36px]">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {studentsInGroup.length > 0 ? studentsInGroup.map(student => (
                  <tr key={student.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-3 sticky left-0 bg-white z-10 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.05)] print:shadow-none">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-800 truncate">{student.lastName} {student.firstName}</span>
                        <span className="text-[9px] text-slate-400 font-medium">{student.cnp || 'Fără CNP'}</span>
                      </div>
                    </td>
                    {daysArray.map(day => {
                      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      const status = getAttendanceStatus(student.id, dateStr);
                      return (
                        <td key={day} className="p-1 border-x border-slate-50/50">
                          <button 
                            onClick={() => handleStatusChange(student.id, dateStr)}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all mx-auto ${
                              status === 'PREZENT' ? 'bg-emerald-500 text-white shadow-md' :
                              status === 'ABSENT' ? 'bg-rose-500 text-white shadow-md' :
                              status === 'MOTIVAT' ? 'bg-blue-500 text-white shadow-md' :
                              'bg-slate-50 hover:bg-slate-100 border border-slate-100'
                            }`}
                          >
                            {status === 'PREZENT' && <Check size={14} />}
                            {status === 'ABSENT' && <XIcon size={14} />}
                            {status === 'MOTIVAT' && <FileText size={14} />}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={daysInMonth + 1} className="p-20 text-center text-slate-400 font-medium italic">
                      Nu am găsit elevi în grupa "{selectedGroup}".
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 flex items-center gap-4 shadow-sm">
              <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl shadow-inner"><Check size={20} /></div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prezențe Lunare</p>
                <p className="text-2xl font-black text-slate-800">
                  {attendance.filter(a => a.date.startsWith(currentMonth) && a.status === 'PREZENT' && studentsInGroup.some(s => s.id === a.studentId)).length}
                </p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-200 flex items-center gap-4 shadow-sm">
              <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl shadow-inner"><XIcon size={20} /></div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Absențe Lunare</p>
                <p className="text-2xl font-black text-slate-800">
                  {attendance.filter(a => a.date.startsWith(currentMonth) && a.status === 'ABSENT' && studentsInGroup.some(s => s.id === a.studentId)).length}
                </p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-200 flex items-center gap-4 shadow-sm">
              <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl shadow-inner"><FileText size={20} /></div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Motivate Lunare</p>
                <p className="text-2xl font-black text-slate-800">
                  {attendance.filter(a => a.date.startsWith(currentMonth) && a.status === 'MOTIVAT' && studentsInGroup.some(s => s.id === a.studentId)).length}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Legend - Fixed at bottom for clarity */}
      <div className="flex flex-wrap gap-4 text-[10px] font-black uppercase tracking-widest text-slate-400 py-4 px-2 border-t border-slate-100">
        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-emerald-500 flex items-center justify-center text-white"><Check size={10} /></div> Prezent</div>
        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-rose-500 flex items-center justify-center text-white"><XIcon size={10} /></div> Absent</div>
        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-blue-500 flex items-center justify-center text-white"><FileText size={10} /></div> Motivat</div>
      </div>
    </div>
  );
};
