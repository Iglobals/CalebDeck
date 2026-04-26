import React, { useState, useEffect } from 'react';
import { AdminLayout } from './AdminLayout';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { Badge } from '../../components/design-system/Badge';
import { Settings, ShieldAlert, Store, Pizza } from 'lucide-react';
import { subscribeToPlatformSettings, updatePlatformSettings, PlatformSettings } from '../../../services/db';
import { useTheme } from '../../../context/ThemeContext';

export default function AdminSettings() {
  const { adminTheme } = useTheme();
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);

  useEffect(() => {
    const unsub = subscribeToPlatformSettings((data) => setPlatformSettings(data));
    return () => unsub();
  }, []);

  const isDark = adminTheme === 'dark';
  const isAcceptingOrders = platformSettings?.isAcceptingOrders !== false; // defaults to true
  const isMartComingSoon = platformSettings?.isMartComingSoon === true;
  const isIPizzaComingSoon = platformSettings?.isIPizzaComingSoon !== false; // defaults to true

  const handleToggleOrdering = async () => {
    if (!confirm(`Are you sure you want to ${isAcceptingOrders ? 'PAUSE' : 'RESUME'} all ordering on CalebDeck?`)) return;
    try {
      await updatePlatformSettings({ isAcceptingOrders: !isAcceptingOrders });
    } catch (err) {
      console.error('Failed to update maintenance mode:', err);
    }
  };

  const handleToggleMart = async () => {
    if (!confirm(`Are you sure you want to ${isMartComingSoon ? 'OPEN' : 'CLOSE'} CalebDeck Mart?`)) return;
    try {
      await updatePlatformSettings({ isMartComingSoon: !isMartComingSoon });
    } catch (err) {
      console.error('Failed to update mart maintenance mode:', err);
    }
  };

  const handleToggleIPizza = async () => {
    if (!confirm(`Are you sure you want to ${isIPizzaComingSoon ? 'OPEN' : 'CLOSE'} iPizza?`)) return;
    try {
      await updatePlatformSettings({ isIPizzaComingSoon: !isIPizzaComingSoon });
    } catch (err) {
      console.error('Failed to update iPizza maintenance mode:', err);
    }
  };

  return (
    <AdminLayout title="Platform Settings">
      <div className="space-y-6">
        <div className="flex items-center space-x-3 mb-8">
          <Settings className={`w-8 h-8 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>System Gates & Maintenance</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Global Ordering Toggle */}
          <Card className={`p-6 border-l-4 ${isAcceptingOrders ? 'border-l-green-500' : 'border-l-red-500'}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={`p-3 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                  <ShieldAlert className={`w-6 h-6 ${isAcceptingOrders ? 'text-green-500' : 'text-red-500'}`} />
                </div>
                <div>
                  <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Global Ordering</h3>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Cafeteria & Main Platform</p>
                </div>
              </div>
            </div>
            <div className="mb-6">
              {isAcceptingOrders ? (
                <Badge className="bg-green-100 text-green-700 mb-2">Systems Active</Badge>
              ) : (
                <Badge className="bg-red-100 text-red-700 mb-2">Ordering Paused</Badge>
              )}
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {isAcceptingOrders 
                  ? 'Students can currently place food orders.' 
                  : 'Platform is paused. Students will see a maintenance screen.'}
              </p>
            </div>
            <Button
              variant={isAcceptingOrders ? "danger" : "primary"}
              className="w-full"
              onClick={handleToggleOrdering}
            >
              {isAcceptingOrders ? 'Pause Ordering' : 'Resume Ordering'}
            </Button>
          </Card>

          {/* CalebDeck Mart Toggle */}
          <Card className={`p-6 border-l-4 ${!isMartComingSoon ? 'border-l-green-500' : 'border-l-yellow-500'}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={`p-3 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                  <Store className={`w-6 h-6 ${!isMartComingSoon ? 'text-green-500' : 'text-yellow-500'}`} />
                </div>
                <div>
                  <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>CalebDeck Mart</h3>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Mart Availability</p>
                </div>
              </div>
            </div>
            <div className="mb-6">
              {!isMartComingSoon ? (
                <Badge className="bg-green-100 text-green-700 mb-2">Mart Open</Badge>
              ) : (
                <Badge className="bg-yellow-100 text-yellow-700 mb-2">Stocking (Closed)</Badge>
              )}
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {!isMartComingSoon 
                  ? 'Mart is open for student orders.' 
                  : 'Mart is hiding behind the stocking overlay.'}
              </p>
            </div>
            <Button
              variant={!isMartComingSoon ? "danger" : "primary"}
              className="w-full"
              onClick={handleToggleMart}
            >
              {!isMartComingSoon ? 'Close Mart (Stocking)' : 'Open Mart'}
            </Button>
          </Card>

          {/* iPizza Toggle */}
          <Card className={`p-6 border-l-4 ${!isIPizzaComingSoon ? 'border-l-green-500' : 'border-l-orange-500'}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={`p-3 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                  <Pizza className={`w-6 h-6 ${!isIPizzaComingSoon ? 'text-green-500' : 'text-orange-500'}`} />
                </div>
                <div>
                  <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>iPizza Platform</h3>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>iPizza Availability</p>
                </div>
              </div>
            </div>
            <div className="mb-6">
              {!isIPizzaComingSoon ? (
                <Badge className="bg-green-100 text-green-700 mb-2">iPizza Open</Badge>
              ) : (
                <Badge className="bg-orange-100 text-orange-700 mb-2">Coming Soon (Closed)</Badge>
              )}
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {!isIPizzaComingSoon 
                  ? 'iPizza is currently open to students.' 
                  : 'iPizza is showing the coming soon gate.'}
              </p>
            </div>
            <Button
              variant={!isIPizzaComingSoon ? "danger" : "primary"}
              className="w-full"
              onClick={handleToggleIPizza}
            >
              {!isIPizzaComingSoon ? 'Close iPizza' : 'Open iPizza'}
            </Button>
          </Card>

        </div>
      </div>
    </AdminLayout>
  );
}
