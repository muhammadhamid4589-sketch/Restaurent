import React, { useState, useEffect } from 'react';
import { AlertTriangle, TrendingDown, Package, Edit } from 'lucide-react';
import toast from 'react-hot-toast';
import { getAllMenuItems, getAllCategories, updateMenuItem } from '../utils/database';
import { MenuItem, Category } from '../types';

const Inventory: React.FC = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filter, setFilter] = useState<'all' | 'low-stock' | 'out-of-stock'>('all');
  const [editingStock, setEditingStock] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [menuData, categoriesData] = await Promise.all([
        getAllMenuItems(),
        getAllCategories()
      ]);
      
      setMenuItems(menuData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading inventory data:', error);
      toast.error('Failed to load inventory data');
    }
  };

  const updateStock = async (itemId: string, newStock: number) => {
    try {
      const item = menuItems.find(item => item.id === itemId);
      if (!item) return;

      const updatedItem = {
        ...item,
        stock: newStock
      };

      await updateMenuItem(updatedItem);
      toast.success('Stock updated successfully');
      loadData();
      
      // Clear editing state
      const newEditingStock = { ...editingStock };
      delete newEditingStock[itemId];
      setEditingStock(newEditingStock);
    } catch (error) {
      console.error('Error updating stock:', error);
      toast.error('Failed to update stock');
    }
  };

  const filteredItems = menuItems.filter(item => {
    switch (filter) {
      case 'low-stock':
        return item.stock > 0 && item.stock <= 10;
      case 'out-of-stock':
        return item.stock === 0;
      default:
        return true;
    }
  });

  const lowStockItems = menuItems.filter(item => item.stock > 0 && item.stock <= 10);
  const outOfStockItems = menuItems.filter(item => item.stock === 0);
  const totalValue = menuItems.reduce((total, item) => total + (item.price * item.stock), 0);

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { status: 'Out of Stock', color: 'text-red-600 bg-red-100' };
    if (stock <= 5) return { status: 'Critical', color: 'text-red-600 bg-red-100' };
    if (stock <= 10) return { status: 'Low Stock', color: 'text-yellow-600 bg-yellow-100' };
    return { status: 'In Stock', color: 'text-green-600 bg-green-100' };
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Inventory Management</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Items</p>
              <p className="text-2xl font-bold">{menuItems.length}</p>
            </div>
            <Package className="text-blue-500" size={32} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Low Stock Items</p>
              <p className="text-2xl font-bold text-yellow-600">{lowStockItems.length}</p>
            </div>
            <TrendingDown className="text-yellow-500" size={32} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Out of Stock</p>
              <p className="text-2xl font-bold text-red-600">{outOfStockItems.length}</p>
            </div>
            <AlertTriangle className="text-red-500" size={32} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Value</p>
              <p className="text-2xl font-bold text-green-600">Rs. {totalValue.toLocaleString()}</p>
            </div>
            <Package className="text-green-500" size={32} />
          </div>
        </div>
      </div>

      {/* Alerts */}
      {(lowStockItems.length > 0 || outOfStockItems.length > 0) && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-6">
          <div className="flex items-center space-x-2 text-red-800">
            <AlertTriangle size={20} />
            <h3 className="font-medium">Inventory Alerts</h3>
          </div>
          <div className="mt-2 text-sm text-red-700">
            {outOfStockItems.length > 0 && (
              <p>{outOfStockItems.length} items are out of stock</p>
            )}
            {lowStockItems.length > 0 && (
              <p>{lowStockItems.length} items are running low</p>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex space-x-2 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'all'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          All Items ({menuItems.length})
        </button>
        <button
          onClick={() => setFilter('low-stock')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'low-stock'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Low Stock ({lowStockItems.length})
        </button>
        <button
          onClick={() => setFilter('out-of-stock')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'out-of-stock'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Out of Stock ({outOfStockItems.length})
        </button>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Item
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredItems.map(item => {
                const category = categories.find(c => c.id === item.categoryId);
                const stockStatus = getStockStatus(item.stock);
                const isEditing = editingStock.hasOwnProperty(item.id);

                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{item.name}</div>
                        <div className="text-sm text-gray-500">{item.description}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {category?.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      Rs. {item.price}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isEditing ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            value={editingStock[item.id]}
                            onChange={(e) => setEditingStock({
                              ...editingStock,
                              [item.id]: parseInt(e.target.value) || 0
                            })}
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                            min="0"
                          />
                          <button
                            onClick={() => updateStock(item.id, editingStock[item.id])}
                            className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              const newEditingStock = { ...editingStock };
                              delete newEditingStock[item.id];
                              setEditingStock(newEditingStock);
                            }}
                            className="bg-gray-500 text-white px-2 py-1 rounded text-xs hover:bg-gray-600"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <span className="text-sm font-medium">{item.stock}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${stockStatus.color}`}>
                        {stockStatus.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      Rs. {(item.price * item.stock).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {!isEditing && (
                        <button
                          onClick={() => setEditingStock({
                            ...editingStock,
                            [item.id]: item.stock
                          })}
                          className="text-blue-600 hover:text-blue-900 flex items-center space-x-1"
                        >
                          <Edit size={16} />
                          <span>Edit Stock</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-16">
          <Package size={64} className="text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">No items found</h3>
          <p className="text-gray-600">No items match the current filter.</p>
        </div>
      )}
    </div>
  );
};

export default Inventory;
