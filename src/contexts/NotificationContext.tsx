import React, { createContext, useContext, useState, useEffect } from 'react';
import { NotificationEvent } from '../types';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  notifications: NotificationEvent[];
  addNotification: (notification: Omit<NotificationEvent, 'timestamp'>) => void;
  clearNotifications: () => void;
  playNotificationSound: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationEvent[]>([]);
  const { user } = useAuth();

  const playNotificationSound = () => {
    // Create a simple beep sound using Web Audio API
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.log('Audio notification not supported');
    }
  };

  const addNotification = (notification: Omit<NotificationEvent, 'timestamp'>) => {
    const newNotification: NotificationEvent = {
      ...notification,
      timestamp: new Date(),
    };

    setNotifications(prev => [newNotification, ...prev]);

    // Play sound if this notification is for the current user's role
    if (user && notification.targetRole === user.role) {
      playNotificationSound();
    }

    // Store in localStorage for cross-tab communication
    const existingNotifications = JSON.parse(localStorage.getItem('notifications') || '[]');
    localStorage.setItem('notifications', JSON.stringify([newNotification, ...existingNotifications.slice(0, 49)]));
  };

  const clearNotifications = () => {
    setNotifications([]);
    localStorage.setItem('notifications', '[]');
  };

  // Listen for localStorage changes (cross-tab notifications)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'notifications') {
        const updatedNotifications = JSON.parse(e.newValue || '[]');
        setNotifications(updatedNotifications);
        
        // Play sound for new notifications targeted at current user
        if (user && updatedNotifications.length > notifications.length) {
          const latestNotification = updatedNotifications[0];
          if (latestNotification.targetRole === user.role) {
            playNotificationSound();
          }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Load existing notifications on mount
    const existingNotifications = JSON.parse(localStorage.getItem('notifications') || '[]');
    setNotifications(existingNotifications);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [user, notifications.length]);

  const value: NotificationContextType = {
    notifications,
    addNotification,
    clearNotifications,
    playNotificationSound,
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};
