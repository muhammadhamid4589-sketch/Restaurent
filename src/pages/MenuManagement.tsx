import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';
import { getAllCategories, getAllMenuItems, createCategory, createMenuItem, updateMenuItem, deleteMenuItem, updateCategory, deleteCategory } from '../utils/database';
import { Category, MenuItem } from '../types';

interface MenuItemForm {
  id?: string;
  name: string;
  categoryId: string;
  price: number;
  description: string;
  modifiers: string[];
  stock: number;
}

const MenuManagement: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showItemForm, setShowItemForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItemForm>({
    name: '',
    categoryId: '',
    price: 0,
    description: '',
    modifiers: [],
    stock: 0
  });
  const [newCategoryName, setNewCategoryName] = useState('');
  const [modifierInput, setModifierInput] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [categoriesData, menuData] = await Promise.all([
        getAllCategories(),
        getAllMenuItems()
      ]);
      
      setCategories(categoriesData);
      setMenuItems(menuData);
      
      if (categoriesData.length > 0 && !selectedCategory) {
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

  const handleSaveCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error('Category name is required');
      return;
    }

    try {
      const newCategory: Category = {
        id: uuidv4(),
        name: newCategoryName.trim(),
        createdAt: new Date()
      };

      await createCategory(newCategory);
      toast.success('Category created successfully');
      setNewCategoryName('');
      setShowCategoryForm(false);
      loadData();
    } catch (error) {
      console.error('Error creating category:', error);
      toast.error('Failed to create category');
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    const itemsInCategory = menuItems.filter(item => item.categoryId === categoryId);
    
    if (itemsInCategory.length > 0) {
      toast.error('Cannot delete category with menu items. Move or delete items first.');
      return;
    }

    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        await deleteCategory(categoryId);
        toast.success('Category deleted successfully');
        loadData();
        
        if (selectedCategory === categoryId) {
          setSelectedCategory('');
        }
      } catch (error) {
        console.error('Error deleting category:', error);
        toast.error('Failed to delete category');
      }
    }
  };

  const handleSaveMenuItem = async () => {
    if (!editingItem.name.trim()) {
      toast.error('Item name is required');
      return;
    }

    if (!editingItem.categoryId) {
      toast.error('Please select a category');
      return;
    }

    if (editingItem.price <= 0) {
      toast.error('Price must be greater than 0');
      return;
    }

    try {
      if (editingItem.id) {
        // Update existing item
        const updatedItem: MenuItem = {
          ...editingItem,
          id: editingItem.id,
          createdAt: menuItems.find(item => item.id === editingItem.id)?.createdAt || new Date()
        };
        await updateMenuItem(updatedItem);
        toast.success('Menu item updated successfully');
      } else {
        // Create new item
        const newItem: MenuItem = {
          ...editingItem,
          id: uuidv4(),
          createdAt: new Date()
        };
        await createMenuItem(newItem);
        toast.success('Menu item created successfully');
      }

      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving menu item:', error);
      toast.error('Failed to save menu item');
    }
  };

  const handleEditItem = (item: MenuItem) => {
    setEditingItem({
      id: item.id,
      name: item.name,
      categoryId: item.categoryId,
      price: item.price,
      description: item.description,
      modifiers: [...item.modifiers],
      stock: item.stock
    });
    setShowItemForm(true);
  };

  const handleDeleteItem = async (itemId: string) => {
    if (window.confirm('Are you sure you want to delete this menu item?')) {
      try {
        await deleteMenuItem(itemId);
        toast.success('Menu item deleted successfully');
        loadData();
      } catch (error) {
        console.error('Error deleting menu item:', error);
        toast.error('Failed to delete menu item');
      }
    }
  };

  const addModifier = () => {
    if (modifierInput.trim() && !editingItem.modifiers.includes(modifierInput.trim())) {
      setEditingItem({
        ...editingItem,
        modifiers: [...editingItem.modifiers, modifierInput.trim()]
      });
      setModifierInput('');
    }
  };

  const removeModifier = (modifier: string) => {
    setEditingItem({
      ...editingItem,
      modifiers: editingItem.modifiers.filter(m => m !== modifier)
    });
  };

  const resetForm = () => {
    setEditingItem({
      name: '',
      categoryId: selectedCategory || '',
      price: 0,
      description: '',
      modifiers: [],
      stock: 0
    });
    setShowItemForm(false);
    setModifierInput('');
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Menu Management</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowCategoryForm(true)}
            className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 flex items-center space-x-2"
          >
            <Plus size={20} />
            <span>Add Category</span>
          </button>
          <button
            onClick={() => {
              setEditingItem({
                name: '',
                categoryId: selectedCategory || '',
                price: 0,
                description: '',
                modifiers: [],
                stock: 0
              });
              setShowItemForm(true);
            }}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center space-x-2"
          >
            <Plus size={20} />
            <span>Add Menu Item</span>
          </button>
        </div>
      </div>

      {/* Categories */}
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-3">Categories</h3>
        <div className="flex space-x-2 overflow-x-auto">
          <button
            onClick={() => setSelectedCategory('')}
            className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
              selectedCategory === ''
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            All Items
          </button>
          {categories.map(category => (
            <div key={category.id} className="flex items-center space-x-1">
              <button
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {category.name}
              </button>
              <button
                onClick={() => handleDeleteCategory(category.id)}
                className="text-red-500 hover:text-red-700 p-1"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Menu Items */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMenuItems.map(item => {
          const category = categories.find(c => c.id === item.categoryId);
          return (
            <div key={item.id} className="bg-white p-6 rounded-lg shadow border">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-lg">{item.name}</h3>
                  <p className="text-sm text-gray-600">{category?.name}</p>
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => handleEditItem(item)}
                    className="text-blue-500 hover:text-blue-700 p-1"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              <p className="text-gray-600 text-sm mb-3">{item.description}</p>
              
              <div className="flex justify-between items-center mb-3">
                <span className="text-2xl font-bold text-blue-600">Rs. {item.price}</span>
                <span className={`px-3 py-1 rounded-full text-sm ${
                  item.stock > 10 ? 'bg-green-100 text-green-800' :
                  item.stock > 0 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  Stock: {item.stock}
                </span>
              </div>

              {item.modifiers.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Modifiers:</p>
                  <div className="flex flex-wrap gap-1">
                    {item.modifiers.map(modifier => (
                      <span
                        key={modifier}
                        className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded"
                      >
                        {modifier}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Category Form Modal */}
      {showCategoryForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Add New Category</h3>
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Category Name"
              className="w-full p-3 border border-gray-300 rounded-lg mb-4"
            />
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  setShowCategoryForm(false);
                  setNewCategoryName('');
                }}
                className="flex-1 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCategory}
                className="flex-1 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Menu Item Form Modal */}
      {showItemForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4 max-h-screen overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">
              {editingItem.id ? 'Edit Menu Item' : 'Add New Menu Item'}
            </h3>
            
            <div className="space-y-4">
              <input
                type="text"
                value={editingItem.name}
                onChange={(e) => setEditingItem({...editingItem, name: e.target.value})}
                placeholder="Item Name"
                className="w-full p-3 border border-gray-300 rounded-lg"
              />

              <select
                value={editingItem.categoryId}
                onChange={(e) => setEditingItem({...editingItem, categoryId: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-lg"
              >
                <option value="">Select Category</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>

              <input
                type="number"
                value={editingItem.price}
                onChange={(e) => setEditingItem({...editingItem, price: parseFloat(e.target.value) || 0})}
                placeholder="Price"
                className="w-full p-3 border border-gray-300 rounded-lg"
              />

              <textarea
                value={editingItem.description}
                onChange={(e) => setEditingItem({...editingItem, description: e.target.value})}
                placeholder="Description"
                rows={3}
                className="w-full p-3 border border-gray-300 rounded-lg"
              />

              <input
                type="number"
                value={editingItem.stock}
                onChange={(e) => setEditingItem({...editingItem, stock: parseInt(e.target.value) || 0})}
                placeholder="Stock Quantity"
                className="w-full p-3 border border-gray-300 rounded-lg"
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Modifiers
                </label>
                <div className="flex space-x-2 mb-2">
                  <input
                    type="text"
                    value={modifierInput}
                    onChange={(e) => setModifierInput(e.target.value)}
                    placeholder="Add modifier"
                    className="flex-1 p-2 border border-gray-300 rounded"
                    onKeyPress={(e) => e.key === 'Enter' && addModifier()}
                  />
                  <button
                    onClick={addModifier}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {editingItem.modifiers.map(modifier => (
                    <span
                      key={modifier}
                      className="bg-gray-100 text-gray-700 text-sm px-2 py-1 rounded flex items-center space-x-1"
                    >
                      <span>{modifier}</span>
                      <button
                        onClick={() => removeModifier(modifier)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex space-x-2 mt-6">
              <button
                onClick={resetForm}
                className="flex-1 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveMenuItem}
                className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuManagement;
