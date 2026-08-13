import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../../../context/AuthContext';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { StatusDot, Badge } from '../../components/design-system/Badge';
import { Search, Wallet, Package, Clock, Utensils, ShoppingBag, Wifi, Shirt, TrendingUp, ChevronRight, ChevronLeft, Store, Plus, Minus } from 'lucide-react';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { subscribeToPlatformSettings, PlatformSettings } from '../../../services/db';
import { useMartCart } from '../../../context/MartCartContext';
import { subscribeToMartItems, MartItem } from '../../../services/mart';

const STATIC_CALEBNET_PRODUCTS = [
  { id: 'calebnet-mtn-1gb', type: 'CalebNet', name: 'MTN 1GB SME (30 Days)', price: 280, path: '/calebnet', disabled: false, icon: 'wifi', network: 'MTN' },
  { id: 'calebnet-mtn-2gb', type: 'CalebNet', name: 'MTN 2GB SME (30 Days)', price: 560, path: '/calebnet', disabled: false, icon: 'wifi', network: 'MTN' },
  { id: 'calebnet-glo-1gb', type: 'CalebNet', name: 'GLO 1GB (30 Days)', price: 250, path: '/calebnet', disabled: false, icon: 'wifi', network: 'GLO' },
  { id: 'calebnet-glo-2gb', type: 'CalebNet', name: 'GLO 2GB (30 Days)', price: 500, path: '/calebnet', disabled: false, icon: 'wifi', network: 'GLO' }
];

const FASHION_PLACEHOLDERS = [
  { id: 'fashion-tee', type: 'Fashion', name: 'Caleb Classic Tee', price: 6500, path: '/fashion', disabled: true, image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=200&auto=format&fit=crop' },
  { id: 'fashion-hoodie', type: 'Fashion', name: 'Caleb Premium Hoodie', price: 12000, path: '/fashion', disabled: true, image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=200&auto=format&fit=crop' }
];


const LOCAL_BUSINESSES = [
  { id: 'b1', name: 'TechHub Gadgets', category: 'Accessories', rating: '4.8', image: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=200&auto=format&fit=crop' },
  { id: 'b2', name: 'Sweet Treats Bakery', category: 'Food & Pastries', rating: '4.9', image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=200&auto=format&fit=crop' },
];

const PROMO_SLIDES = [
  { id: 'slide1', bgClass: 'bg-primary' },
  { id: 'slide2', bgClass: 'bg-primary/90' },
  { id: 'slide3', bgClass: 'bg-primary/80' }
];

export function SignedInHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const { items: cartItems, addItem, updateQuantity } = useMartCart();
  const [exploreMartItems, setExploreMartItems] = useState<any[]>([]);

  useEffect(() => {
    const unsubSettings = subscribeToPlatformSettings(setPlatformSettings);
    const unsubMart = subscribeToMartItems((items) => {
      // Pick top 4 in-stock items
      setExploreMartItems(items.filter(i => i.inStock).slice(0, 4).map(item => ({
        id: item.id,
        type: 'Mart',
        name: item.name,
        price: item.price,
        path: '/mart',
        disabled: false,
        image: item.imageUrl,
        category: item.category
      })));
    });
    return () => {
      unsubSettings();
      unsubMart();
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % PROMO_SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const currentTime = new Date();
  const hour = currentTime.getHours();
  
  const getGreeting = () => {
    if (hour < 12) return 'Good morning,';
    if (hour < 18) return 'Good afternoon,';
    return 'Good evening,';
  };
  
  const openingHour = platformSettings?.systemOpeningHour ?? 10;
  const closingHour = platformSettings?.systemClosingHour ?? 18;
  const isOutOfHours = hour < openingHour || hour >= closingHour;
  const isFoodLocked = platformSettings?.isFoodOrderingClosed === true;
  const isGlobalLocked = platformSettings?.isAcceptingOrders === false;
  const isClosed = !!platformSettings && (isGlobalLocked || isFoodLocked || isOutOfHours);
  
  const statusLabel = isClosed ? 'Closed' : 'Open now';
  const statusType = isClosed ? 'inactive' : 'active';

  const cafeterias = [
    {
      id: 'old',
      name: 'Old Cafeteria',
      image: '/old-cafe-pic.jpeg',
      prepTime: '12 min',
      status: isClosed ? 'closed' : 'open',
      popular: false
    },
    {
      id: 'new',
      name: 'New Cafeteria',
      image: '/new-cafe pic.jpeg',
      status: isClosed ? 'closed' : 'open',
      popular: true
    }
  ];

  const handleCafeteriaClick = (cafeteriaId: string) => {
    if (isClosed) return;
    const cafeteriaName = cafeteriaId === 'old' ? 'Old Cafeteria' : 'New Cafeteria';
    navigate(`/plate-builder/${cafeteriaId}`, {
      state: { cafeteria: cafeteriaName, cafeteriaId, sectionId: 'none' }
    });
  };

  const getCartQuantity = (itemId: string) => {
    return cartItems.find(i => i.id === itemId)?.quantity || 0;
  };

  const rawName = user?.displayNameFromProfile || user?.fullName || user?.email?.split('@')[0] || 'Student';
  const displayName = rawName.split(' ')[0];
  const money = (amount: number) => `₦${amount.toLocaleString()}`;

  return (
    <div className="min-h-screen bg-background text-foreground pb-32">
      {/* Top Header Section */}
      <header className="px-6 pt-[max(3rem,env(safe-area-inset-top))] pb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">{getGreeting()}</h1>
          <p className="text-3xl font-black text-primary truncate max-w-[200px]">{displayName}</p>
        </div>
        <div className="flex items-center justify-end gap-4">
          <Link to="/mart/cart" className="relative rounded-full hover:bg-muted transition-colors">
            <ShoppingBag className="w-6 h-6" />
            {cartItems.reduce((sum, item) => sum + item.quantity, 0) > 0 && (
              <span className="absolute top-0 right-0 w-4 h-4 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center translate-x-1.5 -translate-y-1.5">
                {cartItems.reduce((sum, item) => sum + item.quantity, 0)}
              </span>
            )}
          </Link>
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center shadow-sm overflow-hidden border-2 border-border shrink-0">
            {user?.avatar ? (
              <span className="text-2xl leading-none">{user.avatar}</span>
            ) : user?.photoURL ? (
              <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-lg font-black">{displayName.charAt(0)}</span>
            )}
          </div>
        </div>
      </header>

      <main className="px-6 space-y-8">
        
        {/* At-a-Glance Row */}
        <div className="grid grid-cols-2 gap-4">
          <Link to="/wallet">
            <Card hover className="p-4 flex flex-col justify-between h-full border-border bg-card shadow-sm squircle">
              <div className="flex items-center gap-2 text-muted-foreground mb-4">
                <Wallet className="w-5 h-5 text-primary" />
                <span className="text-xs font-bold uppercase tracking-wider">Wallet</span>
              </div>
              <h2 className="text-xl font-black">{money(user?.walletBalance || 0)}</h2>
            </Card>
          </Link>
          <Link to="/my-orders">
            <Card hover className="p-4 flex flex-col justify-between h-full border-border bg-card shadow-sm squircle">
              <div className="flex items-center gap-2 text-muted-foreground mb-4">
                <Package className="w-5 h-5 text-primary" />
                <span className="text-xs font-bold uppercase tracking-wider">Orders</span>
              </div>
              <h2 className="text-sm font-bold leading-tight">View live<br/>history</h2>
            </Card>
          </Link>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
            <Search className="h-6 w-6 text-muted-foreground" />
          </div>
          <input
            type="text"
            placeholder="Search food, snacks, data..."
            className="w-full pl-14 pr-6 py-5 rounded-[2rem] bg-card border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all text-lg font-medium shadow-sm"
          />
        </div>

        {/* Promo Carousel */}
        <div className={`relative rounded-[2rem] overflow-hidden ${PROMO_SLIDES[currentSlide].bgClass} text-primary-foreground p-8 shadow-xl transition-colors duration-500`}>
          {/* Placeholder for the real product photo background - currently just uses the color class above */}
          <div className="absolute inset-0 bg-black/10 z-0"></div>
          
          <div className="relative z-10 max-w-[70%]">
            <Badge variant="gray" className="bg-white/20 text-white font-bold border-none mb-3 backdrop-blur-md">New!</Badge>
            <h2 className="text-2xl font-black mb-2 leading-tight">CalebDeck Mart is live!</h2>
            <p className="font-bold opacity-90 mb-4 text-sm">Groceries and essentials delivered to your hostel.</p>
            <Link to="/mart">
              <Button variant="secondary" className="bg-background text-foreground hover:bg-muted border-none font-bold rounded-xl text-xs py-2 px-4 h-auto shadow-md">Shop Now</Button>
            </Link>
          </div>
          <ShoppingBag className="absolute right-6 top-1/2 -translate-y-1/2 w-32 h-32 text-black/10 pointer-events-none z-0" />
          
          {/* Carousel indicators */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-10">
            {PROMO_SLIDES.map((_, idx) => (
              <div key={idx} className={`w-2 h-2 rounded-full transition-all ${idx === currentSlide ? 'bg-white w-4' : 'bg-white/50'}`}></div>
            ))}
          </div>
        </div>

        {/* Cross-Product Preview Cards */}
        <div>
          <h3 className="text-lg font-black mb-4">Explore CalebDeck</h3>
          <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar -mx-6 px-6">
            {[...exploreMartItems, ...STATIC_CALEBNET_PRODUCTS, ...FASHION_PLACEHOLDERS].map((product) => {
              if (product.type === 'Mart') {
                const qty = getCartQuantity(product.id);
                return (
                  <div key={product.id} className="flex flex-col min-w-[140px] max-w-[140px] group relative">
                    <div className="w-full aspect-square rounded-2xl bg-muted mb-3 overflow-hidden border border-border shadow-sm squircle relative flex items-center justify-center group-hover:shadow-md transition-shadow">
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute top-2 left-2 bg-background/90 backdrop-blur text-[9px] font-black uppercase px-2 py-0.5 rounded-full border border-border">
                        {product.type}
                      </div>
                      {qty > 0 && (
                        <div className="absolute top-2 right-2 bg-[#10B981] text-white text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-full shadow-lg border-2 border-background animate-in zoom-in z-10">
                          {qty}
                        </div>
                      )}
                    </div>
                    <h4 className="text-sm font-bold truncate leading-tight mb-1">{product.name}</h4>
                    <p className="text-primary font-black text-sm mb-2">{money(product.price)}</p>
                    
                    {qty === 0 ? (
                      <button
                        onClick={() => addItem({ id: product.id, name: product.name, price: product.price, imageUrl: product.image, category: 'Groceries' })}
                        className="w-full h-8 rounded-xl bg-[#10B981] text-white hover:bg-[#059669] transition-all flex items-center justify-center gap-1 shadow-sm font-black uppercase tracking-wider text-[10px]"
                      >
                        <Plus className="w-3 h-3" /> Add
                      </button>
                    ) : (
                      <div className="flex items-center justify-between w-full h-8">
                        <button
                          onClick={() => updateQuantity(product.id, qty - 1)}
                          className="w-8 h-8 rounded-lg bg-muted hover:bg-secondary hover:text-white transition-colors flex items-center justify-center"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-bold text-sm">{qty}</span>
                        <button
                          onClick={() => updateQuantity(product.id, qty + 1)}
                          className="w-8 h-8 rounded-lg bg-[#10B981] text-white transition-colors flex items-center justify-center"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link 
                  key={product.id} 
                  to={product.disabled ? '#' : product.path}
                  state={{ preSelectedPlanId: product.id, preSelectedType: 'DATA', preSelectedNetwork: product.network }}
                  className={`flex flex-col min-w-[140px] max-w-[140px] group ${product.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                  onClick={(e) => product.disabled && e.preventDefault()}
                >
                  <div className={`w-full aspect-square rounded-2xl ${product.icon ? 'bg-[#7C3AED]/10 border-[#7C3AED]/20' : 'bg-muted border-border'} mb-3 overflow-hidden border shadow-sm squircle relative flex items-center justify-center group-hover:shadow-md transition-shadow`}>
                    {product.icon ? (
                      <Wifi className="w-12 h-12 text-[#7C3AED] opacity-80 group-hover:scale-110 group-hover:opacity-100 transition-all duration-300" />
                    ) : (
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                    )}
                    <div className="absolute top-2 left-2 bg-background/90 backdrop-blur text-[9px] font-black uppercase px-2 py-0.5 rounded-full border border-border">
                      {product.type}
                    </div>
                  </div>
                  <h4 className="text-sm font-bold truncate leading-tight mb-1">{product.name}</h4>
                  <p className="text-primary font-black text-sm mb-2">{money(product.price)}</p>
                  
                  <div className="w-full h-8 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all flex items-center justify-center shadow-sm font-black uppercase tracking-wider text-[10px]">
                    Select
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Vendor Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black">Food Vendors</h3>
            {/* "See all" link removed per IA changes */}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {cafeterias.map((cafeteria) => (
              <Card 
                key={cafeteria.id} 
                hover 
                className={`relative overflow-hidden cursor-pointer border-border shadow-sm squircle group ${isClosed ? 'opacity-70' : ''}`}
                onClick={() => handleCafeteriaClick(cafeteria.id)}
              >
                {cafeteria.popular && (
                  <div className="absolute top-4 right-4 z-10">
                    <Badge variant="gold" className="flex items-center gap-1 shadow-md bg-white text-black border-none">
                      <TrendingUp className="w-3 h-3" /> Popular
                    </Badge>
                  </div>
                )}
                <div className="relative h-48 rounded-t-[1.25rem] overflow-hidden">
                  <ImageWithFallback
                    src={cafeteria.image}
                    alt={cafeteria.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                  <div className="absolute bottom-4 left-4">
                    <h2 className="text-2xl font-black text-white mb-1">{cafeteria.name}</h2>
                    <StatusDot status={statusType} label={statusLabel} className="text-white text-xs drop-shadow-md" />
                  </div>
                </div>
                <div className="p-4 bg-card flex items-center justify-between border-t border-border/50">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm font-bold">
                    <Clock className="w-4 h-4" />
                    <span>{cafeteria.prepTime}</span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Utensils className="w-4 h-4" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* CalebDeck Campus Brand */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black">Campus Brand</h3>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar -mx-6 px-6">
            {LOCAL_BUSINESSES.map((business) => (
              <Card 
                key={business.id} 
                className="min-w-[240px] p-3 flex items-center gap-3 border-border shadow-sm squircle opacity-80"
              >
                <div className="w-16 h-16 rounded-xl bg-muted shrink-0 overflow-hidden flex items-center justify-center border border-border">
                  <img src={business.image} alt={business.name} className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-black truncate">{business.name}</h4>
                  <p className="text-[10px] text-muted-foreground font-bold mt-0.5">{business.category}</p>
                  <div className="flex items-center gap-1 mt-1 text-primary">
                    <span className="text-xs font-black">★</span>
                    <span className="text-xs font-bold">{business.rating}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}
