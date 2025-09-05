export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'cashier' | 'waiter' | 'chef';
  createdAt: Date;
}

export interface Category {
  id: string;
  name: string;
  createdAt: Date;
}

export interface MenuItem {
  id: string;
  name: string;
  categoryId: string;
  price: number;
  description: string;
  modifiers: string[];
  stock: number;
  image?: string;
  createdAt: Date;
}

export interface Table {
  id: string;
  number: number;
  status: 'available' | 'occupied' | 'reserved';
  createdAt: Date;
}

export interface Order {
  id: string;
  tableId: string;
  waiterId: string;
  status: 'pending' | 'in-progress' | 'ready' | 'served' | 'cancelled';
  total: number;
  discount: number;
  tax: number;
  serviceCharge: number;
  finalTotal: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  quantity: number;
  price: number;
  modifiers: string[];
  totalPrice: number;
}

export interface Payment {
  id: string;
  orderId: string;
  method: 'cash' | 'card';
  amount: number;
  paidAt: Date;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

export interface NotificationEvent {
  type: 'order_created' | 'order_ready' | 'order_served';
  orderId: string;
  message: string;
  timestamp: Date;
  targetRole: string;
}
