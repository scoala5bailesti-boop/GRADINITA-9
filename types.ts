
export type Role = 'ADMIN' | 'ASISTENT' | 'EDUCATOR';

export interface User {
  id: string;
  username: string;
  password?: string;
  name: string;
  role: Role;
}

export interface AppConfig {
  institutionName: string;
  foodCostPerDay: number;
  currency: string;
  address: string;
  email: string;
  phone: string;
  groups: string[];
}

export interface Parent {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
}

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  group: string;
  cnp?: string;
  parentId: string;
  active: boolean;
}

export type AttendanceStatus = 'PREZENT' | 'ABSENT' | 'MOTIVAT';

export interface AttendanceRecord {
  id: string;
  studentId: string;
  date: string; // ISO string YYYY-MM-DD
  status: AttendanceStatus;
}

export interface Payment {
  id: string;
  studentId: string;
  parentId: string;
  invoiceNumber: string;
  date: string;
  amount: number;
  method: 'CASH' | 'CARD' | 'TRANSFER';
  month: string; // YYYY-MM
}

export interface FoodItem {
  id: string;
  name: string;
  unit: 'kg' | 'litru' | 'buc' | 'g';
  quantity: number;
  minStock: number;
  lastPrice: number;
}

export interface InventoryTransaction {
  id: string;
  foodItemId: string;
  type: 'ENTRY' | 'EXIT';
  quantity: number;
  pricePerUnit?: number;
  date: string;
  documentRef: string; // Factura, Aviz, Bon Consum
  supplier?: string;
  destination?: string; // e.g., 'Bucătărie'
}

export interface DailyMenu {
  id: string;
  date: string;
  breakfast: string;
  snack1: string;
  lunch: string;
  snack2: string;
  itemsUsed: { itemId: string; quantity: number }[];
}
