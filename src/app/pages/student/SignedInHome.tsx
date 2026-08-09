import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../../../context/AuthContext';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { StatusDot, Badge } from '../../components/design-system/Badge';
import { Search, Wallet, Package, Clock, Utensils, ShoppingBag, Wifi, Shirt, TrendingUp } from 'lucide-react';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { subscribeToPlatformSettings, PlatformSettings } from '../../../services/db';

const CATEGORIES = [
  { id: 'mart', name: 'Mart', icon: ShoppingBag, color: 'text-[#10B981]', bg: 'bg-[#10B981]/10', path: '/mart' },
  { id: 'calebnet', name: 'CalebNet', icon: Wifi, color: 'text-blue-500', bg: 'bg-blue-500/10', path: '/calebnet' },
  { id: 'fashion', name: 'Fashion', icon: Shirt, color: 'text-purple-500', bg: 'bg-purple-500/10', path: '/fashion', disabled: true },
];

export function SignedInHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);

  useEffect(() => {
    const unsub = subscribeToPlatformSettings(setPlatformSettings);
    return () => unsub();
  }, []);

  const currentTime = new Date();
  const hour = currentTime.getHours();
  
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
    if (cafeteriaId === 'old') {
      navigate(`/plate-builder/${cafeteriaId}`, {
        state: { cafeteria: 'Old Cafeteria', cafeteriaId, sectionId: 'none' }
      });
    } else {
      navigate('/cafeteria');
    }
  };

  const displayName = user?.displayNameFromProfile || user?.fullName?.split(' ')[0] || user?.email?.split('@')[0] || 'Student';
  const money = (amount: number) => `₦${amount.toLocaleString()}`;

  return (
    <div className="min-h-screen bg-background text-foreground pb-32">
      {/* Top Header Section */}
      <header className="px-6 pt-12 pb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Good afternoon,</h1>
          <p className="text-3xl font-black text-primary">{displayName}</p>
        </div>
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center shadow-sm overflow-hidden border-2 border-border">
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
                <Package className="w-5 h-5" />
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

        {/* Promo Banner */}
        <div className="relative rounded-[2rem] overflow-hidden bg-primary text-primary-foreground p-8 shadow-xl">
          <div className="relative z-10 max-w-[70%]">
            <Badge variant="gray" className="bg-white/20 text-black border-none mb-3 backdrop-blur-none">New!</Badge>
            <h2 className="text-2xl font-black mb-2 leading-tight">CalebDeck Mart is live!</h2>
            <p className="font-bold opacity-80 mb-4 text-sm">Groceries and essentials delivered to your hostel.</p>
            <Link to="/mart">
              <Button variant="secondary" className="bg-black text-white hover:bg-black/80 border-none font-bold rounded-xl text-xs py-2 px-4 h-auto">Shop Now</Button>
            </Link>
          </div>
          <div className="absolute right-[-20%] bottom-[-20%] w-48 h-48 bg-white/20 rounded-full blur-2xl pointer-events-none"></div>
          <ShoppingBag className="absolute right-6 top-1/2 -translate-y-1/2 w-32 h-32 text-black/10 pointer-events-none" />
        </div>

        {/* Cross-Product Row */}
        <div>
          <h3 className="text-lg font-black mb-4">Explore CalebDeck</h3>
          <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar -mx-6 px-6">
            {CATEGORIES.map((cat) => (
              <Link 
                key={cat.id} 
                to={cat.disabled ? '#' : cat.path}
                className={`flex flex-col items-center gap-3 min-w-[80px] group ${cat.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                onClick={(e) => cat.disabled && e.preventDefault()}
              >
                <div className={`w-16 h-16 rounded-2xl ${cat.bg} flex items-center justify-center transition-transform group-hover:scale-105 squircle`}>
                  <cat.icon className={`w-8 h-8 ${cat.color}`} />
                </div>
                <span className="text-xs font-bold text-center">{cat.name}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Vendor Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black">Food Vendors</h3>
            <Link to="/cafeteria" className="text-sm font-bold text-primary hover:underline">See all</Link>
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
                <div className="p-4 bg-card flex items-center justify-between">
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

      </main>
    </div>
  );
}
