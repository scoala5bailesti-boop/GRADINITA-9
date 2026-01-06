
import React, { useState, useRef } from 'react';
import { 
  Settings as SettingsIcon, 
  Building, 
  Trash2, 
  Database, 
  Download, 
  Save,
  ShieldCheck,
  Plus,
  X,
  Layers,
  Utensils,
  UserPlus,
  Users,
  Edit2,
  Check,
  UploadCloud,
  FileJson,
  Calculator
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Role } from '../types';

export const Settings = () => {
  const { config, updateConfig, resetApp, clearAllMenus, students, parents, payments, inventory, transactions, users, addUser, deleteUser, addGroup, renameGroup, deleteGroup, attendance, menus, importAppData } = useApp();
  const [formData, setFormData] = useState(config);
  const [newGroupName, setNewGroupName] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Group editing state
  const [editingGroupIndex, setEditingGroupIndex] = useState<number | null>(null);
  const [editGroupName, setEditGroupName] = useState('');

  // User form state
  const [userForm, setUserForm] = useState({
    username: '',
    password: '',
    name: '',
    role: 'EDUCATOR' as Role
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus('saving');
    setTimeout(() => {
      updateConfig(formData);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 500);
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.username || !userForm.password || !userForm.name) return;
    addUser(userForm);
    setUserForm({ username: '', password: '', name: '', role: 'EDUCATOR' });
  };

  const handleAddGroupAction = () => {
    if (!newGroupName.trim()) return;
    if (config.groups.includes(newGroupName.trim())) {
      alert("Această grupă există deja.");
      return;
    }
    addGroup(newGroupName.trim());
    setNewGroupName('');
    setFormData(prev => ({ ...prev, groups: [...prev.groups, newGroupName.trim()] }));
  };

  const handleRemoveGroupAction = (group: string) => {
    const studentCount = students.filter(s => s.group === group).length;
    const confirmMsg = studentCount > 0 
      ? `Există ${studentCount} elevi alocați grupei "${group}". Grupa va fi ștearsă din filtre, dar elevii vor rămâne marcați cu acest nume până la re-alocarea lor manuală. Continuați?`
      : `Sigur doriți să ștergeți grupa "${group}"?`;

    if (confirm(confirmMsg)) {
      deleteGroup(group);
      setFormData(prev => ({ ...prev, groups: prev.groups.filter(g => g !== group) }));
    }
  };

  const startEditingGroup = (index: number, name: string) => {
    setEditingGroupIndex(index);
    setEditGroupName(name);
  };

  const saveEditedGroupAction = () => {
    if (!editGroupName.trim() || editingGroupIndex === null) return;
    
    const oldName = config.groups[editingGroupIndex];
    const exists = config.groups.some((g, idx) => g === editGroupName.trim() && idx !== editingGroupIndex);
    
    if (exists) {
      alert("O altă grupă are deja acest nume.");
      return;
    }

    renameGroup(oldName, editGroupName.trim());
    setFormData(prev => {
      const newGroups = [...prev.groups];
      newGroups[editingGroupIndex] = editGroupName.trim();
      return { ...prev, groups: newGroups };
    });
    setEditingGroupIndex(null);
  };

  const handleExport = () => {
    const data = {
      config,
      students,
      parents,
      payments,
      inventory,
      transactions,
      attendance,
      menus,
      users,
      exportDate: new Date().toISOString(),
      appVersion: "1.2.0",
      source: "EduGest Pro"
    };
    
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `edugest_full_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const data = JSON.parse(content);
        
        // Verificare structură minimă
        if (!data.config || !data.students) {
          throw new Error("Fișierul nu pare a fi un backup valid EduGest.");
        }

        if (confirm("Importarea datelor va suprascrie baza de date curentă. Sunteți sigur că doriți să continuați? Recomandăm un export înainte.")) {
          importAppData(data);
          alert("Datele au fost importate cu succes! Aplicația se va reîmprospăta.");
          window.location.reload();
        }
      } catch (err) {
        alert("Eroare la citirea fișierului: " + (err as Error).message);
      }
    };
    reader.readAsText(file);
    // Resetam input-ul pentru a permite re-selectarea aceluiași fișier
    e.target.value = '';
  };

  const handleClearMenus = () => {
    if (confirm("Ești sigur că vrei să ștergi TOT istoricul de meniuri și planificări alimentare? Această acțiune nu poate fi anulată.")) {
      clearAllMenus();
      alert("Tot istoricul de meniuri a fost șters.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center gap-4 mb-2">
        <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg">
          <SettingsIcon size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-800">Setări Aplicație</h2>
          <p className="text-slate-400">Personalizează modul de funcționare și datele instituției tale.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Sectiunea Profil Institutie */}
        <form onSubmit={handleSave} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building size={18} className="text-blue-500" />
              <h3 className="font-bold text-slate-700 uppercase tracking-widest text-xs">Profil Instituție</h3>
            </div>
            <button 
              type="submit"
              disabled={saveStatus === 'saving'}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                saveStatus === 'saved' ? 'bg-emerald-500 text-white' : 'bg-blue-600 text-white shadow-lg shadow-blue-100'
              }`}
            >
              {saveStatus === 'saving' ? 'Salvăm...' : saveStatus === 'saved' ? 'S-a salvat!' : <><Save size={16} /> Salvează Setări</>}
            </button>
          </div>
          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nume Instituție</label>
              <input type="text" className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700" value={formData.institutionName} onChange={e => setFormData({...formData, institutionName: e.target.value})} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Adresă Sediu</label>
              <input type="text" className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Contact</label>
              <input type="email" className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Telefon</label>
              <input type="text" className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
            </div>
            <div className="space-y-1.5 md:col-span-2 bg-blue-50/30 p-4 rounded-2xl border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                  <Calculator size={20} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Cost Hrană / Copil / Zi</label>
                  <p className="text-xs text-slate-400 font-medium">Această valoare este folosită pentru calculul facturilor.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="number" 
                  step="0.01"
                  className="w-32 px-4 py-2.5 rounded-xl border border-blue-200 focus:ring-2 focus:ring-blue-500 outline-none font-black text-slate-700 text-right shadow-inner bg-white" 
                  value={formData.foodCostPerDay} 
                  onChange={e => setFormData({...formData, foodCostPerDay: parseFloat(e.target.value) || 0})} 
                />
                <span className="font-black text-slate-400 uppercase text-xs">{formData.currency}</span>
              </div>
            </div>
          </div>
        </form>

        {/* Sectiunea GESTIONARE GRUPE */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
            <Layers size={18} className="text-indigo-500" />
            <h3 className="font-bold text-slate-700 uppercase tracking-widest text-xs">Gestionare Grupe Elevi</h3>
          </div>
          <div className="p-8 space-y-8">
            <div className="flex gap-3">
              <input 
                type="text" 
                placeholder="Ex: Grupa Albinuțelor" 
                className="flex-1 px-5 py-4 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 font-bold" 
                value={newGroupName} 
                onChange={e => setNewGroupName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddGroupAction()}
              />
              <button 
                onClick={handleAddGroupAction} 
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-100 transition-all active:scale-95 flex items-center gap-2"
              >
                <Plus size={18} /> Adaugă Grupă
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {config.groups.map((group, index) => (
                <div key={index} className="flex items-center justify-between bg-slate-50 border border-slate-100 p-4 rounded-2xl group hover:bg-white hover:border-indigo-200 transition-all">
                  {editingGroupIndex === index ? (
                    <div className="flex-1 flex items-center gap-2 animate-in slide-in-from-left-2 duration-200">
                      <input 
                        autoFocus
                        className="flex-1 bg-white px-3 py-1.5 rounded-lg border border-indigo-200 text-sm font-bold outline-none ring-2 ring-indigo-50"
                        value={editGroupName}
                        onChange={(e) => setEditGroupName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEditedGroupAction();
                          if (e.key === 'Escape') setEditingGroupIndex(null);
                        }}
                      />
                      <button onClick={saveEditedGroupAction} className="p-2 bg-emerald-500 text-white rounded-lg shadow-sm hover:bg-emerald-600">
                        <Check size={16} />
                      </button>
                      <button onClick={() => setEditingGroupIndex(null)} className="p-2 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300">
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-xs">
                          {index + 1}
                        </div>
                        <span className="font-bold text-slate-700">{group}</span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => startEditingGroup(index, group)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all"
                          title="Redenumește"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleRemoveGroupAction(group)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-all"
                          title="Șterge"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sectiunea Gestionare Utilizatori */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
            <UserPlus size={18} className="text-blue-600" />
            <h3 className="font-bold text-slate-700 uppercase tracking-widest text-xs">Utilizatori și Acces Personal</h3>
          </div>
          <div className="p-8 space-y-8">
            <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Username</label>
                <input required type="text" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold" value={userForm.username} onChange={e => setUserForm({...userForm, username: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Parolă</label>
                <input required type="text" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold" value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nume Complet</label>
                <input required type="text" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold" value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} />
              </div>
              <div className="space-y-1 flex flex-col justify-end">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Rol</label>
                <div className="flex gap-2">
                  <select className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold bg-white" value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value as Role})}>
                    <option value="EDUCATOR">Educator</option>
                    <option value="ASISTENT">Asistent</option>
                  </select>
                  <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-xl shadow-lg shadow-blue-100 transition-all active:scale-95"><Plus size={20} /></button>
                </div>
              </div>
            </form>

            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <Users size={14} /> Conturi Active în Sistem
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {users.map(u => (
                  <div key={u.id} className="flex items-center justify-between p-5 bg-white border border-slate-100 rounded-2xl shadow-sm group hover:border-blue-200 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black uppercase text-sm shadow-inner">
                        {u.name.substring(0, 2)}
                      </div>
                      <div>
                        <p className="font-black text-slate-800 text-sm tracking-tight">{u.name}</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{u.role} • <span className="text-blue-500">{u.username}</span></p>
                      </div>
                    </div>
                    {u.id !== 'admin' && (
                      <button 
                        onClick={() => deleteUser(u.id)}
                        className="p-2.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Administrare Baza de Date */}
      <div className="pt-8 border-t border-slate-200">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
          <Database size={16} /> Unelte Mentenanță și Backup
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button onClick={handleExport} className="p-6 bg-white border border-slate-200 rounded-[2rem] flex items-center gap-5 hover:border-blue-300 transition-all text-left shadow-sm group">
            <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner"><Download size={24} /></div>
            <div>
              <p className="font-black text-slate-800 text-sm uppercase tracking-tight">Export Date</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Full Backup JSON</p>
            </div>
          </button>

          <button onClick={handleImportClick} className="p-6 bg-white border border-slate-200 rounded-[2rem] flex items-center gap-5 hover:border-indigo-300 transition-all text-left shadow-sm group">
            <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner"><UploadCloud size={24} /></div>
            <div>
              <p className="font-black text-slate-800 text-sm uppercase tracking-tight">Import Date</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Restaurare din JSON</p>
            </div>
          </button>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".json" 
            className="hidden" 
          />

          <button onClick={handleClearMenus} className="p-6 bg-white border border-slate-200 rounded-[2rem] flex items-center gap-5 hover:border-amber-300 transition-all text-left shadow-sm group">
            <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl group-hover:bg-amber-500 group-hover:text-white transition-all shadow-inner"><Utensils size={24} /></div>
            <div>
              <p className="font-black text-slate-800 text-sm uppercase tracking-tight">Golește Meniuri</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Resetare Planificări</p>
            </div>
          </button>
          
          <button onClick={resetApp} className="p-6 bg-rose-50 border border-rose-100 rounded-[2rem] flex items-center gap-5 hover:bg-rose-600 hover:text-white transition-all text-left text-rose-700 shadow-sm group">
            <div className="p-4 bg-rose-500 text-white rounded-2xl shadow-xl shadow-rose-100 group-hover:shadow-none"><Trash2 size={24} /></div>
            <div>
              <p className="font-black text-sm uppercase tracking-tight group-hover:text-white">Resetare Totală</p>
              <p className="text-[10px] uppercase font-bold tracking-widest opacity-70 mt-1 group-hover:text-rose-100">Șterge toată baza!</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
