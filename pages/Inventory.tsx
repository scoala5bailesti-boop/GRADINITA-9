
import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Package, 
  ArrowUpRight, 
  ArrowDownRight, 
  AlertTriangle, 
  Search, 
  X,
  PlusCircle,
  DollarSign,
  Layers,
  Printer,
  Calculator,
  Plus,
  Trash2,
  Eye,
  FileText,
  FileSearch,
  History,
  Calendar,
  Building,
  Scan,
  Loader2,
  Sparkles
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

interface EntryRow {
  id: string;
  itemId: string;
  name: string;
  unit: 'kg' | 'litru' | 'buc' | 'g';
  qty: number;
  price: number;
  minStock: number;
  isNew: boolean;
}

export const Inventory = () => {
  const { inventory, updateStock, addInventoryEntry, deleteDocument, transactions, config } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [modalType, setModalType] = useState<'ENTRY' | 'EXIT'>('ENTRY');
  
  const [printDoc, setPrintDoc] = useState<{ type: 'NIR' | 'BC' | 'LIST', data: any } | null>(null);
  const [previewDoc, setPreviewDoc] = useState<any>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);

  const [docHeader, setDocHeader] = useState({
    doc: '',
    supplier: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [entryRows, setEntryRows] = useState<EntryRow[]>([]);
  const [currentRow, setCurrentRow] = useState<Partial<EntryRow>>({
    itemId: '',
    name: '',
    unit: 'kg',
    qty: 0,
    price: 0,
    minStock: 0,
    isNew: false
  });

  const { totalStockValue, totalItemsCount, lowStockCount } = useMemo(() => {
    return {
      totalStockValue: inventory.reduce((acc, item) => acc + (item.quantity * item.lastPrice), 0),
      totalItemsCount: inventory.length,
      lowStockCount: inventory.filter(i => i.quantity <= i.minStock).length
    };
  }, [inventory]);

  const filteredItems = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const isLow = item.quantity <= item.minStock;
    return matchesSearch && (!showLowStockOnly || isLow);
  });

  const getItem = (id: string) => inventory.find(i => i.id === id);

  const resetForm = () => {
    setDocHeader({
      doc: '',
      supplier: '',
      date: new Date().toISOString().split('T')[0]
    });
    setEntryRows([]);
    setCurrentRow({ itemId: '', name: '', unit: 'kg', qty: 0, price: 0, minStock: 0, isNew: false });
  };

  const openModal = (type: 'ENTRY' | 'EXIT') => {
    setModalType(type);
    resetForm();
    setIsModalOpen(true);
  };

  const handleAddRow = () => {
    if (currentRow.isNew && !currentRow.name) return;
    if (!currentRow.isNew && !currentRow.itemId) return;
    if ((currentRow.qty || 0) <= 0) return;

    const newRow: EntryRow = {
      id: Math.random().toString(36).substr(2, 9),
      itemId: currentRow.itemId || '',
      name: currentRow.isNew ? currentRow.name || '' : inventory.find(i => i.id === currentRow.itemId)?.name || '',
      unit: (currentRow.isNew ? currentRow.unit : inventory.find(i => i.id === currentRow.itemId)?.unit) || 'kg',
      qty: currentRow.qty || 0,
      price: currentRow.price || 0,
      minStock: currentRow.minStock || 0,
      isNew: !!currentRow.isNew
    };

    setEntryRows(prev => [...prev, newRow]);
    setCurrentRow({ itemId: '', name: '', unit: 'kg', qty: 0, price: 0, minStock: 0, isNew: false });
  };

  const handleRemoveRow = (id: string) => {
    setEntryRows(prev => prev.filter(r => r.id !== id));
  };

  const handleFinalizeTransaction = (shouldPrint: boolean = false) => {
    if (entryRows.length === 0) return;
    
    const documentRef = docHeader.doc || `${modalType === 'EXIT' ? 'BC' : 'NIR'}-${Date.now().toString().slice(-6)}`;
    
    entryRows.forEach(row => {
      if (modalType === 'ENTRY') {
        addInventoryEntry({
          itemId: row.isNew ? undefined : row.itemId,
          name: row.isNew ? row.name : undefined,
          unit: row.isNew ? row.unit : undefined,
          minStock: row.isNew ? row.minStock : undefined,
          qty: row.qty,
          pricePerUnit: row.price,
          doc: documentRef,
          supplier: docHeader.supplier
        });
      } else {
        updateStock(row.itemId, row.qty, 'EXIT', documentRef);
      }
    });

    if (shouldPrint) {
      handlePrintDocument(modalType === 'ENTRY' ? 'NIR' : 'BC', documentRef, docHeader.date, entryRows, docHeader.supplier);
    }

    setIsModalOpen(false);
    resetForm();
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleScanInvoice = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAiLoading(true);
    try {
      const base64Data = await blobToBase64(file);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const prompt = `Analizează imaginea acestei facturi de alimente și extrage datele într-un format JSON structurat.
      Avem nevoie de:
      - docNumber: numărul facturii (ex: "F123")
      - supplier: numele furnizorului (ex: "METRO", "LIDL")
      - date: data facturii în format YYYY-MM-DD
      - items: un array cu obiecte: {name: string, unit: "kg" | "litru" | "buc" | "g", qty: number, price: number}
      
      Reguli importante:
      1. Încearcă să standardizezi unitatea de măsură (ex: kg, litru, buc, g).
      2. Returnează EXCLUSIV obiectul JSON, fără text explicativ.
      3. Dacă nu ești sigur de un produs, pune cel mai apropiat nume citit.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{
          parts: [
            { text: prompt },
            { inlineData: { data: base64Data, mimeType: file.type } }
          ]
        }]
      });

      const text = response.text || "{}";
      const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const data = JSON.parse(cleanedText);

      // Deschiderea modalului și pre-popularea datelor
      setModalType('ENTRY');
      setDocHeader({
        doc: data.docNumber || '',
        supplier: data.supplier || '',
        date: data.date || new Date().toISOString().split('T')[0]
      });

      const mappedRows: EntryRow[] = (data.items || []).map((it: any) => {
        // Căutare produs existent în inventar (fuzzy match)
        const existing = inventory.find(inv => 
          inv.name.toLowerCase().includes(it.name.toLowerCase()) || 
          it.name.toLowerCase().includes(inv.name.toLowerCase())
        );

        return {
          id: Math.random().toString(36).substr(2, 9),
          itemId: existing?.id || '',
          name: existing ? existing.name : it.name,
          unit: it.unit || (existing?.unit || 'kg'),
          qty: parseFloat(it.qty) || 0,
          price: parseFloat(it.price) || 0,
          minStock: existing?.minStock || 0,
          isNew: !existing
        };
      });

      setEntryRows(mappedRows);
      setIsModalOpen(true);

    } catch (err) {
      console.error("AI Scan Error:", err);
      alert("A apărut o eroare la scanarea facturii. Vă rugăm să încercați din nou sau să introduceți datele manual.");
    } finally {
      setIsAiLoading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handlePrintInventoryList = () => {
    setPrintDoc({
      type: 'LIST',
      data: {
        date: new Date().toLocaleDateString('ro-RO'),
        items: inventory.sort((a,b) => a.name.localeCompare(b.name))
      }
    });
    setTimeout(() => {
      window.print();
      setPrintDoc(null);
    }, 200);
  };

  const handlePrintDocument = (type: 'NIR' | 'BC', documentRef: string, date: string, items: any[], supplier?: string) => {
    setPrintDoc({
      type,
      data: {
        documentRef,
        date,
        supplier,
        items
      }
    });
    setTimeout(() => {
      window.print();
      setPrintDoc(null);
    }, 200);
  };

  const docHistory = useMemo(() => {
    const groups: Record<string, any> = {};
    transactions.forEach(t => {
      if (!groups[t.documentRef]) {
        groups[t.documentRef] = {
          ref: t.documentRef,
          date: t.date,
          type: t.type,
          itemsCount: 0,
          totalValue: 0,
          supplier: t.supplier || '-'
        };
      }
      groups[t.documentRef].itemsCount++;
      const item = getItem(t.foodItemId);
      groups[t.documentRef].totalValue += t.quantity * (t.pricePerUnit || item?.lastPrice || 0);
    });
    return Object.values(groups).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, inventory]);

  const handleViewDoc = (ref: string) => {
    const related = transactions.filter(t => t.documentRef === ref);
    if (related.length === 0) return;
    
    setPreviewDoc({
      ref,
      type: related[0].type,
      date: related[0].date,
      supplier: related[0].supplier || '-',
      items: related.map(t => ({
        ...t,
        name: getItem(t.foodItemId)?.name || 'Produs șters',
        unit: getItem(t.foodItemId)?.unit || '-'
      }))
    });
    setIsPreviewModalOpen(true);
  };

  const handleDeleteDoc = (ref: string) => {
    if (confirm(`Sunteți sigur că doriți să ștergeți documentul ${ref}? Această acțiune va anula mișcările de stoc aferente.`)) {
      deleteDocument(ref);
    }
  };

  return (
    <div className="space-y-6">
      {/* SECTIUNE TIPARIRE */}
      <div className="hidden print:block bg-white text-black p-4 sm:p-12 font-serif min-h-screen">
        {printDoc?.type === 'LIST' && (
          <div className="space-y-8">
            <div className="border-b-4 border-black pb-4 mb-4">
               <h1 className="text-2xl font-black uppercase text-center">{config.institutionName}</h1>
               <p className="text-center text-sm font-bold uppercase">Inventar Magazie - Situație Stocuri</p>
            </div>
            <p className="text-right text-xs font-bold mb-4">Data generării: {printDoc.data.date}</p>
            <table className="w-full border-collapse border-2 border-black">
              <thead>
                <tr className="bg-slate-100 text-[10px] uppercase font-bold">
                  <th className="border-2 border-black p-2 text-center">Nr.</th>
                  <th className="border-2 border-black p-2 text-left">Produs</th>
                  <th className="border-2 border-black p-2 text-center">U.M.</th>
                  <th className="border-2 border-black p-2 text-right">Cantitate</th>
                  <th className="border-2 border-black p-2 text-right">Preț</th>
                  <th className="border-2 border-black p-2 text-right">Valoare</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {printDoc.data.items.map((item: any, idx: number) => (
                  <tr key={idx}>
                    <td className="border-2 border-black p-2 text-center">{idx + 1}</td>
                    <td className="border-2 border-black p-2 font-bold">{item.name}</td>
                    <td className="border-2 border-black p-2 text-center uppercase">{item.unit}</td>
                    <td className="border-2 border-black p-2 text-right">{item.quantity.toFixed(2)}</td>
                    <td className="border-2 border-black p-2 text-right">{item.lastPrice.toFixed(2)}</td>
                    <td className="border-2 border-black p-2 text-right font-bold">{(item.quantity * item.lastPrice).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {printDoc && (printDoc.type === 'NIR' || printDoc.type === 'BC') && (
          <div className="space-y-8">
            <div className="flex justify-between items-start border-b-4 border-black pb-6">
              <div className="space-y-1">
                <h1 className="text-2xl font-black uppercase leading-none">{config.institutionName}</h1>
                <p className="text-xs font-bold">{config.address}</p>
                <div className="mt-4">
                   <p className="text-sm font-black uppercase tracking-widest bg-black text-white px-2 py-1 inline-block">
                    {printDoc.type === 'NIR' ? 'Notă de Intrare Recepție' : 'Bon de Consum'}
                   </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-black text-2xl">Nr: {printDoc.data.documentRef}</p>
                <p className="text-sm font-bold">Data: {new Date(printDoc.data.date).toLocaleDateString('ro-RO')}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-8 text-xs font-bold uppercase">
               <div className="border border-black p-2">
                  <p className="opacity-50 text-[8px]">Referință Document:</p>
                  <p>{printDoc.data.documentRef}</p>
               </div>
               <div className="border border-black p-2">
                  <p className="opacity-50 text-[8px]">{printDoc.type === 'NIR' ? 'Furnizor:' : 'Gestiune / Destinație:'}</p>
                  <p>{printDoc.data.supplier || (printDoc.type === 'BC' ? 'BUCĂTĂRIE' : '-')}</p>
               </div>
            </div>

            <table className="w-full border-collapse border-2 border-black">
              <thead>
                <tr className="bg-slate-100 text-[10px] uppercase font-bold">
                  <th className="border-2 border-black p-2 text-center w-10">Nr.</th>
                  <th className="border-2 border-black p-2 text-left">Denumire Produs</th>
                  <th className="border-2 border-black p-2 text-center w-20">U.M.</th>
                  <th className="border-2 border-black p-2 text-right w-24">Cantitate</th>
                  <th className="border-2 border-black p-2 text-right w-24">Preț Unitar</th>
                  <th className="border-2 border-black p-2 text-right w-32">Valoare</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {printDoc.data.items.map((item: any, idx: number) => (
                  <tr key={idx}>
                    <td className="border-2 border-black p-2 text-center">{idx + 1}</td>
                    <td className="border-2 border-black p-2 font-bold">{item.name}</td>
                    <td className="border-2 border-black p-2 text-center uppercase">{item.unit}</td>
                    <td className="border-2 border-black p-2 text-right">{item.qty.toFixed(2)}</td>
                    <td className="border-2 border-black p-2 text-right">{item.price.toFixed(2)}</td>
                    <td className="border-2 border-black p-2 text-right font-black">{(item.qty * item.price).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-black">
                  <td colSpan={5} className="border-2 border-black p-2 text-right uppercase">Total Document:</td>
                  <td className="border-2 border-black p-2 text-right text-lg">
                    {printDoc.data.items.reduce((acc: number, it: any) => acc + (it.qty * it.price), 0).toFixed(2)} {config.currency}
                  </td>
                </tr>
              </tfoot>
            </table>
            
            <div className="mt-32 grid grid-cols-2 gap-20 text-center text-xs font-bold uppercase">
               <div className="space-y-16">
                  <div className="border-t-2 border-black pt-2">Gestionar (Predat)</div>
                  <p className="text-[8px] normal-case opacity-50 italic">Semnătură și Ștampilă</p>
               </div>
               <div className="space-y-16">
                  <div className="border-t-2 border-black pt-2">{printDoc.type === 'NIR' ? 'Comisie Recepție' : 'Primit (Bucătar)'}</div>
                  <p className="text-[8px] normal-case opacity-50 italic">Semnătură</p>
               </div>
            </div>
          </div>
        )}
      </div>

      {/* STATISTICI INTERFATA */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:hidden">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-2xl text-white shadow-lg">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-white/10 rounded-lg"><DollarSign size={24} className="text-emerald-400" /></div>
            <span className="text-[10px] font-black px-2 py-1 bg-white/10 rounded-full uppercase tracking-widest text-slate-300">Valoare Stoc</span>
          </div>
          <p className="text-3xl font-black">{totalStockValue.toLocaleString('ro-RO')} {config.currency}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Layers size={24} /></div>
            <span className="text-[10px] font-black px-2 py-1 bg-blue-50 text-blue-600 rounded-full uppercase tracking-widest">Produse</span>
          </div>
          <p className="text-3xl font-black text-slate-800">{totalItemsCount}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-rose-50 text-rose-600 rounded-lg"><AlertTriangle size={24} /></div>
            <span className="text-[10px] font-black px-2 py-1 bg-rose-50 text-rose-600 rounded-full uppercase tracking-widest">Stoc Scăzut</span>
          </div>
          <p className="text-3xl font-black text-slate-800">{lowStockCount}</p>
        </div>
      </div>

      {/* FILTRE SI ACTIUNI */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div className="flex flex-1 items-center gap-3 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Caută în magazie..." 
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none shadow-sm transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setShowLowStockOnly(!showLowStockOnly)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all border shadow-sm active:scale-95 whitespace-nowrap ${showLowStockOnly ? 'bg-rose-600 border-rose-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            <AlertTriangle size={18} className={showLowStockOnly ? 'text-white' : 'text-rose-500'} />
            Alerte ({lowStockCount})
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => scanInputRef.current?.click()}
            disabled={isAiLoading}
            className="flex items-center gap-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 border border-indigo-100 disabled:opacity-50"
          >
            {isAiLoading ? <Loader2 size={18} className="animate-spin" /> : <Scan size={18} />}
            Scanare Factură AI
          </button>
          <input type="file" ref={scanInputRef} className="hidden" accept="image/*" onChange={handleScanInvoice} />
          
          <button onClick={() => openModal('ENTRY')} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-emerald-500/20 active:scale-95">
            <ArrowUpRight size={18} /> NIR Nou
          </button>
          <button onClick={() => openModal('EXIT')} className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-rose-500/20 active:scale-95">
            <ArrowDownRight size={18} /> Bon Consum
          </button>
        </div>
      </div>

      {/* GRID PRODUSE */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        {filteredItems.map(item => {
          const isLow = item.quantity <= item.minStock;
          return (
            <div key={item.id} className={`bg-white rounded-2xl border shadow-sm group overflow-hidden transition-all hover:shadow-md ${isLow ? 'border-rose-200 bg-rose-50/30' : 'border-slate-200 hover:border-blue-300'}`}>
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-xl transition-all ${isLow ? 'bg-rose-500 text-white shadow-lg' : 'bg-slate-100 text-slate-400 group-hover:bg-blue-600 group-hover:text-white'}`}>
                    <Package size={24} />
                  </div>
                  {isLow && <div className="text-rose-500 font-bold text-[10px] uppercase tracking-tighter">Aprovizionare Urgentă</div>}
                </div>
                <h3 className="font-bold text-slate-800 text-lg truncate">{item.name}</h3>
                <div className="mt-4 flex justify-between items-end">
                  <div>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Stoc Disponibil</p>
                    <p className={`text-2xl font-black tracking-tight ${isLow ? 'text-rose-600' : 'text-slate-800'}`}>{item.quantity.toFixed(2)} <span className="text-xs opacity-50 font-medium uppercase">{item.unit}</span></p>
                  </div>
                  <div className="text-right text-[10px] text-slate-400 font-black uppercase tracking-widest">
                    Preț Unitar: <span className="text-slate-700">{item.lastPrice.toFixed(2)} {config.currency}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* JURNAL TRANZACTII GRUPATE */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden print:hidden mt-8">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <History className="text-blue-500" size={20} />
          <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">Jurnal Documente (NIR / BC)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <th className="px-6 py-4">Dată</th>
                <th className="px-6 py-4">Tip</th>
                <th className="px-6 py-4">Referință</th>
                <th className="px-6 py-4">Furnizor / Destinație</th>
                <th className="px-6 py-4 text-center">Repere</th>
                <th className="px-6 py-4 text-right">Valoare Totală</th>
                <th className="px-6 py-4 text-right">Acțiuni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {docHistory.length > 0 ? docHistory.map(doc => (
                <tr key={doc.ref} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-500">{new Date(doc.date).toLocaleDateString('ro-RO')}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${doc.type === 'ENTRY' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                      {doc.type === 'ENTRY' ? 'NIR' : 'Bon Consum'}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono font-bold">{doc.ref}</td>
                  <td className="px-6 py-4 text-slate-600">{doc.supplier}</td>
                  <td className="px-6 py-4 text-center font-bold">{doc.itemsCount}</td>
                  <td className="px-6 py-4 text-right font-black text-slate-800">{doc.totalValue.toFixed(2)} {config.currency}</td>
                  <td className="px-6 py-4 text-right flex justify-end gap-2">
                    <button onClick={() => handleViewDoc(doc.ref)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="Vizualizare">
                      <Eye size={18} />
                    </button>
                    <button onClick={() => handleDeleteDoc(doc.ref)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all" title="Anulare document">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={7} className="p-12 text-center text-slate-400 italic">Nu există documente înregistrate.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL TRANZACTIE NOUA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm print:hidden animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl shadow-lg text-white ${modalType === 'ENTRY' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
                   {modalType === 'ENTRY' ? <ArrowUpRight size={24} /> : <ArrowDownRight size={24} />}
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                    {modalType === 'ENTRY' ? 'Creare Notă Intrare Recepție (NIR)' : 'Creare Bon de Consum (BC)'}
                  </h2>
                  <p className="text-xs text-slate-400 font-medium">Introduceți datele documentului și lista de produse.</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-3 text-slate-400 hover:bg-white rounded-2xl transition-all"><X size={24} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              {/* Header Document */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Număr Document</label>
                  <input className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 font-bold" value={docHeader.doc} onChange={e => setDocHeader({...docHeader, doc: e.target.value})} placeholder="Ex: F123 / BC-01" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{modalType === 'ENTRY' ? 'Furnizor' : 'Destinație'}</label>
                  <input className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 font-bold" value={docHeader.supplier} onChange={e => setDocHeader({...docHeader, supplier: e.target.value})} placeholder={modalType === 'ENTRY' ? "Ex: Metro" : "Ex: Bucătărie"} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dată</label>
                  <input type="date" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 font-bold" value={docHeader.date} onChange={e => setDocHeader({...docHeader, date: e.target.value})} />
                </div>
              </div>

              {/* Editor Produse */}
              <div className="space-y-4">
                <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-widest border-b pb-2">Editor Articole</h3>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-blue-50/30 p-4 rounded-2xl border border-blue-100">
                  <div className="md:col-span-4 space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400">Selectează sau Adaugă Nou</label>
                    <select 
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-bold bg-white"
                      value={currentRow.itemId}
                      onChange={e => {
                        const val = e.target.value;
                        if (val === 'NEW') {
                          setCurrentRow({ ...currentRow, isNew: true, itemId: '', name: '', unit: 'kg' });
                        } else {
                          const item = inventory.find(i => i.id === val);
                          setCurrentRow({ ...currentRow, isNew: false, itemId: val, name: item?.name || '', unit: item?.unit || 'kg', price: item?.lastPrice || 0 });
                        }
                      }}
                    >
                      <option value="">Alege produs existent...</option>
                      {inventory.map(i => <option key={i.id} value={i.id}>{i.name} ({i.quantity} {i.unit} in stoc)</option>)}
                      {modalType === 'ENTRY' && <option value="NEW" className="text-blue-600 font-bold">+ PRODUS NOU (Nu e in baza de date)</option>}
                    </select>
                  </div>
                  
                  {currentRow.isNew && (
                    <div className="md:col-span-3 space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-400">Nume Produs Nou</label>
                      <input className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-bold" value={currentRow.name} onChange={e => setCurrentRow({...currentRow, name: e.target.value})} />
                    </div>
                  )}

                  <div className={`md:col-span-${currentRow.isNew ? '1' : '4'} space-y-1`}>
                    <label className="text-[9px] font-black uppercase text-slate-400">UM</label>
                    <select className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-bold" value={currentRow.unit} disabled={!currentRow.isNew} onChange={e => setCurrentRow({...currentRow, unit: e.target.value as any})}>
                      <option value="kg">KG</option>
                      <option value="litru">Litru</option>
                      <option value="buc">Buc</option>
                      <option value="g">G</option>
                    </select>
                  </div>

                  <div className="md:col-span-1 space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400">Cantitate</label>
                    <input type="number" step="0.01" className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-bold" value={currentRow.qty || ''} onChange={e => setCurrentRow({...currentRow, qty: parseFloat(e.target.value)})} />
                  </div>

                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400">Preț Unitar</label>
                    <input type="number" step="0.01" className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-bold" value={currentRow.price || ''} onChange={e => setCurrentRow({...currentRow, price: parseFloat(e.target.value)})} />
                  </div>

                  <div className="md:col-span-1">
                    <button onClick={handleAddRow} className="w-full p-2.5 bg-blue-600 text-white rounded-xl shadow-md hover:bg-blue-700 transition-all flex justify-center"><Plus size={20} /></button>
                  </div>
                </div>

                <div className="border border-slate-100 rounded-3xl overflow-hidden shadow-inner">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 font-black text-slate-400 uppercase tracking-widest">
                      <tr>
                        <th className="px-6 py-4">Denumire</th>
                        <th className="px-6 py-4 text-center">UM</th>
                        <th className="px-6 py-4 text-center">Cantitate</th>
                        <th className="px-6 py-4 text-right">Preț Unitar</th>
                        <th className="px-6 py-4 text-right">Valoare</th>
                        <th className="px-6 py-4"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {entryRows.length > 0 ? entryRows.map(row => (
                        <tr key={row.id}>
                          <td className="px-6 py-4">
                            <span className="font-bold text-slate-700">{row.name}</span>
                            {row.isNew && <span className="ml-2 px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 text-[8px] uppercase">Produs Nou</span>}
                          </td>
                          <td className="px-6 py-4 text-center uppercase font-medium">{row.unit}</td>
                          <td className="px-6 py-4 text-center font-black">{row.qty.toFixed(2)}</td>
                          <td className="px-6 py-4 text-right font-medium">{row.price.toFixed(2)}</td>
                          <td className="px-6 py-4 text-right font-black">{(row.qty * row.price).toFixed(2)}</td>
                          <td className="px-6 py-4 text-right">
                            <button onClick={() => handleRemoveRow(row.id)} className="p-2 text-slate-300 hover:text-rose-600 transition-colors"><Trash2 size={16} /></button>
                          </td>
                        </tr>
                      )) : (
                        <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">Nu ați adăugat produse în document.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-8 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row gap-4">
              <div className="flex-1 flex items-center gap-4">
                 <div className="text-slate-400 text-xs font-bold uppercase tracking-widest">Valoare Totală Document:</div>
                 <div className="text-2xl font-black text-slate-800">
                    {entryRows.reduce((acc, r) => acc + (r.qty * r.price), 0).toFixed(2)} {config.currency}
                 </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setIsModalOpen(false)} className="px-8 py-4 rounded-2xl font-black text-slate-500 uppercase text-xs tracking-widest">Anulează</button>
                <button onClick={() => handleFinalizeTransaction(true)} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest flex items-center gap-2 shadow-xl active:scale-95">
                  <Printer size={18} /> Salvează și Tipărește
                </button>
                <button onClick={() => handleFinalizeTransaction(false)} className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95">
                  Salvează Document
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW DOCUMENT MODAL */}
      {isPreviewModalOpen && previewDoc && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl shadow-lg text-white ${previewDoc.type === 'ENTRY' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
                   {previewDoc.type === 'ENTRY' ? <FileText size={24} /> : <FileSearch size={24} />}
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Vizualizare {previewDoc.type === 'ENTRY' ? 'NIR' : 'Bon Consum'}</h2>
                  <p className="text-xs text-slate-400 font-medium">Ref: {previewDoc.ref} | Data: {new Date(previewDoc.date).toLocaleDateString('ro-RO')}</p>
                </div>
              </div>
              <button onClick={() => setIsPreviewModalOpen(false)} className="p-3 text-slate-400 hover:bg-white rounded-2xl transition-all"><X size={24} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-8">
               <div className="mb-8 grid grid-cols-2 gap-8">
                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{previewDoc.type === 'ENTRY' ? 'Furnizor' : 'Destinație'}</p>
                     <p className="text-lg font-bold text-slate-800">{previewDoc.supplier}</p>
                  </div>
                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-right">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Valoare Totală</p>
                     <p className="text-2xl font-black text-slate-800">
                        {previewDoc.items.reduce((acc: number, it: any) => acc + (it.quantity * (it.pricePerUnit || getItem(it.foodItemId)?.lastPrice || 0)), 0).toFixed(2)} {config.currency}
                     </p>
                  </div>
               </div>
               <table className="w-full text-left">
                  <thead className="bg-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                     <tr>
                        <th className="px-6 py-4">Produs</th>
                        <th className="px-6 py-4 text-center">UM</th>
                        <th className="px-6 py-4 text-center">Cantitate</th>
                        <th className="px-6 py-4 text-right">Preț</th>
                        <th className="px-6 py-4 text-right">Total</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                     {previewDoc.items.map((it: any, i: number) => {
                       const price = it.pricePerUnit || getItem(it.foodItemId)?.lastPrice || 0;
                       return (
                        <tr key={i}>
                           <td className="px-6 py-4 font-bold text-slate-700">{it.name}</td>
                           <td className="px-6 py-4 text-center uppercase">{it.unit}</td>
                           <td className="px-6 py-4 text-center font-black">{it.quantity.toFixed(2)}</td>
                           <td className="px-6 py-4 text-right">{price.toFixed(2)}</td>
                           <td className="px-6 py-4 text-right font-black">{(it.quantity * price).toFixed(2)}</td>
                        </tr>
                     )})}
                  </tbody>
               </table>
            </div>
            <div className="p-8 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
               <button 
                 onClick={() => {
                   handlePrintDocument(previewDoc.type === 'ENTRY' ? 'NIR' : 'BC', previewDoc.ref, previewDoc.date, previewDoc.items.map((it:any) => ({
                     name: it.name,
                     unit: it.unit,
                     qty: it.quantity,
                     price: it.pricePerUnit || getItem(it.foodItemId)?.lastPrice || 0
                   })), previewDoc.supplier);
                 }}
                 className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest flex items-center gap-2 shadow-xl"
               >
                  <Printer size={18} /> Re-Tipărește
               </button>
               <button onClick={() => setIsPreviewModalOpen(false)} className="px-8 py-4 bg-white border border-slate-200 rounded-2xl font-black uppercase text-xs tracking-widest">Închide</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
