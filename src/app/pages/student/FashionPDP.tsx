import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { Button } from '../../components/design-system/Button';
import { ArrowLeft, ShoppingBag, Plus, Minus } from 'lucide-react';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { useAuth } from '../../../context/AuthContext';
import SEO from '../../components/SEO';
import { useMartCart } from '../../../context/MartCartContext';
import { subscribeToFashionItems, FashionItem } from '../../../services/fashion';
import { toast } from 'sonner';

export default function FashionPDP() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [item, setItem] = useState<FashionItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [activeThumbnail, setActiveThumbnail] = useState<string>('');

  const FALLBACK_ITEMS: FashionItem[] = [
    {
      id: 'f1',
      name: "Men's Pullover Hoodie",
      brand: 'Caleb Originals',
      brandColor: '#FDBA74', // Match the orange bg from inspo
      category: 'Apparel',
      price: 19900,
      inStock: true,
      imageUrl: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=600&auto=format&fit=crop',
      thumbnails: [
        'https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=600&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1578587018452-892bacefd3f2?q=80&w=600&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1556821832-75d117e0ecfa?q=80&w=600&auto=format&fit=crop'
      ],
      sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'],
      colors: ['#F59E0B', '#000000', '#3B82F6', '#93C5FD'],
      description: 'Crafted with premium materials, these pullovers are designed to keep you warm and stylish all season long. Features a relaxed fit and dropped shoulders for maximum comfort.',
      createdAt: new Date().toISOString()
    },
    {
      id: 'f2',
      name: 'Campus Vibe Tote Bag',
      brand: 'Urban Dept',
      brandColor: '#E2E8F0', 
      category: 'Bags',
      price: 4500,
      inStock: true,
      imageUrl: 'https://images.unsplash.com/photo-1597589827317-4c6d6e0a90bd?q=80&w=600&auto=format&fit=crop',
      sizes: ['One Size'],
      colors: ['#E2E8F0', '#1E293B'],
      description: 'Durable canvas tote bag perfect for carrying laptops and books.',
      createdAt: new Date().toISOString()
    },
    {
      id: 'f3',
      name: 'Retro High-Top Sneakers',
      brand: 'Kicks NG',
      brandColor: '#A7F3D0', 
      category: 'Shoes',
      price: 32000,
      inStock: false,
      imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=600&auto=format&fit=crop',
      sizes: ['40', '41', '42', '43', '44', '45'],
      colors: ['#10B981', '#FFFFFF'],
      description: 'Vintage styled high-tops with premium cushioning.',
      createdAt: new Date().toISOString()
    },
    {
      id: 'f4',
      name: 'Essential Graphic Tee',
      brand: 'Caleb Originals',
      brandColor: '#DDD6FE', 
      category: 'Shirts',
      price: 7500,
      inStock: true,
      imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=600&auto=format&fit=crop',
      sizes: ['S', 'M', 'L', 'XL'],
      colors: ['#7C3AED', '#FFFFFF', '#000000'],
      description: '100% cotton graphic tee with minimalist front design.',
      createdAt: new Date().toISOString()
    }
  ];

  const { items: cartItems, addItem, updateQuantity, totalItems } = useMartCart();

  useEffect(() => {
    if (!user) {
      window.location.href = `/api/auth/login?return_to=${encodeURIComponent(window.location.origin + `/fashion/product/${id}`)}`;
      return;
    }
    
    const unsubscribeItems = subscribeToFashionItems((fetchedItems, isFromCache, error) => {
      if (error) {
        setLoading(false);
        const fallback = FALLBACK_ITEMS.find(i => i.id === id);
        setItem(fallback || null);
        return;
      }
      const dataToSearch = fetchedItems.length > 0 ? fetchedItems : FALLBACK_ITEMS;
      const found = dataToSearch.find(i => i.id === id);
      setItem(found || null);
      setLoading(false);
    });

    return () => unsubscribeItems();
  }, [id, user]);

  useEffect(() => {
    if (item) {
      if (item.sizes && item.sizes.length > 0) setSelectedSize(item.sizes[0]);
      if (item.colors && item.colors.length > 0) setSelectedColor(item.colors[0]);
      setActiveThumbnail(item.imageUrl);
    }
  }, [item]);

  const handleAddToCart = () => {
    if (!item || !item.inStock) return;
    
    if (item.sizes && !selectedSize) {
      toast.error('Please select a size');
      return;
    }
    
    const existing = cartItems.find(i => i.id === item.id);
    if (!existing) {
      // Create a unique cart item ID by appending size/color if needed, but for now just use item.id
      // In a real app we would want variants as separate cart items.
      addItem({
        id: item.id,
        name: `${item.name} ${selectedSize ? `(${selectedSize})` : ''}`,
        price: item.price,
        imageUrl: item.imageUrl,
        category: item.category
      });
      toast.success('Added to bag');
      
      // If quantity > 1, we should update it immediately
      if (quantity > 1) {
        // Since addItem might be async state, we ideally pass quantity to addItem.
        // For this demo, we just rely on single adds or a modified context.
        setTimeout(() => updateQuantity(item.id, quantity), 100);
      }
    } else {
      updateQuantity(item.id, existing.quantity + quantity);
      toast.success('Cart updated');
    }
  };

  const handleBuyNow = () => {
    handleAddToCart();
    navigate('/fashion/checkout');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-amber-300 border-t-amber-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-bold mb-2">Product Not Found</h2>
        <Button variant="primary" onClick={() => navigate('/fashion')}>Back to Fashion</Button>
      </div>
    );
  }

  // Define images array including the main image and thumbnails
  const allImages = item.thumbnails?.length ? [item.imageUrl, ...item.thumbnails.filter(t => t !== item.imageUrl)] : [item.imageUrl];

  return (
    <div className="min-h-screen bg-background text-foreground md:bg-muted/10 selection:bg-amber-500/30">
      <SEO
        title={`${item.name} | Fashion`}
        description={item.description || `Buy ${item.name}`}
        canonical={`https://calebdeck.com/fashion/product/${item.id}`}
        image={item.imageUrl}
      />

      {/* Hero Image Section (Fixed for Mobile, Standard for Desktop) */}
      <div 
        className="fixed md:static top-0 left-0 right-0 h-[55vh] md:h-auto md:w-1/2 md:float-left md:sticky md:top-0 transition-colors"
        style={{ backgroundColor: item.brandColor || '#FDBA74' }}
      >
        {/* Transparent Header */}
        <header className="absolute top-0 left-0 right-0 z-40 px-4 py-4 sm:px-6 flex items-center justify-between">
          <button 
            onClick={() => navigate('/fashion')}
            className="w-10 h-10 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white/50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-black" />
          </button>
          
          <span className="font-bold text-black/80">Details</span>
          
          <Link to="/mart/cart" className="relative w-10 h-10 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white/50 transition-colors">
            <ShoppingBag className="w-5 h-5 text-black" />
            {totalItems > 0 && (
              <span className="absolute top-0 right-0 w-4 h-4 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </Link>
        </header>

        {/* Main Image */}
        <div className="absolute inset-0 flex items-center justify-center pt-16 pb-12 px-12 md:relative md:h-[100vh]">
          <ImageWithFallback
            src={activeThumbnail}
            alt={item.name}
            className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal drop-shadow-2xl transition-all duration-300"
          />
        </div>

        {/* Vertical Thumbnails (Right Side) */}
        {allImages.length > 1 && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-20">
            {allImages.slice(0, 4).map((thumb, idx) => (
              <button
                key={idx}
                onClick={() => setActiveThumbnail(thumb)}
                className={`w-12 h-12 rounded-xl bg-white/40 backdrop-blur-md overflow-hidden border-2 transition-all ${
                  activeThumbnail === thumb ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:bg-white/60'
                }`}
              >
                <ImageWithFallback src={thumb} alt={`Thumbnail ${idx}`} className="w-full h-full object-cover mix-blend-multiply" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Sheet / Content Side */}
      <div className="relative z-10 mt-[50vh] md:mt-0 md:ml-[50%] bg-card rounded-t-[32px] md:rounded-none min-h-[50vh] px-6 pt-8 pb-32 shadow-[0_-8px_30px_rgb(0,0,0,0.05)] md:shadow-none">
        
        {/* Header Row: Title & Stepper */}
        <div className="flex justify-between items-start gap-4 mb-2">
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight max-w-[70%]">{item.name}</h1>
          
          <div className="flex items-center justify-between bg-muted/50 rounded-full px-1 py-1 shrink-0">
            <button 
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1 || !item.inStock}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-8 text-center font-semibold text-sm">
              {quantity < 10 ? `0${quantity}` : quantity}
            </span>
            <button 
              onClick={() => setQuantity(quantity + 1)}
              disabled={!item.inStock}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-amber-200 text-amber-900 hover:bg-amber-300 disabled:opacity-50 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Price Row */}
        <div className="mb-8">
          <p className="text-muted-foreground text-sm mb-1">From:</p>
          <p className="text-2xl font-bold">₦{item.price.toLocaleString()}</p>
        </div>

        {/* Color Selection (Circles) */}
        {item.colors && item.colors.length > 0 && (
          <div className="mb-8">
            <p className="font-semibold mb-3">Select Color</p>
            <div className="flex gap-3">
              {item.colors.map(color => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`w-10 h-10 rounded-full border-[3px] transition-all flex items-center justify-center ${
                    selectedColor === color ? 'border-primary scale-110 shadow-sm' : 'border-transparent shadow-sm'
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={`Select color ${color}`}
                >
                  {/* Inner ring for selected state to look like inspo */}
                  {selectedColor === color && (
                    <span className="w-8 h-8 rounded-full border-2 border-background mix-blend-difference" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Size Selection (Pills) */}
        {item.sizes && item.sizes.length > 0 && (
          <div className="mb-8">
            <p className="font-semibold mb-3">Select Size</p>
            <div className="flex flex-wrap gap-2">
              {item.sizes.map(size => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${
                    selectedSize === size
                      ? 'bg-amber-300 text-amber-900 shadow-sm scale-105'
                      : 'bg-muted/50 text-foreground hover:bg-muted'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        <div className="mb-8">
          <p className="font-semibold mb-2">Description</p>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {item.description || 'Premium exclusive fashion item.'}
          </p>
        </div>
      </div>

      {/* Sticky Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 md:left-[50%] bg-card/95 backdrop-blur-xl border-t border-border px-6 py-4 z-40 flex items-center gap-4">
        <Button 
          onClick={handleAddToCart}
          disabled={!item.inStock}
          variant="secondary"
          className="flex-1 h-14 rounded-full border-2 border-muted bg-transparent text-foreground hover:bg-muted font-bold"
        >
          Add to Cart
        </Button>
        <Button 
          onClick={handleBuyNow}
          disabled={!item.inStock}
          variant="primary"
          className="flex-1 h-14 rounded-full bg-amber-300 hover:bg-amber-400 text-amber-900 border-none font-bold shadow-sm"
        >
          Buy Now
        </Button>
      </div>

    </div>
  );
}
