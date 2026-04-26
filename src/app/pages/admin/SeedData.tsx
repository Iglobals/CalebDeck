import React, { useState } from 'react';
import { Button } from '../../components/design-system/Button';
import { Card } from '../../components/design-system/Card';
import { seedData, seedMartItems } from '../../../services/seed-data';
import { toast } from 'react-toastify';

export default function SeedData() {
    const [loading, setLoading] = useState(false);
    const [martLoading, setMartLoading] = useState(false);

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

    const handleSeedMart = async () => {
        if (!confirm("Are you sure? This will overwrite existing Caleb Mart items!")) return;

        setMartLoading(true);
        try {
            await seedMartItems();
            toast.success("Mart items seeded successfully!");
        } catch (error) {
            console.error(error);
            toast.error("Failed to seed mart items.");
        } finally {
            setMartLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center p-6 gap-6">
            <Card className="max-w-md w-full text-center">
                <h1 className="text-2xl font-bold mb-4">Database Seeding</h1>
                <p className="mb-6 text-gray-600">
                    This tool will populate Firestore with initial Hostels and Menu Items.
                    Use this only for initialization or debugging.
                </p>

                <Button
                    variant="primary"
                    onClick={handleSeed}
                    disabled={loading || martLoading}
                    className="w-full"
                >
                    {loading ? "Seeding..." : "Seed Food Menu Now"}
                </Button>
            </Card>

            <Card className="max-w-md w-full text-center border-purple-200 bg-purple-50">
                <h1 className="text-2xl font-bold mb-4 text-purple-800">Caleb Mart Seeding</h1>
                <p className="mb-6 text-purple-700">
                    This tool will populate Firestore with the initial Caleb Mart inventory (Provisions, Snacks, Toiletries, etc.).
                </p>

                <Button
                    variant="primary"
                    onClick={handleSeedMart}
                    disabled={loading || martLoading}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                >
                    {martLoading ? "Seeding..." : "Seed Mart Inventory Now"}
                </Button>
            </Card>
        </div>
    );
}
