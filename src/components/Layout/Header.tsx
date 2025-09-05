import React from 'react';
import { Bell, Clock, Sun, Moon } from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';
import { useTheme } from '../../contexts/ThemeContext';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

const Header: React.FC = () => {
  const { notifications } = useNotifications();
  const { theme, toggleTheme } = useTheme();
  const [currentTime, setCurrentTime] = React.useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const unreadCount = notifications.length;

  return (
    <header className="bg-surface border-b border-border-color px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-text-secondary">
            <Clock size={20} />
            <span className="text-sm font-medium">
              {format(currentTime, 'HH:mm:ss')}
            </span>
            <span className="text-sm hidden md:inline">
              {format(currentTime, 'EEEE, dd MMMM yyyy')}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <motion.button
            onClick={toggleTheme}
            whileTap={{ scale: 0.9, rotate: 15 }}
            className="p-2 text-text-secondary hover:text-primary hover:bg-background rounded-full transition-colors"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </motion.button>

          <div className="relative">
            <button className="p-2 text-text-secondary hover:text-primary hover:bg-background rounded-full transition-colors">
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-accent text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
