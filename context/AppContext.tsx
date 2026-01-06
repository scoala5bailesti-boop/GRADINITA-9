
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Student, Parent, AttendanceRecord, Payment, FoodItem, DailyMenu, InventoryTransaction, AppConfig, AttendanceStatus, User } from '../types';
import { MOCK_STUDENTS, MOCK_PARENTS, MOCK_FOOD_ITEMS, FOOD_COST_PER_DAY } from '../constants';
import { storage } from '../services/storageService';

interface InventoryEntryData {
  itemId?: string;
  name?: string;
  unit?: 'kg' | 'litru' | 'buc' | 'g';
  minStock?: number;
  qty: number;
  pricePerUnit?: number;
  doc: string;
  supplier?: string;
}

interface AppContextType {
  users: User[];
  students: Student[];
  parents: Parent[];
  attendance: AttendanceRecord[];
  payments: Payment[];
  inventory: FoodItem[];
  menus: DailyMenu[];
  transactions: InventoryTransaction[];
  config: AppConfig;
  addUser: (user: Omit<User, 'id'>) => void;
  deleteUser: (id: string) => void;
  addStudent: (student: Omit<Student, 'id'>, parent: Omit<Parent, 'id'>) => void;
  updateStudent: (studentId: string, studentData: Partial<Student>, parentData: Partial<Parent>) => void;
  deleteStudent: (id: string) => void;
  importStudents: (data: any[]) => void;
  recordAttendance: (date: string, records: { studentId: string, status: AttendanceStatus }[]) => void;
  addPayment: (payment: Omit<Payment, 'id'>) => void;
  updateStock: (itemId: string, qty: number, type: 'ENTRY' | 'EXIT', doc: string, pricePerUnit?: number) => void;
  addInventoryEntry: (data: InventoryEntryData) => void;
  deleteDocument: (documentRef: string) => void;
  updateMenu: (menu: DailyMenu) => void;
  deleteMenu: (date: string) => void;
  clearAllMenus: () => void;
  updateConfig: (newConfig: AppConfig) => void;
  addGroup: (name: string) => void;
  renameGroup: (oldName: string, newName: string) => void;
  deleteGroup: (name: string) => void;
  resetApp: () => void;
  importAppData: (data: any) => void;
}

const DEFAULT_USERS: User[] = [
  { id: 'admin', username: 'admin', password: '12345678', name: 'Administrator Principal', role: 'ADMIN' }
];

const DEFAULT_CONFIG: AppConfig = {
  institutionName: "GRADINITA NR. 9 „AMZA PELLEA” BĂILEȘTI",
  foodCostPerDay: FOOD_COST_PER_DAY,
  currency: "RON",
  address: "Str. Exemplu nr. 1, Băilești",
  email: "contact@gradinita9amzapellea.ro",
  phone: "0700 000 000",
  groups: ['Mică', 'Mijlocie', 'Mare', 'Pregătitoare']
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(() => storage.get('app_users', DEFAULT_USERS));
  const [students, setStudents] = useState<Student[]>(() => storage.get('students', MOCK_STUDENTS));
  const [parents, setParents] = useState<Parent[]>(() => storage.get('parents', MOCK_PARENTS));
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => storage.get('attendance', []));
  const [payments, setPayments] = useState<Payment[]>(() => storage.get('payments', []));
  const [inventory, setInventory] = useState<FoodItem[]>(() => storage.get('inventory', MOCK_FOOD_ITEMS));
  const [menus, setMenus] = useState<DailyMenu[]>(() => storage.get('menus', []));
  const [transactions, setTransactions] = useState<InventoryTransaction[]>(() => storage.get('transactions', []));
  const [config, setConfig] = useState<AppConfig>(() => storage.get('config', DEFAULT_CONFIG));

  useEffect(() => {
    storage.set('app_users', users);
    storage.set('students', students);
    storage.set('parents', parents);
    storage.set('attendance', attendance);
    storage.set('payments', payments);
    storage.set('inventory', inventory);
    storage.set('menus', menus);
    storage.set('transactions', transactions);
    storage.set('config', config);
  }, [users, students, parents, attendance, payments, inventory, menus, transactions, config]);

  const addUser = (userData: Omit<User, 'id'>) => {
    const newUser = { ...userData, id: `u${Date.now()}` };
    setUsers(prev => [...prev, newUser]);
  };

  const deleteUser = (id: string) => {
    if (id === 'admin') return; 
    setUsers(prev => prev.filter(u => u.id !== id));
  };

  const addStudent = (studentData: Omit<Student, 'id'>, parentData: Omit<Parent, 'id'>) => {
    const pId = `p${Date.now()}`;
    const sId = `s${Date.now()}`;
    const newParent: Parent = { ...parentData, id: pId };
    const newStudent: Student = { ...studentData, id: sId, parentId: pId };
    
    setParents(prev => [...prev, newParent]);
    setStudents(prev => [...prev, newStudent]);
  };

  const updateStudent = (studentId: string, studentData: Partial<Student>, parentData: Partial<Parent>) => {
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, ...studentData } : s));
    
    const student = students.find(s => s.id === studentId);
    if (student && student.parentId) {
      setParents(prev => prev.map(p => p.id === student.parentId ? { ...p, ...parentData } : p));
    }
  };

  const deleteStudent = (id: string) => {
    const studentToDelete = students.find(s => s.id === id);
    setStudents(prev => prev.filter(s => s.id !== id));
    if (studentToDelete) {
      setParents(prev => {
        const hasOtherStudents = students.some(s => s.id !== id && s.parentId === studentToDelete.parentId);
        if (!hasOtherStudents) {
          return prev.filter(p => p.id !== studentToDelete.parentId);
        }
        return prev;
      });
    }
  };

  const importStudents = (data: any[]) => {
    const newParents: Parent[] = [];
    const newStudents: Student[] = [];

    data.forEach((item, index) => {
      const pId = `p-imp-${Date.now()}-${index}`;
      const sId = `s-imp-${Date.now()}-${index}`;
      
      newParents.push({
        id: pId,
        name: item.numeParinte || 'Parinte Nespecificat',
        phone: item.telefon || '',
        email: item.email || '',
        address: item.adresa || ''
      });

      newStudents.push({
        id: sId,
        firstName: item.prenume || '',
        lastName: item.nume || '',
        group: item.grupa || config.groups[0],
        cnp: item.cnp || '',
        parentId: pId,
        active: true
      });
    });

    setParents(prev => [...prev, ...newParents]);
    setStudents(prev => [...prev, ...newStudents]);
  };

  const recordAttendance = (date: string, records: { studentId: string, status: AttendanceStatus }[]) => {
    setAttendance(prev => {
      const updatedIds = new Set(records.map(r => r.studentId));
      const filtered = prev.filter(a => !(a.date === date && updatedIds.has(a.studentId)));
      const newRecords = records.map(r => ({
        id: `${date}-${r.studentId}`,
        studentId: r.studentId,
        date,
        status: r.status
      }));
      return [...filtered, ...newRecords];
    });
  };

  const addPayment = (paymentData: Omit<Payment, 'id'>) => {
    const newPayment: Payment = { ...paymentData, id: `pay${Date.now()}` };
    setPayments(prev => [newPayment, ...prev]);
  };

  const updateStock = (itemId: string, qty: number, type: 'ENTRY' | 'EXIT', doc: string, pricePerUnit?: number) => {
    setInventory(prev => prev.map(item => {
      if (item.id === itemId) {
        const newQty = type === 'ENTRY' ? item.quantity + qty : Math.max(0, item.quantity - qty);
        return { 
          ...item, 
          quantity: newQty,
          lastPrice: type === 'ENTRY' && pricePerUnit ? pricePerUnit : item.lastPrice
        };
      }
      return item;
    }));

    const newTx: InventoryTransaction = {
      id: `tx${Date.now()}-${itemId}`,
      foodItemId: itemId,
      type,
      quantity: qty,
      pricePerUnit: type === 'ENTRY' ? pricePerUnit : undefined,
      date: new Date().toISOString(),
      documentRef: doc
    };
    setTransactions(prev => [newTx, ...prev]);
  };

  const addInventoryEntry = (data: InventoryEntryData) => {
    let targetId = data.itemId;

    if (!targetId && data.name) {
      targetId = `f${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const newItem: FoodItem = {
        id: targetId,
        name: data.name,
        unit: data.unit || 'kg',
        quantity: data.qty,
        minStock: data.minStock || 0,
        lastPrice: data.pricePerUnit || 0
      };
      setInventory(prev => [...prev, newItem]);
      
      const newTx: InventoryTransaction = {
        id: `tx${Date.now()}-${targetId}`,
        foodItemId: targetId,
        type: 'ENTRY',
        quantity: data.qty,
        pricePerUnit: data.pricePerUnit,
        date: new Date().toISOString(),
        documentRef: data.doc,
        supplier: data.supplier
      };
      setTransactions(prev => [newTx, ...prev]);
    } else if (targetId) {
      updateStock(targetId, data.qty, 'ENTRY', data.doc, data.pricePerUnit);
    }
  };

  const deleteDocument = (documentRef: string) => {
    const relatedTxs = transactions.filter(t => t.documentRef === documentRef);
    if (relatedTxs.length === 0) return;

    setInventory(prev => {
      const newInv = [...prev];
      relatedTxs.forEach(tx => {
        const itemIdx = newInv.findIndex(i => i.id === tx.foodItemId);
        if (itemIdx !== -1) {
          // Inversăm efectul tranzacției
          if (tx.type === 'ENTRY') {
            newInv[itemIdx].quantity = Math.max(0, newInv[itemIdx].quantity - tx.quantity);
          } else {
            newInv[itemIdx].quantity += tx.quantity;
          }
        }
      });
      return newInv;
    });

    setTransactions(prev => prev.filter(t => t.documentRef !== documentRef));
  };

  const updateMenu = (menu: DailyMenu) => {
    setMenus(prev => {
      const filtered = prev.filter(m => m.date !== menu.date);
      return [...filtered, menu];
    });
  };

  const deleteMenu = (date: string) => {
    setMenus(prev => prev.filter(m => m.date !== date));
  };

  const clearAllMenus = () => {
    setMenus([]);
  };

  const updateConfig = (newConfig: AppConfig) => {
    setConfig(newConfig);
  };

  const addGroup = (name: string) => {
    setConfig(prev => ({
      ...prev,
      groups: [...prev.groups, name]
    }));
  };

  const renameGroup = (oldName: string, newName: string) => {
    setStudents(prev => prev.map(s => s.group === oldName ? { ...s, group: newName } : s));
    setConfig(prev => ({
      ...prev,
      groups: prev.groups.map(g => g === oldName ? newName : g)
    }));
  };

  const deleteGroup = (name: string) => {
    setConfig(prev => ({
      ...prev,
      groups: prev.groups.filter(g => g !== name)
    }));
  };

  const resetApp = () => {
    if (confirm("Ești sigur că vrei să ștergi TOATE datele? Această acțiune este ireversibilă.")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const importAppData = (data: any) => {
    if (data.config) setConfig(data.config);
    if (data.students) setStudents(data.students);
    if (data.parents) setParents(data.parents);
    if (data.attendance) setAttendance(data.attendance);
    if (data.payments) setPayments(data.payments);
    if (data.inventory) setInventory(data.inventory);
    if (data.menus) setMenus(data.menus);
    if (data.transactions) setTransactions(data.transactions);
    if (data.users) setUsers(data.users);
    
    // Forțăm o salvare imediată în storage
    storage.set('config', data.config || config);
    storage.set('students', data.students || students);
    storage.set('parents', data.parents || parents);
    storage.set('attendance', data.attendance || attendance);
    storage.set('payments', data.payments || payments);
    storage.set('inventory', data.inventory || inventory);
    storage.set('menus', data.menus || menus);
    storage.set('transactions', data.transactions || transactions);
    storage.set('app_users', data.users || users);
  };

  return (
    <AppContext.Provider value={{ 
      users, students, parents, attendance, payments, inventory, menus, transactions, config,
      addUser, deleteUser, addStudent, updateStudent, deleteStudent, importStudents, recordAttendance, addPayment, updateStock, addInventoryEntry, deleteDocument, updateMenu, deleteMenu, clearAllMenus, updateConfig, addGroup, renameGroup, deleteGroup, resetApp, importAppData
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
