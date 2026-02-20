import React, { useState, useEffect } from 'react';
import { AdminLayout } from './AdminLayout';
import { Card } from '../../components/design-system/Card';
import { Badge } from '../../components/design-system/Badge';
import { Button } from '../../components/design-system/Button';
import {
    UtensilsCrossed,
    Search,
    Eye,
    EyeOff,
    Edit3,
    Filter,
    Plus,
    Trash2
} from 'lucide-react';
import { getAllMenuItems, updateMenuItem, addMenuItem, deleteMenuItem, MenuItem } from '../../../services/db';
import { useTheme } from '../../../context/ThemeContext';

export default function MenuManagement() {
    const [items, setItems] = useState<MenuItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [activeCafeteria, setActiveCafeteria] = useState<string>('all');
    const [activeSection, setActiveSection] = useState<string>('all');
    const [isAddingItem, setIsAddingItem] = useState(false);
    const [newItem, setNewItem] = useState({
        name: '', price: '', category: 'base', cafeteriaId: 'old', sectionId: 'front', unit: 'plate', isAvailable: true
    });
    const { adminTheme } = useTheme();

    useEffect(() => {
        getAllMenuItems().then(setItems);
    }, []);

    const isDark = adminTheme === 'dark';

    const handleToggleAvailability = async (item: MenuItem) => {
        const newStatus = !item.isAvailable;
        await updateMenuItem(item.id, { isAvailable: newStatus });
        setItems(items.map(i => i.id === item.id ? { ...i, isAvailable: newStatus } : i));
    };

    const handleAddItem = async () => {
        if (!newItem.name || !newItem.price) return;
        try {
            const id = await addMenuItem({
                ...newItem,
                price: Number(newItem.price),
                sectionId: newItem.sectionId as 'front' | 'back'
            });
            setItems([{ ...newItem, id, price: Number(newItem.price), sectionId: newItem.sectionId as 'front' | 'back' }, ...items]);
            setIsAddingItem(false);
            setNewItem({ name: '', price: '', category: 'base', cafeteriaId: 'old', sectionId: 'front', unit: 'plate', isAvailable: true });
        } catch (error) {
            console.error(error);
        }
    };

    const handleDeleteItem = async (id: string) => {
        if (!confirm("Are you sure you want to delete this culinary item?")) return;
        try {
            await deleteMenuItem(id);
            setItems(items.filter(i => i.id !== id));
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

    return (
        <AdminLayout title="Menu Management">
            {/* Top Bar Actions */}
            <div className="flex flex-col md:flex-row gap-6 mb-10">
                <div className="relative flex-1">
                    <Search className={`absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`} />
                    <input
                        type="text"
                        placeholder="Search culinary items..."
                        className={`w-full pl-12 pr-6 py-4 rounded-xl border-2 transition-all outline-none text-sm ${isDark
                            ? 'bg-[#2A2A2A] border-[#333333] text-[#FAF9F6] focus:border-[#7C3AED]'
                            : 'bg-white border-gray-100 text-gray-900 focus:border-[#7C3AED]/30 shadow-sm'
                            }`}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex gap-3">
                    <Button variant="ghost" className={`px-6 py-4 rounded-xl font-bold text-xs uppercase tracking-widest ${isDark ? 'text-[#9C8F7F] hover:text-white hover:bg-[#2A2A2A]' : 'text-gray-500'}`}>
                        Batch Operations
                    </Button>
                    <Button
                        variant="primary"
                        onClick={() => setIsAddingItem(true)}
                        className="px-8 py-4 rounded-xl font-bold text-[10px] uppercase tracking-[0.2em] bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-xl shadow-[#7C3AED]/20">
                        <Plus className="w-4 h-4 mr-2" strokeWidth={3} />
                        New Item
                    </Button>
                </div>
            </div>

            {/* Cafeteria & Section Filters */}
            <div className="flex flex-col md:flex-row gap-8 mb-10 p-8 rounded-[2.5rem] border-2 border-dashed border-[#333333] items-center">
                <div className="flex-1 space-y-3 w-full">
                    <p className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>Select Cafeteria</p>
                    <div className="flex gap-2">
                        {['all', 'old', 'new'].map(caf => (
                            <button
                                key={caf}
                                onClick={() => setActiveCafeteria(caf)}
                                className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border-2 transition-all ${activeCafeteria === caf
                                    ? 'bg-[#7C3AED] border-[#7C3AED] text-white'
                                    : `border-[#333333] ${isDark ? 'text-[#9C8F7F] hover:border-[#444444]' : 'text-gray-500'}`
                                    }`}
                            >
                                {caf === 'all' ? 'All Vendors' : caf === 'old' ? 'Old Cafeteria' : 'New Cafeteria'}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex-1 space-y-3 w-full">
                    <p className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>Select Section</p>
                    <div className="flex gap-2">
                        {['all', 'front', 'back'].map(sec => (
                            <button
                                key={sec}
                                onClick={() => setActiveSection(sec)}
                                className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border-2 transition-all ${activeSection === sec
                                    ? 'bg-[#FCD34D] border-[#FCD34D] text-black'
                                    : `border-[#333333] ${isDark ? 'text-[#9C8F7F] hover:border-[#444444]' : 'text-gray-500'}`
                                    }`}
                            >
                                {sec === 'all' ? 'All Sections' : sec.charAt(0).toUpperCase() + sec.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap gap-3 mb-10">
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeCategory === cat
                            ? 'bg-[#7C3AED] text-white shadow-lg shadow-[#7C3AED]/20'
                            : `border-2 ${isDark ? 'bg-[#2A2A2A] border-[#333333] text-[#9C8F7F] hover:border-[#444444]' : 'bg-white border-gray-100 text-gray-500 hover:border-gray-200'}`
                            }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Items Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredItems.map((item) => (
                    <Card key={item.id} className={`group relative p-0 overflow-hidden border transition-all hover:shadow-2xl ${isDark ? 'bg-[#222222] border-[#333333]' : 'bg-white border-gray-100'
                        } ${!item.isAvailable && 'opacity-60 grayscale'}`}>
                        {/* Image Container */}
                        <div className="h-48 relative overflow-hidden bg-[#2A2A2A]">
                            {item.image ? (
                                <img src={item.image} alt={item.name} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-700" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center opacity-10">
                                    <UtensilsCrossed className="w-12 h-12" />
                                </div>
                            )}
                            <div className="absolute top-4 right-4">
                                <Badge variant={item.isAvailable ? 'green' : 'gray'} className="text-[9px] font-black uppercase tracking-widest py-1.5 px-4 border-none shadow-2xl backdrop-blur-md bg-opacity-80">
                                    {item.isAvailable ? 'Available' : 'Unavailable'}
                                </Badge>
                            </div>
                        </div>

                        {/* Details */}
                        <div className="p-6">
                            <div className="mb-6">
                                <div className="flex justify-between items-start gap-4 mb-2">
                                    <h4 className={`font-black text-lg tracking-tight leading-tight transition-colors ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>{item.name}</h4>
                                    <span className={`font-black text-[#10B981] text-lg whitespace-nowrap`}>₦{item.price.toLocaleString()}</span>
                                </div>
                                <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>{item.category}</p>
                            </div>

                            <div className="flex gap-2 pt-5 border-t border-dashed border-gray-500/10">
                                <Button
                                    variant="ghost"
                                    className={`flex-1 flex gap-2 items-center justify-center py-3 rounded-xl font-bold uppercase tracking-[0.2em] text-[9px] ${isDark ? 'bg-[#2A2A2A] text-[#FAF9F6] hover:bg-[#333333]' : 'bg-gray-50'
                                        }`}
                                    onClick={() => handleToggleAvailability(item)}
                                >
                                    {item.isAvailable ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    <span>{item.isAvailable ? 'Delist' : 'Relist'}</span>
                                </Button>
                                <Button
                                    variant="ghost"
                                    className={`px-4 py-3 rounded-xl transition-all ${isDark ? 'bg-[#2A2A2A] hover:bg-red-500/20 group-hover:block' : 'bg-gray-50'}`}
                                    onClick={() => handleDeleteItem(item.id)}
                                >
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* New Item Modal */}
            {isAddingItem && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setIsAddingItem(false)}></div>
                    <Card className={`relative w-full max-w-2xl p-0 border-none shadow-3xl overflow-hidden rounded-[3rem] ${isDark ? 'bg-[#141414]' : 'bg-white'}`}>
                        <div className="p-10 bg-[#7C3AED] text-white text-center">
                            <h2 className="text-3xl font-black uppercase tracking-[0.3em]">Culinart Asset Entry</h2>
                            <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest mt-2">Executive Menu Management</p>
                        </div>
                        <div className="p-10 grid grid-cols-2 gap-8">
                            <div className="col-span-2 space-y-2">
                                <label className="text-[9px] font-black uppercase text-[#9C8F7F] tracking-widest ml-1">Asset Name</label>
                                <input
                                    type="text"
                                    className={`w-full bg-[#1A1A1A] border-2 border-[#333333] rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-[#7C3AED]`}
                                    placeholder="e.g. Royal Jollof Rice"
                                    value={newItem.name}
                                    onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase text-[#9C8F7F] tracking-widest ml-1">Valuation (₦)</label>
                                <input
                                    type="number"
                                    className={`w-full bg-[#1A1A1A] border-2 border-[#333333] rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-[#7C3AED]`}
                                    placeholder="3500"
                                    value={newItem.price}
                                    onChange={e => setNewItem({ ...newItem, price: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase text-[#9C8F7F] tracking-widest ml-1">Category</label>
                                <select
                                    className={`w-full bg-[#1A1A1A] border-2 border-[#333333] rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-[#7C3AED]`}
                                    value={newItem.category}
                                    onChange={e => setNewItem({ ...newItem, category: e.target.value })}
                                >
                                    <option value="base">Base (Rice/Yam)</option>
                                    <option value="protein">Protein (Meat/Fish)</option>
                                    <option value="extra">Extras (Dodo/Salad)</option>
                                    <option value="drink">Beverage</option>
                                    <option value="snack">Executive Snack</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase text-[#9C8F7F] tracking-widest ml-1">Cafeteria</label>
                                <select
                                    className={`w-full bg-[#1A1A1A] border-2 border-[#333333] rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-[#7C3AED]`}
                                    value={newItem.cafeteriaId}
                                    onChange={e => setNewItem({ ...newItem, cafeteriaId: e.target.value })}
                                >
                                    <option value="old">Old Cafeteria</option>
                                    <option value="new">New Cafeteria</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase text-[#9C8F7F] tracking-widest ml-1">Section</label>
                                <select
                                    className={`w-full bg-[#1A1A1A] border-2 border-[#333333] rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-[#7C3AED]`}
                                    value={newItem.sectionId}
                                    onChange={e => setNewItem({ ...newItem, sectionId: e.target.value })}
                                >
                                    <option value="front">Front (Main Gate Side)</option>
                                    <option value="back">Back (Library Side)</option>
                                </select>
                            </div>
                            <div className="col-span-2 pt-6 flex gap-4">
                                <Button variant="ghost" className="flex-1 py-4 font-bold text-[10px] uppercase tracking-widest text-[#9C8F7F]" onClick={() => setIsAddingItem(false)}>Cancel</Button>
                                <Button variant="primary" className="flex-1 py-4 font-black text-[10px] uppercase tracking-[0.2em] bg-[#7C3AED] text-white" onClick={handleAddItem}>Deploy Asset</Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </AdminLayout>
    );
}
