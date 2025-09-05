import React from 'react';
import DashboardStats from '../components/Dashboard/DashboardStats';

const Dashboard: React.FC = () => {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome to your restaurant management system</p>
      </div>
      <DashboardStats />
    </div>
  );
};

export default Dashboard;
