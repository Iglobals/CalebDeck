import React, { useState } from 'react';
import { Button } from '../components/design-system/Button';
import { seedInitialCombos } from '../../services/combo-data';
import { toast } from 'react-toastify';
import { ArrowLeft, Database } from 'lucide-react';
import { useNavigate } from 'react-router';

export default function SeedCombos() {
  const [isSeeding, setIsSeeding] = useState(false);
  const navigate = useNavigate();

  const handleSeed = async () => {
    try {
      setIsSeeding(true);
      const count = await seedInitialCombos();
      if (count > 0) {
        toast.success(`Successfully seeded ${count} combos to Firestore!`);
      } else {
        toast.info('Combo packs collection is not empty. Clear it first to re-seed.');
      }
    } catch (error) {
      console.error('Error seeding combos:', error);
      toast.error('Failed to seed combos to Firestore. Check console for details.');
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl shadow-black/5 flex flex-col items-center text-center">
        <div className="w-16 h-16 bg-[#7C3AED]/10 rounded-2xl flex items-center justify-center mb-6 text-[#7C3AED]">
          <Database className="w-8 h-8" strokeWidth={2.5} />
        </div>
        
        <h1 className="text-2xl font-black text-gray-900 mb-2">Seed Combos</h1>
        <p className="text-sm font-medium text-gray-500 mb-8">
          Upload the default combo packs from the local data file into the Firestore database.
        </p>

        <div className="flex flex-col gap-4 w-full">
          <Button 
            variant="primary" 
            size="lg" 
            onClick={handleSeed} 
            disabled={isSeeding}
            className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-lg shadow-[#7C3AED]/20"
          >
            {isSeeding ? 'Seeding Database...' : 'Seed Combos to Firestore'}
          </Button>

          <Button 
            variant="ghost" 
            onClick={() => navigate('/admin/menu')}
            className="w-full text-gray-500 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Admin Menu
          </Button>
        </div>
      </div>
    </div>
  );
}
