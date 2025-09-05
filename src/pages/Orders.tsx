import React, { useState, useEffect } from 'react';
import { Clock, Eye, Printer, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { getAllOrders, getOrderItems, getAllMenuItems, getAllTables, updateOrder } from '../utils/database';
import { useAuth } from '../contexts/AuthContext';
import { Order, OrderItem, MenuItem, Table } from '../types';

interface OrderWithDetails extends Order {
  items: (OrderItem & { menuItem: MenuItem })[];
  table: Table | undefined;
}

const Orders: React.FC = () => {
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'in-progress' | 'ready' | 'served'>('all');
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const { user } = useAuth();

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const loadOrders = async () => {
    try {
      const [allOrders, menuItems, tables] = await Promise.all([
        getAllOrders(),
        getAllMenuItems(),
        getAllTables()
      ]);

      const ordersWithDetails: OrderWithDetails[] = await Promise.all(
        allOrders.map(async (order) => {
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

      // Sort by creation time (newest first)
      ordersWithDetails.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setOrders(ordersWithDetails);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Failed to load orders');
      setIsLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: Order['status']) => {
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      const updatedOrder = {
        ...order,
        status,
        updatedAt: new Date()
      };

      await updateOrder(updatedOrder);
      toast.success(`Order marked as ${status}`);
      loadOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Failed to update order status');
    }
  };

  const printOrderReceipt = (order: OrderWithDetails) => {
    const receiptContent = `
      RESTAURANT RECEIPT
      ==================
      Order #: ${order.id.slice(0, 8)}
      Table: ${order.table?.number}
      Date: ${format(new Date(order.createdAt), 'dd/MM/yyyy')}
      Time: ${format(new Date(order.createdAt), 'HH:mm:ss')}
      Status: ${order.status.toUpperCase()}
      
      ITEMS:
      ${order.items.map(item => 
        `${item.menuItem.name} x${item.quantity} - Rs. ${item.totalPrice.toFixed(2)}\n${item.modifiers.length > 0 ? `  Modifiers: ${item.modifiers.join(', ')}\n` : ''}`
      ).join('')}
      
      Subtotal: Rs. ${order.total.toFixed(2)}
      Tax (16%): Rs. ${order.tax.toFixed(2)}
      Service (5%): Rs. ${order.serviceCharge.toFixed(2)}
      Discount: Rs. ${order.discount.toFixed(2)}
      
      TOTAL: Rs. ${order.finalTotal.toFixed(2)}
      
      Thank you for dining with us!
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`<pre>${receiptContent}</pre>`);
      printWindow.print();
      printWindow.close();
    }
  };

  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true;
    return order.status === filter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'ready':
        return 'bg-purple-100 text-purple-800';
      case 'served':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const canUpdateStatus = (order: OrderWithDetails) => {
    if (user?.role === 'admin') return true;
    if (user?.role === 'cashier' && order.status === 'ready') return true;
    return false;
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
        <h1 className="text-2xl font-bold">Orders Management</h1>
        <button
          onClick={loadOrders}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
        >
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex space-x-2 mb-6 overflow-x-auto">
        {['all', 'pending', 'in-progress', 'ready', 'served'].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status as any)}
            className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
              filter === status
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {status === 'all' ? 'All Orders' : status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')} 
            ({status === 'all' ? orders.length : orders.filter(o => o.status === status).length})
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Table
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Items
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.map(order => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      #{order.id.slice(0, 8)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">Table {order.table?.number}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {order.items.slice(0, 2).map(item => (
                        <div key={item.id}>
                          {item.menuItem.name} x{item.quantity}
                        </div>
                      ))}
                      {order.items.length > 2 && (
                        <div className="text-gray-500">+{order.items.length - 2} more</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      Rs. {order.finalTotal.toFixed(2)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                      {order.status.replace('-', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-1 text-sm text-gray-500">
                      <Clock size={16} />
                      <span>{format(new Date(order.createdAt), 'HH:mm')}</span>
                    </div>
                    <div className="text-xs text-gray-400">
                      {format(new Date(order.createdAt), 'dd/MM/yyyy')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="text-blue-600 hover:text-blue-900"
                        title="View Details"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => printOrderReceipt(order)}
                        className="text-green-600 hover:text-green-900"
                        title="Print Receipt"
                      >
                        <Printer size={16} />
                      </button>
                      {canUpdateStatus(order) && order.status === 'ready' && (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'served')}
                          className="text-purple-600 hover:text-purple-900"
                          title="Mark as Served"
                        >
                          <CheckCircle size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredOrders.length === 0 && (
        <div className="text-center py-16">
          <Clock size={64} className="text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">No orders found</h3>
          <p className="text-gray-600">No orders match the current filter.</p>
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Order Details</h3>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Order ID</p>
                  <p className="font-medium">#{selectedOrder.id.slice(0, 8)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Table</p>
                  <p className="font-medium">Table {selectedOrder.table?.number}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedOrder.status)}`}>
                    {selectedOrder.status.replace('-', ' ')}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Order Time</p>
                  <p className="font-medium">{format(new Date(selectedOrder.createdAt), 'dd/MM/yyyy HH:mm')}</p>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Order Items</h4>
                <div className="space-y-2">
                  {selectedOrder.items.map(item => (
                    <div key={item.id} className="bg-gray-50 p-3 rounded">
                      <div className="flex justify-between">
                        <span className="font-medium">{item.menuItem.name}</span>
                        <span>Rs. {item.totalPrice.toFixed(2)}</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        Quantity: {item.quantity} × Rs. {item.price}
                      </div>
                      {item.modifiers.length > 0 && (
                        <div className="text-sm text-gray-600">
                          Modifiers: {item.modifiers.join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>Rs. {selectedOrder.total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax (16%):</span>
                    <span>Rs. {selectedOrder.tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Service Charge (5%):</span>
                    <span>Rs. {selectedOrder.serviceCharge.toFixed(2)}</span>
                  </div>
                  {selectedOrder.discount > 0 && (
                    <div className="flex justify-between">
                      <span>Discount:</span>
                      <span>-Rs. {selectedOrder.discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total:</span>
                    <span>Rs. {selectedOrder.finalTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => printOrderReceipt(selectedOrder)}
                  className="flex-1 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600"
                >
                  Print Receipt
                </button>
                {canUpdateStatus(selectedOrder) && selectedOrder.status === 'ready' && (
                  <button
                    onClick={() => {
                      updateOrderStatus(selectedOrder.id, 'served');
                      setSelectedOrder(null);
                    }}
                    className="flex-1 bg-purple-500 text-white py-2 rounded-lg hover:bg-purple-600"
                  >
                    Mark as Served
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
