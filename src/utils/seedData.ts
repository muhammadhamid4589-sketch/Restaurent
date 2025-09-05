import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { User, Category, MenuItem, Table } from '../types';
import { createUser, createCategory, createMenuItem, createTable, getAllUsers } from './database';

export const seedDatabase = async () => {
  // Check if data already exists
  const existingUsers = await getAllUsers();
  if (existingUsers.length > 0) {
    return; // Data already seeded
  }

  // Seed users
  const defaultUsers: Omit<User, 'id'>[] = [
    {
      name: 'Restaurant Admin',
      email: 'admin@restaurant.com',
      password: await bcrypt.hash('admin123', 10),
      role: 'admin',
      createdAt: new Date(),
    },
    {
      name: 'Cashier Staff',
      email: 'cashier@restaurant.com',
      password: await bcrypt.hash('cashier123', 10),
      role: 'cashier',
      createdAt: new Date(),
    },
    {
      name: 'Waiter Staff',
      email: 'waiter@restaurant.com',
      password: await bcrypt.hash('waiter123', 10),
      role: 'waiter',
      createdAt: new Date(),
    },
    {
      name: 'Chef',
      email: 'chef@restaurant.com',
      password: await bcrypt.hash('chef123', 10),
      role: 'chef',
      createdAt: new Date(),
    },
  ];

  for (const user of defaultUsers) {
    await createUser({ ...user, id: uuidv4() });
  }

  // Seed categories
  const categories: Omit<Category, 'id'>[] = [
    { name: 'Biryani & Rice', createdAt: new Date() },
    { name: 'BBQ & Karahi', createdAt: new Date() },
    { name: 'Fast Food', createdAt: new Date() },
    { name: 'Chinese', createdAt: new Date() },
    { name: 'Beverages', createdAt: new Date() },
    { name: 'Desserts', createdAt: new Date() },
  ];

  const createdCategories: Category[] = [];
  for (const category of categories) {
    const newCategory = { ...category, id: uuidv4() };
    await createCategory(newCategory);
    createdCategories.push(newCategory);
  }

  // Seed menu items
  const menuItems: Omit<MenuItem, 'id'>[] = [
    // Biryani & Rice
    {
      name: 'Chicken Biryani',
      categoryId: createdCategories[0].id,
      price: 450,
      description: 'Aromatic basmati rice with tender chicken and traditional spices',
      modifiers: ['Extra Raita', 'Spicy', 'Mild'],
      stock: 50,
      createdAt: new Date(),
    },
    {
      name: 'Mutton Biryani',
      categoryId: createdCategories[0].id,
      price: 650,
      description: 'Premium mutton biryani with authentic flavors',
      modifiers: ['Extra Raita', 'Spicy', 'Mild'],
      stock: 30,
      createdAt: new Date(),
    },
    {
      name: 'Beef Pulao',
      categoryId: createdCategories[0].id,
      price: 380,
      description: 'Flavorful beef pulao with aromatic rice',
      modifiers: ['Extra Raita'],
      stock: 40,
      createdAt: new Date(),
    },

    // BBQ & Karahi
    {
      name: 'Chicken Karahi',
      categoryId: createdCategories[1].id,
      price: 850,
      description: 'Traditional chicken karahi for 2-3 people',
      modifiers: ['Extra Naan', 'Spicy', 'Mild'],
      stock: 25,
      createdAt: new Date(),
    },
    {
      name: 'Mutton Karahi',
      categoryId: createdCategories[1].id,
      price: 1200,
      description: 'Tender mutton karahi with authentic spices',
      modifiers: ['Extra Naan', 'Spicy', 'Mild'],
      stock: 20,
      createdAt: new Date(),
    },
    {
      name: 'Chicken Tikka',
      categoryId: createdCategories[1].id,
      price: 320,
      description: 'Grilled chicken tikka with mint chutney',
      modifiers: ['Extra Chutney', 'Spicy'],
      stock: 35,
      createdAt: new Date(),
    },
    {
      name: 'Seekh Kebab',
      categoryId: createdCategories[1].id,
      price: 280,
      description: 'Juicy seekh kebabs with onions',
      modifiers: ['Extra Chutney'],
      stock: 40,
      createdAt: new Date(),
    },

    // Fast Food
    {
      name: 'Zinger Burger',
      categoryId: createdCategories[2].id,
      price: 350,
      description: 'Crispy chicken burger with fries',
      modifiers: ['Extra Cheese', 'No Fries'],
      stock: 50,
      createdAt: new Date(),
    },
    {
      name: 'Club Sandwich',
      categoryId: createdCategories[2].id,
      price: 280,
      description: 'Triple layer club sandwich with fries',
      modifiers: ['Extra Cheese'],
      stock: 30,
      createdAt: new Date(),
    },
    {
      name: 'Chicken Roll',
      categoryId: createdCategories[2].id,
      price: 220,
      description: 'Spicy chicken roll with fresh vegetables',
      modifiers: ['Extra Spicy', 'No Salad'],
      stock: 45,
      createdAt: new Date(),
    },

    // Chinese
    {
      name: 'Chicken Fried Rice',
      categoryId: createdCategories[3].id,
      price: 380,
      description: 'Wok-fried rice with chicken and vegetables',
      modifiers: ['Extra Spicy'],
      stock: 35,
      createdAt: new Date(),
    },
    {
      name: 'Sweet & Sour Chicken',
      categoryId: createdCategories[3].id,
      price: 450,
      description: 'Crispy chicken in sweet and sour sauce',
      modifiers: ['Extra Sauce'],
      stock: 25,
      createdAt: new Date(),
    },

    // Beverages
    {
      name: 'Fresh Lime',
      categoryId: createdCategories[4].id,
      price: 120,
      description: 'Fresh lime water with mint',
      modifiers: ['Extra Sweet', 'Less Sugar'],
      stock: 100,
      createdAt: new Date(),
    },
    {
      name: 'Mango Lassi',
      categoryId: createdCategories[4].id,
      price: 180,
      description: 'Thick mango yogurt drink',
      modifiers: ['Extra Sweet'],
      stock: 50,
      createdAt: new Date(),
    },
    {
      name: 'Soft Drinks',
      categoryId: createdCategories[4].id,
      price: 80,
      description: 'Pepsi, Coke, Sprite, Fanta',
      modifiers: [],
      stock: 200,
      createdAt: new Date(),
    },

    // Desserts
    {
      name: 'Gulab Jamun',
      categoryId: createdCategories[5].id,
      price: 150,
      description: 'Traditional sweet dumplings in syrup (2 pieces)',
      modifiers: [],
      stock: 30,
      createdAt: new Date(),
    },
    {
      name: 'Kheer',
      categoryId: createdCategories[5].id,
      price: 180,
      description: 'Creamy rice pudding with nuts',
      modifiers: ['Extra Nuts'],
      stock: 25,
      createdAt: new Date(),
    },
  ];

  for (const item of menuItems) {
    await createMenuItem({ ...item, id: uuidv4() });
  }

  // Seed tables
  const tables: Omit<Table, 'id'>[] = [];
  for (let i = 1; i <= 20; i++) {
    tables.push({
      number: i,
      status: 'available',
      createdAt: new Date(),
    });
  }

  for (const table of tables) {
    await createTable({ ...table, id: uuidv4() });
  }
};
