import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation, useParams } from 'react-router';
import { Logo } from '../../components/design-system/Logo';
import { GlassCard } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { Badge } from '../../components/design-system/Badge';
import { ArrowLeft, Plus, Minus, X, AlertTriangle, Users, ChevronDown, ChevronUp, Trash2, ChefHat, Gift, Lock } from 'lucide-react';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { ThemeToggle } from '../../components/ThemeToggle';
import { toast } from 'react-toastify';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent
} from '../../components/ui/collapsible';

import { MenuItem, ComboDefinition, subscribeToCombos, seedCombos } from '../../../services/db';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { useTheme } from '../../../context/ThemeContext';

interface PlateItem {
  item: MenuItem;
  quantity: number;
}

interface Plate {
  id: string;
  type: 'main' | 'swallow';
  items: PlateItem[];
  total: number;
}

const TAKEAWAY_FEE = 200;
const DELIVERY_FEE_SOLO = 750;
const DELIVERY_FEE_GROUP = 580;

export default function PlateBuilder() {
  const navigate = useNavigate();
  const location = useLocation();
  const { studentTheme } = useTheme();

  const params = useParams<{ cafeteriaId: string }>();
  const cafeteria = location.state?.cafeteria || 'Old Cafeteria';
  const cafeteriaId = params.cafeteriaId || location.state?.cafeteriaId || 'old';
  const sectionId = location.state?.sectionId || (cafeteriaId === 'old' ? 'none' : 'front');
  const isOldCafe = cafeteriaId === 'old';

  const [foodItems, setFoodItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [platesExpanded, setPlatesExpanded] = useState(true);
  const [addonsExpanded, setAddonsExpanded] = useState(true);

  // Real-time subscription — fetch all items for this cafeteria/section (including unavailable for overlay)
  useEffect(() => {
    // Old Cafe uses sectionId='none' (no front/back)
    const constraints = [
      where('cafeteriaId', '==', cafeteriaId),
      where('sectionId', '==', sectionId)
    ];
    const q = query(collection(db, 'menu_items'), ...constraints);
    const unsub = onSnapshot(q, (snapshot) => {
      setFoodItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem)));
      setLoading(false);
    });
    return () => unsub();
  }, [cafeteriaId, sectionId]);

  const [builderType, setBuilderType] = useState<'main' | 'swallow'>('main');
  const [currentBuild, setCurrentBuild] = useState<{ [key: string]: number }>({});
  const [selectedSwallow, setSelectedSwallow] = useState<string | null>(null);
  const [selectedSoup, setSelectedSoup] = useState<string | null>(null);

  const [plates, setPlates] = useState<Plate[]>(() => {
    const saved = sessionStorage.getItem('cd_plates');
    if (!saved) return [];
    try { return JSON.parse(saved); } catch { return []; }
  });

  const [drinksSnacks, setDrinksSnacks] = useState<{ [key: string]: number }>(() => {
    const saved = sessionStorage.getItem('cd_drinksSnacks');
    if (!saved) return {};
    try { return JSON.parse(saved); } catch { return {}; }
  });

  const [currentDrinks, setCurrentDrinks] = useState<{ [key: string]: number }>({});
  const [currentSnacks, setCurrentSnacks] = useState<{ [key: string]: number }>({});

  const [deliveryMode, setDeliveryMode] = useState<'solo' | 'group'>(() => {
    const saved = sessionStorage.getItem('cd_deliveryMode');
    return (saved === 'solo' || saved === 'group') ? saved : 'solo';
  });

  const [groupSize, setGroupSize] = useState(() => {
    const saved = sessionStorage.getItem('cd_groupSize');
    const parsed = parseInt(saved || '');
    return isNaN(parsed) ? 2 : parsed;
  });

  const [openPlates, setOpenPlates] = useState<{ [key: string]: boolean }>({});

  // ─── Combos from Firestore ───
  const [allCombos, setAllCombos] = useState<ComboDefinition[]>([]);
  const [combosLoading, setCombosLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToCombos((combos) => {
      setAllCombos(combos);
      setCombosLoading(false);
    });
    return () => unsub();
  }, []);

  const availableCombos = React.useMemo(() => {
    return allCombos.filter(c => {
      if (cafeteriaId === 'new_cafe' && c.cafeteria === 'new') {
        return c.section === 'all' || c.section === sectionId;
      }
      if (cafeteriaId === 'old' && c.cafeteria === 'old') return true;
      if (c.cafeteria === cafeteriaId) {
        return c.section === 'all' || c.section === sectionId;
      }
      return false;
    });
  }, [allCombos, cafeteriaId, sectionId]);

  const [comboQuantities, setComboQuantities] = useState<{ [key: string]: number }>({});

  // ─── Radio selection state for combo option items ───
  // { [comboId]: { [itemIndex]: selectedOption } }
  const [comboSelections, setComboSelections] = useState<{ [comboId: string]: { [itemIdx: number]: string } }>({});

  /**
   * Parse a combo item name for radio options.
   * Patterns:
   *   "Rice/Spaghetti/Basmati - 2 Portions" → options: ["Rice", "Spaghetti", "Basmati"], suffix: " - 2 Portions"
   *   "Rice (Jollof/Fried/Mixed) - 2 Portions" → options: ["Jollof", "Fried", "Mixed"], prefix: "Rice (", suffix: ") - 2 Portions"
   *   "Swallow (Eba/Semo) - 4 Wraps" → options: ["Eba", "Semo"], prefix: "Swallow (", suffix: ") - 4 Wraps"
   *   "Middle Fish/Meat" → options: ["Middle Fish", "Meat"], suffix: ""
   *   "Drink (Fanta/Coke/Pepsi)" → options: ["Fanta", "Coke", "Pepsi"], prefix: "Drink (", suffix: ")"
   */
  const parseComboItemOptions = useCallback((name: string): { hasOptions: boolean; options: string[]; resolveSelection: (selected: string) => string; portionText: string } | null => {
    const extractPortion = (s: string) => {
      let t = s.trim();
      if (t.startsWith('-')) t = t.substring(1).trim();
      return t;
    };

    // Pattern 1: "Prefix (Option1/Option2/Option3) Suffix" e.g. "Rice (Jollof/Fried/Mixed) - 2 Portions"
    const parenMatch = name.match(/^(.+?)\(([^)]*\/[^)]*)\)(.*)$/);
    if (parenMatch) {
      const prefix = parenMatch[1].trim();
      const optionsStr = parenMatch[2];
      const suffix = parenMatch[3].trim();
      const options = optionsStr.split('/').map(o => o.trim()).filter(Boolean);
      if (options.length > 1) {
        return {
          hasOptions: true,
          options,
          portionText: extractPortion(suffix),
          resolveSelection: (selected: string) => {
            return suffix ? `${prefix} ${selected} ${suffix}`.trim() : `${prefix} ${selected}`.trim();
          }
        };
      }
    }

    // Pattern 2: "Option1/Option2 - Suffix" or "Option1/Option2" (no parens), e.g. "Rice/Spaghetti/Basmati - 2 Portions" or "Middle Fish/Meat"
    if (name.includes('/') && !name.includes('(')) {
      // Split on " - " to get the suffix
      const dashIdx = name.indexOf(' - ');
      const mainPart = dashIdx >= 0 ? name.substring(0, dashIdx) : name;
      const suffix = dashIdx >= 0 ? name.substring(dashIdx) : '';
      const options = mainPart.split('/').map(o => o.trim()).filter(Boolean);
      if (options.length > 1) {
        return {
          hasOptions: true,
          options,
          portionText: extractPortion(suffix),
          resolveSelection: (selected: string) => `${selected}${suffix}`
        };
      }
    }

    return null;
  }, []);

  const setComboOptionSelection = (comboId: string, itemIdx: number, option: string) => {
    setComboSelections(prev => ({
      ...prev,
      [comboId]: { ...(prev[comboId] || {}), [itemIdx]: option }
    }));
  };

  /** Check if all required radio options are selected for a combo */
  const isComboReady = (combo: ComboDefinition): boolean => {
    return combo.items.every((item, idx) => {
      const parsed = parseComboItemOptions(item.name);
      if (!parsed) return true; // No options needed
      return !!comboSelections[combo.id]?.[idx];
    });
  };

  const updateComboQty = (id: string, delta: number) => {
    setComboQuantities(prev => {
      const current = prev[id] || 1;
      const next = Math.max(1, current + delta);
      return { ...prev, [id]: next };
    });
  };

  const handleOrderCombo = (combo: ComboDefinition) => {
    if (!isComboReady(combo)) {
      toast.warning('Please select an option for all items before ordering.');
      return;
    }
    const qty = comboQuantities[combo.id] || 1;
    // Resolve selected options into final item names
    const resolvedItems = combo.items.map((item, idx) => {
      const parsed = parseComboItemOptions(item.name);
      if (parsed && comboSelections[combo.id]?.[idx]) {
        return { ...item, name: parsed.resolveSelection(comboSelections[combo.id][idx]) };
      }
      return item;
    });
    const orderData = {
      type: 'combo',
      comboId: combo.id,
      comboName: combo.name,
      comboItems: resolvedItems,
      quantity: qty,
      basePrice: combo.basePrice,
      cafeteria,
      cafeteriaId,
      sectionId,
      deliveryMode: 'solo',
    };

    sessionStorage.setItem('cd_comboOrder', JSON.stringify(orderData));
    navigate('/checkout', { state: { comboOrder: orderData } });
  };

  // ─── Build Your Plate scroll ───
  const buildYourPlateRef = useRef<HTMLDivElement>(null);
  const [showMobileScrollPill, setShowMobileScrollPill] = useState(false);

  const scrollToBuilder = () => {
    buildYourPlateRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Show floating pill on mobile when combo section is visible
  useEffect(() => {
    if (availableCombos.length === 0) return;
    const handleScroll = () => {
      const builderEl = buildYourPlateRef.current;
      if (!builderEl) return;
      const rect = builderEl.getBoundingClientRect();
      // Show pill when builder section is below viewport
      setShowMobileScrollPill(rect.top > window.innerHeight);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [availableCombos.length]);

  useEffect(() => sessionStorage.setItem('cd_plates', JSON.stringify(plates)), [plates]);
  useEffect(() => sessionStorage.setItem('cd_drinksSnacks', JSON.stringify(drinksSnacks)), [drinksSnacks]);
  useEffect(() => sessionStorage.setItem('cd_deliveryMode', deliveryMode), [deliveryMode]);
  useEffect(() => sessionStorage.setItem('cd_groupSize', groupSize.toString()), [groupSize]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Preparing your kitchen...
        </p>
      </div>
    );
  }

  const updateQuantity = (itemId: string, delta: number) => {
    setCurrentBuild(prev => {
      const newQty = (prev[itemId] || 0) + delta;
      if (newQty <= 0) {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [itemId]: newQty };
    });
  };

  const updateCurrentDrink = (itemId: string, delta: number) => {
    setCurrentDrinks(prev => {
      const newQty = (prev[itemId] || 0) + delta;
      if (newQty <= 0) {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [itemId]: newQty };
    });
  };

  const updateCurrentSnack = (itemId: string, delta: number) => {
    setCurrentSnacks(prev => {
      const newQty = (prev[itemId] || 0) + delta;
      if (newQty <= 0) {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [itemId]: newQty };
    });
  };

  const commitDrinks = () => {
    if (Object.keys(currentDrinks).length === 0) return;
    setDrinksSnacks(prev => {
      const next = { ...prev };
      Object.entries(currentDrinks).forEach(([id, qty]) => {
        next[id] = (next[id] || 0) + qty;
      });
      return next;
    });
    setCurrentDrinks({});
    toast.success('Drinks added to order! 🥤');
    window.scrollBy({ top: 300, behavior: 'smooth' });
  };

  const commitSnacks = () => {
    if (Object.keys(currentSnacks).length === 0) return;
    setDrinksSnacks(prev => {
      const next = { ...prev };
      Object.entries(currentSnacks).forEach(([id, qty]) => {
        next[id] = (next[id] || 0) + qty;
      });
      return next;
    });
    setCurrentSnacks({});
    toast.success('Snacks added to order! 🥨');
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  const removeConfirmedAddon = (itemId: string) => {
    setDrinksSnacks(prev => {
      const { [itemId]: _, ...rest } = prev;
      return rest;
    });
  };

  const selectSwallow = (itemId: string) => {
    if (selectedSwallow === itemId) {
      setSelectedSwallow(null);
      setCurrentBuild(prev => {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      });
    } else {
      if (selectedSwallow) {
        setCurrentBuild(prev => {
          const { [selectedSwallow]: _, ...rest } = prev;
          return rest;
        });
      }
      setSelectedSwallow(itemId);
      setCurrentBuild(prev => ({ ...prev, [itemId]: 1 }));
    }
  };

  const selectSoup = (itemId: string) => {
    if (selectedSoup === itemId) {
      setSelectedSoup(null);
      setCurrentBuild(prev => {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      });
    } else {
      if (selectedSoup) {
        setCurrentBuild(prev => {
          const { [selectedSoup]: _, ...rest } = prev;
          return rest;
        });
      }
      setSelectedSoup(itemId);
      setCurrentBuild(prev => ({ ...prev, [itemId]: 1 }));
    }
  };

  const addPlate = () => {
    const items: PlateItem[] = Object.entries(currentBuild).reduce((acc: PlateItem[], [itemId, quantity]) => {
      const item = foodItems.find(f => f.id === itemId);
      if (item) acc.push({ item, quantity });
      return acc;
    }, []);

    const itemsTotal = items.reduce((sum, { item, quantity }) => sum + item.price * quantity, 0);
    const total = itemsTotal + TAKEAWAY_FEE;

    const newPlate: Plate = {
      id: `plate-${Date.now()}`,
      type: builderType,
      items,
      total
    };

    setPlates([...plates, newPlate]);
    setCurrentBuild({});
    setSelectedSwallow(null);
    setSelectedSoup(null);
  };

  const removePlate = (plateId: string) => {
    setPlates(plates.filter(p => p.id !== plateId));
  };

  const canAddPlate = () => {
    if (builderType === 'main') {
      const hasBases = foodItems.filter(f => f.category === 'base').some(f => currentBuild[f.id] > 0);
      return hasBases;
    } else {
      return selectedSwallow !== null && selectedSoup !== null;
    }
  };

  const platesSubtotal = plates.reduce((sum, plate) => sum + plate.total, 0);
  const drinksSnacksTotal = Object.entries(drinksSnacks).reduce((sum, [itemId, qty]) => {
    const item = foodItems.find(f => f.id === itemId);
    return sum + (item?.price || 0) * qty;
  }, 0);

  const deliveryFee = deliveryMode === 'solo' ? DELIVERY_FEE_SOLO : DELIVERY_FEE_GROUP;
  const totalDelivery = deliveryFee * plates.length;
  const grandTotal = platesSubtotal + drinksSnacksTotal + totalDelivery;

  const drinksSnacksDisabled = plates.length === 0;
  const groupOrderWarning = deliveryMode === 'group' && plates.length < groupSize;

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/cafeteria">
              <button className="p-2 rounded-xl transition-colors hover:bg-muted">
                <ArrowLeft className="w-6 h-6 text-foreground" />
              </button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-foreground">Build Your Plate</h1>
              <p className="text-sm text-muted-foreground">{cafeteria}{!isOldCafe && ` • ${sectionId.charAt(0).toUpperCase() + sectionId.slice(1)} Section`}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-[#7C3AED]">{plates.length}</span>
            <span className="text-sm text-[#FCD34D] ml-1 font-semibold">plates</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-[1400px] mx-auto px-6 py-8">

        {/* Quick Combo Packs Section */}
        {availableCombos.length > 0 && (
          <div className="mb-12 space-y-6">
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-black text-foreground">Quick Combo Packs ⚡</h2>
              <Badge variant="green" className="animate-pulse shadow-sm shadow-green-500/20">Fast Checkout</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availableCombos.map(combo => {
                const qty = comboQuantities[combo.id] || 1;
                const comboReady = isComboReady(combo);
                return (
                  <GlassCard key={combo.id} className="overflow-hidden flex flex-col h-full hover:shadow-xl hover:shadow-primary/10 transition-shadow">
                    <div className="h-48 relative bg-muted/30">
                      <ImageWithFallback src={combo.image || `/assets/combos/${combo.imageName}.png`} alt={combo.name} className="w-full h-full object-cover" />
                      <div className="absolute top-3 right-3 bg-background/90 backdrop-blur-md px-3 py-1 pb-1.5 rounded-full font-bold shadow-lg">
                        ₦{(combo.basePrice * qty).toLocaleString()}
                      </div>
                    </div>

                    <div className="p-5 flex-1 flex flex-col">
                      <h3 className="text-xl font-bold mb-1">{combo.name}</h3>
                      <p className="text-sm text-secondary font-medium mb-4">{combo.tagline}</p>

                      <div className="flex-1 mb-6">
                        <ul className="space-y-3">
                          {combo.items.map((item, i) => {
                            const parsed = parseComboItemOptions(item.name);
                            if (parsed) {
                              const selectedOption = comboSelections[combo.id]?.[i] || '';
                              return (
                                <li key={i} className="text-sm">
                                  <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
                                    <div className="text-muted-foreground font-medium flex items-center gap-1 whitespace-nowrap">
                                      <span className="text-primary">•</span>
                                      <span>Choose one{parsed.portionText ? ` (${parsed.portionText})` : ''}{item.quantity > 1 ? <span className="text-foreground font-semibold ml-1">(x{item.quantity})</span> : ''}:</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                      {parsed.options.map(option => (
                                        <button
                                          key={option}
                                          onClick={() => {
                                            setComboSelections(prev => {
                                              const newSelections = { ...prev };
                                              if (!newSelections[combo.id]) newSelections[combo.id] = {};
                                              newSelections[combo.id][i] = option;
                                              return newSelections;
                                            });
                                          }}
                                          className={`flex items-center gap-1 px-2.5 py-1 rounded-[8px] text-[11px] font-bold transition-all border ${selectedOption === option
                                              ? 'border-primary bg-primary/10 text-primary shadow-sm'
                                              : 'border-border bg-muted/30 text-muted-foreground hover:border-primary/40 hover:bg-primary/5'
                                            }`}
                                        >
                                          <span className={`w-3 h-3 rounded-full border-[1.5px] flex items-center justify-center flex-shrink-0 transition-all ${selectedOption === option
                                              ? 'border-primary'
                                              : 'border-muted-foreground/40'
                                            }`}>
                                            {selectedOption === option && (
                                              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                            )}
                                          </span>
                                          {option}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </li>
                              );
                            }
                            return (
                              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2 leading-tight">
                                <span className="text-primary mt-0.5">•</span>
                                {item.name} {item.quantity > 1 ? <span className="text-foreground font-semibold ml-1">(x{item.quantity})</span> : ''}
                              </li>
                            );
                          })}
                        </ul>
                      </div>

                      <div className="flex flex-col gap-3 mt-auto pt-4 border-t border-border">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Quantity</span>
                          <div className="flex items-center gap-3 bg-muted/50 rounded-xl p-1 border border-border">
                            <button onClick={() => updateComboQty(combo.id, -1)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-background shadow-sm hover:bg-secondary/10 transition-colors">
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-4 text-center font-bold px-1">{qty}</span>
                            <button onClick={() => updateComboQty(combo.id, 1)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-background shadow-sm hover:bg-secondary/10 transition-colors">
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 mt-2">
                          <Button
                            variant="primary"
                            className={`w-full font-bold transition-all ${!comboReady ? 'opacity-60' : ''}`}
                            onClick={() => handleOrderCombo(combo)}
                            disabled={!comboReady}
                          >
                            Order Now
                          </Button>
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                );
              })}
            </div>

            {/* Rider Incentives Section */}
            <div className="mt-12 pt-8 border-t border-border/50">
              <div className="flex items-center gap-3 mb-6">
                <h2 className="text-2xl font-black text-foreground">Rider Incentives 🎯</h2>
                <Badge variant="purple" className="shadow-sm">Riders Only • Performance Reward</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Refuel Deck */}
                <div onClick={() => toast.info('Available only to active CalebDeck riders')} className="relative overflow-hidden rounded-2xl border-2 border-dashed border-border p-6 bg-card cursor-pointer group hover:border-primary/50 transition-colors">
                  <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Lock className="w-8 h-8 text-muted-foreground mb-2" />
                    <span className="font-bold text-sm text-foreground">Riders Only</span>
                  </div>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-blue-500 mb-1">Refuel Deck</h3>
                      <p className="text-xs text-muted-foreground font-medium">Unlock at 130 deliveries/week</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                      <Gift className="w-5 h-5" />
                    </div>
                  </div>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2"><span className="text-blue-400">•</span>2 Portions of Rice</li>
                    <li className="flex items-center gap-2"><span className="text-blue-400">•</span>1 Medium Fish</li>
                    <li className="flex items-center gap-2"><span className="text-blue-400">•</span>1 Bottle of Water (Eva)</li>
                    <li className="flex items-center gap-2 font-bold text-foreground"><span className="text-blue-400">•</span>+ ₦1,000 Data Bonus</li>
                  </ul>
                </div>

                {/* Refuel Deck Plus */}
                <div onClick={() => toast.info('Available only to active CalebDeck riders')} className="relative overflow-hidden rounded-2xl border-2 border-dashed border-border p-6 bg-card cursor-pointer group hover:border-amber-500/50 transition-colors">
                  <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Lock className="w-8 h-8 text-muted-foreground mb-2" />
                    <span className="font-bold text-sm text-foreground">Riders Only</span>
                  </div>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-amber-500 mb-1">Refuel Deck Plus</h3>
                      <p className="text-xs text-muted-foreground font-medium">Unlock at 180 deliveries/week</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                      <Gift className="w-5 h-5" />
                    </div>
                  </div>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2"><span className="text-amber-400">•</span>2 Portions of Rice</li>
                    <li className="flex items-center gap-2"><span className="text-amber-400">•</span>1 Tail Fish</li>
                    <li className="flex items-center gap-2"><span className="text-amber-400">•</span>1 Drink (Fanta/Coke/Pepsi)</li>
                    <li className="flex items-center gap-2 font-bold text-foreground"><span className="text-amber-400">•</span>+ ₦1,500 Data Bonus</li>
                  </ul>
                </div>
              </div>
            </div>

            <div ref={buildYourPlateRef} className="flex items-center gap-4 py-8">
              <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
              <span className="text-muted-foreground font-semibold uppercase tracking-widest text-sm">OR BUILD YOUR OWN</span>
              <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-[1fr_400px] gap-8">
          {/* Builder Area - Left */}
          <div className="space-y-6">
            <div className="relative space-y-6">
              {/* Plate Type Selector — hidden for Old Cafe (no swallow items) */}
              {!isOldCafe && foodItems.some(f => f.category === 'swallow') ? (
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setBuilderType('main')}
                    className={`p-6 rounded-2xl border-2 transition-all duration-300 text-left ${builderType === 'main'
                      ? 'border-secondary bg-secondary/10 shadow-lg'
                      : 'border-border bg-card hover:border-secondary/50'
                      }`}
                  >
                    <h3 className="text-xl font-bold">Build Main Plate</h3>
                    <p className="text-sm text-muted-foreground mt-1">Rice, beans, yam & more</p>
                  </button>
                  <button
                    onClick={() => setBuilderType('swallow')}
                    className={`p-6 rounded-2xl border-2 transition-all duration-300 text-left ${builderType === 'swallow'
                      ? 'border-secondary bg-secondary/10 shadow-lg'
                      : 'border-border bg-card hover:border-secondary/50'
                      }`}
                  >
                    <h3 className="text-xl font-bold">Build Swallow Plate</h3>
                    <p className="text-sm text-muted-foreground mt-1">Fufu, eba, pounded yam</p>
                  </button>
                </div>
              ) : null}

              {/* Builder Steps */}
              {builderType === 'main' ? (
                <div className="space-y-8">
                  {/* Step 1: Choose Base */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Badge variant="purple" className="mb-2 uppercase tracking-wider">STEP 1</Badge>
                        <h3 className="text-2xl font-bold">Choose Base</h3>
                        <p className="text-sm text-muted-foreground font-medium">Required • Multiple selection</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {foodItems.filter(f => f.category === 'base').map(item => (
                        <GlassCard key={item.id} selected={currentBuild[item.id] > 0} unavailable={!item.isAvailable}>
                          <div className="space-y-3">
                            <div className="aspect-square rounded-xl overflow-hidden shadow-inner">
                              <ImageWithFallback
                                src={item.image}
                                alt={item.name}
                                className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                              />
                            </div>
                            <div>
                              <h4 className="font-bold text-card-foreground line-clamp-2 min-h-[2.5rem] text-sm leading-tight flex items-center">{item.name}</h4>
                              <p className="text-sm text-muted-foreground font-semibold">₦{item.price}/{item.unit}</p>
                            </div>
                            <div className="flex items-center justify-between bg-muted/50 rounded-lg p-1">
                              <button
                                onClick={() => updateQuantity(item.id, -1)}
                                disabled={!currentBuild[item.id]}
                                className="w-10 h-10 rounded-lg bg-card text-foreground hover:bg-secondary hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all flex items-center justify-center shadow-sm"
                              >
                                <Minus className="w-5 h-5" />
                              </button>
                              <span className="font-bold text-xl px-2">{currentBuild[item.id] || 0}</span>
                              <button
                                onClick={() => updateQuantity(item.id, 1)}
                                className="w-10 h-10 rounded-lg bg-primary text-primary-foreground hover:bg-primary/80 transition-all flex items-center justify-center shadow-sm hover:scale-105"
                              >
                                <Plus className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        </GlassCard>
                      ))}
                    </div>
                  </div>

                  {/* Step 2: Add Protein */}
                  <div className="space-y-4">
                    <div>
                      <Badge variant="purple" className="mb-2 uppercase tracking-wider">STEP 2</Badge>
                      <h3 className="text-2xl font-bold">Add Protein</h3>
                      <p className="text-sm text-muted-foreground font-medium">Optional • Multiple selection</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {foodItems.filter(f => f.category === 'protein').map(item => (
                        <GlassCard key={item.id} selected={currentBuild[item.id] > 0} unavailable={!item.isAvailable}>
                          <div className="space-y-3">
                            <div className="aspect-square rounded-xl overflow-hidden shadow-inner">
                              <ImageWithFallback
                                src={item.image}
                                alt={item.name}
                                className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                              />
                            </div>
                            <div>
                              <h4 className="font-bold text-card-foreground line-clamp-2 min-h-[2.5rem] text-sm leading-tight flex items-center">{item.name}</h4>
                              <p className="text-sm text-muted-foreground font-semibold">₦{item.price}/{item.unit}</p>
                            </div>
                            <div className="flex items-center justify-between bg-muted/50 rounded-lg p-1">
                              <button
                                onClick={() => updateQuantity(item.id, -1)}
                                disabled={!currentBuild[item.id]}
                                className="w-10 h-10 rounded-lg bg-card text-foreground hover:bg-secondary hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all flex items-center justify-center shadow-sm"
                              >
                                <Minus className="w-5 h-5" />
                              </button>
                              <span className="font-bold text-xl px-2">{currentBuild[item.id] || 0}</span>
                              <button
                                onClick={() => updateQuantity(item.id, 1)}
                                className="w-10 h-10 rounded-lg bg-primary text-primary-foreground hover:bg-primary/80 transition-all flex items-center justify-center shadow-sm hover:scale-105"
                              >
                                <Plus className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        </GlassCard>
                      ))}
                    </div>
                  </div>

                  {/* Step 3: Extras — REMOVED (no 'extra' category exists) */}
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Swallow Step 1: Choose Swallow */}
                  <div className="space-y-4">
                    <div>
                      <Badge variant="purple" className="mb-2 uppercase tracking-wider">STEP 1</Badge>
                      <h3 className="text-2xl font-bold">Choose Swallow</h3>
                      <p className="text-sm text-muted-foreground font-medium">Required • Select one</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {foodItems.filter(f => f.category === 'swallow').map(item => (
                        <GlassCard key={item.id} selected={selectedSwallow === item.id} unavailable={!item.isAvailable}>
                          <div className="space-y-3">
                            <div className="aspect-square rounded-xl overflow-hidden shadow-inner">
                              <ImageWithFallback
                                src={item.image}
                                alt={item.name}
                                className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                              />
                            </div>
                            <div>
                              <h4 className="font-bold text-card-foreground line-clamp-2 min-h-[2.5rem] text-sm leading-tight flex items-center">{item.name}</h4>
                              <p className="text-sm text-muted-foreground font-semibold">₦{item.price}/{item.unit}</p>
                            </div>
                            {selectedSwallow === item.id ? (
                              <div className="flex items-center justify-between bg-muted/50 rounded-lg p-1">
                                <button
                                  onClick={() => updateQuantity(item.id, -1)}
                                  disabled={currentBuild[item.id] <= 1}
                                  className="w-10 h-10 rounded-lg bg-card text-foreground hover:bg-secondary hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all flex items-center justify-center shadow-sm"
                                >
                                  <Minus className="w-5 h-5" />
                                </button>
                                <span className="font-bold text-xl px-2">{currentBuild[item.id] || 0}</span>
                                <button
                                  onClick={() => updateQuantity(item.id, 1)}
                                  className="w-10 h-10 rounded-lg bg-primary text-primary-foreground hover:bg-primary/80 transition-all flex items-center justify-center shadow-sm hover:scale-105"
                                >
                                  <Plus className="w-5 h-5" />
                                </button>
                              </div>
                            ) : (
                              <Button
                                variant="primary"
                                size="md"
                                onClick={() => selectSwallow(item.id)}
                                className="w-full rounded-2xl"
                              >
                                Select
                              </Button>
                            )}
                          </div>
                        </GlassCard>
                      ))}
                    </div>
                  </div>

                  {/* Swallow Step 2: Choose Soup */}
                  <div className="space-y-4">
                    <div>
                      <Badge variant="purple" className="mb-2 uppercase tracking-wider">STEP 2</Badge>
                      <h3 className="text-2xl font-bold">Choose Soup</h3>
                      <p className="text-sm text-muted-foreground font-medium">Required • Select one</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {foodItems.filter(f => f.category === 'soup').map(item => (
                        <GlassCard key={item.id} selected={selectedSoup === item.id} unavailable={!item.isAvailable}>
                          <div className="space-y-3">
                            <div className="aspect-square rounded-xl overflow-hidden shadow-inner">
                              <ImageWithFallback
                                src={item.image}
                                alt={item.name}
                                className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                              />
                            </div>
                            <div>
                              <h4 className="font-bold text-card-foreground line-clamp-2 min-h-[2.5rem] text-sm leading-tight flex items-center">{item.name}</h4>
                              <p className="text-sm text-muted-foreground font-semibold">₦{item.price}/{item.unit === 'portion' ? 'serving' : item.unit}</p>
                            </div>
                            {selectedSoup === item.id ? (
                              <div className="flex items-center justify-between bg-muted/50 rounded-lg p-1">
                                <button
                                  onClick={() => updateQuantity(item.id, -1)}
                                  disabled={currentBuild[item.id] <= 1}
                                  className="w-10 h-10 rounded-lg bg-card text-foreground hover:bg-secondary hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all flex items-center justify-center shadow-sm"
                                >
                                  <Minus className="w-5 h-5" />
                                </button>
                                <span className="font-bold text-xl px-2">{currentBuild[item.id] || 0}</span>
                                <button
                                  onClick={() => updateQuantity(item.id, 1)}
                                  className="w-10 h-10 rounded-lg bg-primary text-primary-foreground hover:bg-primary/80 transition-all flex items-center justify-center shadow-sm hover:scale-105"
                                >
                                  <Plus className="w-5 h-5" />
                                </button>
                              </div>
                            ) : (
                              <Button
                                variant="primary"
                                size="md"
                                onClick={() => selectSoup(item.id)}
                                className="w-full rounded-2xl"
                              >
                                Select
                              </Button>
                            )}
                          </div>
                        </GlassCard>
                      ))}
                    </div>
                  </div>

                  {/* Swallow Step 3: Add Protein */}
                  <div className="space-y-4">
                    <div>
                      <Badge variant="purple" className="mb-2 uppercase tracking-wider">STEP 3</Badge>
                      <h3 className="text-2xl font-bold">Add Protein</h3>
                      <p className="text-sm text-muted-foreground font-medium">Optional • Multiple selection</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {foodItems.filter(f => f.category === 'protein').map(item => (
                        <GlassCard key={item.id} selected={currentBuild[item.id] > 0} unavailable={!item.isAvailable}>
                          <div className="space-y-3">
                            <div className="aspect-square rounded-xl overflow-hidden shadow-inner">
                              <ImageWithFallback
                                src={item.image}
                                alt={item.name}
                                className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                              />
                            </div>
                            <div>
                              <h4 className="font-bold text-card-foreground line-clamp-2 min-h-[2.5rem] text-sm leading-tight flex items-center">{item.name}</h4>
                              <p className="text-sm text-muted-foreground font-semibold">₦{item.price}/{item.unit}</p>
                            </div>
                            <div className="flex items-center justify-between bg-muted/50 rounded-lg p-1">
                              <button
                                onClick={() => updateQuantity(item.id, -1)}
                                disabled={!currentBuild[item.id]}
                                className="w-10 h-10 rounded-lg bg-card text-foreground hover:bg-secondary hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all flex items-center justify-center shadow-sm"
                              >
                                <Minus className="w-5 h-5" />
                              </button>
                              <span className="font-bold text-xl px-2">{currentBuild[item.id] || 0}</span>
                              <button
                                onClick={() => updateQuantity(item.id, 1)}
                                className="w-10 h-10 rounded-lg bg-primary text-primary-foreground hover:bg-primary/80 transition-all flex items-center justify-center shadow-sm hover:scale-105"
                              >
                                <Plus className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        </GlassCard>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Add Plate Button */}
              <div className="sticky bottom-6 pt-4 z-40 pointer-events-none">
                <div className="pointer-events-auto pr-[4.5rem] md:pr-0">
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={addPlate}
                    disabled={!canAddPlate()}
                    className="w-full py-6 text-xl rounded-2xl shadow-2xl shadow-primary/20 transition-all duration-300 active:scale-95"
                  >
                    Add Plate to Order
                  </Button>
                </div>
              </div>
            </div>

            {/* Drinks & Snacks Section */}
            <div className={`p-6 rounded-2xl border-2 transition-all ${drinksSnacksDisabled
              ? 'border-border bg-muted/20 opacity-50 pointer-events-none'
              : 'border-primary bg-cardShadow'
              }`}
              style={{ backgroundColor: drinksSnacksDisabled ? 'transparent' : 'var(--card)' }}
            >
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-card-foreground mb-2">{isOldCafe ? 'Add Beverages (Optional)' : `Add Beverages ${'&'} Snacks (Optional)`}</h3>
                <p className="text-sm text-[#9C8F7F]">
                  {drinksSnacksDisabled
                    ? 'Add at least one plate to unlock drinks and snacks'
                    : 'No delivery fee for add-ons'
                  }
                </p>
              </div>

              {!drinksSnacksDisabled && (
                <div className="space-y-8">
                  {/* Drinks */}
                  <div className="relative">
                    <h4 className="text-lg font-bold text-card-foreground mb-4">Beverages</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pb-2">
                      {foodItems.filter(f => f.category === 'drink').map(item => (
                        <GlassCard key={item.id} selected={currentDrinks[item.id] > 0} unavailable={!item.isAvailable}>
                          <div className="space-y-3">
                            <div className="aspect-square rounded-xl overflow-hidden">
                              <ImageWithFallback
                                src={item.image}
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div>
                              <h4 className="font-semibold text-card-foreground line-clamp-2 min-h-[2.5rem] text-sm leading-tight flex items-center">{item.name}</h4>
                              <p className="text-sm text-muted-foreground mt-1">₦{item.price}/{item.unit}</p>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              <button
                                onClick={() => updateCurrentDrink(item.id, -1)}
                                disabled={!currentDrinks[item.id]}
                                className="w-8 h-8 rounded-lg bg-muted hover:bg-secondary hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <span className="font-bold text-lg text-card-foreground">{currentDrinks[item.id] || 0}</span>
                              <button
                                onClick={() => updateCurrentDrink(item.id, 1)}
                                className="w-8 h-8 rounded-lg bg-primary hover:bg-primary/80 text-primary-foreground transition-colors flex items-center justify-center"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </GlassCard>
                      ))}
                    </div>
                    {/* Sticky Add Drinks Button */}
                    <div className="sticky bottom-6 pt-4 pb-2 z-30 pointer-events-none">
                      <div className="pointer-events-auto">
                        <Button
                          variant="primary"
                          size="lg"
                          disabled={Object.entries(currentDrinks).filter(([id]) => foodItems.find(f => f.id === id)?.category === 'drink').length === 0}
                          onClick={commitDrinks}
                          className="w-fit px-8 py-6 text-base sm:text-lg xl:text-xl whitespace-nowrap rounded-2xl shadow-2xl shadow-primary/20 transition-all duration-300 active:scale-95"
                        >
                          Add Beverages to Order
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Snacks & Pastries — hidden for Old Cafe */}
                  {!isOldCafe && (
                    <div className="relative">
                      <h4 className="text-lg font-bold text-card-foreground mb-4">Snacks & Pastries</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pb-2">
                        {foodItems.filter(f => f.category === 'snack').map(item => (
                          <GlassCard key={item.id} selected={currentSnacks[item.id] > 0} unavailable={!item.isAvailable}>
                            <div className="space-y-3">
                              <div className="aspect-square rounded-xl overflow-hidden">
                                <ImageWithFallback
                                  src={item.image}
                                  alt={item.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div>
                                <h4 className="font-semibold text-card-foreground line-clamp-2 min-h-[2.5rem] text-sm leading-tight flex items-center">{item.name}</h4>
                                <p className="text-sm text-muted-foreground mt-1">₦{item.price}/{item.unit}</p>
                              </div>
                              <div className="flex items-center justify-between mt-2">
                                <button
                                  onClick={() => updateCurrentSnack(item.id, -1)}
                                  disabled={!currentSnacks[item.id]}
                                  className="w-8 h-8 rounded-lg bg-muted hover:bg-secondary hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                                >
                                  <Minus className="w-4 h-4" />
                                </button>
                                <span className="font-bold text-lg text-card-foreground">{currentSnacks[item.id] || 0}</span>
                                <button
                                  onClick={() => updateCurrentSnack(item.id, 1)}
                                  className="w-8 h-8 rounded-lg bg-primary hover:bg-primary/80 text-primary-foreground transition-colors flex items-center justify-center"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </GlassCard>
                        ))}
                      </div>
                      {/* Sticky Add Snacks Button */}
                      <div className="sticky bottom-6 pt-4 pb-2 z-20 pointer-events-none">
                        <div className="pointer-events-auto">
                          <Button
                            variant="primary"
                            size="lg"
                            disabled={Object.entries(currentSnacks).filter(([id]) => foodItems.find(f => f.id === id)?.category === 'snack').length === 0}
                            onClick={commitSnacks}
                            className="w-fit px-8 py-6 text-base sm:text-lg xl:text-xl whitespace-nowrap rounded-2xl shadow-2xl shadow-primary/20 transition-all duration-300 active:scale-95"
                          >
                            Add Snacks to Order
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Order Summary - Right Sticky Panel */}
          <div className="lg:sticky lg:top-24 h-fit">
            <div className="bg-card rounded-[2.5rem] p-8 border-2 border-border shadow-2xl transition-all duration-300">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-3xl font-bold">Your Order</h3>
                <Badge variant="secondary">{plates.length} Plates</Badge>
              </div>

              {/* Plates List with Collapsible Dropdowns */}
              <div className="space-y-3 mb-6">
                {plates.length === 0 ? (
                  <p className="text-center text-[#9C8F7F] py-8">No plates added yet</p>
                ) : (
                  plates.map((plate, index) => (
                    <Collapsible
                      key={plate.id}
                      open={openPlates[plate.id]}
                      onOpenChange={(open) => setOpenPlates({ ...openPlates, [plate.id]: open })}
                    >
                      <div className="rounded-xl bg-muted/30 border border-border overflow-hidden">
                        <CollapsibleTrigger className="w-full p-4 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <div className="text-left">
                                <h4 className="font-bold text-card-foreground">
                                  Plate {index + 1} ({plate.type === 'main' ? 'Main' : 'Swallow'})
                                </h4>
                                <p className="text-sm text-[#FCD34D] font-semibold">₦{plate.total.toLocaleString()}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removePlate(plate.id);
                                }}
                                className="p-2 hover:bg-[#7C3AED]/20 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4 text-[#7C3AED]" />
                              </div>
                              {openPlates[plate.id] ? (
                                <ChevronUp className="w-5 h-5 text-[#9C8F7F]" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-[#9C8F7F]" />
                              )}
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="px-4 pb-4 space-y-1 text-sm border-t border-[#333333] pt-3">
                            {plate.items.map(({ item, quantity }) => (
                              <div key={item.id} className="flex justify-between text-[#9C8F7F]">
                                <span>{item.name} × {quantity}</span>
                                <span>₦{(item.price * quantity).toLocaleString()}</span>
                              </div>
                            ))}
                            <div className="flex justify-between text-[#9C8F7F] pt-1 border-t border-[#333333]">
                              <span>Takeaway pack</span>
                              <span>₦{TAKEAWAY_FEE}</span>
                            </div>
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  ))
                )}
              </div>

              {/* Drinks & Snacks Summary */}
              {Object.keys(drinksSnacks).length > 0 && (
                <div className="mb-8 p-6 rounded-[2rem] bg-primary/5 border border-primary/20 shadow-inner">
                  <h4 className="font-bold uppercase tracking-wider text-muted-foreground text-sm mb-4">Add-ons</h4>
                  <div className="space-y-2">
                    {Object.entries(drinksSnacks).map(([itemId, quantity]) => {
                      const item = foodItems.find(f => f.id === itemId);
                      if (!item) return null;
                      return (
                        <div key={itemId} className="flex justify-between items-center text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">{item.name} ×{quantity}</span>
                            <button
                              onClick={() => removeConfirmedAddon(itemId)}
                              className="p-1 hover:bg-destructive/10 rounded-md transition-colors"
                            >
                              <X className="w-3 h-3 text-destructive opacity-50 hover:opacity-100" />
                            </button>
                          </div>
                          <span className="font-bold text-card-foreground">₦{(item.price * quantity).toLocaleString()}</span>
                        </div>
                      );
                    })}
                    <div className="flex justify-between font-bold text-primary pt-3 border-t border-primary/20 text-lg">
                      <span>Add-ons Total</span>
                      <span>₦{drinksSnacksTotal.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Delivery Mode */}
              {plates.length > 0 && (
                <div className="mb-8 space-y-4">
                  <h4 className="font-bold uppercase tracking-wider text-muted-foreground text-sm">Delivery Option</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setDeliveryMode('solo')}
                      className={`p-5 rounded-[2rem] border-2 transition-all duration-300 text-left relative overflow-hidden ${deliveryMode === 'solo'
                        ? 'border-primary bg-primary/10 shadow-lg'
                        : 'border-border bg-muted/20 hover:border-primary/30'
                        }`}
                    >
                      <div className="font-extrabold text-foreground">Just Me</div>
                      <div className="text-xs text-muted-foreground font-bold mt-1">₦750/plate</div>
                      {deliveryMode === 'solo' && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary animate-pulse"></div>}
                    </button>
                    <button
                      onClick={() => setDeliveryMode('group')}
                      className={`p-5 rounded-[2rem] border-2 transition-all duration-300 text-left relative overflow-hidden ${deliveryMode === 'group'
                        ? 'border-secondary bg-secondary/10 shadow-lg'
                        : 'border-border bg-muted/20 hover:border-secondary/30'
                        }`}
                    >
                      <div className="font-extrabold text-foreground flex items-center gap-2">
                        <Users className="w-4 h-4" /> Group
                      </div>
                      <div className="text-xs text-green-500 font-semibold">23% off</div>
                      <div className="text-xs text-muted-foreground font-bold mt-1">₦580/plate</div>
                      {deliveryMode === 'group' && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-secondary animate-pulse"></div>}
                    </button>
                  </div>

                  {deliveryMode === 'group' && (
                    <div className="p-6 rounded-[2rem] bg-secondary/5 border border-secondary/20 animate-in zoom-in-95 duration-300">
                      <label className="block text-sm font-bold uppercase tracking-tight text-muted-foreground mb-4">
                        Batch Group Size
                      </label>
                      <div className="flex gap-3 flex-wrap">
                        {[2, 4, 6, 8, 10].map(size => (
                          <button
                            key={size}
                            onClick={() => setGroupSize(size)}
                            className={`w-12 h-12 rounded-xl font-bold transition-all duration-300 ${groupSize === size
                              ? 'bg-secondary text-secondary-foreground shadow-lg scale-110'
                              : 'bg-card text-foreground hover:bg-secondary/20'
                              }`}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                      {groupOrderWarning && (
                        <div className="mt-4 p-4 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-start gap-3">
                          <AlertTriangle className="w-6 h-6 text-destructive flex-shrink-0" />
                          <p className="text-sm font-medium text-destructive leading-tight">
                            Add {groupSize - plates.length} more plate{(groupSize - plates.length) > 1 ? 's' : ''} to meet the group size requirements.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Price Breakdown */}
              {plates.length > 0 && (
                <div className="space-y-4 pt-6 border-t-2 border-border mb-8">
                  <div className="flex justify-between text-muted-foreground font-medium">
                    <span>Plates Subtotal</span>
                    <span>₦{platesSubtotal.toLocaleString()}</span>
                  </div>

                  {drinksSnacksTotal > 0 && (
                    <div className="flex justify-between text-muted-foreground font-medium">
                      <span>Add-ons</span>
                      <span>₦{drinksSnacksTotal.toLocaleString()}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-muted-foreground font-medium">
                    <span>Delivery (₦{DELIVERY_FEE_SOLO} × {plates.length})</span>
                    <span>₦{(DELIVERY_FEE_SOLO * plates.length).toLocaleString()}</span>
                  </div>

                  {deliveryMode === 'group' && (
                    <div className="flex justify-between text-green-500 font-bold animate-in fade-in slide-in-from-right-4">
                      <span>Group Savings (₦170 off per plate)</span>
                      <span>-₦{((DELIVERY_FEE_SOLO - DELIVERY_FEE_GROUP) * plates.length).toLocaleString()}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center py-4 border-t border-border mt-4 gap-4">
                    <span className="text-2xl font-black text-foreground">Total Due</span>
                    <span className="text-4xl font-black text-secondary">
                      ₦{grandTotal.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              <Button
                variant="primary"
                size="lg"
                disabled={plates.length === 0 || groupOrderWarning}
                className="w-full py-6 text-2xl rounded-3xl shadow-xl shadow-primary/20 transition-all duration-500 hover:scale-[1.02] active:scale-95 disabled:grayscale"
                onClick={() => {
                  const drinksSnacksItems = Object.entries(drinksSnacks).reduce((acc: any[], [itemId, quantity]) => {
                    const item = foodItems.find(f => f.id === itemId);
                    if (item) acc.push({ item, quantity });
                    return acc;
                  }, []);
                  navigate('/checkout', {
                    state: {
                      plates,
                      drinksSnacks,
                      drinksSnacksItems,
                      deliveryMode,
                      groupSize,
                      grandTotal,
                      cafeteria,
                      cafeteriaId,
                      sectionId
                    }
                  });
                }}
              >
                Proceed to Checkout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating "Build Your Plate" pill for mobile */}
      {showMobileScrollPill && availableCombos.length > 0 && (
        <button
          onClick={scrollToBuilder}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 lg:hidden flex items-center gap-2 px-6 py-3 rounded-full bg-secondary text-secondary-foreground font-bold text-sm shadow-2xl shadow-secondary/30 transition-all hover:scale-105 active:scale-95 animate-bounce-slow"
          style={{ animation: 'bounceSubtle 2s infinite' }}
        >
          <ChefHat className="w-4 h-4" />
          Build Your Plate ↓
        </button>
      )}

      <style>{`
        @keyframes bounceSubtle {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(-4px); }
        }
      `}</style>
    </div>
  );
}  
