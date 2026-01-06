
import React, { useState } from 'react';
import { 
  BarChart3, 
  FileSpreadsheet, 
  FileText, 
  Download, 
  ChevronRight,
  TrendingUp,
  Users,
  Printer,
  CheckCircle2,
  X,
  Calendar,
  Building,
  CalendarCheck,
  Wallet,
  ArrowUpCircle,
  ArrowDownCircle,
  Calculator,
  UserCheck,
  PackageCheck
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import * as XLSX from 'xlsx';

const ReportItem = ({ title, description, icon: Icon, color, onDownload, onPrint }: any) => (
  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all group flex items-start gap-5">
    <div className={`p-4 rounded-2xl ${color} text-white shadow-lg`}>
      <Icon size={24} />
    </div>
    <div className="flex-1">
      <h3 className="font-bold text-slate-800 text-lg mb-1">{title}</h3>
      <p className="text-sm text-slate-400 leading-relaxed mb-4">{description}</p>
      <div className="flex gap-3">
        <button 
          onClick={onDownload}
          className="flex items-center gap-1.5 text-[10px] font-black text-indigo-600 hover:bg-indigo-50 px-2.5 py-1.5 rounded-lg border border-indigo-100 transition-colors uppercase tracking-widest"
        >
          <Download size={14} /> EXCEL
        </button>
        <button 
          onClick={onPrint}
          className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 hover:text-slate-600 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-100 transition-colors uppercase tracking-widest"
        >
          <Printer size={14} /> TIPĂREȘTE
        </button>
      </div>
    </div>
  </div>
);

export const Reports = () => {
  const { students, inventory, payments, attendance, transactions, config, parents } = useApp();
  const { user } = useAuth();
  const [activePrintReport, setActivePrintReport] = useState<'inventory' | 'students' | 'payments' | 'attendance' | 'financial' | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const getItem = (id: string) => inventory.find(i => i.id === id);

  const calculateFinancialData = (month: string) => {
    const monthPayments = payments.filter(p => p.month === month);
    const totalRevenue = monthPayments.reduce((acc, p) => acc + p.amount, 0);

    const monthExits = transactions.filter(t => t.type === 'EXIT' && t.date.startsWith(month));
    const expenditures = monthExits.map(tx => {
      const item = getItem(tx.foodItemId);
      const price = item?.lastPrice || 0;
      return {
        date: tx.date.split('T')[0],
        name: item?.name || 'Aliment șters',
        qty: tx.quantity,
        unit: item?.unit || '-',
        price: price,
        total: tx.quantity * price,
        ref: tx.documentRef
      };
    });
    
    const totalExpenditure = expenditures.reduce((acc, e) => acc + e.total, 0);

    return {
      monthPayments,
      totalRevenue,
      expenditures,
      totalExpenditure,
      balance: totalRevenue - totalExpenditure
    };
  };

  const createSheet = (data: any[], colWidths?: number[]) => {
    const ws = XLSX.utils.json_to_sheet(data);
    if (colWidths) {
      ws['!cols'] = colWidths.map(w => ({ wch: w }));
    } else {
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      ws['!cols'] = Array(range.e.c + 1).fill({ wch: 18 });
    }
    return ws;
  };

  const handleDownloadExcel = (type: string) => {
    let wb = XLSX.utils.book_new();
    let filename = `raport_${type}_${new Date().toISOString().split('T')[0]}.xlsx`;

    if (type === 'students' || type === 'all') {
      const data = students.map(s => {
        const parent = parents.find(p => p.id === s.parentId);
        return {
          'Nume': s.lastName,
          'Prenume': s.firstName,
          'Grupă': s.group,
          'CNP': s.cnp || '-',
          'Părinte': parent?.name || '-',
          'Telefon': parent?.phone || '-',
          'Email': parent?.email || '-',
          'Status': s.active ? 'Activ' : 'Inactiv'
        };
      });
      XLSX.utils.book_append_sheet(wb, createSheet(data), "Listă Elevi");
    } 

    if (type === 'inventory' || type === 'all') {
      const data = inventory.map(i => ({
        'Produs': i.name,
        'Stoc Curent': i.quantity,
        'Unitate': i.unit,
        'Stoc Minim': i.minStock,
        'Ultim Preț (RON)': i.lastPrice,
        'Valoare Stoc (RON)': (i.quantity * i.lastPrice).toFixed(2)
      }));
      XLSX.utils.book_append_sheet(wb, createSheet(data), "Situație Magazie");
    } 

    if (type === 'payments' || type === 'all') {
      const data = payments.filter(p => type === 'all' ? p.month === selectedMonth : true).map(p => {
        const student = students.find(s => s.id === p.studentId);
        return {
          'Dată Încasare': p.date.split('T')[0],
          'Număr Factură': p.invoiceNumber,
          'Nume Elev': student ? `${student.lastName} ${student.firstName}` : 'Elev Șters',
          'Sumă (RON)': p.amount,
          'Metodă': p.method,
          'Lună Alocată': p.month
        };
      });
      XLSX.utils.book_append_sheet(wb, createSheet(data), "Registru Încasări");
    }

    if (type === 'attendance' || type === 'all') {
      const data = students.map(s => {
        const studentAttendance = attendance.filter(a => a.studentId === s.id && a.date.startsWith(selectedMonth));
        return {
          'Elev': `${s.lastName} ${s.firstName}`,
          'Grupă': s.group,
          'Lună Raportată': selectedMonth,
          'Prezențe': studentAttendance.filter(a => a.status === 'PREZENT').length,
          'Absențe': studentAttendance.filter(a => a.status === 'ABSENT').length,
          'Motivate': studentAttendance.filter(a => a.status === 'MOTIVAT').length
        };
      });
      XLSX.utils.book_append_sheet(wb, createSheet(data), "Raport Prezență");
    }

    if (type === 'financial' || type === 'all') {
      const financialData = calculateFinancialData(selectedMonth);
      
      const summary = [
        { 'Categorie': 'Venituri Totale (Încasări Părinți)', 'Suma': financialData.totalRevenue },
        { 'Categorie': 'Cheltuieli Totale (Alimente Consumate)', 'Suma': financialData.totalExpenditure },
        { 'Categorie': 'Balanță Netă', 'Suma': financialData.balance }
      ];
      XLSX.utils.book_append_sheet(wb, createSheet(summary), "Rezumat Financiar");

      const revDetail = financialData.monthPayments.map(p => {
        const s = students.find(x => x.id === p.studentId);
        return {
          'Data': p.date.split('T')[0],
          'Elev': s ? `${s.lastName} ${s.firstName}` : '-',
          'Factura': p.invoiceNumber,
          'Metoda': p.method,
          'Suma': p.amount
        };
      });
      XLSX.utils.book_append_sheet(wb, createSheet(revDetail), "Detalii Venituri");

      const expDetail = financialData.expenditures.map(e => ({
        'Data': e.date,
        'Produs': e.name,
        'Cantitate': e.qty,
        'UM': e.unit,
        'Pret Unitar': e.price,
        'Valoare': e.total,
        'Referinta': e.ref
      }));
      XLSX.utils.book_append_sheet(wb, createSheet(expDetail), "Detalii Cheltuieli");
    }

    if (wb.SheetNames.length > 0) {
      XLSX.writeFile(wb, type === 'all' ? `raport_complet_${selectedMonth}.xlsx` : filename);
    }
  };

  const triggerPrint = (type: any) => {
    setActivePrintReport(type);
    setTimeout(() => {
      window.print();
      setActivePrintReport(null);
    }, 300);
  };

  const isAdmin = user?.role === 'ADMIN';
  const financialData = calculateFinancialData(selectedMonth);

  return (
    <div className="space-y-8 pb-20">
      {/* SECTIUNE RAPORT PENTRU PRINTARE */}
      <div className="hidden print:block bg-white text-black p-4 font-serif">
        <div className="border-b-4 border-black pb-4 mb-8 flex justify-between items-end">
          <div className="space-y-1">
             <h1 className="text-2xl font-black uppercase tracking-tighter">{config.institutionName}</h1>
             <p className="text-sm">{config.address}</p>
          </div>
          <div className="text-right">
             <p className="text-sm font-bold uppercase tracking-widest">
                {activePrintReport === 'inventory' ? 'SITUAȚIE INVENTAR ALIMENTE' : 
                 activePrintReport === 'students' ? 'CENTRALIZATOR NOMINAL ELEVI' :
                 activePrintReport === 'payments' ? 'REGISTRU JURNAL ÎNCASĂRI' :
                 activePrintReport === 'attendance' ? 'RAPORT LUNAR PREZENȚĂ' :
                 'BILANȚ FINANCIAR LUNAR'}
             </p>
             <p className="text-xs">Lună raportată: {selectedMonth}</p>
             <p className="text-xs">Data generării: {new Date().toLocaleDateString('ro-RO')}</p>
          </div>
        </div>

        {activePrintReport === 'attendance' && (
           <table className="w-full border-collapse border border-black text-xs">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-black p-2 text-left">ELEV</th>
                <th className="border border-black p-2 text-center">GRUPĂ</th>
                <th className="border border-black p-2 text-right">PREZENȚE</th>
                <th className="border border-black p-2 text-right">ABSENȚE</th>
                <th className="border border-black p-2 text-right">MOTIVATE</th>
              </tr>
            </thead>
            <tbody>
              {students.sort((a,b) => a.lastName.localeCompare(b.lastName)).map(s => {
                const att = attendance.filter(a => a.studentId === s.id && a.date.startsWith(selectedMonth));
                return (
                  <tr key={s.id}>
                    <td className="border border-black p-2 font-bold">{s.lastName} {s.firstName}</td>
                    <td className="border border-black p-2 text-center">{s.group}</td>
                    <td className="border border-black p-2 text-right">{att.filter(a => a.status === 'PREZENT').length}</td>
                    <td className="border border-black p-2 text-right">{att.filter(a => a.status === 'ABSENT').length}</td>
                    <td className="border border-black p-2 text-right">{att.filter(a => a.status === 'MOTIVAT').length}</td>
                  </tr>
                );
              })}
            </tbody>
           </table>
        )}

        {activePrintReport === 'financial' && (
          <div className="space-y-8">
            <div className="grid grid-cols-3 gap-4">
              <div className="border border-black p-4 text-center">
                <p className="text-[10px] font-bold uppercase">Venituri Totale</p>
                <p className="text-lg font-black">{financialData.totalRevenue.toFixed(2)} {config.currency}</p>
              </div>
              <div className="border border-black p-4 text-center">
                <p className="text-[10px] font-bold uppercase">Cheltuieli Totale</p>
                <p className="text-lg font-black">{financialData.totalExpenditure.toFixed(2)} {config.currency}</p>
              </div>
              <div className={`border border-black p-4 text-center ${financialData.balance >= 0 ? 'bg-gray-50' : 'bg-gray-100'}`}>
                <p className="text-[10px] font-bold uppercase">Rezultat (Balanță)</p>
                <p className="text-lg font-black">{financialData.balance.toFixed(2)} {config.currency}</p>
              </div>
            </div>
            
            <table className="w-full border-collapse border border-black text-xs">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-black p-2 text-left">PRODUS CONSUMAT</th>
                  <th className="border border-black p-2 text-center">UM</th>
                  <th className="border border-black p-2 text-right">CANTITATE</th>
                  <th className="border border-black p-2 text-right">VALOARE</th>
                </tr>
              </thead>
              <tbody>
                {financialData.expenditures.map((e, idx) => (
                  <tr key={idx}>
                    <td className="border border-black p-2">{e.name}</td>
                    <td className="border border-black p-2 text-center">{e.unit}</td>
                    <td className="border border-black p-2 text-right">{e.qty.toFixed(2)}</td>
                    <td className="border border-black p-2 text-right">{e.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activePrintReport === 'students' && (
           <table className="w-full border-collapse border border-black text-xs">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-black p-2 text-left">NUME COMPLET</th>
                <th className="border border-black p-2 text-center">GRUPĂ</th>
                <th className="border border-black p-2 text-center">CNP</th>
                <th className="border border-black p-2 text-left">PĂRINTE</th>
                <th className="border border-black p-2 text-center">TELEFON</th>
              </tr>
            </thead>
            <tbody>
              {students.sort((a,b) => a.lastName.localeCompare(b.lastName)).map(s => {
                const parent = parents.find(p => p.id === s.parentId);
                return (
                  <tr key={s.id}>
                    <td className="border border-black p-2 font-bold">{s.lastName} {s.firstName}</td>
                    <td className="border border-black p-2 text-center">{s.group}</td>
                    <td className="border border-black p-2 text-center">{s.cnp || '-'}</td>
                    <td className="border border-black p-2">{parent?.name || '-'}</td>
                    <td className="border border-black p-2 text-center">{parent?.phone || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
           </table>
        )}

        <div className="mt-20 grid grid-cols-2 gap-20 text-center text-xs">
           <div className="space-y-12"><p className="font-bold border-b border-black pb-2 uppercase">Întocmit de: {user?.name}</p></div>
           <div className="space-y-12"><p className="font-bold border-b border-black pb-2">APROBAT DIRECTOR</p></div>
        </div>
      </div>

      {/* UI APLICAȚIE */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Centru de Raportare</h2>
          <p className="text-slate-400 font-medium">Situații statistice și documente oficiale în format XLSX.</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
           <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Lună Raport:</label>
           <input 
             type="month" 
             className="bg-transparent border-none outline-none font-bold text-sm text-slate-700 p-1 cursor-pointer"
             value={selectedMonth}
             onChange={(e) => setSelectedMonth(e.target.value)}
           />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 print:hidden">
        <ReportItem 
          title="Registru Elevi" 
          description="Baza de date completă cu elevii înscriși și datele de contact ale părinților." 
          icon={Users} 
          color="bg-blue-600"
          onDownload={() => handleDownloadExcel('students')}
          onPrint={() => triggerPrint('students')}
        />

        <ReportItem 
          title="Raport Prezență" 
          description={`Centralizator prezențe pe luna ${new Date(selectedMonth + "-01").toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' })}.`} 
          icon={CalendarCheck} 
          color="bg-indigo-600"
          onDownload={() => handleDownloadExcel('attendance')}
          onPrint={() => triggerPrint('attendance')}
        />
        
        {isAdmin && (
          <>
            <ReportItem 
              title="Raport Financiar" 
              description={`Bilanț Venituri vs Cheltuieli pentru luna ${new Date(selectedMonth + "-01").toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' })}.`} 
              icon={Wallet} 
              color="bg-emerald-600"
              onDownload={() => handleDownloadExcel('financial')}
              onPrint={() => triggerPrint('financial')}
            />
            <ReportItem 
              title="Registru Încasări" 
              description="Istoricul plăților și situația financiară centralizată per elev." 
              icon={TrendingUp} 
              color="bg-violet-600"
              onDownload={() => handleDownloadExcel('payments')}
              onPrint={() => triggerPrint('payments')}
            />
            <ReportItem 
              title="Situație Inventar" 
              description="Raportul valoric și cantitativ al stocurilor din magazie la zi." 
              icon={BarChart3} 
              color="bg-slate-700"
              onDownload={() => handleDownloadExcel('inventory')}
              onPrint={() => triggerPrint('inventory')}
            />
          </>
        )}
      </div>

      {isAdmin && (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden print:hidden group">
          <div className="p-10 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between bg-slate-50/50 gap-6">
            <div className="flex items-center gap-6">
               <div className="w-20 h-20 bg-indigo-600 text-white rounded-3xl flex items-center justify-center shadow-2xl group-hover:scale-105 transition-transform">
                  <PackageCheck size={40} />
               </div>
               <div>
                  <h3 className="font-black text-slate-800 text-3xl tracking-tight">Audit Complet Gestiune</h3>
                  <p className="text-slate-500 text-lg font-medium">Exportă toate datele sistemului într-un singur fișier Excel structurat.</p>
               </div>
            </div>
            <button 
              onClick={() => handleDownloadExcel('all')}
              className="px-8 py-5 bg-slate-900 text-white rounded-2xl font-black text-lg hover:bg-slate-800 transition-all flex items-center gap-3 shadow-2xl active:scale-95"
            >
              <FileSpreadsheet size={24} className="text-emerald-400" /> Export Raport Complet
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
