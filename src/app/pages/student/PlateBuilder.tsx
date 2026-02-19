import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import { Logo } from '../../components/design-system/Logo';
import { GlassCard } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { Badge } from '../../components/design-system/Badge';
import { ArrowLeft, Plus, Minus, X, AlertTriangle, Users, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { ThemeToggle } from '../../components/ThemeToggle';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent
} from '../../components/ui/collapsible';

import { getMenu, MenuItem } from '../../../services/db';
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
const DELIVERY_FEE_SOLO = 700;
const DELIVERY_FEE_GROUP = 560;

export default function PlateBuilder() {
  const navigate = useNavigate();
  const location = useLocation();
  const { studentTheme } = useTheme();

  const cafeteria = location.state?.cafeteria || 'Old Cafeteria';
  const cafeteriaId = location.state?.cafeteriaId || 'old';
  const sectionId = location.state?.sectionId || 'front';

  const [foodItems, setFoodItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [platesExpanded, setPlatesExpanded] = useState(true);
  const [addonsExpanded, setAddonsExpanded] = useState(true);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        setLoading(true);
        const allMenu = await getMenu();
        const menu = allMenu.filter(item =>
          item.cafeteriaId === cafeteriaId &&
          item.sectionId === sectionId
        );

        if (menu.length === 0) {
          console.warn(`No menu items found for ${cafeteriaId}.`);
        }
        setFoodItems(menu);
      } catch (error) {
        console.error("Failed to fetch menu:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, [cafeteriaId, sectionId]);

  const [builderType, setBuilderType] = useState<'main' | 'swallow'>('main');
  const [currentBuild, setCurrentBuild] = useState<{ [key: string]: number }>({});
  const [selectedSwallow, setSelectedSwallow] = useState<string | null>(null);
  const [selectedSoup, setSelectedSoup] = useState<string | null>(null);
  const [plates, setPlates] = useState<Plate[]>([]);
  const [drinksSnacks, setDrinksSnacks] = useState<{ [key: string]: number }>({});
  const [deliveryMode, setDeliveryMode] = useState<'solo' | 'group'>('solo');
  const [groupSize, setGroupSize] = useState(2);
  const [openPlates, setOpenPlates] = useState<{ [key: string]: boolean }>({});

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

  const updateDrinkSnack = (itemId: string, delta: number) => {
    setDrinksSnacks(prev => {
      const newQty = (prev[itemId] || 0) + delta;
      if (newQty <= 0) {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [itemId]: newQty };
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
    const items: PlateItem[] = Object.entries(currentBuild).map(([itemId, quantity]) => ({
      item: foodItems.find(f => f.id === itemId)!,
      quantity
    }));

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
              <p className="text-sm text-muted-foreground">{cafeteria} • {sectionId.charAt(0).toUpperCase() + sectionId.slice(1)} Section</p>
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
            {/* Plate Type Selector */}
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
                      <GlassCard key={item.id} selected={currentBuild[item.id] > 0}>
                        <div className="space-y-3">
                          <div className="aspect-square rounded-xl overflow-hidden shadow-inner">
                            <ImageWithFallback
                              src={item.image}
                              alt={item.name}
                              className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                            />
                          </div>
                          <div>
                            <h4 className="font-bold text-card-foreground line-clamp-1">{item.name}</h4>
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
                      <GlassCard key={item.id} selected={currentBuild[item.id] > 0}>
                        <div className="space-y-3">
                          <div className="aspect-square rounded-xl overflow-hidden shadow-inner">
                            <ImageWithFallback
                              src={item.image}
                              alt={item.name}
                              className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                            />
                          </div>
                          <div>
                            <h4 className="font-bold text-card-foreground line-clamp-1">{item.name}</h4>
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

                {/* Step 3: Add Extras */}
                <div className="space-y-4">
                  <div>
                    <Badge variant="purple" className="mb-2 uppercase tracking-wider">STEP 3</Badge>
                    <h3 className="text-2xl font-bold">Add Extras</h3>
                    <p className="text-sm text-muted-foreground font-medium">Optional • Multiple selection</p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {foodItems.filter(f => f.category === 'extra').map(item => (
                      <GlassCard key={item.id} selected={currentBuild[item.id] > 0}>
                        <div className="space-y-3">
                          <div className="aspect-square rounded-xl overflow-hidden shadow-inner">
                            <ImageWithFallback
                              src={item.image}
                              alt={item.name}
                              className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                            />
                          </div>
                          <div>
                            <h4 className="font-bold text-card-foreground line-clamp-1">{item.name}</h4>
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
                      <GlassCard key={item.id} selected={selectedSwallow === item.id}>
                        <div className="space-y-3">
                          <div className="aspect-square rounded-xl overflow-hidden shadow-inner">
                            <ImageWithFallback
                              src={item.image}
                              alt={item.name}
                              className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                            />
                          </div>
                          <div>
                            <h4 className="font-bold text-card-foreground line-clamp-1">{item.name}</h4>
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
                      <GlassCard key={item.id} selected={selectedSoup === item.id}>
                        <div className="space-y-3">
                          <div className="aspect-square rounded-xl overflow-hidden shadow-inner">
                            <ImageWithFallback
                              src={item.image}
                              alt={item.name}
                              className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                            />
                          </div>
                          <div>
                            <h4 className="font-bold text-card-foreground line-clamp-1">{item.name}</h4>
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
                      <GlassCard key={item.id} selected={currentBuild[item.id] > 0}>
                        <div className="space-y-3">
                          <div className="aspect-square rounded-xl overflow-hidden shadow-inner">
                            <ImageWithFallback
                              src={item.image}
                              alt={item.name}
                              className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                            />
                          </div>
                          <div>
                            <h4 className="font-bold text-card-foreground line-clamp-1">{item.name}</h4>
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
            <div className="sticky bottom-6 pt-4 z-40">
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

            {/* Drinks & Snacks Section */}
            <div className={`p-6 rounded-2xl border-2 transition-all ${drinksSnacksDisabled
              ? 'border-[#333333] bg-[#222222]/50 opacity-50 pointer-events-none'
              : 'border-[#FCD34D] bg-[#222222]'
              }`}>
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-[#FAF9F6] mb-2">Add Drinks & Snacks (Optional)</h3>
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
                  <div>
                    <h4 className="text-lg font-bold text-[#FAF9F6] mb-4">Drinks</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {foodItems.filter(f => f.category === 'drink').map(item => (
                        <GlassCard key={item.id} selected={drinksSnacks[item.id] > 0}>
                          <div className="space-y-3">
                            <div className="aspect-square rounded-xl overflow-hidden">
                              <ImageWithFallback
                                src={item.image}
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div>
                              <h4 className="font-semibold text-[#FAF9F6]">{item.name}</h4>
                              <p className="text-sm text-[#9C8F7F]">₦{item.price}/{item.unit}</p>
                            </div>
                            <div className="flex items-center justify-between">
                              <button
                                onClick={() => updateDrinkSnack(item.id, -1)}
                                disabled={!drinksSnacks[item.id]}
                                className="w-8 h-8 rounded-lg bg-[#333333] hover:bg-[#7C3AED] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <span className="font-bold text-lg text-[#FAF9F6]">{drinksSnacks[item.id] || 0}</span>
                              <button
                                onClick={() => updateDrinkSnack(item.id, 1)}
                                className="w-8 h-8 rounded-lg bg-[#FCD34D] hover:bg-[#FCD34D]/80 text-[#1A1A1A] transition-colors flex items-center justify-center"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </GlassCard>
                      ))}
                    </div>
                  </div>

                  {/* Snacks */}
                  <div>
                    <h4 className="text-lg font-bold text-[#FAF9F6] mb-4">Snacks</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {foodItems.filter(f => f.category === 'snack').map(item => (
                        <GlassCard key={item.id} selected={drinksSnacks[item.id] > 0}>
                          <div className="space-y-3">
                            <div className="aspect-square rounded-xl overflow-hidden">
                              <ImageWithFallback
                                src={item.image}
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div>
                              <h4 className="font-semibold text-[#FAF9F6]">{item.name}</h4>
                              <p className="text-sm text-[#9C8F7F]">₦{item.price}/{item.unit}</p>
                            </div>
                            <div className="flex items-center justify-between">
                              <button
                                onClick={() => updateDrinkSnack(item.id, -1)}
                                disabled={!drinksSnacks[item.id]}
                                className="w-8 h-8 rounded-lg bg-[#333333] hover:bg-[#7C3AED] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <span className="font-bold text-lg text-[#FAF9F6]">{drinksSnacks[item.id] || 0}</span>
                              <button
                                onClick={() => updateDrinkSnack(item.id, 1)}
                                className="w-8 h-8 rounded-lg bg-[#FCD34D] hover:bg-[#FCD34D]/80 text-[#1A1A1A] transition-colors flex items-center justify-center"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </GlassCard>
                      ))}
                    </div>
                  </div>
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
                      <div className="rounded-xl bg-[#2A2A2A] border border-[#333333] overflow-hidden">
                        <CollapsibleTrigger className="w-full p-4 hover:bg-[#333333] transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <div className="text-left">
                                <h4 className="font-bold text-[#FAF9F6]">
                                  Plate {index + 1} ({plate.type === 'main' ? 'Main' : 'Swallow'})
                                </h4>
                                <p className="text-sm text-[#FCD34D] font-semibold">₦{plate.total.toLocaleString()}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removePlate(plate.id);
                                }}
                                className="p-2 hover:bg-[#7C3AED]/20 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4 text-[#7C3AED]" />
                              </button>
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
                      const item = foodItems.find(f => f.id === itemId)!;
                      return (
                        <div key={itemId} className="flex justify-between text-sm font-medium">
                          <span className="text-muted-foreground">{item.name} ×{quantity}</span>
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
                      <div className="text-xs text-muted-foreground font-bold mt-1">₦700/plate</div>
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
                      <div className="text-xs text-green-500 font-semibold">20% off</div>
                      <div className="text-xs text-muted-foreground font-bold mt-1">₦560/plate</div>
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
                      <span>Group Savings</span>
                      <span>-₦{((DELIVERY_FEE_SOLO - DELIVERY_FEE_GROUP) * plates.length).toLocaleString()}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center py-4 border-t border-border mt-4">
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
                  const drinksSnacksItems = Object.entries(drinksSnacks).map(([itemId, quantity]) => ({
                    item: foodItems.find(f => f.id === itemId)!,
                    quantity
                  }));
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