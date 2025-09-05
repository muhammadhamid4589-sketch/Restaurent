import React, { useState, useEffect } from 'react';
import { Plus, Minus, ShoppingCart, Trash2, CreditCard, Banknote, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';
import { getAllCategories, getAllMenuItems, getAllTables, createOrder, createOrderItem, createPayment, updateMenuItem } from '../utils/database';
import { useNotifications } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import { Category, MenuItem, Table } from '../types';

interface CartItem extends MenuItem {
  quantity: number;
  selectedModifiers: string[];
}

const POSSystem: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [discount, setDiscount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  
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
      setTables(tablesData.filter(table => table.status === 'available'));
      
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
    toast.success(`${item.name} added to cart`);
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

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter(item => item.id !== itemId));
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

  const calculateSubtotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const calculateTax = () => {
    return calculateSubtotal() * 0.16; // 16% tax
  };

  const calculateServiceCharge = () => {
    return calculateSubtotal() * 0.05; // 5% service charge
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const tax = calculateTax();
    const serviceCharge = calculateServiceCharge();
    return subtotal + tax + serviceCharge - discount;
  };

  const processOrder = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    if (!selectedTable) {
      toast.error('Please select a table');
      return;
    }

    setIsProcessing(true);

    try {
      const orderId = uuidv4();
      const subtotal = calculateSubtotal();
      const tax = calculateTax();
      const serviceCharge = calculateServiceCharge();
      const finalTotal = calculateTotal();

      // Create order
      const order = {
        id: orderId,
        tableId: selectedTable,
        waiterId: user?.id || '',
        status: 'pending' as const,
        total: subtotal,
        discount,
        tax,
        serviceCharge,
        finalTotal,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await createOrder(order);

      // Create order items and update stock
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

        // Update stock
        const updatedItem = {
          ...item,
          stock: item.stock - item.quantity,
        };
        await updateMenuItem(updatedItem);
      }

      // Create payment
      await createPayment({
        id: uuidv4(),
        orderId,
        method: paymentMethod,
        amount: finalTotal,
        paidAt: new Date(),
      });

      // Send notification to kitchen
      addNotification({
        type: 'order_created',
        orderId,
        message: `New order #${orderId.slice(0, 8)} for Table ${selectedTable}`,
        targetRole: 'chef',
      });

      // Reset form
      setCart([]);
      setSelectedTable('');
      setDiscount(0);
      setShowPayment(false);
      
      toast.success('Order processed successfully!');
      loadData(); // Refresh data to update stock
      
    } catch (error) {
      console.error('Error processing order:', error);
      toast.error('Failed to process order');
    } finally {
      setIsProcessing(false);
    }
  };

  const printReceipt = () => {
    const receiptContent = `
      RESTAURANT RECEIPT
      ==================
      Order #: ${Date.now().toString().slice(-6)}
      Table: ${selectedTable}
      Date: ${new Date().toLocaleDateString()}
      Time: ${new Date().toLocaleTimeString()}
      
      ITEMS:
      ${cart.map(item => 
        `${item.name} x${item.quantity} - Rs. ${(item.price * item.quantity).toFixed(2)}\n${item.selectedModifiers.length > 0 ? `  Modifiers: ${item.selectedModifiers.join(', ')}\n` : ''}`
      ).join('')}
      
      Subtotal: Rs. ${calculateSubtotal().toFixed(2)}
      Tax (16%): Rs. ${calculateTax().toFixed(2)}
      Service (5%): Rs. ${calculateServiceCharge().toFixed(2)}
      Discount: Rs. ${discount.toFixed(2)}
      
      TOTAL: Rs. ${calculateTotal().toFixed(2)}
      
      Payment: ${paymentMethod.toUpperCase()}
      
      Thank you for dining with us!
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`<pre>${receiptContent}</pre>`);
      printWindow.print();
      printWindow.close();
    }
  };

  return (
    <div className="flex h-full">
      {/* Menu Section */}
      <div className="flex-1 p-6">
        <h1 className="text-2xl font-bold mb-6">POS System</h1>
        
        {/* Categories */}
        <div className="flex space-x-2 mb-6 overflow-x-auto">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                selectedCategory === category.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Menu Items Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredMenuItems.map(item => (
            <div
              key={item.id}
              className={`bg-white p-4 rounded-lg shadow border cursor-pointer transition-all hover:shadow-md ${
                item.stock <= 0 ? 'opacity-50' : ''
              }`}
              onClick={() => addToCart(item)}
            >
              <h3 className="font-medium text-gray-900 mb-1">{item.name}</h3>
              <p className="text-sm text-gray-600 mb-2 line-clamp-2">{item.description}</p>
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold text-blue-600">Rs. {item.price}</span>
                <span className={`text-xs px-2 py-1 rounded ${
                  item.stock > 10 ? 'bg-green-100 text-green-800' :
                  item.stock > 0 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  Stock: {item.stock}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cart Section */}
      <div className="w-96 bg-white border-l border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Order Cart</h2>
          <ShoppingCart size={24} />
        </div>

        {/* Table Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Table
          </label>
          <select
            value={selectedTable}
            onChange={(e) => setSelectedTable(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Choose a table...</option>
            {tables.map(table => (
              <option key={table.id} value={table.id}>
                Table {table.number}
              </option>
            ))}
          </select>
        </div>

        {/* Cart Items */}
        <div className="space-y-4 mb-6 max-h-64 overflow-y-auto">
          {cart.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Cart is empty</p>
          ) : (
            cart.map(item => (
              <div key={item.id} className="border rounded-lg p-3">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-sm">{item.name}</h4>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      className="bg-gray-200 hover:bg-gray-300 p-1 rounded"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      className="bg-gray-200 hover:bg-gray-300 p-1 rounded"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  <span className="font-medium">Rs. {(item.price * item.quantity).toFixed(2)}</span>
                </div>

                {/* Modifiers */}
                {item.modifiers.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-600 mb-1">Modifiers:</p>
                    <div className="flex flex-wrap gap-1">
                      {item.modifiers.map(modifier => (
                        <button
                          key={modifier}
                          onClick={() => toggleModifier(item.id, modifier)}
                          className={`text-xs px-2 py-1 rounded ${
                            item.selectedModifiers.includes(modifier)
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          {modifier}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Order Summary */}
        {cart.length > 0 && (
          <>
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>Rs. {calculateSubtotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax (16%):</span>
                <span>Rs. {calculateTax().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Service (5%):</span>
                <span>Rs. {calculateServiceCharge().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Discount:</span>
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-20 text-right border border-gray-300 rounded px-2 py-1"
                  min="0"
                />
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total:</span>
                <span>Rs. {calculateTotal().toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={() => setShowPayment(true)}
              disabled={!selectedTable}
              className="w-full bg-blue-500 text-white py-3 rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
            >
              Process Payment
            </button>
          </>
        )}
      </div>

      {/* Payment Modal */}
      {showPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Payment</h3>
              <button
                onClick={() => setShowPayment(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-lg font-medium">Total: Rs. {calculateTotal().toFixed(2)}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPaymentMethod('cash')}
                    className={`flex items-center justify-center space-x-2 p-3 border rounded-lg ${
                      paymentMethod === 'cash'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300'
                    }`}
                  >
                    <Banknote size={20} />
                    <span>Cash</span>
                  </button>
                  <button
                    onClick={() => setPaymentMethod('card')}
                    className={`flex items-center justify-center space-x-2 p-3 border rounded-lg ${
                      paymentMethod === 'card'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300'
                    }`}
                  >
                    <CreditCard size={20} />
                    <span>Card</span>
                  </button>
                </div>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={printReceipt}
                  className="flex-1 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600"
                >
                  Print Receipt
                </button>
                <button
                  onClick={processOrder}
                  disabled={isProcessing}
                  className="flex-1 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 disabled:opacity-50"
                >
                  {isProcessing ? 'Processing...' : 'Complete Order'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POSSystem;
