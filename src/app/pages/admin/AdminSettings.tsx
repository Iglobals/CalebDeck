import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { AdminLayout } from './AdminLayout';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { Badge } from '../../components/design-system/Badge';
import { Settings, ShieldAlert, Store, Pizza, Clock, Wifi, Utensils, MessageSquare, Plus, Trash2, Edit3, ArrowUp, ArrowDown, Image as ImageIcon, Sparkles, Check, X } from 'lucide-react';
import { subscribeToPlatformSettings, updatePlatformSettings, PlatformSettings, PromoSlide, DEFAULT_PROMO_SLIDES } from '../../../services/db';
import { useTheme } from '../../../context/ThemeContext';
import { FashionBatchConfig, DEFAULT_FASHION_BATCH_CONFIG } from '../../../services/fashionBatch';

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
  fashion: [
    'CalebDeck Fashion is currently closed. New collections are dropping soon!',
    'Fashion orders are paused. Please check back shortly.',
    'Fashion is taking a quick break to restock styles.'
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
  fashion: CLOSED_MESSAGES.fashion[0],
  calebNet: CLOSED_MESSAGES.calebNet[0]
};

const GRADIENT_PRESETS = [
  { name: 'Emerald Mart', value: 'from-[#047857] via-[#10B981] to-[#022c22]' },
  { name: 'Purple Fashion', value: 'from-[#6D28D9] via-[#8B5CF6] to-[#2e1065]' },
  { name: 'Royal Blue CalebNet', value: 'from-[#1D4ED8] via-[#3B82F6] to-[#172554]' },
  { name: 'Sunset Amber', value: 'from-[#D97706] via-[#F59E0B] to-[#451A03]' },
  { name: 'Rose Red', value: 'from-[#BE123C] via-[#F43F5E] to-[#4C0519]' },
  { name: 'Dark Obsidian', value: 'from-[#1F2937] via-[#374151] to-[#111827]' },
];

export default function AdminSettings() {
  const { adminTheme } = useTheme();
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);
  const [openingHour, setOpeningHour] = useState<string>('10');
  const [closingHour, setClosingHour] = useState<string>('18');
  const [globalMessage, setGlobalMessage] = useState(DEFAULT_MESSAGES.global);
  const [foodMessage, setFoodMessage] = useState(DEFAULT_MESSAGES.food);
  const [martMessage, setMartMessage] = useState(DEFAULT_MESSAGES.mart);
  const [fashionMessage, setFashionMessage] = useState(DEFAULT_MESSAGES.fashion);
  const [calebNetMessage, setCalebNetMessage] = useState(DEFAULT_MESSAGES.calebNet);
  const [fashionOpenHour, setFashionOpenHour] = useState<string>('0');
  const [fashionCloseHour, setFashionCloseHour] = useState<string>('24');
  
  // Fees and Pricing State
  const [fees, setFees] = useState({
    foodDeliveryFee: 0,
    foodGroupDeliveryFee: 0,
    premiumDeliveryFee: 0,
    martDeliveryFee: 0,
    fashionDeliveryFee: 0,
    fashionRatePerDelivery: 0,
    businessMonthlyPrice: 0,
    businessYearlyPrice: 0
  });
  const [premiumHostelsText, setPremiumHostelsText] = useState('');

  // Promo Banners State
  const [promoSlides, setPromoSlides] = useState<PromoSlide[]>([]);
  const [editingSlideId, setEditingSlideId] = useState<string | null>(null);
  const [isAddingSlide, setIsAddingSlide] = useState(false);
  const [savingPromos, setSavingPromos] = useState(false);

  // Fashion Batch State
  const [fashionBatchConfig, setFashionBatchConfig] = useState<FashionBatchConfig>(DEFAULT_FASHION_BATCH_CONFIG);

  const createEmptySlide = (): PromoSlide => ({
    id: `slide-${Date.now()}`,
    badge: 'EXCLUSIVE',
    title: 'New Announcement',
    tagline: 'Special update or promotion for CalebDeck students.',
    gradient: 'from-[#6D28D9] via-[#8B5CF6] to-[#2e1065]',
    logoUrl: '/avaters/calebdeck-business-logo-transparent.png',
    link: '/mart',
    buttonText: 'Check It Out',
    isActive: true
  });

  const [slideDraft, setSlideDraft] = useState<PromoSlide>(createEmptySlide());

  useEffect(() => {
    const unsub = subscribeToPlatformSettings((data) => {
      setPlatformSettings(data);
      if (data.systemOpeningHour !== undefined) setOpeningHour(data.systemOpeningHour.toString());
      if (data.systemClosingHour !== undefined) setClosingHour(data.systemClosingHour.toString());
      if (data.fashionOpeningHour !== undefined) setFashionOpenHour(data.fashionOpeningHour.toString());
      if (data.fashionClosingHour !== undefined) setFashionCloseHour(data.fashionClosingHour.toString());
      setGlobalMessage(data.globalClosedMessage || DEFAULT_MESSAGES.global);
      setFoodMessage(data.foodOrderingClosedMessage || DEFAULT_MESSAGES.food);
      setMartMessage(data.martClosedMessage || DEFAULT_MESSAGES.mart);
      setFashionMessage(data.fashionClosedMessage || DEFAULT_MESSAGES.fashion);
      setCalebNetMessage(data.calebNetClosedMessage || DEFAULT_MESSAGES.calebNet);
      setPromoSlides(data.promoSlides || DEFAULT_PROMO_SLIDES);
      if (data.fashionBatchConfig) setFashionBatchConfig(data.fashionBatchConfig);
      
      setFees({
        foodDeliveryFee: data.foodDeliveryFee || 0,
        foodGroupDeliveryFee: data.foodGroupDeliveryFee || 0,
        premiumDeliveryFee: data.premiumDeliveryFee || 0,
        martDeliveryFee: data.martDeliveryFee || 0,
        fashionDeliveryFee: data.fashionDeliveryFee || 0,
        fashionRatePerDelivery: data.fashionRatePerDelivery || 0,
        businessMonthlyPrice: data.businessMonthlyPrice || 0,
        businessYearlyPrice: data.businessYearlyPrice || 0
      });
      setPremiumHostelsText((data.premiumHostels || []).join(', '));
    });
    return () => unsub();
  }, []);

  const isDark = adminTheme === 'dark';
  const isAcceptingOrders = platformSettings?.isAcceptingOrders !== false; // defaults to true
  const isFoodOrderingClosed = platformSettings?.isFoodOrderingClosed === true;
  const isMartComingSoon = platformSettings?.isMartComingSoon === true;
  const isFashionAcceptingOrders = platformSettings?.isFashionAcceptingOrders !== false;
  const isFashionComingSoon = platformSettings?.isFashionComingSoon === true;
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

  const handleToggleFashion = async () => {
    if (!confirm(`Are you sure you want to ${isFashionAcceptingOrders ? 'CLOSE' : 'OPEN'} Fashion?`)) return;
    try {
      await updatePlatformSettings({
        isFashionAcceptingOrders: !isFashionAcceptingOrders,
        fashionClosedMessage: fashionMessage.trim() || DEFAULT_MESSAGES.fashion
      });
    } catch (err) {
      console.error('Failed to update Fashion maintenance mode:', err);
    }
  };

  const handleToggleFashionComingSoon = async () => {
    if (!confirm(`Are you sure you want to ${isFashionComingSoon ? 'LAUNCH' : 'SET COMING SOON FOR'} Fashion?`)) return;
    try {
      await updatePlatformSettings({
        isFashionComingSoon: !isFashionComingSoon
      });
    } catch (err) {
      console.error('Failed to update Fashion coming soon mode:', err);
    }
  };

  const saveClosedMessages = async () => {
    try {
      await updatePlatformSettings({
        globalClosedMessage: globalMessage.trim() || DEFAULT_MESSAGES.global,
        foodOrderingClosedMessage: foodMessage.trim() || DEFAULT_MESSAGES.food,
        martClosedMessage: martMessage.trim() || DEFAULT_MESSAGES.mart,
        fashionClosedMessage: fashionMessage.trim() || DEFAULT_MESSAGES.fashion,
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

  const handleSavePromoSlidesToDB = async (slides: PromoSlide[]) => {
    setSavingPromos(true);
    try {
      await updatePlatformSettings({ promoSlides: slides });
      setPromoSlides(slides);
    } catch (err) {
      console.error('Failed to save promo slides:', err);
      alert('Failed to save promo slides.');
    } finally {
      setSavingPromos(false);
    }
  };

  const handleToggleSlideActive = (id: string) => {
    const updated = promoSlides.map(s => s.id === id ? { ...s, isActive: !(s.isActive !== false) } : s);
    handleSavePromoSlidesToDB(updated);
  };

  const handleDeleteSlide = (id: string) => {
    if (!confirm('Are you sure you want to delete this promo slide?')) return;
    const updated = promoSlides.filter(s => s.id !== id);
    handleSavePromoSlidesToDB(updated);
  };

  const handleMoveSlide = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= promoSlides.length) return;
    const updated = [...promoSlides];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    handleSavePromoSlidesToDB(updated);
  };

  const handleOpenAddSlide = () => {
    setSlideDraft(createEmptySlide());
    setEditingSlideId(null);
    setIsAddingSlide(true);
  };

  const handleOpenEditSlide = (slide: PromoSlide) => {
    setSlideDraft({ ...slide });
    setEditingSlideId(slide.id);
    setIsAddingSlide(true);
  };

  const handleSaveSlideDraft = () => {
    if (!slideDraft.title.trim()) {
      alert('Please enter a banner title.');
      return;
    }
    let updated: PromoSlide[];
    if (editingSlideId) {
      updated = promoSlides.map(s => s.id === editingSlideId ? slideDraft : s);
    } else {
      updated = [...promoSlides, slideDraft];
    }
    handleSavePromoSlidesToDB(updated);
    setIsAddingSlide(false);
    setEditingSlideId(null);
  };

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
    const fOpen = parseInt(fashionOpenHour);
    const fClose = parseInt(fashionCloseHour);
    if (isNaN(open) || isNaN(close) || open < 0 || open > 23 || close < 0 || close > 23 ||
        isNaN(fOpen) || isNaN(fClose) || fOpen < 0 || fOpen > 23 || fClose < 0 || fClose > 24) {
      alert('Please enter valid hours.');
      return;
    }
    if (!confirm(`Are you sure you want to update operating hours?`)) return;
    try {
      await updatePlatformSettings({ 
        systemOpeningHour: open, systemClosingHour: close,
        fashionOpeningHour: fOpen, fashionClosingHour: fClose
      });
      alert('Operating hours updated successfully.');
    } catch (err) {
      console.error('Failed to update operating hours:', err);
    }
  };

  const handleUpdateFashionBatch = async () => {
    try {
      await updatePlatformSettings({
        fashionBatchConfig
      });
      alert('Fashion batch schedule updated successfully.');
    } catch (err) {
      console.error('Failed to update fashion batch schedule:', err);
      alert('Failed to update fashion batch schedule.');
    }
  };

  const handleUpdateFees = async () => {
    try {
      const premiumHostels = premiumHostelsText
        .split(',')
        .map(h => h.trim())
        .filter(Boolean);
      await updatePlatformSettings({ ...fees, premiumHostels });
      alert('Platform fees and pricing updated successfully.');
    } catch (err) {
      console.error('Failed to update fees:', err);
      alert('Failed to update fees.');
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
          
          {/* Order Windows / Batch System */}
          <Card className={`p-6 border-l-4 ${platformSettings?.orderWindowsEnabled ? 'border-l-purple-500' : 'border-l-gray-400'}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={`p-3 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                  <Clock className={`w-6 h-6 ${platformSettings?.orderWindowsEnabled ? 'text-purple-500' : 'text-gray-400'}`} />
                </div>
                <div>
                  <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Order Windows</h3>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Batch Delivery System</p>
                </div>
              </div>
            </div>
            <div className="mb-6">
              {platformSettings?.orderWindowsEnabled ? (
                <Badge className="bg-purple-100 text-purple-700 mb-2">Batch Mode Active</Badge>
              ) : (
                <Badge className={isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}>Hour-Based Mode</Badge>
              )}
              <p className={`mt-2 text-xs leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {platformSettings?.orderWindowsEnabled
                  ? 'Students order during batch windows. Each batch has a delivery time slot.'
                  : `Using basic hour gate (${platformSettings?.systemOpeningHour || 10}:00–${platformSettings?.systemClosingHour || 18}:00). Enable for scheduled batch deliveries.`}
              </p>
            </div>
            <Link to="/admin/batches">
              <Button variant="primary" className="w-full">
                Manage Batches →
              </Button>
            </Link>
          </Card>
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

          {/* CalebDeck Fashion Toggle */}
          <Card className={`p-6 border-l-4 ${isFashionAcceptingOrders ? (isFashionComingSoon ? 'border-l-yellow-500' : 'border-l-green-500') : 'border-l-red-500'}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={`p-3 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                  <Store className={`w-6 h-6 ${isFashionAcceptingOrders ? (isFashionComingSoon ? 'text-yellow-500' : 'text-green-500') : 'text-red-500'}`} />
                </div>
                <div>
                  <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>CalebDeck Fashion</h3>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Fashion Availability</p>
                </div>
              </div>
            </div>
            <div className="mb-6">
              {isFashionAcceptingOrders ? (
                isFashionComingSoon ? (
                  <Badge className="bg-yellow-100 text-yellow-700 mb-2">Coming Soon Gate</Badge>
                ) : (
                  <Badge className="bg-green-100 text-green-700 mb-2">Fashion Open</Badge>
                )
              ) : (
                <Badge className="bg-red-100 text-red-700 mb-2">Fashion Closed</Badge>
              )}
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {isFashionAcceptingOrders 
                  ? (isFashionComingSoon ? 'Fashion shows Coming Soon overlay.' : 'Fashion is open for orders.')
                  : 'Fashion is completely closed.'}
              </p>
              {messageTools(fashionMessage, setFashionMessage, CLOSED_MESSAGES.fashion)}
            </div>
            <div className="flex gap-2">
              <Button
                variant={!isFashionAcceptingOrders ? "primary" : "danger"}
                className="flex-1"
                onClick={handleToggleFashion}
              >
                {!isFashionAcceptingOrders ? 'Open' : 'Close'}
              </Button>
              <Button
                variant={isFashionComingSoon ? "primary" : "outline"}
                className="flex-1"
                onClick={handleToggleFashionComingSoon}
              >
                {isFashionComingSoon ? 'Launch' : 'Set Coming Soon'}
              </Button>
            </div>
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
            <div className="mb-6 space-y-3 pt-4 border-t">
              <h4 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Fashion Hours</h4>
              <div>
                <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Fashion Opening Hour</label>
                <input 
                  type="number" min="0" max="23"
                  value={fashionOpenHour}
                  onChange={(e) => setFashionOpenHour(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all ${
                    isDark ? 'bg-[#2A2A2A] border-[#333333] text-white placeholder-gray-500' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Fashion Closing Hour</label>
                <input 
                  type="number" min="0" max="24"
                  value={fashionCloseHour}
                  onChange={(e) => setFashionCloseHour(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all ${
                    isDark ? 'bg-[#2A2A2A] border-[#333333] text-white placeholder-gray-500' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
                  }`}
                />
              </div>
            </div>
            <Button
              variant="primary"
              className="w-full"
              onClick={handleUpdateHours}
            >
              Save Hours
            </Button>
          </Card>

          {/* Fashion Batch Schedule Configuration */}
          <Card className={`p-6 border-l-4 border-l-purple-500`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={`p-3 rounded-xl ${isDark ? 'bg-purple-900/40 text-purple-400' : 'bg-purple-100 text-purple-600'}`}>
                  <Clock className={`w-6 h-6`} />
                </div>
                <div>
                  <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Fashion Batch Schedule</h3>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Weekly Ordering Cycle</p>
                </div>
              </div>
            </div>
            
            <div className="mb-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Order Window Opens (Day)</label>
                  <select 
                    value={fashionBatchConfig.orderWindowOpenDay}
                    onChange={(e) => setFashionBatchConfig({ ...fashionBatchConfig, orderWindowOpenDay: Number(e.target.value) })}
                    className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all ${
                      isDark ? 'bg-[#2A2A2A] border-[#333333] text-white' : 'bg-white border-gray-200 text-gray-900'
                    }`}
                  >
                    <option value={1}>Monday</option>
                    <option value={2}>Tuesday</option>
                    <option value={3}>Wednesday</option>
                    <option value={4}>Thursday</option>
                    <option value={5}>Friday</option>
                    <option value={6}>Saturday</option>
                    <option value={7}>Sunday</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Order Window Closes (Day)</label>
                  <select 
                    value={fashionBatchConfig.orderWindowCloseDay}
                    onChange={(e) => setFashionBatchConfig({ ...fashionBatchConfig, orderWindowCloseDay: Number(e.target.value) })}
                    className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all ${
                      isDark ? 'bg-[#2A2A2A] border-[#333333] text-white' : 'bg-white border-gray-200 text-gray-900'
                    }`}
                  >
                    <option value={1}>Monday</option>
                    <option value={2}>Tuesday</option>
                    <option value={3}>Wednesday</option>
                    <option value={4}>Thursday</option>
                    <option value={5}>Friday</option>
                    <option value={6}>Saturday</option>
                    <option value={7}>Sunday</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Closing Hour (0-23)</label>
                <input 
                  type="number" min="0" max="23"
                  value={fashionBatchConfig.orderWindowCloseHour}
                  onChange={(e) => setFashionBatchConfig({ ...fashionBatchConfig, orderWindowCloseHour: Number(e.target.value) })}
                  className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all ${
                    isDark ? 'bg-[#2A2A2A] border-[#333333] text-white' : 'bg-white border-gray-200 text-gray-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                <div>
                  <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Arrival Day</label>
                  <select 
                    value={fashionBatchConfig.arrivalDay}
                    onChange={(e) => setFashionBatchConfig({ ...fashionBatchConfig, arrivalDay: Number(e.target.value) })}
                    className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all ${
                      isDark ? 'bg-[#2A2A2A] border-[#333333] text-white' : 'bg-white border-gray-200 text-gray-900'
                    }`}
                  >
                    <option value={1}>Monday</option>
                    <option value={2}>Tuesday</option>
                    <option value={3}>Wednesday</option>
                    <option value={4}>Thursday</option>
                    <option value={5}>Friday</option>
                    <option value={6}>Saturday</option>
                    <option value={7}>Sunday</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Delivery Starts</label>
                  <select 
                    value={fashionBatchConfig.deliveryStartDay}
                    onChange={(e) => setFashionBatchConfig({ ...fashionBatchConfig, deliveryStartDay: Number(e.target.value) })}
                    className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all ${
                      isDark ? 'bg-[#2A2A2A] border-[#333333] text-white' : 'bg-white border-gray-200 text-gray-900'
                    }`}
                  >
                    <option value={1}>Monday</option>
                    <option value={2}>Tuesday</option>
                    <option value={3}>Wednesday</option>
                    <option value={4}>Thursday</option>
                    <option value={5}>Friday</option>
                    <option value={6}>Saturday</option>
                    <option value={7}>Sunday</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Delivery Ends</label>
                  <select 
                    value={fashionBatchConfig.deliveryEndDay}
                    onChange={(e) => setFashionBatchConfig({ ...fashionBatchConfig, deliveryEndDay: Number(e.target.value) })}
                    className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all ${
                      isDark ? 'bg-[#2A2A2A] border-[#333333] text-white' : 'bg-white border-gray-200 text-gray-900'
                    }`}
                  >
                    <option value={1}>Monday</option>
                    <option value={2}>Tuesday</option>
                    <option value={3}>Wednesday</option>
                    <option value={4}>Thursday</option>
                    <option value={5}>Friday</option>
                    <option value={6}>Saturday</option>
                    <option value={7}>Sunday</option>
                  </select>
                </div>
              </div>
            </div>

            <Button
              variant="primary"
              className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white"
              onClick={handleUpdateFashionBatch}
            >
              Save Schedule
            </Button>
          </Card>

        </div>

        {/* Platform Fees & Pricing Configuration */}
        <div className="mt-10">
          <Card className={`p-6 md:p-8 border-l-4 border-l-emerald-500 shadow-xl`}>
            <div className="flex flex-col gap-4 mb-6">
              <h2 className={`text-xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>Platform Fees & Pricing</h2>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Configure delivery fees and CalebDeck Business plan prices.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              <div>
                <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Food Delivery Fee</label>
                <input 
                  type="number" min="0"
                  value={fees.foodDeliveryFee}
                  onChange={(e) => setFees({ ...fees, foodDeliveryFee: Number(e.target.value) })}
                  className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all ${
                    isDark ? 'bg-[#2A2A2A] border-[#333333] text-white' : 'bg-white border-gray-200 text-gray-900'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Food Group Delivery Fee</label>
                <input 
                  type="number" min="0"
                  value={fees.foodGroupDeliveryFee}
                  onChange={(e) => setFees({ ...fees, foodGroupDeliveryFee: Number(e.target.value) })}
                  className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all ${
                    isDark ? 'bg-[#2A2A2A] border-[#333333] text-white' : 'bg-white border-gray-200 text-gray-900'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Mart Delivery Fee</label>
                <input 
                  type="number" min="0"
                  value={fees.martDeliveryFee}
                  onChange={(e) => setFees({ ...fees, martDeliveryFee: Number(e.target.value) })}
                  className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all ${
                    isDark ? 'bg-[#2A2A2A] border-[#333333] text-white' : 'bg-white border-gray-200 text-gray-900'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Fashion Delivery Fee</label>
                <input 
                  type="number" min="0"
                  value={fees.fashionDeliveryFee}
                  onChange={(e) => setFees({ ...fees, fashionDeliveryFee: Number(e.target.value) })}
                  className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all ${
                    isDark ? 'bg-[#2A2A2A] border-[#333333] text-white' : 'bg-white border-gray-200 text-gray-900'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Girls' Hostel Premium (Food)</label>
                <input
                  type="number" min="0"
                  value={fees.premiumDeliveryFee}
                  onChange={(e) => setFees({ ...fees, premiumDeliveryFee: Number(e.target.value) })}
                  className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all ${
                    isDark ? 'bg-[#2A2A2A] border-[#333333] text-white' : 'bg-white border-gray-200 text-gray-900'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Fashion Rider Rate (per order)</label>
                <input
                  type="number" min="0"
                  value={fees.fashionRatePerDelivery}
                  onChange={(e) => setFees({ ...fees, fashionRatePerDelivery: Number(e.target.value) })}
                  className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all ${
                    isDark ? 'bg-[#2A2A2A] border-[#333333] text-white' : 'bg-white border-gray-200 text-gray-900'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Business Monthly Price</label>
                <input
                  type="number" min="0"
                  value={fees.businessMonthlyPrice}
                  onChange={(e) => setFees({ ...fees, businessMonthlyPrice: Number(e.target.value) })}
                  className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all ${
                    isDark ? 'bg-[#2A2A2A] border-[#333333] text-white' : 'bg-white border-gray-200 text-gray-900'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Business Yearly Price</label>
                <input 
                  type="number" min="0"
                  value={fees.businessYearlyPrice}
                  onChange={(e) => setFees({ ...fees, businessYearlyPrice: Number(e.target.value) })}
                  className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all ${
                    isDark ? 'bg-[#2A2A2A] border-[#333333] text-white' : 'bg-white border-gray-200 text-gray-900'
                  }`}
                />
              </div>
            </div>

            <div className="mb-6">
              <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Girls' Hostels (Premium Food Rate Applies) — comma separated</label>
              <textarea
                rows={2}
                value={premiumHostelsText}
                onChange={(e) => setPremiumHostelsText(e.target.value)}
                placeholder="sussana, rebecca, mary, esme, deborah, mercy"
                className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all ${
                  isDark ? 'bg-[#2A2A2A] border-[#333333] text-white' : 'bg-white border-gray-200 text-gray-900'
                }`}
              />
              <p className={`text-[11px] mt-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                Only Food orders to these hostels pay the premium rate. Fashion and Mart always use their own flat fees.
              </p>
            </div>

            <Button
              variant="primary"
              className="w-full bg-[#10B981] hover:bg-[#059669] text-white"
              onClick={handleUpdateFees}
            >
              Save Fees & Pricing
            </Button>
          </Card>
        </div>

        {/* Promo Banner & Carousel Manager */}
        <div className="mt-10">
          <Card className="p-6 md:p-8 border-l-4 border-l-purple-500 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center space-x-3">
                <div className={`p-3 rounded-2xl ${isDark ? 'bg-purple-900/40 text-purple-400' : 'bg-purple-100 text-purple-600'}`}>
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h2 className={`text-xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>Homepage Promo Banners</h2>
                  <p className={`text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Manage the hero carousel slides displayed on the student homepage</p>
                </div>
              </div>
              <Button onClick={handleOpenAddSlide} variant="primary" className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Add Promo Slide
              </Button>
            </div>

            {promoSlides.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl">
                <p className="text-gray-500 text-sm">No custom promo slides configured yet. Default slides are being displayed.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {promoSlides.map((slide, idx) => {
                  const isActive = slide.isActive !== false;
                  return (
                    <div key={slide.id || idx} className={`relative rounded-3xl border overflow-hidden transition-all flex flex-col justify-between ${isDark ? 'bg-[#1E1E1E] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                      
                      {/* Live Visual Mini Banner Preview */}
                      <div className={`p-5 relative overflow-hidden bg-gradient-to-r ${slide.gradient || 'from-[#6D28D9] to-[#8B5CF6]'} text-white min-h-[140px] flex flex-col justify-between`}>
                        {slide.bgImage && (
                          <div className="absolute inset-0 bg-cover bg-center opacity-30 z-0" style={{ backgroundImage: `url(${slide.bgImage})` }} />
                        )}
                        <div className="relative z-10 flex items-center justify-between">
                          <span className="px-2.5 py-1 rounded-full bg-white/20 text-[10px] font-black uppercase tracking-wider backdrop-blur-md">
                            {slide.badge || 'PROMO'}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${isActive ? 'bg-emerald-500 text-white' : 'bg-gray-800/80 text-gray-300'}`}>
                            {isActive ? 'Active' : 'Disabled'}
                          </span>
                        </div>
                        <div className="relative z-10 mt-3">
                          <h4 className="font-black text-lg leading-tight truncate">{slide.title}</h4>
                          <p className="text-xs text-white/90 line-clamp-2 mt-1">{slide.tagline}</p>
                        </div>
                        {slide.logoUrl && (
                          <img src={slide.logoUrl} alt="" className="absolute right-[-10px] bottom-[-10px] w-28 h-28 opacity-20 pointer-events-none object-contain" />
                        )}
                      </div>

                      {/* Controls Footer */}
                      <div className="p-4 flex items-center justify-between gap-2 border-t border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleMoveSlide(idx, 'up')}
                            disabled={idx === 0}
                            className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-muted text-gray-600 dark:text-gray-300 disabled:opacity-30"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveSlide(idx, 'down')}
                            disabled={idx === promoSlides.length - 1}
                            className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-muted text-gray-600 dark:text-gray-300 disabled:opacity-30"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => handleToggleSlideActive(slide.id)}
                            variant="outline"
                            className={`py-1 px-3 text-xs font-bold rounded-xl ${isActive ? 'border-amber-500 text-amber-500 hover:bg-amber-500/10' : 'border-emerald-500 text-emerald-500 hover:bg-emerald-500/10'}`}
                          >
                            {isActive ? 'Disable' : 'Enable'}
                          </Button>
                          <button
                            onClick={() => handleOpenEditSlide(slide)}
                            className="p-2 rounded-xl bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 font-bold text-xs flex items-center gap-1 transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button
                            onClick={() => handleDeleteSlide(slide.id)}
                            className="p-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 font-bold text-xs transition-colors"
                            title="Delete Slide"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

      </div>

      {/* Add / Edit Promo Slide Modal */}
      {isAddingSlide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`relative w-full max-w-xl rounded-3xl p-6 sm:p-8 shadow-2xl border ${isDark ? 'bg-[#1C1C1E] border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'} max-h-[90vh] overflow-y-auto`}>
            
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-black">{editingSlideId ? 'Edit Promo Banner' : 'Create New Promo Banner'}</h3>
              </div>
              <button onClick={() => setIsAddingSlide(false)} className="p-2 rounded-full hover:bg-muted text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              
              {/* Badge & Title */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1 opacity-70">Badge Text</label>
                  <input
                    type="text"
                    value={slideDraft.badge}
                    onChange={(e) => setSlideDraft(prev => ({ ...prev, badge: e.target.value }))}
                    placeholder="e.g. Mart Live, Special Offer"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-semibold outline-none focus:ring-2 focus:ring-[#7C3AED] ${isDark ? 'bg-[#2A2A2A] border-gray-700' : 'bg-gray-50 border-gray-200'}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1 opacity-70">Banner Title</label>
                  <input
                    type="text"
                    value={slideDraft.title}
                    onChange={(e) => setSlideDraft(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. CalebDeck Mart"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-semibold outline-none focus:ring-2 focus:ring-[#7C3AED] ${isDark ? 'bg-[#2A2A2A] border-gray-700' : 'bg-gray-50 border-gray-200'}`}
                  />
                </div>
              </div>

              {/* Tagline */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1 opacity-70">Tagline / Description</label>
                <textarea
                  rows={2}
                  value={slideDraft.tagline}
                  onChange={(e) => setSlideDraft(prev => ({ ...prev, tagline: e.target.value }))}
                  placeholder="e.g. Groceries and essentials delivered straight to your hostel."
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium outline-none focus:ring-2 focus:ring-[#7C3AED] ${isDark ? 'bg-[#2A2A2A] border-gray-700' : 'bg-gray-50 border-gray-200'}`}
                />
              </div>

              {/* Link & Button Text */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1 opacity-70">Target Route Link</label>
                  <input
                    type="text"
                    value={slideDraft.link}
                    onChange={(e) => setSlideDraft(prev => ({ ...prev, link: e.target.value }))}
                    placeholder="e.g. /mart, /fashion, /calebnet"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-semibold outline-none focus:ring-2 focus:ring-[#7C3AED] ${isDark ? 'bg-[#2A2A2A] border-gray-700' : 'bg-gray-50 border-gray-200'}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1 opacity-70">Button Label</label>
                  <input
                    type="text"
                    value={slideDraft.buttonText}
                    onChange={(e) => setSlideDraft(prev => ({ ...prev, buttonText: e.target.value }))}
                    placeholder="e.g. Shop Mart"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-semibold outline-none focus:ring-2 focus:ring-[#7C3AED] ${isDark ? 'bg-[#2A2A2A] border-gray-700' : 'bg-gray-50 border-gray-200'}`}
                  />
                </div>
              </div>

              {/* Gradient Preset */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2 opacity-70">Color Theme Gradient</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
                  {GRADIENT_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => setSlideDraft(prev => ({ ...prev, gradient: preset.value }))}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-all ${slideDraft.gradient === preset.value ? 'border-[#7C3AED] bg-[#7C3AED]/10 text-[#7C3AED]' : 'border-gray-200 dark:border-gray-700 hover:border-gray-400'}`}
                    >
                      <span>{preset.name}</span>
                      <div className={`w-4 h-4 rounded-full bg-gradient-to-r ${preset.value}`} />
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={slideDraft.gradient || ''}
                  onChange={(e) => setSlideDraft(prev => ({ ...prev, gradient: e.target.value }))}
                  placeholder="Or custom Tailwind gradient classes (from-... via-... to-...)"
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-mono outline-none ${isDark ? 'bg-[#2A2A2A] border-gray-700' : 'bg-gray-50 border-gray-200'}`}
                />
              </div>

              {/* Logo Asset URL */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1 opacity-70">Brand Logo / Image Overlay URL (Optional)</label>
                <input
                  type="text"
                  value={slideDraft.logoUrl || ''}
                  onChange={(e) => setSlideDraft(prev => ({ ...prev, logoUrl: e.target.value }))}
                  placeholder="e.g. /avaters/calebdeck-business-logo-transparent.png"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-semibold outline-none focus:ring-2 focus:ring-[#7C3AED] ${isDark ? 'bg-[#2A2A2A] border-gray-700' : 'bg-gray-50 border-gray-200'}`}
                />
              </div>

              {/* Live Card Preview */}
              <div className="pt-3 border-t border-gray-200 dark:border-gray-800">
                <p className="text-xs font-bold uppercase tracking-wider mb-2 opacity-70">Live Preview</p>
                <div className={`relative rounded-2xl overflow-hidden bg-gradient-to-r ${slideDraft.gradient || 'from-[#6D28D9] to-[#8B5CF6]'} text-white p-5 shadow-lg flex items-center min-h-[140px]`}>
                  <div className="relative z-10 max-w-[70%]">
                    <span className="px-2.5 py-1 rounded-full bg-white/20 text-[10px] font-bold uppercase mb-2 inline-block">
                      {slideDraft.badge || 'BADGE'}
                    </span>
                    <h4 className="text-xl font-black mb-1">{slideDraft.title || 'Title'}</h4>
                    <p className="text-xs text-white/90 mb-3 line-clamp-2">{slideDraft.tagline || 'Tagline'}</p>
                    <span className="bg-white text-gray-900 px-4 py-1.5 rounded-lg text-xs font-bold inline-block">
                      {slideDraft.buttonText || 'Button'}
                    </span>
                  </div>
                  {slideDraft.logoUrl && (
                    <img src={slideDraft.logoUrl} alt="" className="absolute right-[-10px] top-1/2 -translate-y-1/2 w-32 h-32 opacity-25 pointer-events-none object-contain" />
                  )}
                </div>
              </div>

            </div>

            <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
              <Button onClick={() => setIsAddingSlide(false)} variant="outline" className="rounded-xl px-5">
                Cancel
              </Button>
              <Button onClick={handleSaveSlideDraft} disabled={savingPromos} variant="primary" className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-xl px-6 font-bold">
                {editingSlideId ? 'Save Changes' : 'Create Banner'}
              </Button>
            </div>

          </div>
        </div>
      )}

    </AdminLayout>
  );
}
