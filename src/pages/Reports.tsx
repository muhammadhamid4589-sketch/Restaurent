import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Calendar, TrendingUp, Package, DollarSign } from 'lucide-react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { getAllOrders, getAllMenuItems, getOrderItems } from '../utils/database';
import { Order, MenuItem, OrderItem } from '../types';

interface SalesData {
  date: string;
  sales: number;
  orders: number;
}

interface TopItem {
  name: string;
  quantity: number;
  revenue: number;
}

const Reports: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month'>('today');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [ordersData, menuData] = await Promise.all([
        getAllOrders(),
        getAllMenuItems()
      ]);

      const allOrderItems: OrderItem[] = [];
      for (const order of ordersData) {
        const items = await getOrderItems(order.id);
        allOrderItems.push(...items);
      }

      setOrders(ordersData);
      setMenuItems(menuData);
      setOrderItems(allOrderItems);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setIsLoading(false);
    }
  };

  const getDateRange = () => {
    const now = new Date();
    switch (dateRange) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'week':
        return { start: startOfWeek(now), end: endOfWeek(now) };
      case 'month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  const filteredOrders = orders.filter(order => {
    const range = getDateRange();
    const orderDate = new Date(order.createdAt);
    return isWithinInterval(orderDate, range);
  });

  const totalRevenue = filteredOrders.reduce((sum, order) => sum + order.finalTotal, 0);
  const totalOrders = filteredOrders.length;
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Sales by day data
  const getSalesData = (): SalesData[] => {
    const salesMap = new Map<string, { sales: number; orders: number }>();

    filteredOrders.forEach(order => {
      const dateKey = format(new Date(order.createdAt), 'yyyy-MM-dd');
      const existing = salesMap.get(dateKey) || { sales: 0, orders: 0 };
      salesMap.set(dateKey, {
        sales: existing.sales + order.finalTotal,
        orders: existing.orders + 1
      });
    });

    return Array.from(salesMap.entries()).map(([date, data]) => ({
      date: format(new Date(date), 'MMM dd'),
      sales: data.sales,
      orders: data.orders
    }));
  };

  // Top selling items
  const getTopItems = (): TopItem[] => {
    const itemMap = new Map<string, { quantity: number; revenue: number }>();

    const filteredOrderIds = new Set(filteredOrders.map(order => order.id));

    orderItems
      .filter(item => filteredOrderIds.has(item.orderId))
      .forEach(item => {
        const existing = itemMap.get(item.menuItemId) || { quantity: 0, revenue: 0 };
        itemMap.set(item.menuItemId, {
          quantity: existing.quantity + item.quantity,
          revenue: existing.revenue + item.totalPrice
        });
      });

    return Array.from(itemMap.entries())
      .map(([menuItemId, data]) => {
        const menuItem = menuItems.find(item => item.id === menuItemId);
        return {
          name: menuItem?.name || 'Unknown Item',
          quantity: data.quantity,
          revenue: data.revenue
        };
      })
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
  };

  const salesData = getSalesData();
  const topItems = getTopItems();

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

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
        <h1 className="text-2xl font-bold">Reports & Analytics</h1>
        <div className="flex space-x-2">
          {['today', 'week', 'month'].map(range => (
            <button
              key={range}
              onClick={() => setDateRange(range as any)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                dateRange === range
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-green-600">Rs. {totalRevenue.toLocaleString()}</p>
            </div>
            <DollarSign className="text-green-500" size={32} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-blue-600">{totalOrders}</p>
            </div>
            <Package className="text-blue-500" size={32} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Average Order</p>
              <p className="text-2xl font-bold text-purple-600">Rs. {averageOrderValue.toFixed(2)}</p>
            </div>
            <TrendingUp className="text-purple-500" size={32} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Period</p>
              <p className="text-2xl font-bold text-orange-600">
                {dateRange === 'today' ? 'Today' : 
                 dateRange === 'week' ? 'This Week' : 'This Month'}
              </p>
            </div>
            <Calendar className="text-orange-500" size={32} />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Sales Chart */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-bold mb-4">Sales Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value: any) => [`Rs. ${value}`, 'Sales']} />
              <Bar dataKey="sales" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Items Pie Chart */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-bold mb-4">Top Selling Items</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={topItems.slice(0, 5)}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="quantity"
              >
                {topItems.slice(0, 5).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Items Table */}
      <div className="bg-white rounded-lg shadow border">
        <div className="p-6 border-b">
          <h3 className="text-lg font-bold">Top Selling Items</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Item Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity Sold
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {topItems.map((item, index) => (
                <tr key={item.name} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">#{index + 1}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{item.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{item.quantity}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">Rs. {item.revenue.toFixed(2)}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {topItems.length === 0 && (
        <div className="text-center py-16">
          <TrendingUp size={64} className="text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">No data available</h3>
          <p className="text-gray-600">No sales data found for the selected period.</p>
        </div>
      )}
    </div>
  );
};

export default Reports;
