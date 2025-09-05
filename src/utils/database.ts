import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { User, Category, MenuItem, Table, Order, OrderItem, Payment } from '../types';

interface RestaurantDB extends DBSchema {
  users: {
    key: string;
    value: User;
  };
  categories: {
    key: string;
    value: Category;
  };
  menuItems: {
    key: string;
    value: MenuItem;
  };
  tables: {
    key: string;
    value: Table;
  };
  orders: {
    key: string;
    value: Order;
  };
  orderItems: {
    key: string;
    value: OrderItem;
  };
  payments: {
    key: string;
    value: Payment;
  };
}

let db: IDBPDatabase<RestaurantDB>;

export const initDatabase = async () => {
  db = await openDB<RestaurantDB>('restaurant-pos', 1, {
    upgrade(db) {
      db.createObjectStore('users', { keyPath: 'id' });
      db.createObjectStore('categories', { keyPath: 'id' });
      db.createObjectStore('menuItems', { keyPath: 'id' });
      db.createObjectStore('tables', { keyPath: 'id' });
      db.createObjectStore('orders', { keyPath: 'id' });
      db.createObjectStore('orderItems', { keyPath: 'id' });
      db.createObjectStore('payments', { keyPath: 'id' });
    },
  });
};

// User operations
export const getUser = async (id: string): Promise<User | undefined> => {
  return await db.get('users', id);
};

export const getUserByEmail = async (email: string): Promise<User | undefined> => {
  const users = await db.getAll('users');
  return users.find(user => user.email === email);
};

export const createUser = async (user: User): Promise<void> => {
  await db.add('users', user);
};

export const updateUser = async (user: User): Promise<void> => {
  await db.put('users', user);
};

export const deleteUser = async (id: string): Promise<void> => {
  await db.delete('users', id);
};

export const getAllUsers = async (): Promise<User[]> => {
  return await db.getAll('users');
};

// Category operations
export const getAllCategories = async (): Promise<Category[]> => {
  return await db.getAll('categories');
};

export const createCategory = async (category: Category): Promise<void> => {
  await db.add('categories', category);
};

export const updateCategory = async (category: Category): Promise<void> => {
  await db.put('categories', category);
};

export const deleteCategory = async (id: string): Promise<void> => {
  await db.delete('categories', id);
};

// MenuItem operations
export const getAllMenuItems = async (): Promise<MenuItem[]> => {
  return await db.getAll('menuItems');
};

export const createMenuItem = async (item: MenuItem): Promise<void> => {
  await db.add('menuItems', item);
};

export const updateMenuItem = async (item: MenuItem): Promise<void> => {
  await db.put('menuItems', item);
};

export const deleteMenuItem = async (id: string): Promise<void> => {
  await db.delete('menuItems', id);
};

// Table operations
export const getAllTables = async (): Promise<Table[]> => {
  return await db.getAll('tables');
};

export const createTable = async (table: Table): Promise<void> => {
  await db.add('tables', table);
};

export const updateTable = async (table: Table): Promise<void> => {
  await db.put('tables', table);
};

// Order operations
export const getAllOrders = async (): Promise<Order[]> => {
  return await db.getAll('orders');
};

export const getOrder = async (id: string): Promise<Order | undefined> => {
  return await db.get('orders', id);
};

export const createOrder = async (order: Order): Promise<void> => {
  await db.add('orders', order);
};

export const updateOrder = async (order: Order): Promise<void> => {
  await db.put('orders', order);
};

// OrderItem operations
export const getOrderItems = async (orderId: string): Promise<OrderItem[]> => {
  const items = await db.getAll('orderItems');
  return items.filter(item => item.orderId === orderId);
};

export const createOrderItem = async (item: OrderItem): Promise<void> => {
  await db.add('orderItems', item);
};

// Payment operations
export const createPayment = async (payment: Payment): Promise<void> => {
  await db.add('payments', payment);
};

export const getPaymentByOrderId = async (orderId: string): Promise<Payment | undefined> => {
  const payments = await db.getAll('payments');
  return payments.find(payment => payment.orderId === orderId);
};

export { db };
