import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../../../context/AuthContext';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { StatusDot, Badge } from '../../components/design-system/Badge';
import { Search, Wallet, Package, Clock, Utensils, ShoppingBag, Wifi, Shirt, TrendingUp, ChevronRight, ChevronLeft, Store } from 'lucide-react';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { subscribeToPlatformSettings, PlatformSettings } from '../../../services/db';

const CROSS_PRODUCTS = [
  { id: 'm1', type: 'Mart', name: 'Indomie Super Pack (120g)', price: 350, path: '/mart', disabled: false, image: 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?q=80&w=200&auto=format&fit=crop' },
  { id: 'c1', type: 'CalebNet', name: 'MTN 1GB Data (30 Days)', price: 280, path: '/calebnet', disabled: false, image: 'https://images.unsplash.com/photo-1620283085439-3f62eb351e23?q=80&w=200&auto=format&fit=crop' },
  { id: 'f1', type: 'Fashion', name: 'Caleb Classic Tee', price: 6500, path: '/fashion', disabled: true, image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=200&auto=format&fit=crop' },
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

  useEffect(() => {
    const unsub = subscribeToPlatformSettings(setPlatformSettings);
    return () => unsub();
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

  const displayName = user?.displayNameFromProfile || user?.fullName?.split(' ')[0] || user?.email?.split('@')[0] || 'Student';
  const money = (amount: number) => `₦${amount.toLocaleString()}`;

  return (
    <div className="min-h-screen bg-background text-foreground pb-32">
      {/* Top Header Section */}
      <header className="px-6 pt-12 pb-6 flex items-center justify-between pr-20">
        <div>
          <h1 className="text-2xl font-black">{getGreeting()}</h1>
          <p className="text-3xl font-black text-primary">{displayName}</p>
        </div>
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center shadow-sm overflow-hidden border-2 border-border shrink-0 ml-4">
          {user?.photoURL ? (
            <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xl font-black">{displayName.charAt(0)}</span>
          )}
        </div>
      </header>

      <main className="px-6 space-y-8">
        
        {/* At-a-Glance Row */}
        <div className="grid grid-cols-2 gap-4">
          <Link to="/calebnet">
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
            {CROSS_PRODUCTS.map((product) => (
              <Link 
                key={product.id} 
                to={product.disabled ? '#' : product.path}
                className={`flex flex-col min-w-[140px] max-w-[140px] group ${product.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                onClick={(e) => product.disabled && e.preventDefault()}
              >
                <div className="w-full aspect-square rounded-2xl bg-muted mb-3 overflow-hidden border border-border shadow-sm squircle relative flex items-center justify-center group-hover:shadow-md transition-shadow">
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute top-2 left-2 bg-background/90 backdrop-blur text-[9px] font-black uppercase px-2 py-0.5 rounded-full border border-border">
                    {product.type}
                  </div>
                </div>
                <h4 className="text-sm font-bold truncate leading-tight mb-1">{product.name}</h4>
                <p className="text-primary font-black text-sm">{money(product.price)}</p>
              </Link>
            ))}
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

        {/* CalebDeck Local Businesses */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black">Local Businesses</h3>
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
