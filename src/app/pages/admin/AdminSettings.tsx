import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { AdminLayout } from './AdminLayout';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { Badge } from '../../components/design-system/Badge';
import { Settings, ShieldAlert, Store, Pizza, Clock, Wifi, Utensils, MessageSquare, Plus, Trash2, Edit3, ArrowUp, ArrowDown, Image as ImageIcon, Sparkles, Check, X, Gift, Upload, Loader2, ChevronDown, ChevronUp, Building2, MapPin, AlertTriangle, Search } from 'lucide-react';
import { subscribeToPlatformSettings, updatePlatformSettings, subscribeToFirstOrderDiscountClaims, subscribeToAllHostels, saveHostelConfig, toggleHostelStatus, removeOrArchiveHostel, Hostel, PlatformSettings, PromoSlide, DEFAULT_PROMO_SLIDES, FirstOrderDiscountClaim, FashionDeliveryConfig } from '../../../services/db';
import {
  WEEKDAY_OPTIONS,
  DEFAULT_FOOD_OPERATING_DAYS,
  normalizeFoodOperatingDays,
  validateFoodOperatingDaysInput,
  formatFoodOperatingDays,
  getFoodDeliveryAvailability,
  WeekdayNumber,
} from '../../../services/foodSchedule';
import { HostelRuleType, slugifyHostelId, DAVID_HOSTEL_DEFAULT_MESSAGE, DAVID_HOSTEL_DEFAULT_CHECKBOX, DAVID_HOSTEL_DEFAULT_COLLECTION_INSTRUCTION, DAVID_HOSTEL_DEFAULT_PICKUP_POINT, FEMALE_HOSTEL_DEFAULT_MESSAGE, FEMALE_HOSTEL_DEFAULT_CHECKBOX } from '../../../services/hostels';
import { toast } from 'react-toastify';
import { useTheme } from '../../../context/ThemeContext';
import { FashionBatchConfig, DEFAULT_FASHION_BATCH_CONFIG } from '../../../services/fashionBatch';
import { AdminAnnouncementsCard } from './AdminAnnouncementsCard';
import { uploadMediaToCloudinary } from '../../../services/cloudinary';
import { auth } from '../../../services/firebase';

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
    instantDeliveryFee: 700,
    instantGroupDeliveryFee: 0,
    foodDeliveryFee: 0,
    foodGroupDeliveryFee: 0,
    premiumDeliveryFee: 0,
    martDeliveryFee: 0,
    fashionDeliveryFee: 0,
    fashionRatePerDelivery: 0,
    businessBasicPrice: 0,
    businessPremiumPrice: 0
  });
  const [premiumHostelsText, setPremiumHostelsText] = useState('');

  const [firstOrderDiscount, setFirstOrderDiscount] = useState({
    enabled: false,
    percentOff: 50,
    maxOrders: 1,
  });
  const [firstOrderClaimedCount, setFirstOrderClaimedCount] = useState(0);
  const [firstOrderClaims, setFirstOrderClaims] = useState<FirstOrderDiscountClaim[]>([]);
  const [savingFirstOrderDiscount, setSavingFirstOrderDiscount] = useState(false);

  // Promo Banners State
  const [promoSlides, setPromoSlides] = useState<PromoSlide[]>([]);
  const [editingSlideId, setEditingSlideId] = useState<string | null>(null);
  const [isAddingSlide, setIsAddingSlide] = useState(false);
  const [savingPromos, setSavingPromos] = useState(false);
  const [uploadingBannerImage, setUploadingBannerImage] = useState(false);
  const [bannerUploadProgress, setBannerUploadProgress] = useState(0);

  // Fashion Batch State
  const [fashionBatchConfig, setFashionBatchConfig] = useState<FashionBatchConfig>(DEFAULT_FASHION_BATCH_CONFIG);
  const [fashionDeliveryConfig, setFashionDeliveryConfig] = useState<FashionDeliveryConfig>({ nonStudentDeliveryEnabled: false, pilotEnabled: false, zones: [] });
  const [savedFashionDeliveryConfig, setSavedFashionDeliveryConfig] = useState<FashionDeliveryConfig>({ nonStudentDeliveryEnabled: false, pilotEnabled: false, zones: [] });
  const [fashionCoverageOpen, setFashionCoverageOpen] = useState(false);
  const [savingFashionDelivery, setSavingFashionDelivery] = useState(false);
  const [seedingFashionDelivery, setSeedingFashionDelivery] = useState(false);
  const [fashionDeliveryRequests, setFashionDeliveryRequests] = useState<any[]>([]);
  const [loadingFashionRequests, setLoadingFashionRequests] = useState(false);

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
  const [foodOperatingDaysDraft, setFoodOperatingDaysDraft] = useState<WeekdayNumber[]>([...DEFAULT_FOOD_OPERATING_DAYS]);
  const [savingFoodSchedule, setSavingFoodSchedule] = useState(false);

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
      setFoodOperatingDaysDraft(normalizeFoodOperatingDays(data.foodOperatingDays));
      if (data.fashionBatchConfig) setFashionBatchConfig(data.fashionBatchConfig);
      if (data.fashionDeliveryConfig) {
        setFashionDeliveryConfig(data.fashionDeliveryConfig);
        setSavedFashionDeliveryConfig(data.fashionDeliveryConfig);
      }
      
      setFees({
        instantDeliveryFee: data.instantDeliveryFee !== undefined ? Number(data.instantDeliveryFee) : 700,
        instantGroupDeliveryFee: data.instantGroupDeliveryFee !== undefined ? Number(data.instantGroupDeliveryFee) : 0,
        foodDeliveryFee: data.foodDeliveryFee || 0,
        foodGroupDeliveryFee: data.foodGroupDeliveryFee || 0,
        premiumDeliveryFee: data.premiumDeliveryFee || 0,
        martDeliveryFee: data.martDeliveryFee || 0,
        fashionDeliveryFee: data.fashionDeliveryFee || 0,
        fashionRatePerDelivery: data.fashionRatePerDelivery || 0,
        businessBasicPrice: data.businessBasicPrice || 0,
        businessPremiumPrice: data.businessPremiumPrice || 0
      });
      setPremiumHostelsText((data.premiumHostels || []).join(', '));
      setFirstOrderDiscount({
        enabled: data.firstOrderDiscountEnabled === true,
        percentOff: Number(data.firstOrderDiscountPercent) > 0 ? Number(data.firstOrderDiscountPercent) : 50,
        maxOrders: Number(data.firstOrderDiscountMaxOrders) > 0 ? Number(data.firstOrderDiscountMaxOrders) : 1,
      });
      setFirstOrderClaimedCount(Number(data.firstOrderDiscountClaimedCount) || 0);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoadingFashionRequests(true);
    (async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) return;
        const response = await fetch('/api/fashion-delivery?view=requests', { headers: { Authorization: `Bearer ${token}` } });
        const data = response.ok ? await response.json() : null;
        if (!cancelled && data?.requests) setFashionDeliveryRequests(data.requests);
      } catch { /* settings page remains usable when there are no pending requests */ }
      finally { if (!cancelled) setLoadingFashionRequests(false); }
    })();
    return () => { cancelled = true; };
  }, [platformSettings?.fashionDeliveryConfig?.seedVersion]);

  useEffect(() => {
    const unsub = subscribeToFirstOrderDiscountClaims(setFirstOrderClaims);
    return () => unsub();
  }, []);

  // Hostel Management State
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [isHostelsSectionOpen, setIsHostelsSectionOpen] = useState(true);
  const [hostelSearchQuery, setHostelSearchQuery] = useState('');
  const [hostelFilterTab, setHostelFilterTab] = useState<'ALL' | 'ACTIVE' | 'DISABLED' | 'ACK'>('ALL');
  const [isHostelModalOpen, setIsHostelModalOpen] = useState(false);
  const [editingHostelId, setEditingHostelId] = useState<string | null>(null);
  const [savingHostel, setSavingHostel] = useState(false);
  const [hostelActionId, setHostelActionId] = useState<string | null>(null);
  const [hostelDraft, setHostelDraft] = useState<{
    id: string;
    name: string;
    isActive: boolean;
    gender: 'male' | 'female' | 'mixed';
    isPremiumDelivery: boolean;
    requiresAcknowledgement: boolean;
    ruleType: HostelRuleType;
    pickupPoint: string;
    acknowledgementTitle: string;
    acknowledgementMessage: string;
    acknowledgementCheckboxLabel: string;
    collectionInstruction: string;
  }>({
    id: '',
    name: '',
    isActive: true,
    gender: 'male',
    isPremiumDelivery: false,
    requiresAcknowledgement: false,
    ruleType: 'NONE',
    pickupPoint: 'Front of your hostel/reception',
    acknowledgementTitle: '',
    acknowledgementMessage: '',
    acknowledgementCheckboxLabel: '',
    collectionInstruction: 'Standard delivery to the front of the hostel/reception.',
  });

  useEffect(() => {
    const unsubHostels = subscribeToAllHostels((list) => {
      setHostels(list);
    }, false);
    return () => unsubHostels();
  }, []);

  const syncHostelConfigsToPlatformSettings = async (updatedHostels: Hostel[]) => {
    try {
      const premiumIds = updatedHostels
        .filter(h => h.isPremiumDelivery && !h.isArchived)
        .map(h => h.id);
      const hostelConfigs = updatedHostels.map(h => ({
        id: h.id,
        name: h.name,
        isActive: h.isActive,
        isArchived: Boolean(h.isArchived),
        gender: h.gender || 'mixed',
        isPremiumDelivery: Boolean(h.isPremiumDelivery),
        requiresAcknowledgement: Boolean(h.requiresAcknowledgement),
        ruleType: h.ruleType || (h.requiresAcknowledgement ? 'CUSTOM' : 'NONE'),
        pickupPoint: h.pickupPoint || 'Front of your hostel/reception',
        acknowledgementTitle: h.acknowledgementTitle || '',
        acknowledgementMessage: h.acknowledgementMessage || '',
        acknowledgementCheckboxLabel: h.acknowledgementCheckboxLabel || '',
        collectionInstruction: h.collectionInstruction || '',
      }));
      await updatePlatformSettings({
        hostelConfigs,
        ...(premiumIds.length > 0 ? { premiumHostels: premiumIds } : {}),
      });
    } catch (syncErr) {
      console.warn('Non-blocking platform settings hostel sync warning:', syncErr);
    }
  };

  const handleOpenAddHostel = () => {
    setEditingHostelId(null);
    setHostelDraft({
      id: '',
      name: '',
      isActive: true,
      gender: 'male',
      isPremiumDelivery: false,
      requiresAcknowledgement: false,
      ruleType: 'NONE',
      pickupPoint: 'Front of your hostel/reception',
      acknowledgementTitle: '',
      acknowledgementMessage: '',
      acknowledgementCheckboxLabel: '',
      collectionInstruction: 'Standard delivery to the front of the hostel/reception.',
    });
    setIsHostelModalOpen(true);
  };

  const handleOpenEditHostel = (hostel: Hostel) => {
    setEditingHostelId(hostel.id);
    setHostelDraft({
      id: hostel.id,
      name: hostel.name,
      isActive: hostel.isActive !== false,
      gender: hostel.gender || 'male',
      isPremiumDelivery: Boolean(hostel.isPremiumDelivery),
      requiresAcknowledgement: Boolean(hostel.requiresAcknowledgement),
      ruleType: hostel.ruleType || (hostel.requiresAcknowledgement ? 'CUSTOM' : 'NONE'),
      pickupPoint: hostel.pickupPoint || 'Front of your hostel/reception',
      acknowledgementTitle: hostel.acknowledgementTitle || `${hostel.name} Collection Notice`,
      acknowledgementMessage: hostel.acknowledgementMessage || '',
      acknowledgementCheckboxLabel: hostel.acknowledgementCheckboxLabel || '',
      collectionInstruction: hostel.collectionInstruction || 'Standard delivery to the front of the hostel/reception.',
    });
    setIsHostelModalOpen(true);
  };

  const applyHostelRulePreset = (preset: HostelRuleType, currentName?: string) => {
    const label = (currentName ?? hostelDraft.name).trim() || "this hostel";
    if (preset === 'DOWNSTAIRS_COLLECTION') {
      setHostelDraft(prev => ({
        ...prev,
        requiresAcknowledgement: true,
        ruleType: 'DOWNSTAIRS_COLLECTION',
        pickupPoint: label.toLowerCase().includes('david')
          ? DAVID_HOSTEL_DEFAULT_PICKUP_POINT
          : `Downstairs at ${label} entrance`,
        acknowledgementTitle: `${label} Collection Requirement`,
        acknowledgementMessage: label.toLowerCase().includes('david')
          ? DAVID_HOSTEL_DEFAULT_MESSAGE
          : `Please note: Riders cannot enter ${label} unless they are authorized residents. If you select this hostel, you must come downstairs to collect your order. Please confirm that you understand and agree before continuing.`,
        acknowledgementCheckboxLabel: label.toLowerCase().includes('david')
          ? DAVID_HOSTEL_DEFAULT_CHECKBOX
          : `I understand that riders cannot enter ${label} and I agree to come downstairs to collect my order.`,
        collectionInstruction: label.toLowerCase().includes('david')
          ? DAVID_HOSTEL_DEFAULT_COLLECTION_INSTRUCTION
          : `Riders cannot enter ${label} unless they are authorized residents. Student must come downstairs to collect their order.`,
      }));
    } else if (preset === 'FEMALE_HOSTEL_PICKUP') {
      setHostelDraft(prev => ({
        ...prev,
        requiresAcknowledgement: true,
        ruleType: 'FEMALE_HOSTEL_PICKUP',
        gender: 'female',
        isPremiumDelivery: true,
        pickupPoint: prev.pickupPoint === 'Front of your hostel/reception' ? 'Caleb Medicals' : prev.pickupPoint,
        acknowledgementTitle: 'Female Hostel Delivery Notice',
        acknowledgementMessage: FEMALE_HOSTEL_DEFAULT_MESSAGE,
        acknowledgementCheckboxLabel: FEMALE_HOSTEL_DEFAULT_CHECKBOX,
        collectionInstruction: `Riders cannot enter ${label}. Student must meet the rider at the designated external pickup point.`,
      }));
    } else if (preset === 'CUSTOM') {
      setHostelDraft(prev => ({
        ...prev,
        requiresAcknowledgement: true,
        ruleType: 'CUSTOM',
        acknowledgementTitle: prev.acknowledgementTitle || `${label} Collection Notice`,
        acknowledgementMessage:
          prev.acknowledgementMessage ||
          `Please note: Delivery to ${label} requires student collection at ${prev.pickupPoint || 'the designated pickup point'}. Please confirm that you understand and agree before continuing.`,
        acknowledgementCheckboxLabel:
          prev.acknowledgementCheckboxLabel ||
          `I understand and agree to follow the collection instructions for ${label}.`,
        collectionInstruction:
          prev.collectionInstruction === 'Standard delivery to the front of the hostel/reception.'
            ? `Student must collect order at ${prev.pickupPoint || 'the designated pickup point'}.`
            : prev.collectionInstruction,
      }));
    } else {
      setHostelDraft(prev => ({
        ...prev,
        requiresAcknowledgement: false,
        ruleType: 'NONE',
        pickupPoint: 'Front of your hostel/reception',
        collectionInstruction: 'Standard delivery to the front of the hostel/reception.',
      }));
    }
  };

  const handleSaveHostelDraft = async () => {
    const trimmedName = hostelDraft.name.trim();
    if (!trimmedName) {
      toast.error('Please enter a hostel display name.');
      return;
    }
    const targetId = editingHostelId || hostelDraft.id.trim() || slugifyHostelId(trimmedName);
    if (!targetId) {
      toast.error('Could not generate a valid hostel ID.');
      return;
    }
    if (!editingHostelId && hostels.some(h => h.id === targetId && !h.isArchived)) {
      toast.error(`A hostel with ID "${targetId}" already exists. Edit the existing hostel or choose a distinct name.`);
      return;
    }
    if (hostelDraft.requiresAcknowledgement && !hostelDraft.acknowledgementMessage.trim()) {
      toast.error('Please enter the acknowledgement message shown to students at checkout.');
      return;
    }

    setSavingHostel(true);
    try {
      const saved = await saveHostelConfig({
        id: targetId,
        name: trimmedName,
        isActive: hostelDraft.isActive,
        gender: hostelDraft.gender,
        isPremiumDelivery: hostelDraft.isPremiumDelivery,
        requiresAcknowledgement: hostelDraft.requiresAcknowledgement,
        ruleType: hostelDraft.requiresAcknowledgement ? hostelDraft.ruleType : 'NONE',
        pickupPoint: hostelDraft.pickupPoint.trim() || 'Front of your hostel/reception',
        acknowledgementTitle: hostelDraft.acknowledgementTitle.trim() || `${trimmedName} Collection Notice`,
        acknowledgementMessage: hostelDraft.acknowledgementMessage.trim(),
        acknowledgementCheckboxLabel:
          hostelDraft.acknowledgementCheckboxLabel.trim() ||
          `I understand and agree to the collection instructions for ${trimmedName}.`,
        collectionInstruction:
          hostelDraft.collectionInstruction.trim() ||
          (hostelDraft.requiresAcknowledgement
            ? `Student must collect order at ${hostelDraft.pickupPoint.trim() || 'the designated pickup point'}.`
            : 'Standard delivery to the front of the hostel/reception.'),
      });

      const nextList = editingHostelId
        ? hostels.map(h => (h.id === saved.id ? saved : h))
        : [...hostels.filter(h => h.id !== saved.id), saved];
      setHostels(nextList);
      await syncHostelConfigsToPlatformSettings(nextList);

      toast.success(editingHostelId ? `${saved.name} updated.` : `${saved.name} added to CalebDeck.`);
      setIsHostelModalOpen(false);
    } catch (err: any) {
      console.error('Failed to save hostel configuration:', err);
      toast.error(err?.message || 'Could not save hostel configuration. Your changes are still in the form.');
    } finally {
      setSavingHostel(false);
    }
  };

  const handleToggleHostelActive = async (hostel: Hostel) => {
    const nextActive = !hostel.isActive;
    setHostelActionId(hostel.id);
    try {
      await toggleHostelStatus(hostel.id, nextActive);
      const nextList = hostels.map(h => (h.id === hostel.id ? { ...h, isActive: nextActive } : h));
      setHostels(nextList);
      await syncHostelConfigsToPlatformSettings(nextList);
      toast.success(
        nextActive
          ? `${hostel.name} is now enabled for student checkout.`
          : `${hostel.name} has been disabled for new orders. Historical orders remain intact.`
      );
    } catch (err: any) {
      console.error('Failed to toggle hostel status:', err);
      toast.error(err?.message || `Could not update status for ${hostel.name}.`);
    } finally {
      setHostelActionId(null);
    }
  };

  const handleRemoveHostel = async (hostel: Hostel) => {
    if (
      !confirm(
        `Remove "${hostel.name}" from active hostels? If this hostel has existing orders, it will be safely archived so historical orders and reports remain intact.`
      )
    ) {
      return;
    }
    setHostelActionId(hostel.id);
    try {
      const result = await removeOrArchiveHostel(hostel.id, hostel.name);
      const nextList = hostels.filter(h => h.id !== hostel.id);
      setHostels(nextList);
      await syncHostelConfigsToPlatformSettings(nextList);
      if (result.mode === 'archived') {
        toast.info(result.reason || `${hostel.name} was safely archived.`);
      } else {
        toast.success(`${hostel.name} was removed.`);
      }
    } catch (err: any) {
      console.error('Failed to remove/archive hostel:', err);
      toast.error(err?.message || `Could not remove ${hostel.name}.`);
    } finally {
      setHostelActionId(null);
    }
  };

  const isDark = adminTheme === 'dark';

  const totalHostelsCount = hostels.length;
  const activeHostelsCount = hostels.filter(h => h.isActive !== false).length;
  const disabledHostelsCount = hostels.filter(h => h.isActive === false).length;
  const ackHostelsCount = hostels.filter(h => Boolean(h.requiresAcknowledgement)).length;

  const filteredHostels = hostels.filter(hostel => {
    const q = hostelSearchQuery.trim().toLowerCase();
    const matchesSearch = !q ||
      hostel.name.toLowerCase().includes(q) ||
      hostel.id.toLowerCase().includes(q) ||
      (hostel.pickupPoint && hostel.pickupPoint.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    if (hostelFilterTab === 'ACTIVE') return hostel.isActive !== false;
    if (hostelFilterTab === 'DISABLED') return hostel.isActive === false;
    if (hostelFilterTab === 'ACK') return Boolean(hostel.requiresAcknowledgement);
    return true;
  });
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

  const handleBannerImageUpload = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please choose an image file.');
      return;
    }
    setUploadingBannerImage(true);
    setBannerUploadProgress(0);
    try {
      const result = await uploadMediaToCloudinary(file, setBannerUploadProgress, { overwrite: false });
      setSlideDraft(prev => ({ ...prev, bgImage: result.url }));
    } catch (error: any) {
      alert(error?.message || 'The banner image could not be uploaded. Please try again.');
    } finally {
      setUploadingBannerImage(false);
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

  const handleToggleOperatingDay = (day: WeekdayNumber) => {
    setFoodOperatingDaysDraft((prev) =>
      prev.includes(day)
        ? prev.filter((d) => d !== day)
        : normalizeFoodOperatingDays([...prev, day])
    );
  };

  const handleSaveFoodSchedule = async () => {
    const validation = validateFoodOperatingDaysInput(foodOperatingDaysDraft);
    if ('message' in validation) {
      toast.error(validation.message);
      return;
    }
    if (validation.days.length === 0) {
      const confirmed = confirm(
        'Warning: Disabling all 7 days will suspend Food Delivery across the entire week until you re-enable at least one day. Continue?'
      );
      if (!confirmed) return;
    }
    setSavingFoodSchedule(true);
    try {
      await updatePlatformSettings({ foodOperatingDays: validation.days });
      toast.success(`Food Delivery schedule updated: ${formatFoodOperatingDays(validation.days)}`);
    } catch (err: any) {
      console.error('Failed to update food operating days:', err);
      toast.error(err?.message || 'Failed to save Food Delivery schedule. Ensure you have admin permissions.');
    } finally {
      setSavingFoodSchedule(false);
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
      if (fees.instantDeliveryFee !== undefined) {
        const instantFee = Number(fees.instantDeliveryFee);
        if (isNaN(instantFee) || instantFee < 0 || instantFee > 20000) {
          alert('Instant Order Delivery Fee must be a valid amount between ₦0 and ₦20,000.');
          return;
        }
      }
      if (fees.instantGroupDeliveryFee !== undefined && fees.instantGroupDeliveryFee > 0) {
        const instantGroupFee = Number(fees.instantGroupDeliveryFee);
        if (isNaN(instantGroupFee) || instantGroupFee < 0 || instantGroupFee > 20000) {
          alert('Instant Group Delivery Fee must be a valid amount between ₦0 and ₦20,000.');
          return;
        }
      }
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

  const callFashionDeliveryApi = async (body: any) => {
    const token = await auth.currentUser?.getIdToken();
    const response = await fetch('/api/fashion-delivery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Fashion delivery settings could not be updated.');
    return data;
  };

  const handleSeedFashionDelivery = async () => {
    if (!confirm('Create the initial Lagos Fashion delivery coverage from the approved price list? Delivery will remain off until you enable it.')) return;
    setSeedingFashionDelivery(true);
    try {
      const data = await callFashionDeliveryApi({ action: 'seed' });
      setFashionDeliveryConfig(data.config);
      setSavedFashionDeliveryConfig(data.config);
      setFashionCoverageOpen(true);
      alert('Initial Lagos delivery coverage was added. Review it before enabling non-student delivery.');
    } catch (error: any) {
      alert(error.message || 'The initial delivery coverage could not be added.');
    } finally { setSeedingFashionDelivery(false); }
  };

  const handleSaveFashionDelivery = async () => {
    setSavingFashionDelivery(true);
    try {
      const data = await callFashionDeliveryApi({ action: 'save', config: fashionDeliveryConfig });
      setFashionDeliveryConfig(data.config);
      setSavedFashionDeliveryConfig(data.config);
      setFashionCoverageOpen(false);
      alert('Fashion delivery settings saved.');
    } catch (error: any) {
      alert(error.message || 'Fashion delivery settings could not be saved.');
    } finally { setSavingFashionDelivery(false); }
  };

  const handleConfirmFashionRequest = async (request: any) => {
    const value = window.prompt(`Confirm a delivery fee between ₦${Number(request.estimatedMinFee).toLocaleString()} and ₦${Number(request.estimatedMaxFee).toLocaleString()}.`);
    if (value === null) return;
    try {
      await callFashionDeliveryApi({ action: 'confirm-request', requestId: request.id, confirmedFee: Number(value) });
      setFashionDeliveryRequests(prev => prev.filter(item => item.id !== request.id));
      alert('The delivery fee is ready for the customer to review.');
    } catch (error: any) { alert(error.message || 'The delivery fee could not be confirmed.'); }
  };

  const updateFashionZone = (zoneIndex: number, patch: Partial<FashionDeliveryConfig['zones'][number]>) => {
    setFashionDeliveryConfig(prev => ({ ...prev, zones: prev.zones.map((zone, index) => index === zoneIndex ? { ...zone, ...patch } : zone) }));
  };

  const fashionDeliveryHasChanges = JSON.stringify(fashionDeliveryConfig) !== JSON.stringify(savedFashionDeliveryConfig);

  const handleSaveFirstOrderDiscount = async () => {
    const percentOff = Math.min(100, Math.max(1, Math.round(Number(firstOrderDiscount.percentOff) || 0)));
    const maxOrders = Math.min(1000, Math.max(1, Math.floor(Number(firstOrderDiscount.maxOrders) || 0)));
    if (!percentOff || !maxOrders) {
      alert('Enter a percent off (1–100) and how many first orders should get it (1 or more).');
      return;
    }
    if (maxOrders < firstOrderClaimedCount) {
      if (!confirm(`You've already granted this discount to ${firstOrderClaimedCount} ${firstOrderClaimedCount === 1 ? 'person' : 'people'}. Lowering the limit to ${maxOrders} will stop new claims but will not take the discount back from people who already got it. Continue?`)) {
        return;
      }
    }
    setSavingFirstOrderDiscount(true);
    try {
      await updatePlatformSettings({
        firstOrderDiscountEnabled: firstOrderDiscount.enabled,
        firstOrderDiscountPercent: percentOff,
        firstOrderDiscountMaxOrders: maxOrders,
      });
      setFirstOrderDiscount({ enabled: firstOrderDiscount.enabled, percentOff, maxOrders });
      alert('First-order discount settings saved.');
    } catch (err) {
      console.error('Failed to save first-order discount:', err);
      alert('Failed to save first-order discount settings.');
    } finally {
      setSavingFirstOrderDiscount(false);
    }
  };

  const formatClaimDate = (ts: any) => {
    if (!ts) return 'Just now';
    try {
      const date = ts.toDate ? ts.toDate() : new Date(ts);
      return date.toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch {
      return '—';
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

        <AdminAnnouncementsCard />

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

            {/* Food Delivery Availability (Operating Days in Africa/Lagos) */}
            <div className="mb-6 space-y-3 pt-4 border-t">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h4 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Food Delivery Availability</h4>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Active operating days in Africa/Lagos (WAT). Applies to instant, scheduled, and group food orders.
                  </p>
                </div>
                <Badge className={foodOperatingDaysDraft.length === 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}>
                  {foodOperatingDaysDraft.length} day{foodOperatingDaysDraft.length === 1 ? '' : 's'}/wk
                </Badge>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                {WEEKDAY_OPTIONS.map((opt) => {
                  const active = foodOperatingDaysDraft.includes(opt.day);
                  return (
                    <button
                      key={opt.day}
                      type="button"
                      onClick={() => handleToggleOperatingDay(opt.day)}
                      className={`px-2 py-2 rounded-lg text-xs font-bold border transition-all ${
                        active
                          ? 'bg-[#7C3AED] text-white border-[#7C3AED] shadow-sm'
                          : isDark
                            ? 'bg-[#2A2A2A] text-gray-300 border-[#333333] hover:border-gray-500'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      {opt.shortLabel}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setFoodOperatingDaysDraft([5, 6, 0])}
                  className={`text-xs px-2.5 py-1 rounded-md border ${isDark ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  Fri – Sun (Weekend)
                </button>
                <button
                  type="button"
                  onClick={() => setFoodOperatingDaysDraft([1, 2, 3, 4, 5])}
                  className={`text-xs px-2.5 py-1 rounded-md border ${isDark ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  Mon – Fri
                </button>
                <button
                  type="button"
                  onClick={() => setFoodOperatingDaysDraft([1, 2, 3, 4, 5, 6, 0])}
                  className={`text-xs px-2.5 py-1 rounded-md border ${isDark ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  All 7 Days
                </button>
                <button
                  type="button"
                  onClick={() => setFoodOperatingDaysDraft([])}
                  className="text-xs px-2.5 py-1 rounded-md border border-red-300 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30"
                >
                  Suspend All
                </button>
              </div>

              <div className={`p-3 rounded-lg text-xs border ${
                foodOperatingDaysDraft.length === 0
                  ? 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
                  : isDark
                    ? 'bg-[#2A2A2A] border-[#333333] text-gray-300'
                    : 'bg-gray-50 border-gray-200 text-gray-700'
              }`}>
                <p className="font-semibold">Selected schedule: {formatFoodOperatingDays(foodOperatingDaysDraft)}</p>
                <p className="opacity-80 mt-0.5">
                  Live status right now: {getFoodDeliveryAvailability({ ...platformSettings, foodOperatingDays: foodOperatingDaysDraft }).userMessage}
                </p>
              </div>

              <Button
                type="button"
                variant="primary"
                className="w-full"
                disabled={savingFoodSchedule}
                onClick={handleSaveFoodSchedule}
              >
                {savingFoodSchedule ? 'Saving Food Schedule...' : 'Save Food Delivery Availability'}
              </Button>
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
                <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Instant Order Delivery Fee (₦)</label>
                <input 
                  type="number" min="0"
                  value={fees.instantDeliveryFee ?? 700}
                  onChange={(e) => setFees({ ...fees, instantDeliveryFee: Number(e.target.value) })}
                  className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all ${
                    isDark ? 'bg-[#2A2A2A] border-[#333333] text-white' : 'bg-white border-gray-200 text-gray-900'
                  }`}
                />
                <p className={`text-[10px] mt-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                  Base fee for instant delivery orders (qualifying group orders receive the 20% group discount on this fee). Does not affect scheduled batches.
                </p>
              </div>
              <div>
                <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Food Delivery Fee (Scheduled Batch)</label>
                <input 
                  type="number" min="0"
                  value={fees.foodDeliveryFee}
                  onChange={(e) => setFees({ ...fees, foodDeliveryFee: Number(e.target.value) })}
                  className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all ${
                    isDark ? 'bg-[#2A2A2A] border-[#333333] text-white' : 'bg-white border-gray-200 text-gray-900'
                  }`}
                />
                <p className={`text-[10px] mt-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                  Applies to solo scheduled batch food orders.
                </p>
              </div>
              <div>
                <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Food Group Delivery Fee (Scheduled Batch)</label>
                <input 
                  type="number" min="0"
                  value={fees.foodGroupDeliveryFee}
                  onChange={(e) => setFees({ ...fees, foodGroupDeliveryFee: Number(e.target.value) })}
                  className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all ${
                    isDark ? 'bg-[#2A2A2A] border-[#333333] text-white' : 'bg-white border-gray-200 text-gray-900'
                  }`}
                />
                <p className={`text-[10px] mt-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                  Applies to scheduled batch group orders.
                </p>
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
                <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Business Basic Price</label>
                <input
                  type="number" min="0"
                  value={fees.businessBasicPrice}
                  onChange={(e) => setFees({ ...fees, businessBasicPrice: Number(e.target.value) })}
                  className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all ${
                    isDark ? 'bg-[#2A2A2A] border-[#333333] text-white' : 'bg-white border-gray-200 text-gray-900'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Business Premium Price</label>
                <input 
                  type="number" min="0"
                  value={fees.businessPremiumPrice}
                  onChange={(e) => setFees({ ...fees, businessPremiumPrice: Number(e.target.value) })}
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

        {/* Hostel Management Configuration */}
        <div className="mt-10" id="hostel-management">
          <Card className="p-6 md:p-8 border-l-4 border-l-indigo-500 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div className="flex items-center space-x-3">
                <div className={`p-3 rounded-2xl ${isDark ? 'bg-indigo-900/40 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className={`text-xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>Hostel Management</h2>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${isDark ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-800' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'}`}>
                      {totalHostelsCount} Hostels · {activeHostelsCount} Active
                    </span>
                  </div>
                  <p className={`text-xs sm:text-sm mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Configure pickup locations, collection acknowledgements, and delivery availability for campus halls.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <Button
                  onClick={handleOpenAddHostel}
                  variant="primary"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-2 shrink-0 text-xs sm:text-sm py-2 px-3.5"
                >
                  <Plus className="w-4 h-4" /> Add Hostel
                </Button>
                <button
                  type="button"
                  onClick={() => setIsHostelsSectionOpen(prev => !prev)}
                  className={`p-2.5 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition-all ${
                    isDark 
                      ? 'border-gray-700 hover:border-indigo-500 bg-[#222222] text-gray-200' 
                      : 'border-gray-200 hover:border-indigo-500 bg-gray-50 text-gray-700'
                  }`}
                  aria-expanded={isHostelsSectionOpen}
                  title={isHostelsSectionOpen ? "Collapse Hostel List" : "Expand Hostel List"}
                >
                  <span className="hidden xs:inline">{isHostelsSectionOpen ? 'Collapse' : 'Expand'}</span>
                  {isHostelsSectionOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {isHostelsSectionOpen && (
              <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                {/* Search & Filter Toolbar */}
                <div className="my-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      value={hostelSearchQuery}
                      onChange={(e) => setHostelSearchQuery(e.target.value)}
                      placeholder="Search by hostel name, ID, or pickup point..."
                      className={`w-full pl-9 pr-9 py-2 text-xs font-medium rounded-xl border outline-none transition-all focus:ring-2 focus:ring-indigo-500 ${
                        isDark ? 'bg-[#1E1E1E] border-gray-700 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
                      }`}
                    />
                    {hostelSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setHostelSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400"
                        title="Clear search"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Filter chips */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setHostelFilterTab('ALL')}
                      className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                        hostelFilterTab === 'ALL'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : isDark ? 'bg-gray-800 text-gray-400 hover:text-white' : 'bg-gray-100 text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      All ({totalHostelsCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setHostelFilterTab('ACTIVE')}
                      className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                        hostelFilterTab === 'ACTIVE'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : isDark ? 'bg-gray-800 text-gray-400 hover:text-white' : 'bg-gray-100 text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Active ({activeHostelsCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setHostelFilterTab('DISABLED')}
                      className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                        hostelFilterTab === 'DISABLED'
                          ? 'bg-amber-600 text-white shadow-sm'
                          : isDark ? 'bg-gray-800 text-gray-400 hover:text-white' : 'bg-gray-100 text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Disabled ({disabledHostelsCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setHostelFilterTab('ACK')}
                      className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                        hostelFilterTab === 'ACK'
                          ? 'bg-purple-600 text-white shadow-sm'
                          : isDark ? 'bg-gray-800 text-gray-400 hover:text-white' : 'bg-gray-100 text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Rules ({ackHostelsCount})
                    </button>
                  </div>
                </div>

                {/* Scrollable Fixed Container */}
                <div className={`rounded-2xl border p-2 sm:p-3 max-h-[460px] md:max-h-[560px] overflow-y-auto overscroll-contain transition-all ${
                  isDark ? 'bg-[#151515] border-gray-800/80' : 'bg-gray-50/70 border-gray-200/80'
                }`}>
                  {filteredHostels.length === 0 ? (
                    <div className="py-12 px-4 text-center">
                      <Building2 className="w-10 h-10 mx-auto mb-2 text-gray-400 opacity-60" />
                      <p className={`font-bold text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        {hostels.length === 0 ? 'No hostels added yet' : 'No matching hostels found'}
                      </p>
                      <p className={`text-xs mt-1 max-w-sm mx-auto ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                        {hostelSearchQuery ? `No hostels match "${hostelSearchQuery}". Try clearing your search query or switching filters.` : 'Click "Add Hostel" above to create your first campus delivery location.'}
                      </p>
                      {hostelSearchQuery && (
                        <button
                          type="button"
                          onClick={() => { setHostelSearchQuery(''); setHostelFilterTab('ALL'); }}
                          className="mt-3 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600/10 text-indigo-600 hover:bg-indigo-600/20"
                        >
                          Reset Filters
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {filteredHostels.map((hostel) => {
                        const isActive = hostel.isActive !== false;
                        const isBusy = hostelActionId === hostel.id;
                        return (
                          <div
                            key={hostel.id}
                            className={`rounded-xl border p-4 flex flex-col justify-between transition-all ${
                              isDark
                                ? isActive
                                  ? 'bg-[#1E1E1E] border-gray-800 hover:border-gray-700'
                                  : 'bg-[#171717] border-gray-800/60 opacity-75'
                                : isActive
                                ? 'bg-white border-gray-200 shadow-xs hover:border-gray-300'
                                : 'bg-gray-50 border-gray-200 opacity-75'
                            }`}
                          >
                            <div>
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className={`text-base font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                      {hostel.name}
                                    </h3>
                                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md border ${isDark ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-gray-100 border-gray-200 text-gray-600'}`}>
                                      ID: {hostel.id}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <Badge className={isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}>
                                    {isActive ? 'Active' : 'Disabled'}
                                  </Badge>
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-1.5 mb-3">
                                {hostel.requiresAcknowledgement ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                    <AlertTriangle className="w-3 h-3" />
                                    Acknowledgement Required
                                  </span>
                                ) : (
                                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
                                    Standard Checkout
                                  </span>
                                )}
                                {hostel.isPremiumDelivery && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                                    Premium Food Rate
                                  </span>
                                )}
                              </div>

                              <div className={`rounded-xl p-3 text-xs space-y-1.5 mb-4 border ${isDark ? 'bg-[#141414] border-gray-800 text-gray-300' : 'bg-gray-50 border-gray-100 text-gray-700'}`}>
                                <div className="flex items-start gap-2">
                                  <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                                  <span>
                                    <strong className="font-bold">Pickup Point:</strong>{' '}
                                    {hostel.pickupPoint || 'Front of your hostel/reception'}
                                  </span>
                                </div>
                                {hostel.requiresAcknowledgement && hostel.acknowledgementMessage && (
                                  <p className={`text-[11px] leading-relaxed pl-5 ${isDark ? 'text-amber-300/90' : 'text-amber-800'}`}>
                                    "{hostel.acknowledgementMessage}"
                                  </p>
                                )}
                                {hostel.collectionInstruction && (
                                  <p className={`text-[11px] leading-relaxed pl-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                    <strong className="font-semibold">Rider/Tracker Note:</strong> {hostel.collectionInstruction}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                              <Button
                                type="button"
                                variant="outline"
                                disabled={isBusy}
                                onClick={() => handleToggleHostelActive(hostel)}
                                className={`py-1.5 px-3 text-xs font-bold rounded-xl ${
                                  isActive
                                    ? 'border-amber-500 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10'
                                    : 'border-emerald-500 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
                                }`}
                              >
                                {isBusy ? 'Updating...' : isActive ? 'Disable' : 'Enable'}
                              </Button>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleOpenEditHostel(hostel)}
                                  className="px-3 py-1.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 font-bold text-xs flex items-center gap-1.5 transition-colors"
                                >
                                  <Edit3 className="w-3.5 h-3.5" /> Edit Rules
                                </button>
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleRemoveHostel(hostel)}
                                  className="p-1.5 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 font-bold text-xs transition-colors"
                                  title="Remove or Archive Hostel"
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
                </div>

                {/* Scroll Indicator Footer */}
                {filteredHostels.length > 2 && (
                  <div className="mt-2.5 flex items-center justify-between text-[11px] text-gray-400 dark:text-gray-500 px-1">
                    <span>Showing {filteredHostels.length} of {hostels.length} hostels</span>
                    <span>Scroll inside box to view all</span>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Fashion Delivery Settings */}
        <div className="mt-10">
          <Card className="p-6 md:p-8 border-l-4 border-l-orange-500 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
              <div>
                <h2 className={`text-xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>Fashion Delivery Coverage</h2>
                <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Manage Lagos areas and delivery fees for customers outside campus.</p>
              </div>
              <Badge className={fashionDeliveryConfig.nonStudentDeliveryEnabled && fashionDeliveryConfig.pilotEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}>
                {fashionDeliveryConfig.nonStudentDeliveryEnabled && fashionDeliveryConfig.pilotEnabled ? 'Lagos delivery active' : 'Lagos delivery off'}
              </Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <label className={`flex items-center gap-3 rounded-xl border p-4 text-sm font-bold ${isDark ? 'border-gray-700 text-white' : 'border-gray-200 text-gray-800'}`}>
                <input type="checkbox" checked={fashionDeliveryConfig.nonStudentDeliveryEnabled} onChange={(e) => setFashionDeliveryConfig(prev => ({ ...prev, nonStudentDeliveryEnabled: e.target.checked }))} />
                Allow non-student Fashion delivery
              </label>
              <label className={`flex items-center gap-3 rounded-xl border p-4 text-sm font-bold ${isDark ? 'border-gray-700 text-white' : 'border-gray-200 text-gray-800'}`}>
                <input type="checkbox" checked={fashionDeliveryConfig.pilotEnabled} onChange={(e) => setFashionDeliveryConfig(prev => ({ ...prev, pilotEnabled: e.target.checked }))} />
                Make Lagos delivery available to customers
              </label>
            </div>
            {!fashionDeliveryConfig.seedVersion && (
              <Button variant="outline" onClick={handleSeedFashionDelivery} disabled={seedingFashionDelivery} className="mb-6">
                {seedingFashionDelivery ? 'Adding initial coverage...' : 'Seed Initial Lagos Delivery Zones'}
              </Button>
            )}
            {(loadingFashionRequests || fashionDeliveryRequests.length > 0) && <div className={`mb-6 rounded-2xl border p-4 ${isDark ? 'border-amber-800 bg-amber-900/10' : 'border-amber-200 bg-amber-50'}`}>
              <h3 className="font-black text-sm mb-3">Delivery fee requests awaiting review</h3>
              {loadingFashionRequests ? <p className="text-sm text-muted-foreground">Loading requests...</p> : fashionDeliveryRequests.map(request => <div key={request.id} className="flex flex-col gap-2 border-t border-amber-200/60 py-3 text-sm lg:flex-row lg:items-center lg:justify-between"><div><p className="font-bold">{request.customerName} · {request.city}</p><p className="text-xs text-muted-foreground">{request.areaName} · ₦{Number(request.estimatedMinFee).toLocaleString()}–₦{Number(request.estimatedMaxFee).toLocaleString()}</p><p className="text-xs text-muted-foreground break-words">{request.streetAddress}</p></div><Button size="sm" variant="outline" onClick={() => handleConfirmFashionRequest(request)}>Confirm fee</Button></div>)}
            </div>}
            <div className={`rounded-2xl border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <button type="button" onClick={() => setFashionCoverageOpen(open => !open)} className={`flex w-full items-center justify-between gap-4 px-4 py-4 text-left ${isDark ? 'text-white' : 'text-gray-900'}`} aria-expanded={fashionCoverageOpen}>
                <span>
                  <span className="block font-black">Lagos locations and fees</span>
                  <span className="mt-1 block text-xs font-medium text-muted-foreground">{fashionDeliveryConfig.zones.length} coverage zones configured</span>
                </span>
                <ChevronDown className={`h-5 w-5 transition-transform ${fashionCoverageOpen ? 'rotate-180' : ''}`} />
              </button>
            {fashionCoverageOpen && <div className="space-y-4 border-t border-inherit p-4 max-h-[620px] overflow-y-auto">
              {fashionDeliveryConfig.zones.map((zone, zoneIndex) => (
                <div key={zone.id} className={`rounded-2xl border p-4 ${isDark ? 'border-gray-700 bg-[#1A1A1A]' : 'border-gray-200 bg-gray-50'}`}>
                  <div className="flex flex-col sm:flex-row gap-3 sm:items-center mb-3">
                    <input value={zone.name} onChange={(e) => updateFashionZone(zoneIndex, { name: e.target.value })} className={`flex-1 rounded-lg border px-3 py-2 text-sm font-bold ${isDark ? 'bg-[#2A2A2A] border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'}`} />
                    <label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={zone.enabled} onChange={(e) => updateFashionZone(zoneIndex, { enabled: e.target.checked })} /> Available</label>
                  </div>
                  <div className="space-y-2">
                    {zone.areas.map((deliveryArea, areaIndex) => (
                      <div key={deliveryArea.id} className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_110px_110px_110px_auto] gap-2 items-center">
                        <input value={deliveryArea.name} onChange={(e) => setFashionDeliveryConfig(prev => ({ ...prev, zones: prev.zones.map((z, zi) => zi !== zoneIndex ? z : { ...z, areas: z.areas.map((a, ai) => ai === areaIndex ? { ...a, name: e.target.value } : a) }) }))} className={`min-w-0 rounded-lg border px-3 py-2 text-xs ${isDark ? 'bg-[#2A2A2A] border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'}`} />
                        <select value={deliveryArea.pricingMode} onChange={(e) => setFashionDeliveryConfig(prev => ({ ...prev, zones: prev.zones.map((z, zi) => zi !== zoneIndex ? z : { ...z, areas: z.areas.map((a, ai) => ai === areaIndex ? { ...a, pricingMode: e.target.value as 'FIXED' | 'RANGE' } : a) }) }))} className={`rounded-lg border px-2 py-2 text-xs ${isDark ? 'bg-[#2A2A2A] border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'}`}><option value="FIXED">Fixed fee</option><option value="RANGE">Fee range</option></select>
                        {deliveryArea.pricingMode === 'FIXED' ? <input type="number" min="1" value={deliveryArea.fixedFee || ''} onChange={(e) => setFashionDeliveryConfig(prev => ({ ...prev, zones: prev.zones.map((z, zi) => zi !== zoneIndex ? z : { ...z, areas: z.areas.map((a, ai) => ai === areaIndex ? { ...a, fixedFee: Number(e.target.value) } : a) }) }))} placeholder="Fee" className={`rounded-lg border px-3 py-2 text-xs ${isDark ? 'bg-[#2A2A2A] border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'}`} /> : <input type="number" min="1" value={deliveryArea.minFee || ''} onChange={(e) => setFashionDeliveryConfig(prev => ({ ...prev, zones: prev.zones.map((z, zi) => zi !== zoneIndex ? z : { ...z, areas: z.areas.map((a, ai) => ai === areaIndex ? { ...a, minFee: Number(e.target.value) } : a) }) }))} placeholder="Min" className={`rounded-lg border px-3 py-2 text-xs ${isDark ? 'bg-[#2A2A2A] border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'}`} />}
                        {deliveryArea.pricingMode === 'RANGE' ? <input type="number" min="1" value={deliveryArea.maxFee || ''} onChange={(e) => setFashionDeliveryConfig(prev => ({ ...prev, zones: prev.zones.map((z, zi) => zi !== zoneIndex ? z : { ...z, areas: z.areas.map((a, ai) => ai === areaIndex ? { ...a, maxFee: Number(e.target.value) } : a) }) }))} placeholder="Max" className={`rounded-lg border px-3 py-2 text-xs ${isDark ? 'bg-[#2A2A2A] border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'}`} /> : <span className="hidden lg:block" />}
                        <label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={deliveryArea.enabled} onChange={(e) => setFashionDeliveryConfig(prev => ({ ...prev, zones: prev.zones.map((z, zi) => zi !== zoneIndex ? z : { ...z, areas: z.areas.map((a, ai) => ai === areaIndex ? { ...a, enabled: e.target.checked } : a) }) }))} /> On</label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {fashionDeliveryConfig.zones.length === 0 && <p className="text-sm text-muted-foreground">Seed the approved list to begin managing delivery coverage.</p>}
            </div>
            }
            </div>
            {fashionDeliveryConfig.zones.length > 0 && <Button variant="primary" onClick={handleSaveFashionDelivery} disabled={savingFashionDelivery || !fashionDeliveryHasChanges} className={`w-full mt-6 ${fashionDeliveryHasChanges ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-muted text-muted-foreground'}`}>{savingFashionDelivery ? 'Saving delivery settings...' : fashionDeliveryHasChanges ? 'Save Fashion Delivery Settings' : 'Fashion Delivery Settings Saved'}</Button>}
          </Card>
        </div>

        {/* First Order Discount */}
        <div className="mt-10">
          <Card className="p-6 md:p-8 border-l-4 border-l-amber-500 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
              <div className="flex items-center space-x-3">
                <div className={`p-3 rounded-2xl ${isDark ? 'bg-amber-900/40 text-amber-400' : 'bg-amber-100 text-amber-600'}`}>
                  <Gift className="w-6 h-6" />
                </div>
                <div>
                  <h2 className={`text-xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>First Order Discount</h2>
                  <p className={`text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Percent off delivery for the first ICA (i-CON) students who order food on CalebDeck. Change the percent and how many people qualify anytime.
                  </p>
                </div>
              </div>
              <Badge className={firstOrderDiscount.enabled ? 'bg-emerald-100 text-emerald-700' : isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}>
                {firstOrderDiscount.enabled ? 'Active' : 'Off'}
              </Badge>
            </div>

            <div className={`mb-6 rounded-2xl border px-4 py-3 ${isDark ? 'border-gray-800 bg-[#1A1A1A]' : 'border-gray-100 bg-gray-50'}`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {firstOrderClaimedCount} of {firstOrderDiscount.maxOrders} claimed
                  </p>
                  <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {Math.max(0, firstOrderDiscount.maxOrders - firstOrderClaimedCount)} slot{Math.max(0, firstOrderDiscount.maxOrders - firstOrderClaimedCount) === 1 ? '' : 's'} remaining. Only signed-in ICA accounts qualify, once per person.
                  </p>
                </div>
                <div className={`h-2 w-28 rounded-full overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}>
                  <div
                    className="h-full bg-amber-500"
                    style={{ width: `${Math.min(100, firstOrderDiscount.maxOrders > 0 ? (firstOrderClaimedCount / firstOrderDiscount.maxOrders) * 100 : 0)}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div>
                <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Enable discount</label>
                <button
                  type="button"
                  onClick={() => setFirstOrderDiscount(prev => ({ ...prev, enabled: !prev.enabled }))}
                  className={`w-full px-3 py-2 rounded-lg border font-bold text-sm transition-all ${
                    firstOrderDiscount.enabled
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600'
                      : isDark
                        ? 'bg-[#2A2A2A] border-[#333333] text-gray-300'
                        : 'bg-white border-gray-200 text-gray-700'
                  }`}
                >
                  {firstOrderDiscount.enabled ? 'On — students can receive it' : 'Off — no launch discount'}
                </button>
              </div>
              <div>
                <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Percent off delivery fee</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={firstOrderDiscount.percentOff}
                  onChange={(e) => setFirstOrderDiscount(prev => ({ ...prev, percentOff: Number(e.target.value) }))}
                  className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all ${
                    isDark ? 'bg-[#2A2A2A] border-[#333333] text-white' : 'bg-white border-gray-200 text-gray-900'
                  }`}
                />
                <p className={`text-[11px] mt-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Applied after food, takeaway, and group delivery are calculated.</p>
              </div>
              <div>
                <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>How many first orders</label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={firstOrderDiscount.maxOrders}
                  onChange={(e) => setFirstOrderDiscount(prev => ({ ...prev, maxOrders: Number(e.target.value) }))}
                  className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all ${
                    isDark ? 'bg-[#2A2A2A] border-[#333333] text-white' : 'bg-white border-gray-200 text-gray-900'
                  }`}
                />
                <p className={`text-[11px] mt-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>1 = first person only. Raise this later to the first 3, 4, or more without a code change.</p>
              </div>
            </div>

            <Button
              variant="primary"
              className="w-full bg-amber-500 hover:bg-amber-600 text-white mb-8"
              onClick={handleSaveFirstOrderDiscount}
              disabled={savingFirstOrderDiscount}
            >
              {savingFirstOrderDiscount ? 'Saving...' : 'Save First Order Discount'}
            </Button>

            <div>
              <h3 className={`text-sm font-black uppercase tracking-widest mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Who received it</h3>
              {firstOrderClaims.length === 0 ? (
                <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                  Nobody has claimed this discount yet. The first eligible ICA student to pay for a food order will show up here.
                </p>
              ) : (
                <div className={`overflow-x-auto rounded-xl border ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
                  <table className="w-full text-sm">
                    <thead className={isDark ? 'bg-[#1A1A1A] text-gray-400' : 'bg-gray-50 text-gray-500'}>
                      <tr>
                        <th className="text-left font-bold px-3 py-2">#</th>
                        <th className="text-left font-bold px-3 py-2">Student</th>
                        <th className="text-left font-bold px-3 py-2">Order</th>
                        <th className="text-left font-bold px-3 py-2">Saved</th>
                        <th className="text-left font-bold px-3 py-2">When</th>
                      </tr>
                    </thead>
                    <tbody>
                      {firstOrderClaims.map((claim) => (
                        <tr key={claim.id} className={isDark ? 'border-t border-gray-800' : 'border-t border-gray-100'}>
                          <td className={`px-3 py-2 font-black ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>{claim.slotNumber}</td>
                          <td className={`px-3 py-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            <div className="font-bold">{claim.studentName || 'Student'}</div>
                            <div className={`text-[11px] ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{claim.email || claim.userId}</div>
                          </td>
                          <td className={`px-3 py-2 font-mono text-xs ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{claim.orderId}</td>
                          <td className="px-3 py-2 font-bold text-emerald-600">
                            -₦{(claim.amount || 0).toLocaleString()} ({claim.percentOff}%)
                          </td>
                          <td className={`px-3 py-2 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{formatClaimDate(claim.claimedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
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

              {/* Destination & Button Text */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1 opacity-70">Banner Destination</label>
                  <select
                    value={slideDraft.destination || 'CUSTOM'}
                    onChange={(e) => {
                      const destination = e.target.value as PromoSlide['destination'];
                      const links: Record<string, string> = {
                        FOOD: '/cafeteria', MART: '/mart', FASHION: '/fashion', CALEBNET: '/calebnet',
                        CAMPUS_BRAND: '/#campus-brand-section'
                      };
                      setSlideDraft(prev => ({ ...prev, destination, link: links[destination || ''] || prev.link }));
                    }}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-semibold outline-none focus:ring-2 focus:ring-[#7C3AED] ${isDark ? 'bg-[#2A2A2A] border-gray-700' : 'bg-gray-50 border-gray-200'}`}
                  >
                    <option value="FOOD">Food and cafeterias</option>
                    <option value="MART">CalebDeck Mart</option>
                    <option value="FASHION">CalebDeck Fashion</option>
                    <option value="CALEBNET">CalebNet</option>
                    <option value="CAMPUS_BRAND">Campus Brand section</option>
                    <option value="CUSTOM">Custom link</option>
                  </select>
                  {(slideDraft.destination || 'CUSTOM') === 'CUSTOM' && (
                    <input
                      type="text"
                      value={slideDraft.link}
                      onChange={(e) => setSlideDraft(prev => ({ ...prev, link: e.target.value }))}
                      placeholder="e.g. /mart or https://..."
                      className={`mt-2 w-full px-3.5 py-2.5 rounded-xl border text-sm font-semibold outline-none focus:ring-2 focus:ring-[#7C3AED] ${isDark ? 'bg-[#2A2A2A] border-gray-700' : 'bg-gray-50 border-gray-200'}`}
                    />
                  )}
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

              {/* Banner image */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2 opacity-70">Banner Image</label>
                <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-3">
                  {slideDraft.bgImage ? (
                    <div className="relative overflow-hidden rounded-xl bg-muted">
                      <img src={slideDraft.bgImage} alt="Banner preview" className="h-32 w-full object-cover" />
                      <button type="button" onClick={() => setSlideDraft(prev => ({ ...prev, bgImage: undefined }))} className="absolute right-2 top-2 rounded-lg bg-black/70 p-2 text-white" aria-label="Remove banner image">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <p className="py-4 text-center text-sm text-muted-foreground">No banner image selected</p>
                  )}
                  <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-bold hover:bg-muted">
                    {uploadingBannerImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {uploadingBannerImage ? `Uploading ${bannerUploadProgress}%` : slideDraft.bgImage ? 'Replace image' : 'Choose image'}
                    <input type="file" accept="image/*" className="hidden" disabled={uploadingBannerImage} onChange={(e) => void handleBannerImageUpload(e.target.files?.[0])} />
                  </label>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">Images are stored securely and remain available after deployment.</p>
              </div>

              {/* Optional legacy logo overlay */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1 opacity-70">Brand Logo URL (Optional)</label>
                <input
                  type="text"
                  value={slideDraft.logoUrl || ''}
                  onChange={(e) => setSlideDraft(prev => ({ ...prev, logoUrl: e.target.value }))}
                  placeholder="Optional legacy logo path"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-semibold outline-none focus:ring-2 focus:ring-[#7C3AED] ${isDark ? 'bg-[#2A2A2A] border-gray-700' : 'bg-gray-50 border-gray-200'}`}
                />
              </div>

              {/* Live Card Preview */}
              <div className="pt-3 border-t border-gray-200 dark:border-gray-800">
                <p className="text-xs font-bold uppercase tracking-wider mb-2 opacity-70">Live Preview</p>
                  <div className={`relative rounded-2xl overflow-hidden bg-gradient-to-r ${slideDraft.gradient || 'from-[#6D28D9] to-[#8B5CF6]'} text-white p-5 shadow-lg flex items-center min-h-[140px]`}>
                  {slideDraft.bgImage && <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: `url(${slideDraft.bgImage})` }} />}
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

      {/* Add / Edit Hostel Configuration Modal */}
      {isHostelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`relative w-full max-w-2xl rounded-3xl p-6 sm:p-8 shadow-2xl border ${isDark ? 'bg-[#1C1C1E] border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'} max-h-[90vh] overflow-y-auto`}>
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-black">{editingHostelId ? `Edit ${hostelDraft.name || 'Hostel'}` : 'Add Campus Hostel'}</h3>
                  <p className="text-xs opacity-70 mt-0.5">Configure checkout display, pickup point, and student acknowledgement rules.</p>
                </div>
              </div>
              <button type="button" onClick={() => setIsHostelModalOpen(false)} className="p-2 rounded-full hover:bg-muted text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5">
              {/* Name & Stable ID */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1 opacity-70">Display Name *</label>
                  <input
                    type="text"
                    value={hostelDraft.name}
                    onChange={(e) => {
                      const nextName = e.target.value;
                      setHostelDraft(prev => ({
                        ...prev,
                        name: nextName,
                        id: editingHostelId ? prev.id : slugifyHostelId(nextName),
                      }));
                    }}
                    placeholder="e.g. David's Hostel, Daniel Hall"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-[#2A2A2A] border-gray-700' : 'bg-gray-50 border-gray-200'}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1 opacity-70">
                    Stable Hostel ID {editingHostelId ? '(Locked)' : '(Auto-generated)'}
                  </label>
                  <input
                    type="text"
                    value={hostelDraft.id || slugifyHostelId(hostelDraft.name)}
                    disabled={Boolean(editingHostelId)}
                    onChange={(e) => setHostelDraft(prev => ({ ...prev, id: slugifyHostelId(e.target.value) }))}
                    placeholder="e.g. david"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono outline-none ${
                      editingHostelId ? 'opacity-60 cursor-not-allowed' : ''
                    } ${isDark ? 'bg-[#2A2A2A] border-gray-700' : 'bg-gray-50 border-gray-200'}`}
                  />
                </div>
              </div>

              {/* Status, Gender & Premium Delivery */}
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1 opacity-70">Checkout Status</label>
                  <button
                    type="button"
                    onClick={() => setHostelDraft(prev => ({ ...prev, isActive: !prev.isActive }))}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-bold transition-all ${
                      hostelDraft.isActive
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : isDark
                        ? 'bg-[#2A2A2A] border-gray-700 text-gray-400'
                        : 'bg-gray-100 border-gray-200 text-gray-600'
                    }`}
                  >
                    {hostelDraft.isActive ? 'Enabled (Visible)' : 'Disabled (Hidden)'}
                  </button>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1 opacity-70">Hostel Category</label>
                  <select
                    value={hostelDraft.gender}
                    onChange={(e) => setHostelDraft(prev => ({ ...prev, gender: e.target.value as 'male' | 'female' | 'mixed' }))}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-semibold outline-none ${isDark ? 'bg-[#2A2A2A] border-gray-700' : 'bg-gray-50 border-gray-200'}`}
                  >
                    <option value="male">Male Hostel</option>
                    <option value="female">Female Hostel</option>
                    <option value="mixed">General / Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1 opacity-70">Food Delivery Rate</label>
                  <button
                    type="button"
                    onClick={() => setHostelDraft(prev => ({ ...prev, isPremiumDelivery: !prev.isPremiumDelivery }))}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-bold transition-all ${
                      hostelDraft.isPremiumDelivery
                        ? 'border-purple-500 bg-purple-500/10 text-purple-600 dark:text-purple-400'
                        : isDark
                        ? 'bg-[#2A2A2A] border-gray-700 text-gray-300'
                        : 'bg-gray-50 border-gray-200 text-gray-700'
                    }`}
                  >
                    {hostelDraft.isPremiumDelivery ? 'Premium Rate' : 'Standard Rate'}
                  </button>
                </div>
              </div>

              {/* Pickup Point */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1 opacity-70">
                  Designated Pickup / Collection Point *
                </label>
                <input
                  type="text"
                  value={hostelDraft.pickupPoint}
                  onChange={(e) => setHostelDraft(prev => ({ ...prev, pickupPoint: e.target.value }))}
                  placeholder="e.g. Downstairs at David's Hostel entrance, Front of Mass Comm Building, Caleb Medicals"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-[#2A2A2A] border-gray-700' : 'bg-gray-50 border-gray-200'}`}
                />
                <p className="text-[11px] opacity-60 mt-1">
                  Displayed to students in the Order Tracker and to riders on delivery manifests.
                </p>
              </div>

              {/* Mandatory Checkout Acknowledgement Toggle & Rule Presets */}
              <div className={`rounded-2xl border p-4 space-y-4 ${isDark ? 'bg-[#151517] border-gray-800' : 'bg-gray-50/80 border-gray-200'}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-sm flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      Mandatory Checkout Acknowledgement
                    </h4>
                    <p className="text-xs opacity-70 mt-0.5">
                      Require students to read and accept a collection restriction before placing an order for this hostel.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const nextReq = !hostelDraft.requiresAcknowledgement;
                      if (nextReq) {
                        applyHostelRulePreset(
                          hostelDraft.name.toLowerCase().includes('david')
                            ? 'DOWNSTAIRS_COLLECTION'
                            : hostelDraft.gender === 'female'
                            ? 'FEMALE_HOSTEL_PICKUP'
                            : 'DOWNSTAIRS_COLLECTION'
                        );
                      } else {
                        applyHostelRulePreset('NONE');
                      }
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider shrink-0 transition-all ${
                      hostelDraft.requiresAcknowledgement
                        ? 'bg-amber-500 text-white shadow-sm'
                        : isDark
                        ? 'bg-gray-800 text-gray-400'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {hostelDraft.requiresAcknowledgement ? 'Required' : 'Not Required'}
                  </button>
                </div>

                {hostelDraft.requiresAcknowledgement && (
                  <div className="space-y-4 pt-3 border-t border-gray-200 dark:border-gray-800">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider mb-2 opacity-70">
                        Quick Restriction Template
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => applyHostelRulePreset('DOWNSTAIRS_COLLECTION')}
                          className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all ${
                            hostelDraft.ruleType === 'DOWNSTAIRS_COLLECTION'
                              ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                              : 'border-gray-200 dark:border-gray-700 opacity-75 hover:opacity-100'
                          }`}
                        >
                          Downstairs Collection (David's Hostel)
                        </button>
                        <button
                          type="button"
                          onClick={() => applyHostelRulePreset('FEMALE_HOSTEL_PICKUP')}
                          className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all ${
                            hostelDraft.ruleType === 'FEMALE_HOSTEL_PICKUP'
                              ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                              : 'border-gray-200 dark:border-gray-700 opacity-75 hover:opacity-100'
                          }`}
                        >
                          External Pickup Point (Girls' Hostel)
                        </button>
                        <button
                          type="button"
                          onClick={() => applyHostelRulePreset('CUSTOM')}
                          className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all ${
                            hostelDraft.ruleType === 'CUSTOM'
                              ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                              : 'border-gray-200 dark:border-gray-700 opacity-75 hover:opacity-100'
                          }`}
                        >
                          Custom Restriction Rule
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider mb-1 opacity-70">
                        Notice Title
                      </label>
                      <input
                        type="text"
                        value={hostelDraft.acknowledgementTitle}
                        onChange={(e) => setHostelDraft(prev => ({ ...prev, acknowledgementTitle: e.target.value }))}
                        placeholder="e.g. David's Hostel Collection Requirement"
                        className={`w-full px-3.5 py-2 rounded-xl border text-sm font-semibold outline-none ${isDark ? 'bg-[#2A2A2A] border-gray-700' : 'bg-white border-gray-200'}`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider mb-1 opacity-70">
                        Checkout Restriction Message *
                      </label>
                      <textarea
                        rows={3}
                        value={hostelDraft.acknowledgementMessage}
                        onChange={(e) => setHostelDraft(prev => ({ ...prev, acknowledgementMessage: e.target.value }))}
                        placeholder="Explain clearly why the restriction applies and how the student must collect their order."
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none ${isDark ? 'bg-[#2A2A2A] border-gray-700' : 'bg-white border-gray-200'}`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider mb-1 opacity-70">
                        Student Confirmation Checkbox Label *
                      </label>
                      <input
                        type="text"
                        value={hostelDraft.acknowledgementCheckboxLabel}
                        onChange={(e) => setHostelDraft(prev => ({ ...prev, acknowledgementCheckboxLabel: e.target.value }))}
                        placeholder="e.g. I understand that riders cannot enter David's Hostel and I agree to come downstairs to collect my order."
                        className={`w-full px-3.5 py-2 rounded-xl border text-sm font-semibold outline-none ${isDark ? 'bg-[#2A2A2A] border-gray-700' : 'bg-white border-gray-200'}`}
                      />
                    </div>

                    {/* Live Checkout Preview */}
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">
                        Student Checkout Preview
                      </p>
                      <p className="text-sm font-bold text-amber-700 dark:text-amber-400">
                        {hostelDraft.acknowledgementTitle || `${hostelDraft.name || 'Hostel'} Collection Notice`}
                      </p>
                      <p className="text-xs text-amber-700/90 dark:text-amber-300/90 leading-relaxed">
                        {hostelDraft.acknowledgementMessage}
                      </p>
                      <div className="flex items-start gap-2.5 pt-1">
                        <input type="checkbox" checked readOnly className="mt-0.5 w-4 h-4 accent-amber-600 rounded" />
                        <span className="text-xs font-semibold text-amber-800 dark:text-amber-200">
                          {hostelDraft.acknowledgementCheckboxLabel}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1 opacity-70">
                    Order Tracker / Rider / PDF Manifest Collection Instruction
                  </label>
                  <textarea
                    rows={2}
                    value={hostelDraft.collectionInstruction}
                    onChange={(e) => setHostelDraft(prev => ({ ...prev, collectionInstruction: e.target.value }))}
                    placeholder="e.g. Riders cannot enter David's Hostel unless authorized residents. Student must come downstairs to collect their order."
                    className={`w-full px-3.5 py-2 rounded-xl border text-sm outline-none ${isDark ? 'bg-[#2A2A2A] border-gray-700' : 'bg-white border-gray-200'}`}
                  />
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
              <Button type="button" onClick={() => setIsHostelModalOpen(false)} variant="outline" className="rounded-xl px-5">
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveHostelDraft}
                disabled={savingHostel}
                variant="primary"
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-6 font-bold"
              >
                {savingHostel ? 'Saving...' : editingHostelId ? 'Save Hostel Changes' : 'Add Hostel'}
              </Button>
            </div>
          </div>
        </div>
      )}

    </AdminLayout>
  );
}
