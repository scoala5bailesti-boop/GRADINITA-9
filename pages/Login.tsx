
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User as UserIcon, LogIn, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';

export const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const { users } = useApp();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const result = login(username, password, users);
    
    if (result === 'SUCCESS') {
      navigate('/');
    } else if (result === 'USER_NOT_FOUND') {
      setError('Utilizatorul introdus nu a fost găsit în sistem.');
    } else if (result === 'WRONG_PASSWORD') {
      setError('Parola introdusă este incorectă. Vă rugăm să reîncercați.');
    } else {
      setError('A apărut o eroare la autentificare.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-3xl text-white shadow-xl shadow-blue-200 mb-6">
            <Lock size={36} />
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-tight px-4">GRADINITA NR. 9 „AMZA PELLEA” BĂILEȘTI</h1>
          <p className="text-slate-400 font-medium mt-2">Sistem Management Grădiniță</p>
        </div>

        <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center gap-3 p-4 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100 text-sm font-bold animate-in fade-in zoom-in duration-200">
                <AlertCircle size={18} className="shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Utilizator</label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  required
                  placeholder="Introduceți username-ul"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Parolă</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="password" 
                  required
                  placeholder="********"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button 
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-black text-lg transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-3 active:scale-[0.98]"
            >
              <LogIn size={20} />
              Autentificare
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400 font-medium italic">Acces restricționat personalului autorizat</p>
          </div>
        </div>
      </div>
    </div>
  );
};
