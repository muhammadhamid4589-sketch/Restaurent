import React, { useState, useEffect } from 'react';
import { BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import { getAllCategories, getAllMenuItems } from '../utils/database';
import { Category, MenuItem } from '../types';
import { motion } from 'framer-motion';

const MenuView: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [categoriesData, menuData] = await Promise.all([
        getAllCategories(),
        getAllMenuItems()
      ]);
      
      setCategories(categoriesData);
      setMenuItems(menuData);
      
      if (categoriesData.length > 0) {
        setSelectedCategory(categoriesData[0].id);
      }
    } catch (error) {
      console.error('Error loading menu data:', error);
      toast.error('Failed to load menu');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredMenuItems = menuItems.filter(item => 
    selectedCategory ? item.categoryId === selectedCategory : true
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center space-x-3 mb-6">
        <BookOpen className="text-primary" size={28} />
        <h1 className="text-2xl font-bold text-text-primary">Restaurant Menu</h1>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredMenuItems.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-surface p-6 rounded-lg shadow-sm border border-border-color"
          >
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-bold text-lg text-text-primary">{item.name}</h3>
              <span className="text-xl font-bold text-primary">Rs. {item.price}</span>
            </div>
            
            <p className="text-text-secondary text-sm mb-4 h-12 line-clamp-2">{item.description}</p>
            
            {item.modifiers.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-medium text-text-primary mb-1">Options:</p>
                <div className="flex flex-wrap gap-2">
                  {item.modifiers.map(modifier => (
                    <span
                      key={modifier}
                      className="bg-background text-text-secondary text-xs px-2 py-1 rounded-full"
                    >
                      {modifier}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-border-color pt-3 flex justify-between items-center">
                <span className="text-sm text-text-secondary">In Stock</span>
                <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                  item.stock > 10 ? 'bg-green-500/10 text-green-400' :
                  item.stock > 0 ? 'bg-yellow-500/10 text-yellow-400' :
                  'bg-red-500/10 text-red-400'
                }`}>
                  {item.stock}
                </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default MenuView;
