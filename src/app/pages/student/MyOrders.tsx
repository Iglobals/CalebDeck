import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowLeft, Package, ShoppingBag, Utensils, Wifi, Trash2, Clock, ChevronRight, Smartphone, RotateCcw, Shirt } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { Logo } from '../../components/design-system/Logo';
import { Button } from '../../components/design-system/Button';
import { Card } from '../../components/design-system/Card';
import SEO from '../../components/SEO';
import { getOrderHistory, clearOrderHistory, OrderHistoryEntry } from '../../../services/orderHistory';
import { getOrderById } from '../../../services/db';
import { useAuth } from '../../../context/AuthContext';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../../services/firebase';

const typeConfig: Record<string, { icon: React.ReactNode; color: string; bgColor: string; borderColor: string; label: string }> = {
  food: {
    icon: <Utensils className="w-5 h-5" />,
    color: '#FCD34D',
    bgColor: 'rgba(252,211,77,0.15)',
    borderColor: 'rgba(252,211,77,0.25)',
    label: 'Food'
  },
  combo: {
    icon: <Utensils className="w-5 h-5" />,
    color: '#F59E0B',
    bgColor: 'rgba(245,158,11,0.15)',
    borderColor: 'rgba(245,158,11,0.25)',
    label: 'Combo'
  },
  mart: {
    icon: <ShoppingBag className="w-5 h-5" />,
    color: '#10B981',
    bgColor: 'rgba(16,185,129,0.15)',
    borderColor: 'rgba(16,185,129,0.25)',
    label: 'Mart'
  },
  calebnet: {
    icon: <Wifi className="w-5 h-5" />,
    color: '#3B82F6',
    bgColor: 'rgba(59,130,246,0.15)',
    borderColor: 'rgba(59,130,246,0.25)',
    label: 'CalebNet'
  },
  fashion: {
    icon: <Shirt className="w-5 h-5" />,
    color: 'var(--secondary, #7C3AED)',
    bgColor: 'rgba(124,58,237,0.15)',
    borderColor: 'rgba(124,58,237,0.25)',
    label: 'Fashion'
  }
};

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hrs < 24) return `${hrs}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}

type FilterType = 'all' | 'food' | 'combo' | 'mart' | 'calebnet' | 'fashion';

export default function MyOrders() {
  const navigate = useNavigate();
  const { studentTheme } = useTheme();
  const { user } = useAuth();
  const isAuth = !!user;
  const [orders, setOrders] = useState<OrderHistoryEntry[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null);

  useEffect(() => {
    setOrders(getOrderHistory());
  }, []);

  const filtered = filter === 'all' ? orders : orders.filter(o => o.type === filter);

  const handleClear = () => {
    clearOrderHistory();
    setOrders([]);
    setShowClearConfirm(false);
  };

  const handleTrackOrder = async (order: OrderHistoryEntry) => {
    if (order.type === 'calebnet') {
      navigate(`/calebnet/status/${order.id}`);
      return;
    }

    setTrackingOrderId(order.id);
    try {
      const liveOrder = await getOrderById(order.id);
      navigate('/order-success', {
        state: {
          ...(liveOrder || {}),
          firestoreOrderId: order.id,
          orderId: liveOrder?.orderId || order.orderId,
          total: liveOrder?.total || liveOrder?.totalAmount || order.total,
          status: liveOrder?.status || order.status,
          hostelName: liveOrder?.hostelName || order.hostelName,
          type: liveOrder?.type || order.type,
          orderType: liveOrder?.orderType || order.orderType || (order.type === 'fashion' ? 'FASHION' : undefined),
          showTracking: true,
        },
      });
    } catch (error) {
      console.error('Could not open live tracker:', error);
      navigate('/order-success', {
        state: {
          firestoreOrderId: order.id,
          orderId: order.orderId,
          total: order.total,
          status: order.status,
          hostelName: order.hostelName,
          type: order.type,
          showTracking: true,
        },
      });
    } finally {
      setTrackingOrderId(null);
    }
  };

  const filterButtons: { key: FilterType; label: string; color: string }[] = [
    { key: 'all', label: 'All', color: '#A78BFA' },
    { key: 'food', label: 'Food', color: '#FCD34D' },
    { key: 'mart', label: 'Mart', color: '#10B981' },
    { key: 'fashion', label: 'Fashion', color: '#7C3AED' },
    { key: 'calebnet', label: 'CalebNet', color: '#3B82F6' }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <SEO
        title="My Orders - CalebDeck"
        description="View recent CalebDeck food, mart, and CalebNet activity saved on this device, with quick links back to live order tracking."
        canonical="https://calebdeck.com/my-orders"
        robots="noindex,follow"
      />

      {/* Header */}
      <header className="sticky top-0 bg-background/95 backdrop-blur-sm z-50 border-b border-border shadow-sm transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between pr-16 sm:pr-20">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link 
              to="/" 
              className="p-2 sm:p-2.5 bg-muted/50 hover:bg-muted text-foreground rounded-xl sm:rounded-2xl transition-all duration-200"
              aria-label="Back to Home"
            >
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </Link>
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 sm:w-6 sm:h-6 text-secondary" />
              <h1 className="text-lg sm:text-2xl font-bold tracking-tight">My Orders</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {orders.length > 0 && (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="p-2 text-muted-foreground hover:text-red-400 rounded-xl transition-colors"
                title="Clear history"
                aria-label="Clear local order history"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            <Logo size="sm" />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">

        {/* Device Notice */}
        <div className={`rounded-2xl mb-6 overflow-hidden ${
          studentTheme === 'dark'
            ? 'bg-[#1A1A1A] border border-[#333333]'
            : 'bg-amber-50/50 border border-amber-200/60'
        }`}>
          <div className={`flex items-center gap-3 px-4 py-3 ${
            isAuth ? 'text-amber-600 dark:text-amber-500' : (studentTheme === 'dark' ? 'text-amber-400' : 'text-amber-800')
          }`}>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
              isAuth ? 'bg-amber-100 dark:bg-amber-900/30' : (studentTheme === 'dark' ? 'bg-amber-500/15' : 'bg-amber-200/50')
            }`}>
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-bold">Orders are saved on this device only</p>
              <p className={`text-xs mt-0.5 ${
                isAuth ? 'text-muted-foreground' : (studentTheme === 'dark' ? 'text-[#9C8F7F]' : 'text-amber-700/70')
              }`}>
                Clearing your browser data, switching browsers, or using incognito mode will erase your history.
              </p>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        {orders.length > 0 && (
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-hide">
            {filterButtons.map(fb => {
              const isActive = filter === fb.key;
              return (
                <button
                  key={fb.key}
                  onClick={() => setFilter(fb.key)}
                  className="px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-200"
                  style={{
                    background: isActive ? fb.color : isAuth ? 'var(--muted)' : (studentTheme === 'dark' ? '#1A1A1A' : '#f3f4f6'),
                    color: isActive ? (fb.key === 'food' ? '#1A1A1A' : '#fff') : isAuth ? 'var(--muted-foreground)' : (studentTheme === 'dark' ? '#9C8F7F' : '#6b7280'),
                    border: `1.5px solid ${isActive ? fb.color : isAuth ? 'var(--border)' : (studentTheme === 'dark' ? '#333333' : '#e5e7eb')}`,
                  }}
                >
                  {fb.label}
                  {fb.key === 'all' && ` (${orders.length})`}
                </button>
              );
            })}
          </div>
        )}

        {/* Order List */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className={`w-24 h-24 rounded-[2rem] flex items-center justify-center mb-6 ${
              isAuth ? 'bg-muted' : (studentTheme === 'dark' ? 'bg-[#1A1A1A]' : 'bg-gray-100')
            }`}>
              <Package className="w-10 h-10 text-muted-foreground/50" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold mb-2">
              {orders.length === 0 ? 'No orders yet' : 'No matching orders'}
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base max-w-sm mb-8">
              {orders.length === 0
                ? 'Your completed CalebDeck orders will appear here automatically after payment.'
                : 'Try switching filters to find what you\u0027re looking for.'}
            </p>
            {orders.length === 0 && (
              <div className="flex flex-col sm:flex-row gap-3">
                <Link to="/cafeteria">
                  <Button variant="primary" size="lg">Order Food</Button>
                </Link>
                <Link to="/mart">
                  <Button variant="secondary" size="lg" className="border-[#10B981] text-[#10B981]">Shop Mart</Button>
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((order, idx) => {
              const cfg = typeConfig[order.type] || typeConfig.food;
              return (
                <div
                  key={order.id + idx}
                  className={`group rounded-2xl border p-4 sm:p-5 transition-all duration-300 hover:shadow-lg ${
                    studentTheme === 'dark'
                      ? 'bg-[#1A1A1A] border-[#222222] hover:border-[#333333]'
                      : 'bg-white border-gray-100 hover:border-gray-200'
                  }`}
                  style={{
                    animation: `fadeSlideUp 0.4s ease-out ${idx * 0.05}s both`
                  }}
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    {/* Type Icon */}
                    <div
                      className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ background: cfg.bgColor, color: cfg.color }}
                    >
                      {cfg.icon}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-bold text-sm sm:text-base truncate">{order.summary}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span
                              className="text-xs font-bold px-2 py-0.5 rounded-full"
                              style={{
                                background: cfg.bgColor,
                                color: cfg.color,
                                border: `1px solid ${cfg.borderColor}`
                              }}
                            >
                              {cfg.label}
                            </span>
                            {order.hostelName && (
                              <span className="text-xs text-muted-foreground truncate">
                                → {order.hostelName}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Price */}
                        <p className="font-black text-sm sm:text-base whitespace-nowrap" style={{ color: cfg.color }}>
                          ₦{order.total.toLocaleString()}
                        </p>
                      </div>

                      {/* Bottom row */}
                      <div className="flex items-center justify-between gap-3 mt-3">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="w-3.5 h-3.5" />
                          {formatDate(order.createdAt)}
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          order.status === 'PAID' || order.status === 'SUCCESSFUL' || order.status === 'DELIVERED'
                            ? isAuth ? 'bg-green-500/10 text-green-600 dark:text-green-400' : (studentTheme === 'dark' ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700')
                            : order.status === 'PENDING' || order.status === 'PROCESSING'
                              ? isAuth ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' : (studentTheme === 'dark' ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-700')
                              : isAuth ? 'bg-red-500/10 text-red-600 dark:text-red-400' : (studentTheme === 'dark' ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700')
                        }`}>
                          {order.status}
                        </span>
                      </div>

                      <button
                        onClick={() => handleTrackOrder(order)}
                        disabled={trackingOrderId === order.id}
                        className={`mt-4 w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-black uppercase tracking-widest transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                          studentTheme === 'dark'
                            ? 'bg-[#222222] text-[#FAF9F6] hover:bg-[#2A2A2A] border border-[#333333]'
                            : 'bg-gray-50 text-gray-800 hover:bg-gray-100 border border-gray-100'
                        }`}
                      >
                        {trackingOrderId === order.id ? (
                          <>
                            <RotateCcw className="w-4 h-4 animate-spin" />
                            Opening Tracker
                          </>
                        ) : (
                          <>
                            Track Order
                            <ChevronRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Quick Actions */}
        {orders.length > 0 && (
          <div className={`mt-10 rounded-2xl border p-6 text-center ${
            isAuth ? 'bg-card border-border' : (studentTheme === 'dark' ? 'bg-[#1A1A1A] border-[#222222]' : 'bg-gray-50/50 border-gray-100')
          }`}>
            <p className="text-sm text-muted-foreground mb-4 font-medium">Need something else?</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link to="/cafeteria">
                <Button variant="primary" size="md">Order Food</Button>
              </Link>
              <Link to="/mart">
                <Button variant="secondary" size="md" className="border-[#10B981] text-[#10B981]">Shop Mart</Button>
              </Link>
              <Link to="/calebnet">
                <Button variant="secondary" size="md" className="border-blue-500 text-blue-500">CalebNet</Button>
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-sm rounded-3xl p-8 shadow-2xl ${
            isAuth ? 'bg-card' : (studentTheme === 'dark' ? 'bg-[#1A1A1A]' : 'bg-white')
          }`}>
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-red-500/15 flex items-center justify-center">
              <Trash2 className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-xl font-black text-center mb-2">Clear Order History?</h3>
            <p className="text-sm text-center text-muted-foreground mb-6">
              This will remove all {orders.length} order{orders.length !== 1 ? 's' : ''} from this device. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setShowClearConfirm(false)}
              >
                Cancel
              </Button>
              <button
                onClick={handleClear}
                className="flex-1 py-3 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Animation Keyframes */}
      <style>{`
        @keyframes fadeSlideUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}




