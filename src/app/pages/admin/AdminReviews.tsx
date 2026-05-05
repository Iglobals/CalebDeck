import React, { useState, useEffect } from 'react';
import { AdminLayout } from './AdminLayout';
import { Card } from '../../components/design-system/Card';
import { Star, MessageSquare, User, Package, UtensilsCrossed, Loader2 } from 'lucide-react';
import { subscribeToReviews, Review } from '../../../services/db';
import { useTheme } from '../../../context/ThemeContext';
import { format } from 'date-fns';

export default function AdminReviews() {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const { adminTheme } = useTheme();
    const isDark = adminTheme === 'dark';

    useEffect(() => {
        const unsub = subscribeToReviews((data) => {
            setReviews(data);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const averageRating = reviews.length > 0 
        ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length 
        : 0;

    if (loading) {
        return (
            <AdminLayout title="Student Reviews">
                <div className="flex flex-col items-center justify-center py-32">
                    <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-3" />
                    <p className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>Loading reviews...</p>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout title="Student Reviews">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card className={`p-6 ${isDark ? 'bg-[#222222]' : 'bg-white'}`}>
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                            <Star className="w-6 h-6 text-amber-500" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Avg Rating</p>
                            <h3 className="text-3xl font-black">{averageRating.toFixed(1)}</h3>
                        </div>
                    </div>
                </Card>
                <Card className={`p-6 ${isDark ? 'bg-[#222222]' : 'bg-white'}`}>
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                            <MessageSquare className="w-6 h-6 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Total Reviews</p>
                            <h3 className="text-3xl font-black">{reviews.length}</h3>
                        </div>
                    </div>
                </Card>
            </div>

            <div className="space-y-6">
                {reviews.map(review => (
                    <Card key={review.id} className={`p-6 ${isDark ? 'bg-[#222222]' : 'bg-white'}`}>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h4 className="text-lg font-bold flex items-center gap-2">
                                    {review.studentName}
                                </h4>
                                <div className="flex gap-1 mt-1 text-amber-500">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'fill-current' : 'text-gray-300'}`} />
                                    ))}
                                </div>
                            </div>
                            <span className="text-sm text-gray-500 font-bold">
                                {review.createdAt?.seconds ? format(new Date(review.createdAt.seconds * 1000), 'PPp') : 'Just now'}
                            </span>
                        </div>
                        
                        {review.feedback && (
                            <div className={`p-4 rounded-xl mb-4 ${isDark ? 'bg-[#333333]' : 'bg-gray-50'} text-sm italic font-medium`}>
                                "{review.feedback}"
                            </div>
                        )}
                        
                        <div className="flex flex-wrap gap-4 text-xs font-bold text-gray-500 uppercase tracking-widest mt-4 pt-4 border-t border-dashed border-gray-500/20">
                            <div className="flex items-center gap-1">
                                <UtensilsCrossed className="w-3 h-3" /> {review.cafeteria}
                            </div>
                            <div className="flex items-center gap-1">
                                <User className="w-3 h-3" /> Rider: {review.riderName}
                            </div>
                            <div className="flex items-center gap-1">
                                <Package className="w-3 h-3" /> Order: {review.orderId ? review.orderId.substring(Math.max(0, review.orderId.length - 6)) : 'N/A'}
                            </div>
                        </div>
                    </Card>
                ))}
                
                {reviews.length === 0 && (
                    <div className="text-center p-12 text-gray-500 font-bold uppercase tracking-widest">
                        No reviews yet
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
