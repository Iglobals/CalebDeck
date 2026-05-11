import React, { useState, useEffect } from 'react';
import { AdminLayout } from './AdminLayout';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { Badge } from '../../components/design-system/Badge';
import { Settings, ShieldAlert, Store, Pizza, Clock, Wifi, Utensils, MessageSquare } from 'lucide-react';
import { subscribeToPlatformSettings, updatePlatformSettings, PlatformSettings } from '../../../services/db';
import { useTheme } from '../../../context/ThemeContext';

const CLOSED_MESSAGES = {
  global: [
    'CalebDeck is temporarily paused while we make a quick operational update. Please check back shortly.',
    'We are doing a short system reset to keep orders moving smoothly. Ordering will resume soon.',
    'CalebDeck is currently closed for maintenance. Thank you for your patience.'
  ],
  food: [
    'Food ordering is currently closed. Cafeterias are preparing for the next order window.',
    'The cafeteria order line is paused for now. Please check back soon for fresh meals.',
    'Food orders are locked while the cafeteria catches up with current demand.'
  ],
  mart: [
    'CalebDeck Mart is currently closed for restocking. Fresh items will be available soon.',
    'Mart orders are paused while inventory is being updated. Please check back shortly.',
    'The Mart is taking a quick break to restock and organize available items.'
  ],
  calebNet: [
    'CalebNet is temporarily unavailable while we update plans and provider availability.',
    'Data and airtime purchases are paused for a quick service check. Please try again shortly.',
    'CalebNet is closed for maintenance. Your wallet remains safe and purchases will resume soon.'
  ]
};

const DEFAULT_MESSAGES = {
  global: CLOSED_MESSAGES.global[0],
  food: CLOSED_MESSAGES.food[0],
  mart: CLOSED_MESSAGES.mart[0],
  calebNet: CLOSED_MESSAGES.calebNet[0]
};

export default function AdminSettings() {
  const { adminTheme } = useTheme();
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);
  const [openingHour, setOpeningHour] = useState<string>('10');
  const [closingHour, setClosingHour] = useState<string>('18');
  const [globalMessage, setGlobalMessage] = useState(DEFAULT_MESSAGES.global);
  const [foodMessage, setFoodMessage] = useState(DEFAULT_MESSAGES.food);
  const [martMessage, setMartMessage] = useState(DEFAULT_MESSAGES.mart);
  const [calebNetMessage, setCalebNetMessage] = useState(DEFAULT_MESSAGES.calebNet);

  useEffect(() => {
    const unsub = subscribeToPlatformSettings((data) => {
      setPlatformSettings(data);
      if (data.systemOpeningHour !== undefined) setOpeningHour(data.systemOpeningHour.toString());
      if (data.systemClosingHour !== undefined) setClosingHour(data.systemClosingHour.toString());
      setGlobalMessage(data.globalClosedMessage || DEFAULT_MESSAGES.global);
      setFoodMessage(data.foodOrderingClosedMessage || DEFAULT_MESSAGES.food);
      setMartMessage(data.martClosedMessage || DEFAULT_MESSAGES.mart);
      setCalebNetMessage(data.calebNetClosedMessage || DEFAULT_MESSAGES.calebNet);
    });
    return () => unsub();
  }, []);

  const isDark = adminTheme === 'dark';
  const isAcceptingOrders = platformSettings?.isAcceptingOrders !== false; // defaults to true
  const isFoodOrderingClosed = platformSettings?.isFoodOrderingClosed === true;
  const isMartComingSoon = platformSettings?.isMartComingSoon === true;
  const isCalebNetComingSoon = platformSettings?.isCalebNetComingSoon !== false; // defaults to true
  const isIPizzaComingSoon = platformSettings?.isIPizzaComingSoon !== false; // defaults to true

  const handleToggleOrdering = async () => {
    if (!confirm(`Are you sure you want to ${isAcceptingOrders ? 'PAUSE' : 'RESUME'} all ordering on CalebDeck?`)) return;
    try {
      await updatePlatformSettings({
        isAcceptingOrders: !isAcceptingOrders,
        globalClosedMessage: globalMessage.trim() || DEFAULT_MESSAGES.global
      });
    } catch (err) {
      console.error('Failed to update maintenance mode:', err);
    }
  };

  const handleToggleFoodOrdering = async () => {
    if (!confirm(`Are you sure you want to ${isFoodOrderingClosed ? 'OPEN' : 'CLOSE'} food ordering?`)) return;
    try {
      await updatePlatformSettings({
        isFoodOrderingClosed: !isFoodOrderingClosed,
        foodOrderingClosedMessage: foodMessage.trim() || DEFAULT_MESSAGES.food
      });
    } catch (err) {
      console.error('Failed to update food ordering gate:', err);
    }
  };

  const handleToggleMart = async () => {
    if (!confirm(`Are you sure you want to ${isMartComingSoon ? 'OPEN' : 'CLOSE'} CalebDeck Mart?`)) return;
    try {
      await updatePlatformSettings({
        isMartComingSoon: !isMartComingSoon,
        martClosedMessage: martMessage.trim() || DEFAULT_MESSAGES.mart
      });
    } catch (err) {
      console.error('Failed to update mart maintenance mode:', err);
    }
  };

  const handleToggleCalebNet = async () => {
    if (!confirm(`Are you sure you want to ${isCalebNetComingSoon ? 'OPEN' : 'CLOSE'} CalebNet?`)) return;
    try {
      await updatePlatformSettings({
        isCalebNetComingSoon: !isCalebNetComingSoon,
        calebNetClosedMessage: calebNetMessage.trim() || DEFAULT_MESSAGES.calebNet
      });
    } catch (err) {
      console.error('Failed to update CalebNet maintenance mode:', err);
    }
  };

  const saveClosedMessages = async () => {
    try {
      await updatePlatformSettings({
        globalClosedMessage: globalMessage.trim() || DEFAULT_MESSAGES.global,
        foodOrderingClosedMessage: foodMessage.trim() || DEFAULT_MESSAGES.food,
        martClosedMessage: martMessage.trim() || DEFAULT_MESSAGES.mart,
        calebNetClosedMessage: calebNetMessage.trim() || DEFAULT_MESSAGES.calebNet
      });
      alert('Closed messages saved successfully.');
    } catch (err) {
      console.error('Failed to save closed messages:', err);
      alert('Failed to save closed messages.');
    }
  };

  const messageTools = (
    value: string,
    setValue: (message: string) => void,
    messages: string[]
  ) => (
    <div className="mt-4 space-y-3">
      <label className={`flex items-center gap-2 text-xs font-bold uppercase tracking-widest ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
        <MessageSquare className="h-3.5 w-3.5" />
        Student message
      </label>
      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        rows={3}
        className={`w-full resize-none rounded-xl border px-3 py-2 text-sm font-medium outline-none transition-all focus:ring-2 focus:ring-primary ${
          isDark
            ? 'bg-[#2A2A2A] border-[#333333] text-white placeholder-gray-500'
            : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
        }`}
      />
      <div className="flex flex-wrap gap-2">
        {messages.map((message, index) => (
          <button
            key={message}
            type="button"
            onClick={() => setValue(message)}
            className={`rounded-lg border px-2.5 py-1 text-xs font-bold transition-colors ${
              value === message
                ? 'border-primary bg-primary/10 text-primary'
                : isDark
                  ? 'border-gray-700 text-gray-300 hover:border-primary'
                  : 'border-gray-200 text-gray-600 hover:border-primary'
            }`}
          >
            Preset {index + 1}
          </button>
        ))}
      </div>
    </div>
  );

  const handleToggleIPizza = async () => {
    if (!confirm(`Are you sure you want to ${isIPizzaComingSoon ? 'OPEN' : 'CLOSE'} iPizza?`)) return;
    try {
      await updatePlatformSettings({ isIPizzaComingSoon: !isIPizzaComingSoon });
    } catch (err) {
      console.error('Failed to update iPizza maintenance mode:', err);
    }
  };

  const handleUpdateHours = async () => {
    const open = parseInt(openingHour);
    const close = parseInt(closingHour);
    if (isNaN(open) || isNaN(close) || open < 0 || open > 23 || close < 0 || close > 23) {
      alert('Please enter valid hours between 0 and 23.');
      return;
    }
    if (!confirm(`Are you sure you want to update operating hours to ${open}:00 - ${close}:00?`)) return;
    try {
      await updatePlatformSettings({ systemOpeningHour: open, systemClosingHour: close });
      alert('Operating hours updated successfully.');
    } catch (err) {
      console.error('Failed to update operating hours:', err);
    }
  };

  return (
    <AdminLayout title="Platform Settings">
      <div className="space-y-6">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center space-x-3">
            <Settings className={`w-8 h-8 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
            <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>System Gates & Maintenance</h1>
          </div>
          <Button variant="outline" onClick={saveClosedMessages}>
            Save Display Messages
          </Button>
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
              {messageTools(globalMessage, setGlobalMessage, CLOSED_MESSAGES.global)}
            </div>
            <Button
              variant={isAcceptingOrders ? "danger" : "primary"}
              className="w-full"
              onClick={handleToggleOrdering}
            >
              {isAcceptingOrders ? 'Pause Ordering' : 'Resume Ordering'}
            </Button>
          </Card>

          {/* Food Ordering Toggle */}
          <Card className={`p-6 border-l-4 ${!isFoodOrderingClosed ? 'border-l-green-500' : 'border-l-red-500'}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={`p-3 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                  <Utensils className={`w-6 h-6 ${!isFoodOrderingClosed ? 'text-green-500' : 'text-red-500'}`} />
                </div>
                <div>
                  <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Food Ordering</h3>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Cafeteria Selection Gate</p>
                </div>
              </div>
            </div>
            <div className="mb-6">
              {!isFoodOrderingClosed ? (
                <Badge className="bg-green-100 text-green-700 mb-2">Food Open</Badge>
              ) : (
                <Badge className="bg-red-100 text-red-700 mb-2">Food Closed</Badge>
              )}
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {!isFoodOrderingClosed
                  ? 'Students can choose a cafeteria and place food orders.'
                  : 'Students are blocked at cafeteria selection with your message.'}
              </p>
              {messageTools(foodMessage, setFoodMessage, CLOSED_MESSAGES.food)}
            </div>
            <Button
              variant={!isFoodOrderingClosed ? "danger" : "primary"}
              className="w-full"
              onClick={handleToggleFoodOrdering}
            >
              {!isFoodOrderingClosed ? 'Close Food Ordering' : 'Open Food Ordering'}
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
              {messageTools(martMessage, setMartMessage, CLOSED_MESSAGES.mart)}
            </div>
            <Button
              variant={!isMartComingSoon ? "danger" : "primary"}
              className="w-full"
              onClick={handleToggleMart}
            >
              {!isMartComingSoon ? 'Close Mart (Stocking)' : 'Open Mart'}
            </Button>
          </Card>

          {/* CalebNet Toggle */}
          <Card className={`p-6 border-l-4 ${!isCalebNetComingSoon ? 'border-l-green-500' : 'border-l-blue-500'}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={`p-3 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                  <Wifi className={`w-6 h-6 ${!isCalebNetComingSoon ? 'text-green-500' : 'text-blue-500'}`} />
                </div>
                <div>
                  <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>CalebNet</h3>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Data & Airtime Availability</p>
                </div>
              </div>
            </div>
            <div className="mb-6">
              {!isCalebNetComingSoon ? (
                <Badge className="bg-green-100 text-green-700 mb-2">CalebNet Open</Badge>
              ) : (
                <Badge className="bg-blue-100 text-blue-700 mb-2">Coming Soon (Closed)</Badge>
              )}
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {!isCalebNetComingSoon
                  ? 'Students can currently buy data and airtime.'
                  : 'Students will see the CalebNet coming soon teaser.'}
              </p>
              {messageTools(calebNetMessage, setCalebNetMessage, CLOSED_MESSAGES.calebNet)}
            </div>
            <Button
              variant={!isCalebNetComingSoon ? "danger" : "primary"}
              className="w-full"
              onClick={handleToggleCalebNet}
            >
              {!isCalebNetComingSoon ? 'Close CalebNet' : 'Open CalebNet'}
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

          {/* Operating Hours Configuration */}
          <Card className={`p-6 border-l-4 border-l-blue-500`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={`p-3 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                  <Clock className={`w-6 h-6 text-blue-500`} />
                </div>
                <div>
                  <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Operating Hours</h3>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>System Schedule (0-23)</p>
                </div>
              </div>
            </div>
            <div className="mb-6 space-y-3">
              <div>
                <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Opening Hour (e.g. 10 for 10 AM)</label>
                <input 
                  type="number" 
                  min="0" max="23"
                  value={openingHour}
                  onChange={(e) => setOpeningHour(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all ${
                    isDark 
                      ? 'bg-[#2A2A2A] border-[#333333] text-white placeholder-gray-500' 
                      : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Closing Hour (e.g. 18 for 6 PM)</label>
                <input 
                  type="number" 
                  min="0" max="23"
                  value={closingHour}
                  onChange={(e) => setClosingHour(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all ${
                    isDark 
                      ? 'bg-[#2A2A2A] border-[#333333] text-white placeholder-gray-500' 
                      : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
                  }`}
                />
              </div>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Set to 0 and 24 to keep the system open 24/7. Current schedule is from {platformSettings?.systemOpeningHour ?? 10}:00 to {platformSettings?.systemClosingHour ?? 18}:00.
              </p>
            </div>
            <Button
              variant="primary"
              className="w-full"
              onClick={handleUpdateHours}
            >
              Save Hours
            </Button>
          </Card>

        </div>
      </div>
    </AdminLayout>
  );
}
