import React, { useEffect, useState } from 'react';
import { BarChart3, DollarSign, ShoppingCart, Users } from 'lucide-react';
import { getAllOrders, getAllMenuItems, getAllUsers } from '../../utils/database';
import { Order } from '../../types';
import { format, startOfDay, isToday } from 'date-fns';

interface StatsData {
  todaySales: number;
  todayOrders: number;
  totalMenuItems: number;
  totalUsers: number;
  recentOrders: Order[];
}

const DashboardStats: React.FC = () => {
  const [stats, setStats] = useState<StatsData>({
    todaySales: 0,
    todayOrders: 0,
    totalMenuItems: 0,
    totalUsers: 0,
    recentOrders: [],
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [orders, menuItems, users] = await Promise.all([
          getAllOrders(),
          getAllMenuItems(),
          getAllUsers(),
        ]);

        const todayOrders = orders.filter(order => isToday(new Date(order.createdAt)));
        const todaySales = todayOrders.reduce((sum, order) => sum + order.finalTotal, 0);

        setStats({
          todaySales,
          todayOrders: todayOrders.length,
          totalMenuItems: menuItems.length,
          totalUsers: users.length,
          recentOrders: orders.slice(0, 5),
        });
      } catch (error) {
        console.error('Error loading stats:', error);
      }
    };

    loadStats();
  }, []);

  const statCards = [
    {
      title: 'Today\'s Sales',
      value: `Rs. ${stats.todaySales.toLocaleString()}`,
      icon: DollarSign,
      color: 'bg-green-500',
    },
    {
      title: 'Today\'s Orders',
      value: stats.todayOrders.toString(),
      icon: ShoppingCart,
      color: 'bg-blue-500',
    },
    {
      title: 'Menu Items',
      value: stats.totalMenuItems.toString(),
      icon: BarChart3,
      color: 'bg-purple-500',
    },
    {
      title: 'Total Users',
      value: stats.totalUsers.toString(),
      icon: Users,
      color: 'bg-orange-500',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => (
          <div key={index} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
              </div>
              <div className={`${card.color} p-3 rounded-lg`}>
                <card.icon className="text-white" size={24} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Orders</h3>
        {stats.recentOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Order ID</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Table</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Total</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Time</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentOrders.map((order) => (
                  <tr key={order.id} className="border-b border-gray-100">
                    <td className="py-3 px-4 text-sm text-gray-900">#{order.id.slice(0, 8)}</td>
                    <td className="py-3 px-4 text-sm text-gray-900">Table {order.tableId}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                        order.status === 'served' ? 'bg-green-100 text-green-800' :
                        order.status === 'ready' ? 'bg-blue-100 text-blue-800' :
                        order.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900">Rs. {order.finalTotal}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {format(new Date(order.createdAt), 'HH:mm')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No recent orders found</p>
        )}
      </div>
    </div>
  );
};

export default DashboardStats;
