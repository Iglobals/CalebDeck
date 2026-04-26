import React, { useState, useEffect, useRef } from 'react';
import { AdminLayout } from './AdminLayout';
import { Card } from '../../components/design-system/Card';
import { Badge } from '../../components/design-system/Badge';
import { Button } from '../../components/design-system/Button';
import {
  Package,
  Search,
  Plus,
  Trash2,
  Pencil,
  Upload,
  Eye,
  EyeOff,
  Image as ImageIcon,
  X
} from 'lucide-react';
import { subscribeToMartItems, MartItem, addMartItem, updateMartItem, deleteMartItem } from '../../../services/mart';
import { useTheme } from '../../../context/ThemeContext';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';

const CATEGORIES = [
  'All', 
  'Breakfast & Cereals', 
  'Spreads & Snacks', 
  'Sugar & Beverages', 
  'Perfumes', 
  'Personal Care', 
  'Clothing & Accessories', 
  'Home & Living'
];

export default function AdminMartInventory() {
  const [items, setItems] = useState<MartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingItem, setEditingItem] = useState<MartItem | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    category: 'Snacks',
    imageUrl: '',
    inStock: true
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { adminTheme } = useTheme();

  useEffect(() => {
    const unsub = subscribeToMartItems((data) => {
      setItems(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { 
      alert('Please select an image smaller than 2MB'); 
      return; 
    }
    
    const reader = new FileReader();
    reader.onload = (ev) => {
      setFormData(prev => ({ ...prev, imageUrl: ev.target?.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price || !formData.imageUrl) return;

    setSaving(true);
    try {
      const itemData = {
        name: formData.name,
        price: Number(formData.price),
        category: formData.category,
        imageUrl: formData.imageUrl,
        inStock: formData.inStock
      };

      if (editingItem) {
        await updateMartItem(editingItem.id, itemData);
      } else {
        await addMartItem(itemData);
      }
      
      setIsAdding(false);
      setEditingItem(null);
      setFormData({ name: '', price: '', category: 'Snacks', imageUrl: '', inStock: true });
    } catch (err) {
      console.error("Error saving mart item", err);
      alert("Failed to save item. Check console.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: MartItem) => {
    setFormData({
      name: item.name,
      price: item.price.toString(),
      category: item.category,
      imageUrl: item.imageUrl || '',
      inStock: item.inStock
    });
    setEditingItem(item);
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      await deleteMartItem(id);
    }
  };

  const handleToggleStock = async (item: MartItem) => {
    await updateMartItem(item.id, { inStock: !item.inStock });
  };

  const isDark = adminTheme === 'dark';

  return (
    <AdminLayout title="Mart Inventory">
      <div className="space-y-6">
        
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="relative w-full sm:w-96">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`} />
            <input
              type="text"
              placeholder="Search mart items..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-3 rounded-xl border-2 outline-none transition-all ${
                isDark 
                ? 'border-[#333333] bg-[#222222] text-[#FAF9F6] focus:border-[#10B981]' 
                : 'border-gray-200 bg-white text-gray-900 focus:border-[#10B981]/50'
              }`}
            />
          </div>
          
          <Button 
            variant="primary" 
            onClick={() => {
              setEditingItem(null);
              setFormData({ name: '', price: '', category: 'Snacks', imageUrl: '', inStock: true });
              setIsAdding(true);
            }}
            className="flex items-center gap-2 bg-[#10B981] hover:bg-[#059669] text-white"
          >
            <Plus className="w-5 h-5" /> Add New Item
          </Button>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${
                activeCategory === cat
                ? 'bg-[#10B981] text-white shadow-md'
                : isDark
                  ? 'bg-[#222222] text-[#9C8F7F] hover:bg-[#333333]'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Items Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
          {loading ? (
            Array(10).fill(0).map((_, i) => (
              <div key={i} className={`h-64 rounded-2xl animate-pulse ${isDark ? 'bg-[#333333]' : 'bg-gray-200'}`}></div>
            ))
          ) : filteredItems.map(item => (
            <Card key={item.id} className={`overflow-hidden flex flex-col ${!item.inStock ? 'opacity-60 grayscale-[0.5]' : ''}`}>
              <div className={`relative h-40 flex items-center justify-center p-4 ${isDark ? 'bg-[#222222]' : 'bg-gray-50'}`}>
                {item.imageUrl ? (
                  <ImageWithFallback src={item.imageUrl} alt={item.name} className="w-full h-full object-contain drop-shadow-lg" />
                ) : (
                  <Package className="w-12 h-12 text-gray-300" />
                )}
                <div className="absolute top-2 right-2 flex gap-1">
                  <button 
                    onClick={() => handleToggleStock(item)}
                    className="p-1.5 rounded-lg bg-background/80 backdrop-blur shadow-sm hover:bg-background transition-colors"
                    title={item.inStock ? "Mark Out of Stock" : "Mark In Stock"}
                  >
                    {item.inStock ? <Eye className="w-4 h-4 text-green-500" /> : <EyeOff className="w-4 h-4 text-red-500" />}
                  </button>
                </div>
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <span className="text-xs font-bold text-[#10B981] uppercase tracking-wider mb-1">{item.category}</span>
                <h3 className="font-bold text-sm mb-2 line-clamp-2 flex-1">{item.name}</h3>
                <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/50">
                  <span className="font-black">₦{item.price}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleEdit(item)} className="p-1.5 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(item.id)} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Add/Edit Modal */}
        {isAdding && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <Card className="w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className={`p-4 sm:p-6 border-b flex justify-between items-center ${isDark ? 'border-[#333333]' : 'border-gray-100'}`}>
                <h2 className="text-xl font-bold">{editingItem ? 'Edit Mart Item' : 'Add New Mart Item'}</h2>
                <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-muted rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-5">
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <label className="block text-sm font-semibold mb-2">Item Image</label>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      ref={fileInputRef}
                      onChange={handleImageUpload}
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full flex items-center justify-center gap-2"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-4 h-4" /> {formData.imageUrl ? 'Change Image' : 'Upload Image'}
                    </Button>
                  </div>
                  {formData.imageUrl && (
                    <div className="w-20 h-20 rounded-xl bg-muted/50 border-2 border-border overflow-hidden flex items-center justify-center flex-shrink-0">
                      <img src={formData.imageUrl} alt="Preview" className="max-w-full max-h-full object-contain" />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Item Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g. Minimie Chinchin"
                    className={`w-full px-4 py-3 rounded-xl border-2 outline-none ${
                      isDark ? 'border-[#333333] bg-[#2A2A2A] focus:border-[#10B981]' : 'border-gray-200 focus:border-[#10B981]/50'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Price (₦)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={formData.price}
                      onChange={e => setFormData({...formData, price: e.target.value})}
                      className={`w-full px-4 py-3 rounded-xl border-2 outline-none ${
                        isDark ? 'border-[#333333] bg-[#2A2A2A] focus:border-[#10B981]' : 'border-gray-200 focus:border-[#10B981]/50'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Category</label>
                    <select
                      value={formData.category}
                      onChange={e => setFormData({...formData, category: e.target.value})}
                      className={`w-full px-4 py-3 rounded-xl border-2 outline-none ${
                        isDark ? 'border-[#333333] bg-[#2A2A2A] focus:border-[#10B981]' : 'border-gray-200 focus:border-[#10B981]/50'
                      }`}
                    >
                      {CATEGORIES.filter(c => c !== 'All').map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="inStock"
                    checked={formData.inStock}
                    onChange={e => setFormData({...formData, inStock: e.target.checked})}
                    className="w-5 h-5 rounded accent-[#10B981]"
                  />
                  <label htmlFor="inStock" className="font-semibold cursor-pointer">In Stock</label>
                </div>

                <div className="pt-4 border-t border-border flex justify-end gap-3">
                  <Button type="button" variant="ghost" onClick={() => setIsAdding(false)}>Cancel</Button>
                  <Button type="submit" variant="primary" disabled={saving || !formData.imageUrl} className="bg-[#10B981] hover:bg-[#059669] text-white min-w-[120px]">
                    {saving ? 'Saving...' : 'Save Item'}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

      </div>
    </AdminLayout>
  );
}
