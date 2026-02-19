import React, { useState } from 'react';
import { Button } from '../../components/design-system/Button';
import { Card } from '../../components/design-system/Card';
import { seedData } from '../../../services/seed-data';
import { toast } from 'react-toastify';

export default function SeedData() {
    const [loading, setLoading] = useState(false);

    const handleSeed = async () => {
        if (!confirm("Are you sure? This will overwrite/merge menu data!")) return;

        setLoading(true);
        try {
            await seedData();
            toast.success("Database seeded successfully!");
        } catch (error) {
            console.error(error);
            toast.error("Failed to seed database.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center p-6">
            <Card className="max-w-md w-full text-center">
                <h1 className="text-2xl font-bold mb-4">Database Seeding</h1>
                <p className="mb-6 text-gray-600">
                    This tool will populate Firestore with initial Hostels and Menu Items.
                    Use this only for initialization or debugging.
                </p>

                <Button
                    variant="primary"
                    onClick={handleSeed}
                    disabled={loading}
                    className="w-full"
                >
                    {loading ? "Seeding..." : "Seed Database Now"}
                </Button>
            </Card>
        </div>
    );
}
