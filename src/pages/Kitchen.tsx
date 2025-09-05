import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, AlertCircle, Users } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { getAllOrders, getOrderItems, updateOrder, getAllMenuItems, getAllTables } from '../utils/database';
import { useNotifications } from '../contexts/NotificationContext';
import { Order, OrderItem, MenuItem, Table } from '../types';

interface OrderWithDetails extends Order {
  items: (OrderItem & { menuItem: MenuItem })[];
  table: Table | undefined;
}

const Kitchen: React.FC = () => {
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'in-progress'>('all');
  const [isLoading, setIsLoading] = useState(true);
  
  const { addNotification, playNotificationSound } = useNotifications();

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const loadOrders = async () => {
    try {
      const [allOrders, menuItems, tables] = await Promise.all([
        getAllOrders(),
        getAllMenuItems(),
        getAllTables()
      ]);

      const kitchenOrders = allOrders.filter(order => 
        order.status === 'pending' || order.status === 'in-progress'
      );

      const ordersWithDetails: OrderWithDetails[] = await Promise.all(
        kitchenOrders.map(async (order) => {
          const orderItems = await getOrderItems(order.id);
          const itemsWithDetails = orderItems.map(item => ({
            ...item,
            menuItem: menuItems.find(mi => mi.id === item.menuItemId)!
          }));

          return {
            ...order,
            items: itemsWithDetails,
            table: tables.find(t => t.id === order.tableId)
          };
        })
      );

      // Sort by creation time (oldest first)
      ordersWithDetails.sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      setOrders(ordersWithDetails);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Failed to load orders');
      setIsLoading(false);
    }
  };

  const startOrder = async (orderId: string) => {
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      const updatedOrder = {
        ...order,
        status: 'in-progress' as const,
        updatedAt: new Date()
      };

      await updateOrder(updatedOrder);
      toast.success('Order started!');
      loadOrders();
    } catch (error) {
      console.error('Error starting order:', error);
      toast.error('Failed to start order');
    }
  };

  const completeOrder = async (orderId: string) => {
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      const updatedOrder = {
        ...order,
        status: 'ready' as const,
        updatedAt: new Date()
      };

      await updateOrder(updatedOrder);

      // Send notification to cashier
      addNotification({
        type: 'order_ready',
        orderId,
        message: `Order #${orderId.slice(0, 8)} for Table ${order.table?.number} is ready!`,
        targetRole: 'cashier',
      });

      playNotificationSound();
      toast.success('Order completed! Cashier notified.');
      loadOrders();
    } catch (error) {
      console.error('Error completing order:', error);
      toast.error('Failed to complete order');
    }
  };

  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true;
    return order.status === filter;
  });

  const getOrderPriority = (createdAt: Date) => {
    const minutesAgo = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60);
    if (minutesAgo > 20) return 'high';
    if (minutesAgo > 10) return 'medium';
    return 'low';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-500 bg-red-50';
      case 'medium': return 'border-yellow-500 bg-yellow-50';
      default: return 'border-green-500 bg-green-50';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Kitchen Display</h1>
        <div className="flex items-center space-x-4">
          <div className="flex space-x-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'all'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              All ({orders.length})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'pending'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Pending ({orders.filter(o => o.status === 'pending').length})
            </button>
            <button
              onClick={() => setFilter('in-progress')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'in-progress'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              In Progress ({orders.filter(o => o.status === 'in-progress').length})
            </button>
          </div>
          <button
            onClick={loadOrders}
            className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
          >
            Refresh
          </button>
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="text-center py-16">
          <CheckCircle size={64} className="text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">All caught up!</h3>
          <p className="text-gray-600">No orders in the kitchen right now.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOrders.map(order => {
            const priority = getOrderPriority(order.createdAt);
            const timeAgo = formatDistanceToNow(new Date(order.createdAt), { addSuffix: true });

            return (
              <div
                key={order.id}
                className={`bg-white p-6 rounded-lg shadow-lg border-l-4 ${getPriorityColor(priority)}`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      Order #{order.id.slice(0, 8)}
                    </h3>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Users size={16} />
                      <span>Table {order.table?.number}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-1 text-sm text-gray-600">
                      <Clock size={16} />
                      <span>{timeAgo}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {format(new Date(order.createdAt), 'HH:mm')}
                    </div>
                  </div>
                </div>

                {priority === 'high' && (
                  <div className="flex items-center space-x-2 mb-3 text-red-600">
                    <AlertCircle size={16} />
                    <span className="text-sm font-medium">Priority Order!</span>
                  </div>
                )}

                <div className="space-y-3 mb-4">
                  {order.items.map(item => (
                    <div key={item.id} className="bg-gray-50 p-3 rounded">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{item.menuItem.name}</h4>
                          <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                          {item.modifiers.length > 0 && (
                            <div className="mt-1">
                              <p className="text-xs text-gray-500">Modifiers:</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {item.modifiers.map(modifier => (
                                  <span
                                    key={modifier}
                                    className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                                  >
                                    {modifier}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex space-x-2">
                  {order.status === 'pending' && (
                    <button
                      onClick={() => startOrder(order.id)}
                      className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      Start Cooking
                    </button>
                  )}
                  {order.status === 'in-progress' && (
                    <button
                      onClick={() => completeOrder(order.id)}
                      className="flex-1 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition-colors"
                    >
                      Mark Ready
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Kitchen;
