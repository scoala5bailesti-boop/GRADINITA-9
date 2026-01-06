
import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import * as XLSX from 'xlsx';
import { 
  DollarSign, 
  FileText, 
  Clock, 
  Plus, 
  Printer,
  AlertCircle, 
  CheckCircle2,
  TrendingUp,
  X,
  History as HistoryIcon,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Calculator,
  Eye,
  Users,
  Phone,
  Mail,
  MapPin,
  History,
  FileSpreadsheet,
  Wallet,
  Coins,
  Info,
  CalendarDays,
  FileCheck
} from 'lucide-react';

export const Payments = () => {
  const { students, parents, attendance, payments, addPayment, config } = useApp();
  const [activeTab, setActiveTab] = useState<'monthly' | 'registry'>('monthly');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [viewingStudentId, setViewingStudentId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [paymentForm, setPaymentForm] = useState({
    studentId: '',
    amount: 0,
    method: 'CASH' as 'CASH' | 'CARD' | 'TRANSFER',
    invoiceNumber: `F${Date.now().toString().slice(-6)}`
  });

  const [printReceiptData, setPrintReceiptData] = useState<any>(null);

  // State pentru zilele de școală editabile manual
  const [manualWorkingDays, setManualWorkingDays] = useState(0);

  // Funcție pentru a calcula zilele lucrătoare (Luni-Vineri) dintr-o lună
  const getWorkingDaysInMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    let count = 0;
    while (date.getMonth() === month - 1) {
      const dayOfWeek = date.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // 0 = Duminică, 6 = Sâmbătă
        count++;
      }
      date.setDate(date.getDate() + 1);
    }
    return count;
  };

  const defaultWorkingDays = useMemo(() => getWorkingDaysInMonth(selectedMonth), [selectedMonth]);

  // Actualizăm zilele manuale când se schimbă luna
  useEffect(() => {
    setManualWorkingDays(defaultWorkingDays);
  }, [defaultWorkingDays]);

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    
    if (activeTab === 'registry') {
      const filteredPayments = payments.filter(p => p.month === selectedMonth);
      const data = filteredPayments.map(p => {
        const student = students.find(s => s.id === p.studentId);
        return {
          'Dată Încasare': p.date.split('T')[0],
          'Nr. Factură': p.invoiceNumber,
          'Nume Elev': student ? `${student.lastName} ${student.firstName}` : '---',
          'Grupă': student?.group || '---',
          'Sumă (RON)': p.amount,
          'Metodă': p.method,
          'Lună Alocată': p.month
        };
      });
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, "Registru Plăți");
    } else {
      const data = students.map(s => {
        const stats = getMonthlyStatement(s.id, selectedMonth);
        return {
          'Nume Elev': `${s.lastName} ${s.firstName}`,
          'Grupă': s.group,
          'Zile Prezent': stats.currentMonthAttendance,
          'Cost Masă': stats.currentMonthCost,
          'Plătit Lună': stats.currentMonthPayments,
          'Sold Anterior': stats.carryOver,
          'Balanță Finală': stats.finalBalance,
          'Status': stats.finalBalance < 0 ? 'Datorie' : stats.finalBalance > 0 ? 'Credit' : 'Achitat'
        };
      });
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, "Situație Plăți");
    }

    XLSX.writeFile(wb, `raport_plati_${activeTab}_${selectedMonth}.xlsx`);
  };

  const getMonthlyStatement = (studentId: string, monthStr: string) => {
    const prevPayments = payments
      .filter(p => p.studentId === studentId && p.month < monthStr)
      .reduce((acc, p) => acc + p.amount, 0);
    
    const prevAttendance = attendance
      .filter(a => a.studentId === studentId && a.status === 'PREZENT' && a.date < `${monthStr}-01`)
      .length;
    
    const carryOver = prevPayments - (prevAttendance * config.foodCostPerDay);

    const currentMonthAttendance = attendance
      .filter(a => a.studentId === studentId && a.status === 'PREZENT' && a.date.startsWith(monthStr))
      .length;
    
    const currentMonthCost = currentMonthAttendance * config.foodCostPerDay;
    
    const currentMonthPayments = payments
      .filter(p => p.studentId === studentId && p.month === monthStr)
      .reduce((acc, p) => acc + p.amount, 0);

    const finalBalance = carryOver + currentMonthPayments - currentMonthCost;

    return {
      carryOver,
      currentMonthAttendance,
      currentMonthCost,
      currentMonthPayments,
      finalBalance
    };
  };

  const handlePrintReceipt = (payment: any) => {
    const student = students.find(s => s.id === payment.studentId);
    const parent = parents.find(p => p.id === student?.parentId);
    
    setPrintReceiptData({
      institution: config.institutionName,
      address: config.address,
      phone: config.phone,
      number: payment.invoiceNumber,
      date: new Date(payment.date).toLocaleDateString('ro-RO'),
      studentName: student ? `${student.lastName} ${student.firstName}` : '---',
      parentName: parent?.name || '---',
      amount: payment.amount,
      method: payment.method,
      month: payment.month,
      currency: config.currency
    });
    
    setTimeout(() => {
      window.print();
      setPrintReceiptData(null);
    }, 200);
  };

  const handleAddPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentForm.studentId || paymentForm.amount <= 0) return;

    const student = students.find(s => s.id === paymentForm.studentId);
    if (!student) return;

    addPayment({
      studentId: paymentForm.studentId,
      parentId: student.parentId,
      amount: paymentForm.amount,
      method: paymentForm.method,
      invoiceNumber: paymentForm.invoiceNumber,
      date: new Date().toISOString(),
      month: selectedMonth
    });

    setIsModalOpen(false);
    setPaymentForm({ studentId: '', amount: 0, method: 'CASH', invoiceNumber: `F${Date.now().toString().slice(-6)}` });
  };

  const totals = useMemo(() => {
    return students.reduce((acc, s) => {
      const stats = getMonthlyStatement(s.id, selectedMonth);
      acc.totalCost += stats.currentMonthCost;
      acc.totalPaid += stats.currentMonthPayments;
      if (stats.finalBalance < 0) acc.totalArrears += Math.abs(stats.finalBalance);
      if (stats.finalBalance > 0) acc.totalCredits += stats.finalBalance;
      return acc;
    }, { totalCost: 0, totalPaid: 0, totalArrears: 0, totalCredits: 0 });
  }, [students, attendance, payments, selectedMonth, config.foodCostPerDay]);

  const viewingData = useMemo(() => {
    if (!viewingStudentId) return null;
    const student = students.find(s => s.id === viewingStudentId);
    if (!student) return null;

    const parent = parents.find(p => p.id === student.parentId);
    const studentPayments = payments
      .filter(p => p.studentId === student.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    const studentAttendance = attendance
      .filter(a => a.studentId === student.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const totalPaid = studentPayments.reduce((acc, p) => acc + p.amount, 0);
    const stats = {
      present: studentAttendance.filter(a => a.status === 'PREZENT').length,
      absent: studentAttendance.filter(a => a.status === 'ABSENT').length,
      motivated: studentAttendance.filter(a => a.status === 'MOTIVAT').length
    };

    return { student, parent, payments: studentPayments, attendance: studentAttendance, totalPaid, stats };
  }, [viewingStudentId, students, parents, payments, attendance]);

  const monthName = new Date(selectedMonth + "-01").toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' });

  const updateSuggestedAmount = (studentId: string, days: number) => {
    if (!studentId) return;
    const stats = getMonthlyStatement(studentId, selectedMonth);
    const theoreticalFee = days * config.foodCostPerDay;
    const suggested = Math.max(0, theoreticalFee - stats.finalBalance);
    setPaymentForm(prev => ({ ...prev, amount: parseFloat(suggested.toFixed(2)) }));
  };

  return (
    <div className="space-y-6">
      {/* TEMPLATE PRINTARE CHITANȚĂ */}
      <div className="hidden print:block bg-white text-black p-12 font-serif">
        {printReceiptData && (
          <div className="border-4 border-black p-8 max-w-2xl mx-auto space-y-6">
            <div className="flex justify-between items-start border-b-2 border-black pb-4">
              <div className="space-y-1">
                <h1 className="text-xl font-black uppercase">{printReceiptData.institution}</h1>
                <p className="text-xs">{printReceiptData.address}</p>
                <p className="text-xs">Tel: {printReceiptData.phone}</p>
              </div>
              <div className="text-right">
                <h2 className="text-2xl font-black">CHITANȚĂ</h2>
                <p className="font-bold">NR: {printReceiptData.number}</p>
                <p className="text-sm">Data: {printReceiptData.date}</p>
              </div>
            </div>

            <div className="space-y-4 py-4">
              <p className="leading-loose">
                Am primit de la <span className="font-bold border-b border-dotted border-black px-2">{printReceiptData.parentName}</span>,
                reprezentant legal al elevului <span className="font-bold border-b border-dotted border-black px-2">{printReceiptData.studentName}</span>,
                suma de <span className="font-black text-lg border-b-2 border-black px-2">{printReceiptData.amount} {printReceiptData.currency}</span>,
                reprezentând contravaloare hrană pentru luna <span className="font-bold">{printReceiptData.month}</span>.
              </p>
              
              <div className="flex justify-between items-end mt-12">
                <div className="text-center w-48">
                  <p className="text-[10px] uppercase font-bold">Am încasat prin</p>
                  <p className="font-black border-b border-black py-1">{printReceiptData.method}</p>
                </div>
                <div className="text-center w-48 pt-12">
                   <p className="text-[10px] uppercase font-bold border-t border-black pt-1">Semnătură și Ștampilă</p>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-200 text-center">
               <p className="text-[9px] uppercase tracking-widest opacity-50 italic">Aceasta este o chitanță generată electronic.</p>
            </div>
          </div>
        )}
      </div>

      {/* Statistici Globale */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-xl w-fit mb-4"><DollarSign size={20} /></div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Cost Lună</p>
          <p className="text-2xl font-black text-slate-800">{totals.totalCost.toLocaleString()} {config.currency}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl w-fit mb-4"><CheckCircle2 size={20} /></div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Încasări Lună</p>
          <p className="text-2xl font-black text-slate-800">{totals.totalPaid.toLocaleString()} {config.currency}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="p-3 bg-rose-100 text-rose-600 rounded-xl w-fit mb-4"><AlertCircle size={20} /></div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Restanțe</p>
          <p className="text-2xl font-black text-rose-600">{totals.totalArrears.toLocaleString()} {config.currency}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl w-fit mb-4"><Coins size={20} /></div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Credite (În Plus)</p>
          <p className="text-2xl font-black text-indigo-600">{totals.totalCredits.toLocaleString()} {config.currency}</p>
        </div>
      </div>
      
      {/* Tabs & Month Selector */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden print:hidden">
        <div className="border-b border-slate-100 px-6 py-5 flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-slate-50/30">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex p-1.5 bg-slate-200/50 rounded-2xl">
              <button 
                onClick={() => setActiveTab('monthly')}
                className={`px-5 py-2.5 text-[10px] font-black rounded-xl transition-all uppercase tracking-widest ${activeTab === 'monthly' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Situație Lunară
              </button>
              <button 
                onClick={() => setActiveTab('registry')}
                className={`px-5 py-2.5 text-[10px] font-black rounded-xl transition-all uppercase tracking-widest ${activeTab === 'registry' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Registru Plăți
              </button>
            </div>
            
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm">
              <Calendar size={16} className="text-blue-500" />
              <input 
                type="month" 
                className="bg-transparent border-none outline-none font-bold text-sm text-slate-700 cursor-pointer"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             <button 
              onClick={handleExportExcel}
              className="flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-600 px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border border-slate-200 active:scale-95"
            >
              <FileSpreadsheet size={18} className="text-emerald-500" />
              Export {activeTab === 'monthly' ? 'Situație' : 'Registru'}
            </button>
            <button 
              onClick={() => {
                setIsModalOpen(true);
                setManualWorkingDays(defaultWorkingDays);
              }}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-blue-500/20 active:scale-95"
            >
              <Plus size={18} />
              Înregistrează Plată
            </button>
          </div>
        </div>

        {activeTab === 'monthly' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  <th className="px-6 py-4">Elev</th>
                  <th className="px-6 py-4 text-center">Zile Prezent</th>
                  <th className="px-6 py-4 text-right">Cost Lună</th>
                  <th className="px-6 py-4 text-right">Plătit în {monthName}</th>
                  <th className="px-6 py-4 text-right">Sold Reportat</th>
                  <th className="px-6 py-4 text-right">Balanță Finală</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-medium">
                {students.map(s => {
                  const stats = getMonthlyStatement(s.id, selectedMonth);
                  const isDebt = stats.finalBalance < 0;
                  const isCredit = stats.finalBalance > 0;
                  
                  return (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800">{s.lastName} {s.firstName}</span>
                          <span className="text-[10px] text-slate-400 uppercase">{s.group}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">{stats.currentMonthAttendance} zile</td>
                      <td className="px-6 py-4 text-right font-bold text-slate-600">{stats.currentMonthCost} {config.currency}</td>
                      <td className="px-6 py-4 text-right font-black text-emerald-600">{stats.currentMonthPayments} {config.currency}</td>
                      <td className={`px-6 py-4 text-right ${stats.carryOver < 0 ? 'text-rose-500' : stats.carryOver > 0 ? 'text-blue-500' : 'text-slate-400'}`}>
                        {stats.carryOver} {config.currency}
                      </td>
                      <td className={`px-6 py-4 text-right font-black ${isDebt ? 'text-rose-600 bg-rose-50/30' : isCredit ? 'text-emerald-600 bg-emerald-50/30' : 'text-slate-800'}`}>
                        {stats.finalBalance} {config.currency}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${isDebt ? 'bg-rose-100 text-rose-600' : isCredit ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'}`}>
                          {isDebt ? 'Datorie' : isCredit ? 'Credit' : 'Achitat'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                         <button 
                          onClick={() => { setViewingStudentId(s.id); setIsDetailModalOpen(true); }}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                         >
                           <Eye size={18} />
                         </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  <th className="px-6 py-4">Data Încasării</th>
                  <th className="px-6 py-4">Elev / Grupă</th>
                  <th className="px-6 py-4">Factură</th>
                  <th className="px-6 py-4 text-center">Metodă</th>
                  <th className="px-6 py-4 text-right">Sumă Încasată</th>
                  <th className="px-6 py-4 text-right">Acțiuni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {payments.filter(p => p.month === selectedMonth).length > 0 ? (
                  payments.filter(p => p.month === selectedMonth).map(p => {
                    const student = students.find(s => s.id === p.studentId);
                    return (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-500">{new Date(p.date).toLocaleDateString('ro-RO')}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800">{student?.lastName} {student?.firstName}</span>
                            <span className="text-[10px] text-slate-400 uppercase">{student?.group}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-slate-500">{p.invoiceNumber}</td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-[10px] font-black uppercase text-slate-600">{p.method}</span>
                        </td>
                        <td className="px-6 py-4 text-right font-black text-indigo-600 text-base">{p.amount} {config.currency}</td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => handlePrintReceipt(p)}
                            title="Tipărește Chitanță"
                            className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                          >
                            <Printer size={18} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr><td colSpan={6} className="px-6 py-20 text-center text-slate-400 italic">Nu există plăți înregistrate pe această lună.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Adăugare Plată */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300 print:hidden">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-200"><Wallet size={24} /></div>
                <div>
                  <h2 className="text-xl font-black text-slate-800 uppercase">Înregistrare Plată</h2>
                  <p className="text-xs text-slate-400 font-medium">Situație pentru luna {monthName}</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:bg-white rounded-xl transition-all"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleAddPayment} className="p-8 space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Selectează Elev</label>
                <select 
                  required
                  className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 font-bold text-slate-700 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  value={paymentForm.studentId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setPaymentForm(prev => ({ ...prev, studentId: id }));
                    updateSuggestedAmount(id, manualWorkingDays);
                  }}
                >
                  <option value="">Alege elevul...</option>
                  {students.sort((a,b) => a.lastName.localeCompare(b.lastName)).map(s => (
                    <option key={s.id} value={s.id}>{s.lastName} {s.firstName} ({s.group})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                    <CalendarDays size={10} className="text-blue-500" /> Zile Școală / Lucrate
                  </label>
                  <input 
                    type="number" 
                    className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50/50"
                    value={manualWorkingDays}
                    max={defaultWorkingDays}
                    onChange={(e) => {
                      const days = parseInt(e.target.value) || 0;
                      setManualWorkingDays(days);
                      updateSuggestedAmount(paymentForm.studentId, days);
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Metodă</label>
                  <select 
                    className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 font-bold bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                    value={paymentForm.method}
                    onChange={(e) => setPaymentForm({...paymentForm, method: e.target.value as any})}
                  >
                    <option value="CASH">Numerar</option>
                    <option value="CARD">Card Bancar</option>
                    <option value="TRANSFER">Transfer</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sumă de încasat ({config.currency})</label>
                  {paymentForm.studentId && (
                    <span className="text-[9px] font-black text-blue-600 uppercase flex items-center gap-1">
                      <Calculator size={10} /> {manualWorkingDays}z x {config.foodCostPerDay}
                    </span>
                  )}
                </div>
                <input 
                  type="number" 
                  required
                  step="0.01"
                  className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 font-black text-lg text-indigo-600 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={paymentForm.amount || ''}
                  onChange={(e) => setPaymentForm({...paymentForm, amount: parseFloat(e.target.value)})}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Număr Factură / Chitanță</label>
                <input 
                  className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 font-mono text-xs uppercase"
                  value={paymentForm.invoiceNumber}
                  onChange={(e) => setPaymentForm({...paymentForm, invoiceNumber: e.target.value})}
                />
              </div>

              <div className="pt-4 flex flex-col sm:flex-row gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 px-6 rounded-2xl font-black text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all uppercase text-xs tracking-widest">Anulează</button>
                <button type="submit" className="flex-[2] py-4 px-10 rounded-2xl font-black text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 uppercase text-xs tracking-widest active:scale-95 flex items-center justify-center gap-2">
                  <CheckCircle2 size={18} />
                  Confirmă Încasarea
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {isDetailModalOpen && viewingData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300 print:hidden">
          <div className="bg-white rounded-[3rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-2xl shadow-xl">
                  {viewingData.student.lastName[0]}{viewingData.student.firstName[0]}
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight">{viewingData.student.lastName} {viewingData.student.firstName}</h2>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Istoric Plăți & Balanță Detaliată</p>
                </div>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="p-3 text-slate-400 hover:bg-white rounded-2xl transition-all shadow-sm"><X size={24} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-8">
               <div className="grid grid-cols-2 gap-4">
                  <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Prezențe Lună Curentă</p>
                     <p className="text-2xl font-black text-slate-800">
                        {attendance.filter(a => a.studentId === viewingData.student.id && a.status === 'PREZENT' && a.date.startsWith(selectedMonth)).length} zile
                     </p>
                  </div>
                  <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Plătit (Ever)</p>
                     <p className="text-2xl font-black text-emerald-600">{viewingData.totalPaid} {config.currency}</p>
                  </div>
               </div>

               <div className="space-y-4">
                  <h4 className="font-black text-slate-800 uppercase tracking-widest text-xs flex items-center gap-2">
                    <HistoryIcon size={14} className="text-blue-500" /> Ultimele Tranzacții
                  </h4>
                  <div className="bg-slate-50 rounded-3xl border border-slate-100 overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 font-black text-slate-400 uppercase">
                        <tr>
                          <th className="px-6 py-4">Data</th>
                          <th className="px-6 py-4">Factură</th>
                          <th className="px-6 py-4 text-right">Sumă</th>
                          <th className="px-6 py-4 text-right">Acțiuni</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {viewingData.payments.map(p => (
                          <tr key={p.id} className="hover:bg-slate-100 transition-colors">
                            <td className="px-6 py-4 font-bold text-slate-600">{new Date(p.date).toLocaleDateString('ro-RO')}</td>
                            <td className="px-6 py-4 font-mono text-slate-500">{p.invoiceNumber}</td>
                            <td className="px-6 py-4 text-right font-black text-indigo-600">{p.amount} {config.currency}</td>
                            <td className="px-6 py-4 text-right">
                               <button 
                                onClick={() => handlePrintReceipt(p)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 transition-all"
                               >
                                  <Printer size={16} />
                               </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
               </div>
            </div>
            
            <div className="p-8 border-t border-slate-100 bg-slate-50/50">
               <button onClick={() => setIsDetailModalOpen(false)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all active:scale-95">
                  Închide Vizualizarea
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
