
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Utensils, 
  Printer, 
  Edit2, 
  Sparkles, 
  Package, 
  X,
  CheckCircle2,
  Users,
  Save,
  Trash2,
  Eraser,
  Copy,
  ClipboardCheck,
  Loader2,
  Wand2,
  ChevronRight,
  TrendingUp,
  Calculator,
  FileText,
  Clock,
  Coffee,
  Apple,
  Soup,
  Croissant,
  Scale,
  Plus,
  AlertTriangle,
  FileCheck,
  BrainCircuit,
  ClipboardPaste,
  ArrowRight
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DailyMenu, FoodItem } from '../types';
import { GoogleGenAI } from "@google/genai";

interface RecipeIngredient {
  itemId: string;
  name: string;
  qtyPerChild: number;
  totalQty: number;
  unit: string;
  availableStock: number;
}

export const MenuPage = () => {
  const { inventory, updateStock, students, attendance, transactions, deleteDocument, menus, updateMenu, clearAllMenus, config } = useApp();
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [lastBcData, setLastBcData] = useState<any>(null);
  const [printMode, setPrintMode] = useState<'bc' | 'daily_menu' | 'weekly_menu' | null>(null);
  const [clipboard, setClipboard] = useState<DailyMenu | null>(null);
  
  const [selectedItemToAdd, setSelectedItemToAdd] = useState<string>('');
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>([]);

  const days = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri'];
  
  const [menuForm, setMenuForm] = useState<Omit<DailyMenu, 'id' | 'itemsUsed'>>({
    date: '',
    breakfast: '',
    snack1: '',
    lunch: '',
    snack2: ''
  });

  const getDayDate = (index: number) => {
    const today = new Date();
    const day = today.getDay(); 
    const diff = today.getDate() - day + (day === 0 ? -6 : 1) + index;
    const d = new Date(today.setDate(diff));
    return d.toISOString().split('T')[0];
  };

  const currentDayDate = useMemo(() => new Date().toISOString().split('T')[0], []);
  
  const presentCount = useMemo(() => {
    const date = selectedDayIndex !== null ? getDayDate(selectedDayIndex) : currentDayDate;
    const count = attendance.filter(a => a.date === date && a.status === 'PREZENT').length;
    return count > 0 ? count : students.length;
  }, [attendance, students, currentDayDate, selectedDayIndex]);

  const hasBcGenerated = (date: string) => {
    const bcNumber = `BC-${date.replace(/-/g, '')}`;
    return transactions.some(t => t.documentRef === bcNumber);
  };

  useEffect(() => {
    if (selectedDayIndex !== null) {
      const date = getDayDate(selectedDayIndex);
      const existing = menus.find(m => m.date === date);
      setMenuForm({
        date,
        breakfast: existing?.breakfast || '',
        snack1: existing?.snack1 || '',
        lunch: existing?.lunch || '',
        snack2: existing?.snack2 || '',
      });

      if (existing?.itemsUsed?.length) {
        setRecipeIngredients(existing.itemsUsed.map(item => {
          const inv = inventory.find(i => i.id === item.itemId);
          const totalQty = item.quantity;
          const qtyPerChild = presentCount > 0 ? totalQty / presentCount : 0;
          return {
            itemId: item.itemId,
            name: inv?.name || '?',
            unit: inv?.unit || 'kg',
            qtyPerChild: parseFloat(qtyPerChild.toFixed(4)),
            totalQty: totalQty,
            availableStock: inv?.quantity || 0
          };
        }));
      } else {
        setRecipeIngredients([]);
      }
    }
  }, [selectedDayIndex, menus, inventory, presentCount]);

  const handleCopyMenu = (menu: DailyMenu) => {
    setClipboard(menu);
    // Optional: add a small toast notification logic here
  };

  const handlePasteMenu = (targetDate: string) => {
    if (!clipboard) return;
    const newMenu: DailyMenu = {
      ...clipboard,
      id: `menu-${targetDate}`,
      date: targetDate,
      // Păstrăm ingredientele dar le lăsăm utilizatorului opțiunea de a le actualiza pentru prezența zilei respective
    };
    updateMenu(newMenu);
    setClipboard(null);
  };

  const handleAiSuggestions = async () => {
    if (!menuForm.breakfast && !menuForm.lunch) {
      alert("Vă rugăm să introduceți preparatele din meniu înainte de a solicita sugestii.");
      return;
    }

    setIsAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const inventoryList = inventory.map(i => ({ id: i.id, name: i.name, unit: i.unit }));
      
      const prompt = `Ești un asistent de bucătărie pentru o grădiniță. Mai jos ai meniul zilei și lista de produse disponibile în magazie. 
      Te rog să identifici care dintre produsele din inventar sunt necesare pentru a găti acest meniu.
      
      MENIU:
      Mic dejun: ${menuForm.breakfast}
      Gustare 1: ${menuForm.snack1}
      Prânz: ${menuForm.lunch}
      Gustare 2: ${menuForm.snack2}
      
      INVENTAR DISPONIBIL:
      ${JSON.stringify(inventoryList)}
      
      Returnează EXCLUSIV un array JSON care conține obiecte cu structura: {"id": "ID_PRODUS", "qtyPerChild": NUMAR_ESTIMAT_KG_SAU_UNITATE}.
      Estimează gramajul per copil (ex: 0.05 pentru 50g carne, 0.01 pentru sare, 0.1 pentru lapte etc).
      Nu returna text explicativ, doar JSON-ul.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: prompt }] }]
      });

      const text = response.text || "[]";
      const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const suggestions = JSON.parse(cleanedText) as { id: string; qtyPerChild: number }[];

      if (suggestions.length === 0) {
        alert("AI-ul nu a putut identifica ingrediente clare în meniu. Încercați să adăugați manual.");
      } else {
        const newIngredients: RecipeIngredient[] = [];
        
        suggestions.forEach(sug => {
          const item = inventory.find(i => i.id === sug.id);
          if (item && !recipeIngredients.some(ri => ri.itemId === item.id)) {
            newIngredients.push({
              itemId: item.id,
              name: item.name,
              unit: item.unit,
              qtyPerChild: sug.qtyPerChild,
              totalQty: parseFloat((sug.qtyPerChild * presentCount).toFixed(3)),
              availableStock: item.quantity
            });
          }
        });

        if (newIngredients.length > 0) {
          setRecipeIngredients(prev => [...prev, ...newIngredients]);
        } else {
          alert("Ingredientele sugerate sunt deja în listă.");
        }
      }
    } catch (error) {
      console.error("Error fetching AI suggestions:", error);
      alert("A apărut o eroare la procesarea AI. Vă rugăm să încercați din nou.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAddIngredient = () => {
    if (!selectedItemToAdd) return;
    const item = inventory.find(i => i.id === selectedItemToAdd);
    if (!item) return;

    if (recipeIngredients.some(r => r.itemId === item.id)) {
      alert("Acest ingredient este deja adăugat.");
      return;
    }

    setRecipeIngredients(prev => [...prev, {
      itemId: item.id,
      name: item.name,
      unit: item.unit,
      qtyPerChild: 0,
      totalQty: 0,
      availableStock: item.quantity
    }]);
    setSelectedItemToAdd('');
  };

  const updateIngredientQty = (itemId: string, val: number) => {
    setRecipeIngredients(prev => prev.map(item => {
      if (item.itemId === itemId) {
        const total = val * presentCount;
        return { ...item, qtyPerChild: val, totalQty: parseFloat(total.toFixed(3)) };
      }
      return item;
    }));
  };

  const handleRemoveIngredient = (itemId: string) => {
    setRecipeIngredients(prev => prev.filter(i => i.itemId !== itemId));
  };

  const handleSaveMenu = () => {
    if (selectedDayIndex === null) return;
    const menuData: DailyMenu = {
      id: `menu-${menuForm.date}`,
      date: menuForm.date,
      breakfast: menuForm.breakfast,
      snack1: menuForm.snack1,
      lunch: menuForm.lunch,
      snack2: menuForm.snack2,
      itemsUsed: recipeIngredients.map(r => ({ itemId: r.itemId, quantity: r.totalQty }))
    };
    updateMenu(menuData);
    setIsModalOpen(false);
  };

  const handleSaveAndGenerateBC = () => {
    if (selectedDayIndex === null) return;
    
    const bcNumber = `BC-${menuForm.date.replace(/-/g, '')}`;
    const alreadyExists = transactions.some(t => t.documentRef === bcNumber);

    if (alreadyExists) {
      if (!confirm("Un Bon de Consum pentru această dată există deja. Doriți să îl anulați pe cel vechi și să generați unul nou conform datelor actuale?")) {
        return;
      }
      deleteDocument(bcNumber);
    }

    const insufficient = recipeIngredients.filter(i => i.totalQty > i.availableStock);
    if (insufficient.length > 0) {
      if (!confirm(`Atenție! Stocul este insuficient pentru: ${insufficient.map(i => i.name).join(', ')}. Doriți să continuați scăderea oricum?`)) {
        return;
      }
    }

    const menuData: DailyMenu = {
      id: `menu-${menuForm.date}`,
      date: menuForm.date,
      breakfast: menuForm.breakfast,
      snack1: menuForm.snack1,
      lunch: menuForm.lunch,
      snack2: menuForm.snack2,
      itemsUsed: recipeIngredients.map(r => ({ itemId: r.itemId, quantity: r.totalQty }))
    };
    
    updateMenu(menuData);

    recipeIngredients.forEach(r => {
      if (r.totalQty > 0) {
        updateStock(r.itemId, r.totalQty, 'EXIT', bcNumber);
      }
    });

    setLastBcData({ 
      bcNumber, 
      date: menuForm.date, 
      dayName: days[selectedDayIndex], 
      children: presentCount, 
      items: recipeIngredients.filter(i => i.totalQty > 0) 
    });
    
    setShowSuccess(true);
  };

  const handlePrintDailyMenu = (menu: DailyMenu, dayName: string) => {
    // Calculăm ingredientele pentru vizualizarea print (necesită prezența actuală)
    const date = menu.date;
    const currentAttendance = attendance.filter(a => a.date === date && a.status === 'PREZENT').length || students.length;
    
    const ingredients = menu.itemsUsed.map(iu => {
      const inv = inventory.find(i => i.id === iu.itemId);
      return {
        name: inv?.name || '?',
        unit: inv?.unit || '-',
        totalQty: iu.quantity
      };
    });

    setLastBcData({ ...menu, dayName, ingredients, presentCount: currentAttendance });
    setPrintMode('daily_menu');
    setTimeout(() => { window.print(); setPrintMode(null); }, 300);
  };

  const handlePrintWeeklyMenu = () => {
    setPrintMode('weekly_menu');
    setTimeout(() => { window.print(); setPrintMode(null); }, 300);
  };

  const handlePrintBC = () => {
    setPrintMode('bc');
    setTimeout(() => { window.print(); setPrintMode(null); }, 300);
  };

  return (
    <div className="space-y-6">
      {/* SECTIUNE TIPARIRE */}
      <div className="hidden print:block bg-white text-black p-4 sm:p-12 font-serif min-h-screen">
        {printMode === 'daily_menu' && lastBcData && (
          <div className="space-y-12">
            <div className="flex justify-between items-start border-b-4 border-black pb-6">
                 <div className="space-y-1">
                    <h1 className="text-2xl font-black uppercase leading-none">{config.institutionName}</h1>
                    <p className="text-xs font-bold">{config.address}</p>
                    <p className="mt-4 font-black uppercase text-sm bg-black text-white px-2 py-1 inline-block">Meniu Zilnic Detaliat</p>
                 </div>
                 <div className="text-right">
                    <p className="font-black text-2xl uppercase">{lastBcData.dayName}</p>
                    <p className="text-sm font-bold">Data: {new Date(lastBcData.date).toLocaleDateString('ro-RO')}</p>
                    <p className="text-[10px] font-bold uppercase mt-1">Copii prezenți: {lastBcData.presentCount}</p>
                 </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
               <div className="space-y-6">
                  <h3 className="text-sm font-black uppercase border-b border-black pb-1">Compoziție Preparate</h3>
                  <div className="space-y-4">
                     <div className="flex gap-4">
                        <div className="font-bold w-24 shrink-0 text-[10px] uppercase opacity-60">Mic Dejun</div>
                        <div className="font-black text-sm">{lastBcData.breakfast}</div>
                     </div>
                     <div className="flex gap-4">
                        <div className="font-bold w-24 shrink-0 text-[10px] uppercase opacity-60">Gustare I</div>
                        <div className="font-black text-sm">{lastBcData.snack1}</div>
                     </div>
                     <div className="flex gap-4">
                        <div className="font-bold w-24 shrink-0 text-[10px] uppercase opacity-60">Prânz</div>
                        <div className="font-black text-sm">{lastBcData.lunch}</div>
                     </div>
                     <div className="flex gap-4">
                        <div className="font-bold w-24 shrink-0 text-[10px] uppercase opacity-60">Gustare II</div>
                        <div className="font-black text-sm">{lastBcData.snack2}</div>
                     </div>
                  </div>
               </div>

               <div className="space-y-6">
                  <h3 className="text-sm font-black uppercase border-b border-black pb-1">Necesar Bucătărie (Alimente)</h3>
                  <table className="w-full border-collapse border border-black text-xs">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="border border-black p-1 text-left">Ingredient</th>
                        <th className="border border-black p-1 text-right">Cantitate</th>
                        <th className="border border-black p-1 text-center">UM</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lastBcData.ingredients.map((it: any, i: number) => (
                        <tr key={i}>
                          <td className="border border-black p-1">{it.name}</td>
                          <td className="border border-black p-1 text-right font-bold">{it.totalQty.toFixed(3)}</td>
                          <td className="border border-black p-1 text-center uppercase">{it.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
               </div>
            </div>

            <div className="mt-32 grid grid-cols-2 gap-20 text-center font-bold uppercase text-[10px]">
                 <div className="space-y-16">
                    <div className="border-t-2 border-black pt-2">Întocmit Bucătar</div>
                    <p className="text-[8px] normal-case opacity-50 italic">Semnătură</p>
                 </div>
                 <div className="space-y-16">
                    <div className="border-t-2 border-black pt-2">Aprobat Director</div>
                    <p className="text-[8px] normal-case opacity-50 italic">Semnătură și Ștampilă</p>
                 </div>
            </div>
          </div>
        )}

        {printMode === 'weekly_menu' && (
          <div className="space-y-8">
            <div className="text-center border-b-4 border-black pb-6 mb-8">
               <h1 className="text-3xl font-black uppercase">{config.institutionName}</h1>
               <h2 className="text-xl font-bold mt-2">MENIU SĂPTĂMÂNAL: {new Date(getDayDate(0)).toLocaleDateString('ro-RO')} - {new Date(getDayDate(4)).toLocaleDateString('ro-RO')}</h2>
            </div>
            
            <table className="w-full border-collapse border-2 border-black">
               <thead className="bg-slate-100">
                  <tr className="text-[10px] uppercase font-black">
                    <th className="border-2 border-black p-4 w-32">ZIUA</th>
                    <th className="border-2 border-black p-4">MIC DEJUN</th>
                    <th className="border-2 border-black p-4">GUSTARE I</th>
                    <th className="border-2 border-black p-4">PRÂNZ</th>
                    <th className="border-2 border-black p-4">GUSTARE II</th>
                  </tr>
               </thead>
               <tbody className="text-xs">
                  {days.map((day, idx) => {
                    const date = getDayDate(idx);
                    const menu = menus.find(m => m.date === date);
                    return (
                      <tr key={day}>
                        <td className="border-2 border-black p-4 bg-slate-50 font-black text-center">{day.toUpperCase()}</td>
                        <td className="border-2 border-black p-4 font-bold">{menu?.breakfast || '-'}</td>
                        <td className="border-2 border-black p-4 font-bold">{menu?.snack1 || '-'}</td>
                        <td className="border-2 border-black p-4 font-black">{menu?.lunch || '-'}</td>
                        <td className="border-2 border-black p-4 font-bold">{menu?.snack2 || '-'}</td>
                      </tr>
                    );
                  })}
               </tbody>
            </table>
            
            <div className="mt-20 flex justify-between text-[10px] font-bold uppercase px-12 italic">
               <p>Aprobat Director: ............................</p>
               <p>Întocmit Bucătar: ............................</p>
            </div>
          </div>
        )}

        {printMode === 'bc' && lastBcData && (
           <div className="space-y-8">
              <div className="flex justify-between items-start border-b-4 border-black pb-6">
                 <div className="space-y-1">
                    <h1 className="text-2xl font-black uppercase leading-none">{config.institutionName}</h1>
                    <p className="text-xs font-bold">{config.address}</p>
                    <p className="mt-4 font-black uppercase text-sm bg-black text-white px-2 py-1 inline-block">Bon de Consum Alimente</p>
                 </div>
                 <div className="text-right">
                    <p className="font-black text-2xl">Nr: {lastBcData.bcNumber}</p>
                    <p className="text-sm font-bold">Data: {new Date(lastBcData.date).toLocaleDateString('ro-RO')}</p>
                 </div>
              </div>
              
              <div className="border border-black p-4 text-xs font-bold uppercase">
                 <p className="opacity-50 text-[8px] mb-1">Explicație / Destinație:</p>
                 <p>Hrana pentru {lastBcData.children} copii prezenți ({lastBcData.dayName})</p>
              </div>

              <table className="w-full border-collapse border-2 border-black text-sm">
                 <thead className="bg-slate-100 font-bold">
                    <tr>
                       <th className="border-2 border-black p-2 text-center w-12">Nr.</th>
                       <th className="border-2 border-black p-2 text-left">Denumire Produs</th>
                       <th className="border-2 border-black p-2 text-center w-24">U.M.</th>
                       <th className="border-2 border-black p-2 text-right w-32">Cantitate</th>
                    </tr>
                 </thead>
                 <tbody>
                    {lastBcData.items.map((it: RecipeIngredient, i: number) => (
                       <tr key={i}>
                          <td className="border-2 border-black p-2 text-center">{i+1}</td>
                          <td className="border-2 border-black p-2 font-bold">{it.name}</td>
                          <td className="border-2 border-black p-2 text-center uppercase">{it.unit}</td>
                          <td className="border-2 border-black p-2 text-right font-black">{it.totalQty.toFixed(3)}</td>
                       </tr>
                    ))}
                 </tbody>
              </table>

              <div className="mt-32 grid grid-cols-2 gap-20 text-center font-bold uppercase text-xs">
                 <div className="space-y-16">
                    <div className="border-t-2 border-black pt-2">Gestionar (Eliberat)</div>
                    <p className="text-[8px] normal-case opacity-50 italic">Semnătură</p>
                 </div>
                 <div className="space-y-16">
                    <div className="border-t-2 border-black pt-2">Bucătar (Primit)</div>
                    <p className="text-[8px] normal-case opacity-50 italic">Semnătură</p>
                 </div>
              </div>
           </div>
        )}
      </div>

      {/* INTERFATA APLICATIE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-rose-100 text-rose-600 rounded-2xl shadow-sm"><Utensils size={24} /></div>
          <div>
            <h2 className="text-xl font-bold uppercase tracking-tight">Planificare Meniu</h2>
            <p className="text-sm text-slate-400 font-medium">Gestionare alimente și meniuri săptămânale</p>
          </div>
        </div>
        <div className="flex gap-2">
          {clipboard && (
            <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-200 rounded-xl animate-pulse">
               <ClipboardCheck size={16} className="text-amber-600" />
               <span className="text-[10px] font-black text-amber-600 uppercase">Meniu Copiat</span>
               <button onClick={() => setClipboard(null)} className="text-amber-400 hover:text-amber-600 transition-all"><X size={14} /></button>
            </div>
          )}
          <button onClick={handlePrintWeeklyMenu} className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 border border-slate-200">
            <Printer size={16} /> Meniu Săptămânal
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 print:hidden">
        {days.map((day, idx) => {
          const date = getDayDate(idx);
          const menu = menus.find(m => m.date === date);
          const isToday = date === currentDayDate;
          const bcExists = hasBcGenerated(date);
          
          return (
            <div key={day} className={`bg-white rounded-[2rem] border transition-all shadow-sm flex flex-col overflow-hidden group hover:border-blue-300 ${isToday ? 'border-blue-300 ring-2 ring-blue-50' : 'border-slate-200'}`}>
              <div className={`p-4 border-b flex justify-between items-center ${isToday ? 'bg-blue-50/50' : 'bg-slate-50'}`}>
                 <div className="flex flex-col">
                   <p className="font-black text-[10px] uppercase text-slate-500 tracking-widest">{day}</p>
                   {bcExists && (
                     <span className="flex items-center gap-1 text-[8px] font-black text-emerald-600 uppercase mt-0.5">
                       <FileCheck size={10} /> Consum Scăzut
                     </span>
                   )}
                 </div>
                 <div className="flex gap-1">
                    {menu && (
                      <button 
                        onClick={() => handleCopyMenu(menu)} 
                        title="Copiază Meniu"
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                      >
                        <Copy size={14} />
                      </button>
                    )}
                    {clipboard && (
                       <button 
                        onClick={() => handlePasteMenu(date)} 
                        title="Lipește Meniu Aici"
                        className="p-1.5 text-amber-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-all"
                      >
                        <ClipboardPaste size={14} />
                      </button>
                    )}
                    {menu && (
                      <button onClick={() => handlePrintDailyMenu(menu, day)} className="p-1.5 text-slate-400 hover:text-blue-600 transition-all" title="Vizualizare / Print Zilnic">
                        <Printer size={14} />
                      </button>
                    )}
                 </div>
              </div>
              <div className="p-5 flex-1 space-y-4">
                 <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase text-blue-600">Prânz</p>
                    <p className="text-xs font-bold text-slate-700 line-clamp-3 leading-relaxed min-h-[3rem]">
                      {menu?.lunch || <span className="text-slate-300 italic">Nu este setat</span>}
                    </p>
                 </div>
                 <button 
                  onClick={() => { setSelectedDayIndex(idx); setIsModalOpen(true); }}
                  className={`w-full mt-auto py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-inner active:scale-95 ${bcExists ? 'bg-slate-50 text-slate-400' : 'bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white'}`}
                 >
                   {bcExists ? 'Vezi Detalii / Editează' : 'Planifică / Generează BC'}
                 </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL EDITARE MENIU & GENERARE BON CONSUM */}
      {isModalOpen && selectedDayIndex !== null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm print:hidden animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in duration-200">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-rose-600 text-white rounded-2xl flex items-center justify-center shadow-lg"><Utensils size={32} /></div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">{days[selectedDayIndex]} • Planificare</h2>
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2">
                    <Users size={14} /> {presentCount} Copii Prezenți la masă
                  </p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-3 text-slate-400 hover:bg-white rounded-2xl transition-all"><X size={28} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-2 gap-10">
               <div className="space-y-6">
                  <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                    <FileText size={16} /> Compoziție Meniu
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-amber-600 tracking-widest ml-1">Mic Dejun</label>
                      <input className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-rose-500 font-bold text-slate-700 outline-none" value={menuForm.breakfast} onChange={e => setMenuForm({...menuForm, breakfast: e.target.value})} placeholder="Ex: Ceai cu pâine și unt" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-emerald-600 tracking-widest ml-1">Gustare I</label>
                      <input className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-rose-500 font-bold text-slate-700 outline-none" value={menuForm.snack1} onChange={e => setMenuForm({...menuForm, snack1: e.target.value})} placeholder="Ex: Mere proaspete" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-blue-600 tracking-widest ml-1">Prânz</label>
                      <textarea rows={3} className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-rose-500 font-bold text-slate-700 outline-none resize-none" value={menuForm.lunch} onChange={e => setMenuForm({...menuForm, lunch: e.target.value})} placeholder="Ex: Ciorbă de văcuță, Piure de cartofi" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-rose-600 tracking-widest ml-1">Gustare II</label>
                      <input className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-rose-500 font-bold text-slate-700 outline-none" value={menuForm.snack2} onChange={e => setMenuForm({...menuForm, snack2: e.target.value})} placeholder="Ex: Biscuiți digestivi" />
                    </div>
                  </div>
               </div>

               <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                      <Scale size={16} /> Calculator Consum Alim.
                    </h3>
                    <button 
                      onClick={handleAiSuggestions}
                      disabled={isAiLoading}
                      className="flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all border border-blue-100 active:scale-95 disabled:opacity-50"
                    >
                      {isAiLoading ? <Loader2 size={14} className="animate-spin" /> : <BrainCircuit size={14} />}
                      Sugestie Inteligentă
                    </button>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200 space-y-6">
                    <div className="flex gap-2">
                       <select 
                        className="flex-1 px-4 py-3 rounded-xl border border-slate-200 font-bold text-slate-700 text-sm bg-white"
                        value={selectedItemToAdd}
                        onChange={(e) => setSelectedItemToAdd(e.target.value)}
                       >
                         <option value="">Alege ingredient din magazie...</option>
                         {inventory.map(i => <option key={i.id} value={i.id}>{i.name} ({i.quantity} {i.unit} disponibil)</option>)}
                       </select>
                       <button 
                        onClick={handleAddIngredient}
                        className="p-3 bg-blue-600 text-white rounded-xl shadow-md hover:bg-blue-700 transition-all"
                       >
                         <Plus size={20} />
                       </button>
                    </div>

                    <div className="space-y-3">
                      {recipeIngredients.length > 0 ? recipeIngredients.map(item => (
                        <div key={item.itemId} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm animate-in fade-in slide-in-from-right-2">
                          <div className="flex items-center justify-between mb-3">
                            <span className="font-bold text-slate-800 text-sm truncate">{item.name}</span>
                            <button onClick={() => handleRemoveIngredient(item.itemId)} className="text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={16} /></button>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                               <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Cantitate / Copil</label>
                               <div className="relative">
                                  <input 
                                    type="number" 
                                    step="0.001"
                                    className="w-full pl-3 pr-8 py-2 bg-slate-50 rounded-lg border border-slate-100 font-black text-slate-700 text-sm outline-none focus:ring-1 focus:ring-blue-500"
                                    value={item.qtyPerChild}
                                    onChange={(e) => updateIngredientQty(item.itemId, parseFloat(e.target.value) || 0)}
                                  />
                                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-slate-300">{item.unit}</span>
                               </div>
                            </div>
                            <div className="space-y-1">
                               <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Total pt. {presentCount} copii</label>
                               <div className={`px-3 py-2 rounded-lg font-black text-sm flex items-center justify-between ${item.totalQty > item.availableStock ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                                  <span>{item.totalQty.toFixed(3)} {item.unit}</span>
                                  {item.totalQty > item.availableStock && <AlertTriangle size={14} />}
                                </div>
                            </div>
                          </div>
                        </div>
                      )) : (
                        <div className="py-12 flex flex-col items-center justify-center text-slate-400 italic text-center">
                           <Scale size={40} className="mb-2 opacity-10" />
                           <p className="text-xs">Nu ați adăugat ingrediente.<br/>Folosiți selectorul sau butonul AI.</p>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-slate-200 flex flex-col gap-3">
                       <button 
                        onClick={handleSaveMenu}
                        className="w-full py-4 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95"
                       >
                         Salvează Modificări Meniu
                       </button>
                       {recipeIngredients.length > 0 && (
                         <>
                          <button 
                            onClick={handleSaveAndGenerateBC}
                            className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 ${hasBcGenerated(menuForm.date) ? 'bg-amber-600 hover:bg-amber-700' : 'bg-slate-900 hover:bg-slate-800'} text-white`}
                          >
                            <Calculator size={18} /> 
                            {hasBcGenerated(menuForm.date) ? 'Actualizează Bon Consum' : 'Generează Bon Consum'}
                          </button>
                          <p className="text-[9px] text-center text-slate-400 mt-1 font-medium italic">Această acțiune va scădea automat cantitățile calculate din magazie.</p>
                         </>
                       )}
                    </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SUCCES GENERARE */}
      {showSuccess && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm print:hidden">
          <div className="bg-white rounded-[3rem] w-full max-w-md shadow-2xl p-10 text-center space-y-6 animate-in zoom-in duration-300">
            <div className="w-24 h-24 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-xl shadow-emerald-100">
               <CheckCircle2 size={56} />
            </div>
            <div>
               <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Gestiune Procesată!</h3>
               <p className="text-slate-500 font-medium mt-2">Bonul de Consum a fost înregistrat în magazie conform prezenței actuale.</p>
            </div>
            <div className="flex flex-col gap-3">
               <button 
                onClick={handlePrintBC}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition-all active:scale-95"
               >
                 <Printer size={18} /> Tipărește Bonul de Consum
               </button>
               <button 
                onClick={() => setShowSuccess(false)}
                className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
               >
                 Înapoi la Meniu
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
