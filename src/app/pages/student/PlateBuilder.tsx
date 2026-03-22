import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useParams } from 'react-router';
import { Logo } from '../../components/design-system/Logo';
import { GlassCard } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { Badge } from '../../components/design-system/Badge';
import { ArrowLeft, Plus, Minus, X, AlertTriangle, Users, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { ThemeToggle } from '../../components/ThemeToggle';
import { toast } from 'react-toastify';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent
} from '../../components/ui/collapsible';

import { MenuItem } from '../../../services/db';
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
    </div>
  );
}  
