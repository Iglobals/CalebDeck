import React, { useState, useEffect, useRef } from 'react';
import { AdminLayout } from './AdminLayout';
import { Card } from '../../components/design-system/Card';
import { Badge } from '../../components/design-system/Badge';
import { Button } from '../../components/design-system/Button';
import {
    UtensilsCrossed,
    Search,
    Eye,
    EyeOff,
    Plus,
    Trash2,
    Upload,
    X
} from 'lucide-react';
import { updateMenuItem, addMenuItem, deleteMenuItem, MenuItem } from '../../../services/db';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { useTheme } from '../../../context/ThemeContext';

const CATEGORIES = [
    { value: 'main', label: 'Main (Rice / Pasta)' },
    { value: 'swallow', label: 'Swallow (Eba / Fufu)' },
    { value: 'protein', label: 'Protein (Meat / Fish)' },
    { value: 'extra', label: 'Extras (Dodo / Salad)' },
    { value: 'soup', label: 'Soup' },
    { value: 'drink', label: 'Drink' },
    { value: 'snack', label: 'Snack' },
];

export default function MenuManagement() {
    const [items, setItems] = useState<MenuItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [activeCafeteria, setActiveCafeteria] = useState<string>('all');
    const [activeSection, setActiveSection] = useState<string>('all');
    const [isAddingItem, setIsAddingItem] = useState(false);
    const [newItem, setNewItem] = useState({
        name: '', price: '', category: 'main', cafeteriaId: 'old', sectionId: 'front', unit: 'plate', isAvailable: true, image: ''
    });
    const [imagePreview, setImagePreview] = useState<string>('');
    const [saving, setSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { adminTheme } = useTheme();

    // Real-time subscription
    useEffect(() => {
        const q = query(collection(db, 'menu_items'), orderBy('category', 'asc'));
        const unsub = onSnapshot(q, (snapshot) => {
            setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem)));
        });
        return () => unsub();
    }, []);

    const isDark = adminTheme === 'dark';

    const handleToggleAvailability = async (item: MenuItem) => {
        const newStatus = !item.isAvailable;
        await updateMenuItem(item.id, { isAvailable: newStatus });
        // Real-time subscription will update automatically
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            alert('Image must be under 2MB');
            return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
            const result = ev.target?.result as string;
            setImagePreview(result);
            setNewItem(prev => ({ ...prev, image: result }));
        };
        reader.readAsDataURL(file);
    };

    const handleAddItem = async () => {
        if (!newItem.name || !newItem.price) return;
        setSaving(true);
        try {
            await addMenuItem({
                ...newItem,
                price: Number(newItem.price),
                sectionId: newItem.sectionId as 'front' | 'back'
            });
            setIsAddingItem(false);
            setNewItem({ name: '', price: '', category: 'main', cafeteriaId: 'old', sectionId: 'front', unit: 'plate', isAvailable: true, image: '' });
            setImagePreview('');
        } catch (error) {
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteItem = async (id: string) => {
        if (!confirm('Are you sure you want to delete this item?')) return;
        try {
            await deleteMenuItem(id);
        } catch (error) {
            console.error(error);
        }
    };

    const categories = ['all', ...Array.from(new Set(items.map(i => i.category)))];

    const filteredItems = items.filter(i => {
        const matchesSearch = i.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = activeCategory === 'all' || i.category === activeCategory;
        const matchesCafeteria = activeCafeteria === 'all' || i.cafeteriaId === activeCafeteria;
        const matchesSection = activeSection === 'all' || i.sectionId === activeSection;
        return matchesSearch && matchesCategory && matchesCafeteria && matchesSection;
    });

    const inputClass = `w-full border-2 rounded-2xl px-5 py-4 font-bold outline-none transition-all focus:border-[#7C3AED] ${isDark
        ? 'bg-[#1A1A1A] border-[#333333] text-white placeholder:text-gray-600'
        : 'bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400'}`;

    return (
        <AdminLayout title="Menu Items">
            {/* Top Bar Actions */}
            <div className="flex flex-col md:flex-row gap-4 mb-8">
                <div className="relative flex-1">
                    <Search className={`absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`} />
                    <input
                        type="text"
                        placeholder="Search menu items..."
                        className={`w-full pl-12 pr-6 py-4 rounded-xl border-2 transition-all outline-none text-sm ${isDark
                            ? 'bg-[#2A2A2A] border-[#333333] text-[#FAF9F6] focus:border-[#7C3AED]'
                            : 'bg-white border-gray-100 text-gray-900 focus:border-[#7C3AED]/30 shadow-sm'}`}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Button
                    variant="primary"
                    onClick={() => setIsAddingItem(true)}
                    className="px-8 py-4 rounded-xl font-bold text-[10px] uppercase tracking-[0.2em] bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-xl shadow-[#7C3AED]/20">
                    <Plus className="w-4 h-4 mr-2" strokeWidth={3} />
                    Add Item
                </Button>
            </div>

            {/* Filters */}
            <div className={`flex flex-col md:flex-row gap-6 mb-8 p-6 rounded-2xl border-2 border-dashed ${isDark ? 'border-[#333333]' : 'border-gray-200'}`}>
                <div className="flex-1 space-y-2 w-full">
                    <p className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>Cafeteria</p>
                    <div className="flex gap-2">
                        {['all', 'old', 'new'].map(caf => (
                            <button key={caf} onClick={() => setActiveCafeteria(caf)}
                                className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border-2 transition-all ${activeCafeteria === caf
                                    ? 'bg-[#7C3AED] border-[#7C3AED] text-white'
                                    : `border-[#333333] ${isDark ? 'text-[#9C8F7F] hover:border-[#444444]' : 'text-gray-500'}`}`}>
                                {caf === 'all' ? 'All' : caf === 'old' ? 'Old Caf' : 'New Caf'}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex-1 space-y-2 w-full">
                    <p className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>Section</p>
                    <div className="flex gap-2">
                        {['all', 'front', 'back'].map(sec => (
                            <button key={sec} onClick={() => setActiveSection(sec)}
                                className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border-2 transition-all ${activeSection === sec
                                    ? 'bg-[#FCD34D] border-[#FCD34D] text-black'
                                    : `border-[#333333] ${isDark ? 'text-[#9C8F7F] hover:border-[#444444]' : 'text-gray-500'}`}`}>
                                {sec === 'all' ? 'All' : sec.charAt(0).toUpperCase() + sec.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Category Pills */}
            <div className="flex flex-wrap gap-2 mb-8">
                {categories.map(cat => (
                    <button key={cat} onClick={() => setActiveCategory(cat)}
                        className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all ${activeCategory === cat
                            ? 'bg-[#7C3AED] text-white shadow-lg shadow-[#7C3AED]/20'
                            : `border-2 ${isDark ? 'bg-[#2A2A2A] border-[#333333] text-[#9C8F7F]' : 'bg-white border-gray-100 text-gray-500'}`}`}>
                        {cat === 'all' ? 'All Items' : cat}
                    </button>
                ))}
            </div>

            {/* Items Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filteredItems.length === 0 && (
                    <div className={`col-span-full p-12 text-center rounded-2xl border-2 border-dashed ${isDark ? 'border-[#333333] text-[#9C8F7F]' : 'border-gray-100 text-gray-400'}`}>
                        <UtensilsCrossed className="w-10 h-10 mx-auto mb-3 opacity-20" />
                        <p className="font-bold text-sm">No items found</p>
                    </div>
                )}
                {filteredItems.map((item) => (
                    <Card key={item.id} className={`group relative p-0 overflow-hidden border transition-all hover:shadow-xl ${isDark ? 'bg-[#222222] border-[#333333]' : 'bg-white border-gray-100'}`}>
                        <div className="h-44 relative overflow-hidden bg-[#2A2A2A]">
                            {item.image ? (
                                <img src={item.image} alt={item.name} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center opacity-10">
                                    <UtensilsCrossed className="w-12 h-12" />
                                </div>
                            )}
                            {/* Unavailable overlay */}
                            {!item.isAvailable && (
                                <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2">
                                    <EyeOff className="w-7 h-7 text-white/80" />
                                    <span className="text-white/80 text-[10px] font-black uppercase tracking-widest">Unavailable</span>
                                </div>
                            )}
                            <div className="absolute top-3 right-3">
                                <Badge variant={item.isAvailable ? 'green' : 'gray'} className="text-[9px] font-black uppercase tracking-widest py-1 px-3 backdrop-blur-md">
                                    {item.isAvailable ? 'Available' : 'Hidden'}
                                </Badge>
                            </div>
                        </div>

                        <div className="p-5">
                            <div className="mb-4">
                                <div className="flex justify-between items-start gap-2 mb-1">
                                    <h4 className={`font-black text-base tracking-tight leading-tight ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>{item.name}</h4>
                                    <span className="font-black text-[#10B981] text-base whitespace-nowrap">₦{item.price?.toLocaleString()}</span>
                                </div>
                                <p className={`text-[10px] font-bold uppercase tracking-[0.15em] ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>{item.category} · {item.cafeteriaId} caf</p>
                            </div>

                            <div className="flex gap-2 pt-4 border-t border-dashed border-gray-500/10">
                                <Button
                                    variant="ghost"
                                    className={`flex-1 flex gap-2 items-center justify-center py-2.5 rounded-xl font-bold uppercase tracking-[0.15em] text-[9px] ${isDark ? 'bg-[#2A2A2A] text-[#FAF9F6] hover:bg-[#333333]' : 'bg-gray-50 hover:bg-gray-100'}`}
                                    onClick={() => handleToggleAvailability(item)}
                                >
                                    {item.isAvailable ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    <span>{item.isAvailable ? 'Mark Unavailable' : 'Mark Available'}</span>
                                </Button>
                                <Button
                                    variant="ghost"
                                    className={`px-3 py-2.5 rounded-xl transition-all ${isDark ? 'bg-[#2A2A2A] hover:bg-red-500/20' : 'bg-gray-50 hover:bg-red-50'}`}
                                    onClick={() => handleDeleteItem(item.id)}
                                >
                                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                </Button>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Add Item Modal */}
            {isAddingItem && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setIsAddingItem(false)}></div>
                    <div className={`relative w-full max-w-xl rounded-3xl shadow-3xl overflow-hidden flex flex-col ${isDark ? 'bg-[#141414]' : 'bg-white'}`}
                        style={{ maxHeight: '90vh' }}>
                        {/* Modal Header */}
                        <div className="p-7 bg-[#7C3AED] text-white flex items-center justify-between flex-shrink-0">
                            <div>
                                <h2 className="text-xl font-black">Add Menu Item</h2>
                                <p className="text-[10px] opacity-70 uppercase tracking-widest mt-1">Fill in the details below</p>
                            </div>
                            <button onClick={() => setIsAddingItem(false)} className="p-2 rounded-xl hover:bg-white/20 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Scrollable Body */}
                        <div className="overflow-y-auto flex-1 p-7 space-y-5">
                            {/* Item Name */}
                            <div className="space-y-1.5">
                                <label className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Item Name</label>
                                <input type="text" className={inputClass} placeholder="e.g. Jollof Rice"
                                    value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} />
                            </div>

                            {/* Price */}
                            <div className="space-y-1.5">
                                <label className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Price (₦)</label>
                                <input type="number" className={inputClass} placeholder="e.g. 1000"
                                    value={newItem.price} onChange={e => setNewItem({ ...newItem, price: e.target.value })} />
                            </div>

                            {/* Category */}
                            <div className="space-y-1.5">
                                <label className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Category</label>
                                <select className={inputClass} value={newItem.category}
                                    onChange={e => setNewItem({ ...newItem, category: e.target.value })}>
                                    {CATEGORIES.map(c => (
                                        <option key={c.value} value={c.value}>{c.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Cafeteria + Section */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Cafeteria</label>
                                    <select className={inputClass} value={newItem.cafeteriaId}
                                        onChange={e => setNewItem({ ...newItem, cafeteriaId: e.target.value })}>
                                        <option value="old">Old Cafeteria</option>
                                        <option value="new">New Cafeteria</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Section</label>
                                    <select className={inputClass} value={newItem.sectionId}
                                        onChange={e => setNewItem({ ...newItem, sectionId: e.target.value })}>
                                        <option value="front">Front Section</option>
                                        <option value="back">Back Section</option>
                                    </select>
                                </div>
                            </div>

                            {/* Image Upload */}
                            <div className="space-y-1.5">
                                <label className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Food Image (optional)</label>
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`relative border-2 border-dashed rounded-2xl h-36 flex flex-col items-center justify-center cursor-pointer transition-all hover:border-[#7C3AED] ${isDark ? 'border-[#333333] hover:bg-[#7C3AED]/5' : 'border-gray-200 hover:bg-purple-50/50'}`}>
                                    {imagePreview ? (
                                        <>
                                            <img src={imagePreview} alt="preview" className="absolute inset-0 w-full h-full object-cover rounded-2xl opacity-70" />
                                            <div className="relative z-10 flex flex-col items-center gap-1">
                                                <Upload className="w-5 h-5 text-white" />
                                                <span className="text-white text-[10px] font-bold">Change image</span>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <Upload className={`w-8 h-8 mb-2 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`} />
                                            <p className={`text-xs font-bold ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>Click to upload image</p>
                                            <p className={`text-[10px] mt-1 ${isDark ? 'text-[#666]' : 'text-gray-300'}`}>PNG, JPG · max 2MB</p>
                                        </>
                                    )}
                                </div>
                                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className={`flex-shrink-0 p-7 flex gap-3 border-t ${isDark ? 'border-[#333333]' : 'border-gray-100'}`}>
                            <Button variant="ghost" className={`flex-1 py-4 font-bold text-[10px] uppercase tracking-widest ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}
                                onClick={() => setIsAddingItem(false)}>Cancel</Button>
                            <Button variant="primary" className="flex-1 py-4 font-black text-[10px] uppercase tracking-[0.2em] bg-[#7C3AED] text-white"
                                onClick={handleAddItem} disabled={saving}>
                                {saving ? 'Saving...' : 'Add to Menu'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
