
import { Student, Parent, FoodItem, Role } from './types';

export const APP_NAME = "GRADINITA NR. 9 „AMZA PELLEA” BĂILEȘTI";

export const MOCK_PARENTS: Parent[] = [
  { id: 'p1', name: 'Andrei Popescu', phone: '0722123456', email: 'andrei.p@example.com', address: 'Str. Libertății 10, București' },
  { id: 'p2', name: 'Maria Ionescu', phone: '0733987654', email: 'maria.i@example.com', address: 'Bd. Unirii 5, București' },
];

export const MOCK_STUDENTS: Student[] = [
  { id: 's1', firstName: 'Luca', lastName: 'Popescu', group: 'Mijlocie', cnp: '5180101123456', parentId: 'p1', active: true },
  { id: 's2', firstName: 'Sofia', lastName: 'Ionescu', group: 'Mică', cnp: '6200202123456', parentId: 'p2', active: true },
  { id: 's3', firstName: 'David', lastName: 'Popescu', group: 'Mare', cnp: '5170303123456', parentId: 'p1', active: true },
];

export const MOCK_FOOD_ITEMS: FoodItem[] = [
  { id: 'f1', name: 'Lapte 3.5%', unit: 'litru', quantity: 45, minStock: 10, lastPrice: 6.5 },
  { id: 'f2', name: 'Pâine integrală', unit: 'buc', quantity: 12, minStock: 5, lastPrice: 4.2 },
  { id: 'f3', name: 'Mere roșii', unit: 'kg', quantity: 8, minStock: 15, lastPrice: 3.5 },
  { id: 'f4', name: 'Piept de pui', unit: 'kg', quantity: 20, minStock: 5, lastPrice: 28.0 },
  { id: 'f5', name: 'Făină Albă', unit: 'kg', quantity: 3, minStock: 5, lastPrice: 4.5 },
  { id: 'f6', name: 'Drojdie', unit: 'buc', quantity: 2, minStock: 5, lastPrice: 1.2 },
];

export const FOOD_COST_PER_DAY = 25.0; // Standard daily food fee
