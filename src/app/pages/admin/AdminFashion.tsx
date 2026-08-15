import React, { useState, useEffect, useRef } from 'react';
import { AdminLayout } from './AdminLayout';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import {
  Search,
  Plus,
  Trash2,
  Pencil,
  Upload,
  Eye,
  EyeOff,
  Shirt,
  X,
  Loader2
} from 'lucide-react';
import { subscribeToFashionItems, FashionItem, addFashionItem, updateFashionItem, deleteFashionItem } from '../../../services/fashion';
import { useTheme } from '../../../context/ThemeContext';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { removeBackgroundML } from '../../../utils/imageUtils';

const CATEGORIES = ['All', 'Apparel', 'Accessories', 'Footwear', 'Merch'];

export default function AdminFashion() {
  const [items, setItems] = useState<FashionItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingItem, setEditingItem] = useState<FashionItem | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    brandColor: '#F97316',
    price: '',
    category: 'Apparel',
    imageUrl: '',
    description: '',
    inStock: true,
    sizesInput: '',
    colors: [] as string[]
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processingImage, setProcessingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { adminTheme } = useTheme();

  useEffect(() => {
    const unsub = subscribeToFashionItems((data) => {
      setItems(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.brand.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { 
      alert('Please select an image smaller than 2MB'); 
      return; 
    }
    
    setProcessingImage(true);
    try {
      // Automatically remove background for clean catalog presentation
      const transparentDataUrl = await removeBackgroundML(file);
      setFormData(prev => ({ ...prev, imageUrl: transparentDataUrl }));
    } catch (err) {
      console.error('Background removal failed, using original image:', err);
      // Fallback to raw image if processing fails
      const reader = new FileReader();
      reader.onload = (ev) => {
        setFormData(prev => ({ ...prev, imageUrl: ev.target?.result as string }));
      };
      reader.readAsDataURL(file);
    } finally {
      setProcessingImage(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price || !formData.imageUrl || !formData.brand) return;

    setSaving(true);
    try {
      const itemData = {
        name: formData.name,
        brand: formData.brand,
        brandColor: formData.brandColor,
        description: formData.description,
        price: Number(formData.price),
        category: formData.category,
        imageUrl: formData.imageUrl,
        inStock: formData.inStock,
        sizes: formData.sizesInput ? formData.sizesInput.split(',').map(s => s.trim()).filter(s => s !== '') : [],
        colors: formData.colors
      };

      if (editingItem) {
        await updateFashionItem(editingItem.id, itemData);
      } else {
        await addFashionItem(itemData);
      }
      
      setIsAdding(false);
      setEditingItem(null);
      setFormData({ name: '', brand: '', brandColor: '#F97316', description: '', price: '', category: 'Apparel', imageUrl: '', inStock: true, sizesInput: '', colors: [] });
    } catch (err) {
      console.error("Error saving fashion item", err);
      alert("Failed to save item. Check console.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: FashionItem) => {
    setFormData({
      name: item.name,
      brand: item.brand,
      brandColor: item.brandColor || '#F97316',
      description: item.description || '',
      price: item.price.toString(),
      category: item.category,
      imageUrl: item.imageUrl || '',
      inStock: item.inStock,
      sizesInput: item.sizes ? item.sizes.join(', ') : '',
      colors: item.colors || []
    });
    setEditingItem(item);
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this fashion item?')) {
      await deleteFashionItem(id);
    }
  };

  const handleToggleStock = async (item: FashionItem) => {
    await updateFashionItem(item.id, { inStock: !item.inStock });
  };

  const isDark = adminTheme === 'dark';

  return (
    <AdminLayout title="Fashion Inventory">
      <div className="space-y-6">
        
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="relative w-full sm:w-96">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`} />
            <input
              type="text"
              placeholder="Search fashion items or brands..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-3 rounded-xl border-2 outline-none transition-all ${
                isDark 
                ? 'border-[#333333] bg-[#222222] text-[#FAF9F6] focus:border-[#7C3AED]' 
                : 'border-gray-200 bg-white text-gray-900 focus:border-[#7C3AED]/50'
              }`}
            />
          </div>
          
          <Button 
            variant="primary" 
            onClick={() => {
              setEditingItem(null);
              setFormData({ name: '', brand: '', brandColor: '#F97316', description: '', price: '', category: 'Apparel', imageUrl: '', inStock: true, sizesInput: '', colors: [] });
              setIsAdding(true);
            }}
            className="flex items-center gap-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white"
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
                ? 'bg-[#7C3AED] text-white shadow-md'
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
                  <Shirt className="w-12 h-12 text-[#7C3AED]/30" />
                )}
                
                <div className="absolute bottom-2 left-2 px-2 py-1 bg-background/80 backdrop-blur-md rounded-md border border-border flex items-center gap-1.5 shadow-sm">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.brandColor || '#F97316' }}></div>
                  <span className="text-[10px] font-bold uppercase tracking-wider">{item.brand}</span>
                </div>

                <div className="absolute top-2 right-2 flex gap-1">
                  <button 
                    onClick={() => handleToggleStock(item)}
                    className="p-1.5 rounded-lg bg-background/80 backdrop-blur shadow-sm hover:bg-background transition-colors"
                    title={item.inStock ? "Mark Out of Stock" : "Mark In Stock"}
                  >
                    {item.inStock ? <Eye className="w-4 h-4 text-[#10B981]" /> : <EyeOff className="w-4 h-4 text-red-500" />}
                  </button>
                </div>
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <span className="text-xs font-bold text-[#7C3AED] uppercase tracking-wider mb-1">{item.category}</span>
                <h3 className="font-bold text-sm mb-2 line-clamp-2 flex-1">{item.name}</h3>
                <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/50">
                  <span className="font-black text-[#F97316]">₦{item.price}</span>
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
            <Card className="w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className={`p-4 sm:p-6 border-b flex justify-between items-center ${isDark ? 'border-[#333333]' : 'border-gray-100'}`}>
                <h2 className="text-xl font-bold">{editingItem ? 'Edit Fashion Item' : 'Add New Fashion Item'}</h2>
                <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-muted rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto custom-scrollbar">
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
                      disabled={processingImage}
                    >
                      {processingImage ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Removing Background...</>
                      ) : (
                        <><Upload className="w-4 h-4" /> {formData.imageUrl ? 'Change Image' : 'Upload Image'}</>
                      )}
                    </Button>
                  </div>
                  {formData.imageUrl && (
                    <div className="w-20 h-20 rounded-xl bg-muted/50 border-2 border-border overflow-hidden flex items-center justify-center flex-shrink-0">
                      <img src={formData.imageUrl} alt="Preview" className="max-w-full max-h-full object-contain" />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Item Name</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      placeholder="e.g. Classic Varsity Jacket"
                      className={`w-full px-4 py-3 rounded-xl border-2 outline-none ${
                        isDark ? 'border-[#333333] bg-[#2A2A2A] focus:border-[#7C3AED]' : 'border-gray-200 focus:border-[#7C3AED]/50'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Brand</label>
                    <input
                      type="text"
                      required
                      value={formData.brand}
                      onChange={e => setFormData({...formData, brand: e.target.value})}
                      placeholder="e.g. i-CON Apparel"
                      className={`w-full px-4 py-3 rounded-xl border-2 outline-none ${
                        isDark ? 'border-[#333333] bg-[#2A2A2A] focus:border-[#7C3AED]' : 'border-gray-200 focus:border-[#7C3AED]/50'
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-1">
                    <label className="block text-sm font-semibold mb-2">Brand Color</label>
                    <input
                      type="color"
                      value={formData.brandColor}
                      onChange={e => setFormData({...formData, brandColor: e.target.value})}
                      className="w-full h-12 p-1 rounded-xl cursor-pointer"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-sm font-semibold mb-2">Price (₦)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={formData.price}
                      onChange={e => setFormData({...formData, price: e.target.value})}
                      className={`w-full px-4 py-3 rounded-xl border-2 outline-none ${
                        isDark ? 'border-[#333333] bg-[#2A2A2A] focus:border-[#7C3AED]' : 'border-gray-200 focus:border-[#7C3AED]/50'
                      }`}
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-sm font-semibold mb-2">Category</label>
                    <select
                      value={formData.category}
                      onChange={e => setFormData({...formData, category: e.target.value})}
                      className={`w-full px-4 py-3 rounded-xl border-2 outline-none ${
                        isDark ? 'border-[#333333] bg-[#2A2A2A] focus:border-[#7C3AED]' : 'border-gray-200 focus:border-[#7C3AED]/50'
                      }`}
                    >
                      {CATEGORIES.filter(c => c !== 'All').map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Available Sizes</label>
                    <input
                      type="text"
                      value={formData.sizesInput}
                      onChange={e => setFormData({...formData, sizesInput: e.target.value})}
                      placeholder="e.g. S, M, L, XL (Comma separated)"
                      className={`w-full px-4 py-3 rounded-xl border-2 outline-none ${
                        isDark ? 'border-[#333333] bg-[#2A2A2A] focus:border-[#7C3AED]' : 'border-gray-200 focus:border-[#7C3AED]/50'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="flex text-sm font-semibold mb-2 items-center justify-between">
                      Available Colors
                      <button type="button" onClick={() => setFormData({...formData, colors: [...formData.colors, '#000000']})} className="text-[#7C3AED] hover:text-[#6D28D9] text-xs font-bold flex items-center">
                        <Plus className="w-3 h-3 mr-1"/> Add Color
                      </button>
                    </label>
                    <div className="flex flex-wrap gap-2 items-center h-12">
                      {formData.colors.map((color, idx) => (
                        <div key={idx} className="relative flex items-center group">
                          <input
                            type="color"
                            value={color}
                            onChange={(e) => {
                              const newColors = [...formData.colors];
                              newColors[idx] = e.target.value;
                              setFormData({...formData, colors: newColors});
                            }}
                            className="w-10 h-10 p-1 rounded-xl cursor-pointer"
                          />
                          <button 
                            type="button" 
                            onClick={() => {
                              const newColors = formData.colors.filter((_, i) => i !== idx);
                              setFormData({...formData, colors: newColors});
                            }} 
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      {formData.colors.length === 0 && <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>No specific colors</span>}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Description</label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    className={`w-full px-4 py-3 rounded-xl border-2 outline-none resize-none ${
                      isDark ? 'border-[#333333] bg-[#2A2A2A] focus:border-[#7C3AED]' : 'border-gray-200 focus:border-[#7C3AED]/50'
                    }`}
                  ></textarea>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="inStock"
                    checked={formData.inStock}
                    onChange={e => setFormData({...formData, inStock: e.target.checked})}
                    className="w-5 h-5 rounded accent-[#7C3AED]"
                  />
                  <label htmlFor="inStock" className="font-semibold cursor-pointer">In Stock</label>
                </div>

                <div className="pt-4 border-t border-border flex justify-end gap-3 sticky bottom-0 bg-card py-2">
                  <Button type="button" variant="ghost" onClick={() => setIsAdding(false)}>Cancel</Button>
                  <Button type="submit" variant="primary" disabled={saving || processingImage || !formData.imageUrl} className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white min-w-[120px]">
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
