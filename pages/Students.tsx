
import React, { useState, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import * as XLSX from 'xlsx';
import { 
  Search, 
  UserPlus, 
  Phone, 
  Mail, 
  MapPin,
  Filter,
  Edit,
  Trash2,
  X,
  FileSpreadsheet,
  Printer,
  Download,
  Users,
  Save,
  CheckCircle2,
  AlertCircle,
  Eye,
  Calendar,
  CreditCard,
  History,
  Info,
  Upload,
  FileDown,
  AlertTriangle
} from 'lucide-react';

export const Students = () => {
  const { students, parents, addStudent, updateStudent, deleteStudent, attendance, payments, config, importStudents } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('Toate');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [viewingStudentId, setViewingStudentId] = useState<string | null>(null);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [studentIdToDelete, setStudentIdToDelete] = useState<string | null>(null);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');
  const [errors, setErrors] = useState<{ cnp?: string }>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [localFormData, setLocalFormData] = useState({
    firstName: '', 
    lastName: '', 
    group: config.groups[0] || 'Mică', 
    cnp: '',
    parentName: '', 
    parentPhone: '', 
    parentEmail: '', 
    parentAddress: ''
  });

  const validateCNP = (cnp: string): boolean => {
    if (!cnp) return true; 
    if (cnp.length !== 13) return false;
    if (!/^\d+$/.test(cnp)) return false;
    return true; 
  };

  const filteredStudents = students.filter(s => {
    const fullName = `${s.firstName} ${s.lastName}`.toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase());
    const matchesGroup = selectedGroup === 'Toate' || s.group === selectedGroup;
    return matchesSearch && matchesGroup;
  });

  const getParent = (id: string) => parents.find(p => p.id === id);

  const handleExportExcel = () => {
    const data = filteredStudents.map(s => {
      const p = getParent(s.parentId);
      return {
        'Nume': s.lastName,
        'Prenume': s.firstName,
        'Grupă': s.group,
        'CNP': s.cnp || '-',
        'Părinte': p?.name || '-',
        'Telefon': p?.phone || '-',
        'Email': p?.email || '-',
        'Adresă': p?.address || '-'
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Elevi");
    XLSX.writeFile(wb, `lista_elevi_${selectedGroup}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Nume': 'Popescu',
        'Prenume': 'Ionut',
        'Grupă': config.groups[0] || 'Mică',
        'CNP': '5180101123456',
        'Nume Părinte': 'Popescu Andrei',
        'Telefon': '0722111222',
        'Email': 'andrei@example.com',
        'Adresă': 'Strada Florilor Nr. 5, Băilești'
      }
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(templateData);
    
    // Setare lățime coloane
    const wscols = [
      {wch: 15}, {wch: 15}, {wch: 15}, {wch: 20}, {wch: 25}, {wch: 15}, {wch: 25}, {wch: 35}
    ];
    ws['!cols'] = wscols;

    XLSX.utils.book_append_sheet(wb, ws, "Șablon Import");
    XLSX.writeFile(wb, "sablon_import_elevi.xlsx");
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawData = XLSX.utils.sheet_to_json(ws) as any[];

        if (rawData.length === 0) {
          alert("Fișierul este gol.");
          return;
        }

        const mappedData = rawData.map(row => ({
          nume: row['Nume'] || row['nume'],
          prenume: row['Prenume'] || row['prenume'],
          grupa: row['Grupă'] || row['Grupa'] || row['grupa'],
          cnp: row['CNP'] || row['cnp'],
          numeParinte: row['Nume Părinte'] || row['Parinte'] || row['numeParinte'],
          telefon: row['Telefon'] || row['telefon'],
          email: row['Email'] || row['email'],
          adresa: row['Adresă'] || row['Adresa'] || row['adresa']
        }));

        if (confirm(`Sunteți sigur că doriți să importați ${mappedData.length} elevi?`)) {
          importStudents(mappedData);
          alert(`Import realizat cu succes! Au fost adăugați ${mappedData.length} elevi.`);
        }
      } catch (err) {
        alert("Eroare la procesarea fișierului Excel. Asigurați-vă că este un format valid.");
      }
      e.target.value = ''; 
    };
    reader.readAsBinaryString(file);
  };

  const openRegisterModal = () => {
    setEditingStudentId(null);
    setErrors({});
    setLocalFormData({
      firstName: '', 
      lastName: '', 
      group: config.groups[0] || 'Mică', 
      cnp: '',
      parentName: '', 
      parentPhone: '', 
      parentEmail: '', 
      parentAddress: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    const parent = student ? getParent(student.parentId) : null;
    
    if (student) {
      setEditingStudentId(studentId);
      setErrors({});
      setLocalFormData({
        firstName: student.firstName,
        lastName: student.lastName,
        group: student.group,
        cnp: student.cnp || '',
        parentName: parent?.name || '',
        parentPhone: parent?.phone || '',
        parentEmail: parent?.email || '',
        parentAddress: parent?.address || ''
      });
      setIsModalOpen(true);
    }
  };

  const openDetailModal = (studentId: string) => {
    setViewingStudentId(studentId);
    setIsDetailModalOpen(true);
  };

  const openDeleteModal = (studentId: string) => {
    setStudentIdToDelete(studentId);
    setDeleteConfirmationInput('');
    setIsDeleteModalOpen(true);
  };

  const confirmDeletion = () => {
    if (studentIdToDelete && deleteConfirmationInput === 'ȘTERGE') {
      deleteStudent(studentIdToDelete);
      setIsDeleteModalOpen(false);
      setStudentIdToDelete(null);
      setDeleteConfirmationInput('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (localFormData.cnp && !validateCNP(localFormData.cnp)) {
      setErrors({ cnp: 'Format CNP invalid.' });
      return;
    }

    if (editingStudentId) {
      updateStudent(
        editingStudentId,
        { firstName: localFormData.firstName, lastName: localFormData.lastName, group: localFormData.group, cnp: localFormData.cnp },
        { name: localFormData.parentName, phone: localFormData.parentPhone, email: localFormData.parentEmail, address: localFormData.parentAddress }
      );
    } else {
      addStudent(
        { firstName: localFormData.firstName, lastName: localFormData.lastName, group: localFormData.group, cnp: localFormData.cnp, active: true, parentId: '' },
        { name: localFormData.parentName, phone: localFormData.parentPhone, email: localFormData.parentEmail, address: localFormData.parentAddress }
      );
    }
    setIsModalOpen(false);
  };

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

  const studentToBeDeleted = useMemo(() => 
    studentIdToDelete ? students.find(s => s.id === studentIdToDelete) : null,
  [studentIdToDelete, students]);

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Caută elev după nume..." 
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none shadow-sm transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2.5 rounded-xl shadow-sm">
            <Filter size={18} className="text-slate-400" />
            <select 
              className="bg-transparent text-sm font-bold outline-none text-slate-600 cursor-pointer"
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
            >
              <option value="Toate">Toate grupele</option>
              {config.groups.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={handleDownloadTemplate}
              title="Descarcă Șablon Excel"
              className="p-2.5 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-xl border border-amber-200 transition-all shadow-sm active:scale-95"
            >
              <FileDown size={20} />
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 bg-white hover:bg-emerald-50 text-emerald-600 px-4 py-2.5 rounded-xl font-bold border border-emerald-200 transition-all shadow-sm active:scale-95"
            >
              <Upload size={18} />
              Import Excel
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".xlsx, .xls" 
              onChange={handleImportExcel} 
            />
          </div>

          <button 
            onClick={handleExportExcel}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-600 px-5 py-2.5 rounded-xl font-bold border border-slate-200 transition-all shadow-sm active:scale-95"
          >
            <FileSpreadsheet size={18} className="text-emerald-500" />
            Export Excel
          </button>
          
          <button 
            onClick={openRegisterModal}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-95"
          >
            <UserPlus size={18} />
            Înscrie Elev
          </button>
        </div>
      </div>

      {/* Students Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {filteredStudents.length > 0 ? filteredStudents.map(student => {
          const parent = getParent(student.parentId);
          return (
            <div key={student.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden group hover:border-blue-300 transition-all flex flex-col sm:flex-row">
              <div className="p-6 flex-1">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xl uppercase shadow-inner group-hover:bg-blue-600 group-hover:text-white transition-all">
                    {student.lastName[0]}{student.firstName[0]}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800 tracking-tight">{student.lastName} {student.firstName}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest">
                        Grupa {student.group}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <Users size={14} className="text-blue-500" />
                    <span className="font-bold text-slate-700">{parent?.name || '---'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <Phone size={14} className="text-emerald-500" />
                    <span className="font-medium">{parent?.phone || '---'}</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-slate-50 sm:w-24 border-t sm:border-t-0 sm:border-l border-slate-100 flex sm:flex-col items-center justify-center gap-3 p-4">
                <button 
                  onClick={() => openDetailModal(student.id)}
                  title="Vezi Profil Complet"
                  className="p-3 bg-white text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 rounded-2xl transition-all shadow-sm active:scale-90"
                >
                  <Eye size={20} />
                </button>
                <button 
                  onClick={() => openEditModal(student.id)}
                  title="Editează Elev"
                  className="p-3 bg-white text-slate-400 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 rounded-2xl transition-all shadow-sm active:scale-90"
                >
                  <Edit size={20} />
                </button>
                <button 
                  onClick={() => openDeleteModal(student.id)}
                  title="Șterge Elev"
                  className="p-3 bg-white text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 rounded-2xl transition-all shadow-sm active:scale-90"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          );
        }) : (
          <div className="col-span-full py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
            <Search size={48} className="mb-4 opacity-10" />
            <p className="text-lg font-medium">Niciun elev găsit.</p>
          </div>
        )}
      </div>

      {/* DELETE CONFIRMATION MODAL ENHANCED */}
      {isDeleteModalOpen && studentToBeDeleted && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in duration-200 border border-rose-100">
            <div className="p-8 text-center space-y-6">
              <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto shadow-inner ring-4 ring-rose-100">
                <AlertTriangle size={40} />
              </div>
              <div className="space-y-3">
                <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Confirmare Ștergere</h3>
                <p className="text-slate-500 font-medium leading-relaxed">
                  Sunteți pe cale să ștergeți profilul elevului <span className="font-black text-rose-600 underline">{studentToBeDeleted.lastName} {studentToBeDeleted.firstName}</span>.
                  Această acțiune este <span className="font-bold text-slate-800">ireversibilă</span> și va șterge toate datele asociate (prezență, plăți).
                </p>
              </div>

              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block text-left ml-1">
                  Scrieți „ȘTERGE” pentru a confirma:
                </label>
                <input 
                  type="text"
                  placeholder="Introduceți confirmarea..."
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-rose-500 transition-all font-black text-center text-rose-600 placeholder:text-slate-300"
                  value={deleteConfirmationInput}
                  onChange={(e) => setDeleteConfirmationInput(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={confirmDeletion}
                  disabled={deleteConfirmationInput !== 'ȘTERGE'}
                  className={`w-full py-4 rounded-2xl font-black transition-all shadow-xl uppercase text-xs tracking-widest active:scale-95 flex items-center justify-center gap-2 ${
                    deleteConfirmationInput === 'ȘTERGE' 
                      ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200' 
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  }`}
                >
                  <Trash2 size={18} />
                  Șterge Definitiv
                </button>
                <button 
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="w-full py-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-2xl font-black transition-all uppercase text-xs tracking-widest"
                >
                  Renunță
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* DETAIL MODAL */}
      {isDetailModalOpen && viewingData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] w-full max-w-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-3xl bg-blue-600 text-white flex items-center justify-center font-black text-3xl shadow-xl shadow-blue-200">
                  {viewingData.student.lastName[0]}{viewingData.student.firstName[0]}
                </div>
                <div>
                  <h2 className="text-3xl font-black text-slate-800 tracking-tight">{viewingData.student.lastName} {viewingData.student.firstName}</h2>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-widest">Grupa {viewingData.student.group}</span>
                    <span className="text-xs text-slate-400 font-medium italic">CNP: {viewingData.student.cnp || '---'}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="p-3 text-slate-400 hover:bg-white rounded-2xl transition-all shadow-sm"><X size={24} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-emerald-50 p-6 rounded-[2rem] border border-emerald-100">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Prezențe</p>
                  <p className="text-3xl font-black text-emerald-800">{viewingData.stats.present}</p>
                </div>
                <div className="bg-rose-50 p-6 rounded-[2rem] border border-rose-100">
                  <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1">Absențe</p>
                  <p className="text-3xl font-black text-rose-800">{viewingData.stats.absent}</p>
                </div>
                <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-100">
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Total Plătit</p>
                  <p className="text-3xl font-black text-blue-800">{viewingData.totalPaid} {config.currency}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="font-black text-slate-800 uppercase tracking-widest text-xs flex items-center gap-2">
                    <Phone size={14} className="text-blue-500" /> Date Contact Părinte
                  </h4>
                  <div className="p-6 bg-slate-50 rounded-3xl space-y-4 border border-slate-100">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nume Părinte</p>
                      <p className="font-bold text-slate-700">{viewingData.parent?.name || '---'}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Telefon</p>
                        <p className="font-bold text-slate-700">{viewingData.parent?.phone || '---'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</p>
                        <p className="font-bold text-slate-700 truncate">{viewingData.parent?.email || '---'}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Adresă</p>
                      <p className="font-bold text-slate-700 text-sm">{viewingData.parent?.address || '---'}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-black text-slate-800 uppercase tracking-widest text-xs flex items-center gap-2">
                    <CreditCard size={14} className="text-indigo-500" /> Istoric Plăți
                  </h4>
                  <div className="bg-slate-50 rounded-3xl border border-slate-100 overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 font-black text-slate-400 uppercase">
                        <tr>
                          <th className="px-4 py-3">Data</th>
                          <th className="px-4 py-3">Lună</th>
                          <th className="px-4 py-3 text-right">Sumă</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {viewingData.payments.length > 0 ? viewingData.payments.map(p => (
                          <tr key={p.id}>
                            <td className="px-4 py-3 text-slate-600">{new Date(p.date).toLocaleDateString('ro-RO')}</td>
                            <td className="px-4 py-3 font-bold text-slate-800">{p.month}</td>
                            <td className="px-4 py-3 text-right font-black text-indigo-600">{p.amount} {config.currency}</td>
                          </tr>
                        )) : (
                          <tr><td colSpan={3} className="px-4 py-6 text-center text-slate-400 italic">Nicio plată înregistrată</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REGISTRATION / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg">
                  {editingStudentId ? <Edit size={24} /> : <UserPlus size={24} />}
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">{editingStudentId ? 'Editează Elev' : 'Înscriere Elev Nou'}</h2>
                  <p className="text-xs text-slate-400 font-medium">Introduceți datele elevului și ale reprezentantului legal.</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-3 text-slate-400 hover:bg-white rounded-2xl transition-all shadow-sm"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8">
              <div className="space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-2">
                  <Users size={16} className="text-blue-500" />
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date Elev</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nume Familie</label>
                    <input required className="w-full px-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-slate-700" value={localFormData.lastName} onChange={e => setLocalFormData({...localFormData, lastName: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Prenume</label>
                    <input required className="w-full px-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-slate-700" value={localFormData.firstName} onChange={e => setLocalFormData({...localFormData, firstName: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Grupă</label>
                    <select className="w-full px-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-slate-700 bg-white" value={localFormData.group} onChange={e => setLocalFormData({...localFormData, group: e.target.value})}>
                      {config.groups.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CNP</label>
                    <input className={`w-full px-4 py-3 rounded-2xl border ${errors.cnp ? 'border-rose-400' : 'border-slate-200'} outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono`} value={localFormData.cnp} onChange={e => setLocalFormData({...localFormData, cnp: e.target.value})} />
                    {errors.cnp && <p className="text-[10px] text-rose-500 font-bold ml-1">{errors.cnp}</p>}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-2">
                  <Phone size={16} className="text-emerald-500" />
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date Părinte / Tutore</h4>
                </div>
                <div className="space-y-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nume Complet Părinte</label>
                    <input required className="w-full px-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-slate-700" value={localFormData.parentName} onChange={e => setLocalFormData({...localFormData, parentName: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Telefon Mobil</label>
                      <input required className="w-full px-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-slate-700" value={localFormData.parentPhone} onChange={e => setLocalFormData({...localFormData, parentPhone: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                      <input type="email" className="w-full px-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-slate-700" value={localFormData.parentEmail} onChange={e => setLocalFormData({...localFormData, parentEmail: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Adresă Domiciliu</label>
                    <textarea rows={2} className="w-full px-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-700" value={localFormData.parentAddress} onChange={e => setLocalFormData({...localFormData, parentAddress: e.target.value})} />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 px-6 rounded-2xl font-black text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all uppercase text-xs tracking-widest">Anulează</button>
                <button type="submit" className="flex-2 py-4 px-10 rounded-2xl font-black text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 uppercase text-xs tracking-widest active:scale-95 flex items-center justify-center gap-2">
                  <Save size={18} />
                  {editingStudentId ? 'Salvează Modificări' : 'Finalizează Înscrierea'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
