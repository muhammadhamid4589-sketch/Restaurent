import React, { useState, useEffect } from 'react';
import { Plus, Minus, ShoppingCart, Send, UtensilsCrossed } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';
import { getAllCategories, getAllMenuItems, getAllTables, createOrder, createOrderItem, updateTable } from '../utils/database';
import { useNotifications } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import { Category, MenuItem, Table } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface CartItem extends MenuItem {
  quantity: number;
  selectedModifiers: string[];
}

const TakeOrders: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { addNotification } = useNotifications();
  const { user } = useAuth();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [categoriesData, menuData, tablesData] = await Promise.all([
        getAllCategories(),
        getAllMenuItems(),
        getAllTables()
      ]);
      
      setCategories(categoriesData);
      setMenuItems(menuData);
      setTables(tablesData);
      
      if (categoriesData.length > 0) {
        setSelectedCategory(categoriesData[0].id);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    }
  };

  const filteredMenuItems = menuItems.filter(item => 
    selectedCategory ? item.categoryId === selectedCategory : true
  );

  const addToCart = (item: MenuItem) => {
    if (item.stock <= 0) {
      toast.error('Item out of stock');
      return;
    }

    const existingItem = cart.find(cartItem => cartItem.id === item.id);
    
    if (existingItem) {
      if (existingItem.quantity >= item.stock) {
        toast.error('Cannot add more than available stock');
        return;
      }
      setCart(cart.map(cartItem =>
        cartItem.id === item.id
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem
      ));
    } else {
      setCart([...cart, { ...item, quantity: 1, selectedModifiers: [] }]);
    }
    toast.success(`${item.name} added to order`);
  };

  const updateQuantity = (itemId: string, change: number) => {
    setCart(cart.map(item => {
      if (item.id === itemId) {
        const newQuantity = Math.max(0, item.quantity + change);
        if (newQuantity > item.stock) {
          toast.error('Cannot exceed available stock');
          return item;
        }
        return { ...item, quantity: newQuantity };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const toggleModifier = (itemId: string, modifier: string) => {
    setCart(cart.map(item => {
      if (item.id === itemId) {
        const modifiers = item.selectedModifiers.includes(modifier)
          ? item.selectedModifiers.filter(m => m !== modifier)
          : [...item.selectedModifiers, modifier];
        return { ...item, selectedModifiers: modifiers };
      }
      return item;
    }));
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const sendOrderToKitchen = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    if (!selectedTable) {
      toast.error('Please select a table');
      return;
    }

    setIsSubmitting(true);

    try {
      const orderId = uuidv4();
      const total = calculateTotal();
      const tax = total * 0.16;
      const serviceCharge = total * 0.05;
      const finalTotal = total + tax + serviceCharge;

      const order = {
        id: orderId,
        tableId: selectedTable,
        waiterId: user?.id || '',
        status: 'pending' as const,
        total,
        discount: 0,
        tax,
        serviceCharge,
        finalTotal,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await createOrder(order);

      for (const item of cart) {
        const orderItem = {
          id: uuidv4(),
          orderId,
          menuItemId: item.id,
          quantity: item.quantity,
          price: item.price,
          modifiers: item.selectedModifiers,
          totalPrice: item.price * item.quantity,
        };
        await createOrderItem(orderItem);
      }

      const table = tables.find(t => t.id === selectedTable);
      if (table) {
        await updateTable({ ...table, status: 'occupied' });
        // Optimistic UI update
        setTables(prevTables => prevTables.map(t => t.id === selectedTable ? { ...t, status: 'occupied' } : t));
      }

      addNotification({
        type: 'order_created',
        orderId,
        message: `New order for Table ${table?.number} by ${user?.name}`,
        targetRole: 'chef',
      });

      setCart([]);
      setSelectedTable('');
      
      toast.success('Order sent to kitchen!');
      
    } catch (error) {
      console.error('Error sending order:', error);
      toast.error('Failed to send order to kitchen');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTableStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'occupied':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'reserved':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  return (
    <div className="flex h-full">
      <div className="flex-1 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <UtensilsCrossed className="text-primary" size={28} />
          <h1 className="text-2xl font-bold text-text-primary">Take Orders</h1>
        </div>
        
        <div className="mb-6">
          <h3 className="text-lg font-medium text-text-primary mb-3">Select Table</h3>
          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {tables.map(table => (
              <motion.button
                key={table.id}
                onClick={() => table.status === 'available' && setSelectedTable(table.id)}
                disabled={table.status !== 'available'}
                className={`p-3 border-2 rounded-lg text-center font-medium transition-all duration-200 ${
                  selectedTable === table.id
                    ? 'border-primary bg-primary/10 scale-105 shadow-lg'
                    : getTableStatusColor(table.status)
                } ${table.status !== 'available' ? 'cursor-not-allowed opacity-60' : 'hover:border-primary/50'}`}
                whileHover={{ scale: table.status === 'available' ? 1.05 : 1 }}
                whileTap={{ scale: table.status === 'available' ? 0.95 : 1 }}
              >
                <div className="text-sm">Table</div>
                <div className="text-lg font-bold">{table.number}</div>
                <div className="text-xs capitalize">{table.status}</div>
              </motion.button>
            ))}
          </div>
        </div>
        
        <div className="flex space-x-2 mb-6 overflow-x-auto pb-2">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-full whitespace-nowrap transition-all duration-200 text-sm font-medium ${
                selectedCategory === category.id
                  ? 'bg-primary text-white shadow'
                  : 'bg-surface text-text-secondary hover:bg-background'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredMenuItems.map(item => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              className={`bg-surface p-4 rounded-lg shadow-sm border border-border-color cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/50 ${
                item.stock <= 0 ? 'opacity-50' : ''
              }`}
              onClick={() => addToCart(item)}
            >
              <h3 className="font-medium text-text-primary mb-1">{item.name}</h3>
              <p className="text-sm text-text-secondary mb-2 line-clamp-2 h-10">{item.description}</p>
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold text-primary">Rs. {item.price}</span>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  item.stock > 10 ? 'bg-green-500/10 text-green-400' :
                  item.stock > 0 ? 'bg-yellow-500/10 text-yellow-400' :
                  'bg-red-500/10 text-red-400'
                }`}>
                  Stock: {item.stock}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="w-96 bg-surface border-l border-border-color p-6 flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-text-primary">Order Details</h2>
          <ShoppingCart className="text-primary" size={24} />
        </div>

        {selectedTable && (
          <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
            <p className="text-sm font-medium text-primary">
              Table {tables.find(t => t.id === selectedTable)?.number} Selected
            </p>
          </div>
        )}

        <div className="flex-1 space-y-4 mb-6 max-h-[50vh] overflow-y-auto pr-2">
          <AnimatePresence>
            {cart.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-text-secondary text-center py-8"
              >
                No items in order
              </motion.div>
            ) : (
              cart.map(item => (
                <motion.div 
                  key={item.id} 
                  layout
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="border border-border-color rounded-lg p-3"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-sm text-text-primary">{item.name}</h4>
                    <span className="text-sm font-medium text-text-primary">Rs. {(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <button onClick={() => updateQuantity(item.id, -1)} className="bg-surface-darker hover:bg-border-color p-1 rounded"><Minus size={16} /></button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} className="bg-surface-darker hover:bg-border-color p-1 rounded"><Plus size={16} /></button>
                    </div>
                  </div>

                  {item.modifiers.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-text-secondary mb-1">Modifiers:</p>
                      <div className="flex flex-wrap gap-1">
                        {item.modifiers.map(modifier => (
                          <button
                            key={modifier}
                            onClick={() => toggleModifier(item.id, modifier)}
                            className={`text-xs px-2 py-1 rounded-full transition-colors ${
                              item.selectedModifiers.includes(modifier)
                                ? 'bg-primary text-white'
                                : 'bg-surface text-text-secondary'
                            }`}
                          >
                            {modifier}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        {cart.length > 0 && (
          <div className="mt-auto">
            <div className="border-t border-border-color pt-4 space-y-2">
              <div className="flex justify-between font-bold text-lg text-text-primary">
                <span>Total:</span>
                <span>Rs. {calculateTotal().toFixed(2)}</span>
              </div>
              <p className="text-xs text-text-secondary">*Tax and service charges will be added at checkout</p>
            </div>

            <motion.button
              onClick={sendOrderToKitchen}
              disabled={!selectedTable || isSubmitting}
              className="w-full bg-primary text-white py-3 rounded-lg font-medium hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed mt-4 flex items-center justify-center space-x-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Send size={20} />
              <span>{isSubmitting ? 'Sending...' : 'Send to Kitchen'}</span>
            </motion.button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TakeOrders;
