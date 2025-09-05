import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  BookOpen, 
  Package, 
  Users, 
  BarChart3, 
  ClipboardList, 
  ChefHat, 
  CreditCard,
  LogOut,
  UtensilsCrossed
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { motion } from 'framer-motion';

const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getMenuItems = () => {
    const commonItems = [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
      { icon: ClipboardList, label: 'Orders', path: '/orders' },
    ];

    switch (user?.role) {
      case 'admin':
        return [
          ...commonItems,
          { icon: BookOpen, label: 'Menu', path: '/menu' },
          { icon: Package, label: 'Inventory', path: '/inventory' },
          { icon: Users, label: 'Users', path: '/users' },
          { icon: BarChart3, label: 'Reports', path: '/reports' },
        ];
      case 'cashier':
        return [
          ...commonItems,
          { icon: CreditCard, label: 'POS System', path: '/pos' },
        ];
      case 'waiter':
        return [
          ...commonItems,
          { icon: UtensilsCrossed, label: 'Take Orders', path: '/take-orders' },
          { icon: BookOpen, label: 'View Menu', path: '/menu-view' },
        ];
      case 'chef':
        return [
          ...commonItems,
          { icon: ChefHat, label: 'Kitchen', path: '/kitchen' },
        ];
      default:
        return commonItems;
    }
  };

  const menuItems = getMenuItems();

  return (
    <div className="bg-surface w-64 min-h-screen flex flex-col border-r border-border-color">
      <div className="p-6 border-b border-border-color">
        <div className="flex items-center space-x-3">
          <div className="bg-primary p-2 rounded-lg">
            <UtensilsCrossed className="text-white" size={24} />
          </div>
          <h1 className="text-xl font-bold text-text-primary">Karahi Point</h1>
        </div>
        <p className="text-sm text-text-secondary mt-4">Welcome, {user?.name}</p>
        <p className="text-xs text-text-secondary capitalize font-medium bg-surface-darker px-2 py-1 rounded inline-block mt-1">
          {user?.role}
        </p>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item, index) => (
            <motion.li 
              key={item.path}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-primary text-white shadow-md'
                      : 'text-text-secondary hover:bg-background hover:text-text-primary'
                  }`
                }
              >
                <item.icon size={20} />
                <span className="font-medium">{item.label}</span>
              </NavLink>
            </motion.li>
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t border-border-color">
        <motion.button
          onClick={handleLogout}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center space-x-3 p-3 text-text-secondary hover:bg-background hover:text-text-primary rounded-lg transition-colors w-full"
        >
          <LogOut size={20} />
          <span className="font-medium">Logout</span>
        </motion.button>
      </div>
    </div>
  );
};

export default Sidebar;
