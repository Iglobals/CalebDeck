import { FieldValue, Firestore } from 'firebase-admin/firestore';

export type FashionDeliveryPricingMode = 'FIXED' | 'RANGE';

export interface FashionDeliveryArea {
  id: string;
  name: string;
  enabled: boolean;
  pricingMode: FashionDeliveryPricingMode;
  fixedFee?: number;
  minFee?: number;
  maxFee?: number;
}

export interface FashionDeliveryZone {
  id: string;
  name: string;
  enabled: boolean;
  areas: FashionDeliveryArea[];
}

export interface FashionDeliveryConfig {
  nonStudentDeliveryEnabled: boolean;
  pilotEnabled: boolean;
  seededAt?: unknown;
  seedVersion?: string;
  zones: FashionDeliveryZone[];
}

const area = (id: string, name: string, fixedFee?: number, minFee?: number, maxFee?: number): FashionDeliveryArea => ({
  id,
  name,
  enabled: true,
  pricingMode: minFee !== undefined ? 'RANGE' : 'FIXED',
  ...(minFee !== undefined ? { minFee, maxFee } : { fixedFee }),
});

// Source: CALEBDECK FASHION PRICE LIST.pdf. Keep this disabled until launch approval.
export const INITIAL_FASHION_DELIVERY_ZONES: FashionDeliveryZone[] = [
  { id: 'zone-01', name: '1. Near Island', enabled: true, areas: [area('area-01', 'Balogun, CMS, Marina, Broad Street, Idumota, Tinubu Square, Ebute Ero', 1500)] },
  { id: 'zone-02', name: '2. Near Island', enabled: true, areas: [area('area-02', 'Apongbon, Obalende', 2000)] },
  { id: 'zone-03', name: '3. Island premium districts', enabled: true, areas: [area('area-03', 'Ikoyi, Victoria Island, Onikan, Falomo', 2500)] },
  { id: 'zone-04', name: '4. Island premium districts', enabled: true, areas: [area('area-04', 'Lekki Phase 1, Admiralty, Ikate', 3000)] },
  { id: 'zone-05', name: '5. Lekki corridor', enabled: true, areas: [area('area-05', 'Agungi, Osapa London, Jakande, Chevron', 3500)] },
  { id: 'zone-06', name: '6. Lekki corridor', enabled: true, areas: [area('area-06', 'VGC, Ajah, Abraham Adesanya', 4000)] },
  { id: 'zone-07', name: '7. Lekki corridor', enabled: true, areas: [area('area-07', 'Badore, Sangotedo', 4500)] },
  { id: 'zone-08', name: '8. Lekki corridor', enabled: true, areas: [area('area-08', 'Awoyaya, Lakowe, Eleko', undefined, 5500, 6500)] },
  { id: 'zone-09', name: '9. Inner Mainland', enabled: true, areas: [area('area-09', 'Ebute Metta, Iddo, Oyingbo', 2500)] },
  { id: 'zone-10', name: '10. Inner Mainland', enabled: true, areas: [area('area-10', 'Yaba, Sabo, Jibowu, Ojuelegba', 2500)] },
  { id: 'zone-11', name: '11. Inner Mainland', enabled: true, areas: [area('area-11', 'Surulere, Lawanson, Itire', 3000)] },
  { id: 'zone-12', name: '12. Inner Mainland', enabled: true, areas: [area('area-12', 'Mushin, Shomolu, Bariga', 3000)] },
  { id: 'zone-13', name: '13. Inner Mainland', enabled: true, areas: [area('area-13', 'Gbagada, Anthony, Maryland', 3000)] },
  { id: 'zone-14', name: '14. Inner Mainland', enabled: true, areas: [area('area-14', 'Ilupeju, Palmgrove, Oshodi', 3500)] },
  { id: 'zone-15', name: '15. Ikeja environs', enabled: true, areas: [area('area-15', 'Ikeja, Allen, Opebi, Computer Village', 4000)] },
  { id: 'zone-16', name: '16. Ikeja environs', enabled: true, areas: [area('area-16', 'Ogba, Ojodu, Magodo', 4000)] },
  { id: 'zone-17', name: '17. Ikeja environs', enabled: true, areas: [area('area-17', 'Agege, Iju, Fagba', 4500)] },
  { id: 'zone-18', name: '18. Eastern Mainland', enabled: true, areas: [area('area-18', 'Ketu, Mile 12, Ojota, Ogudu', 3500)] },
  { id: 'zone-19', name: '19. Eastern Mainland', enabled: true, areas: [area('area-19', 'Isolo, Okota, Ejigbo', 3500)] },
  { id: 'zone-20', name: '20. Eastern Mainland', enabled: true, areas: [area('area-20', 'Ikotun, Igando, Idimu, Egbeda, Ipaja, Ayobo, Abule Egba', undefined, 4500, 5000)] },
  { id: 'zone-21', name: '21. Western Mainland', enabled: true, areas: [area('area-21', 'Apapa, Ajegunle', 3500)] },
  { id: 'zone-22', name: '22. Western Mainland', enabled: true, areas: [area('area-22', 'Mile 2, Festac, Amuwo-Odofin, Satellite Town, Alaba, Trade Fair', undefined, 4000, 5000)] },
  { id: 'zone-23', name: '23. Western Mainland', enabled: true, areas: [area('area-23', 'Ojo, Iba', 5000)] },
  { id: 'zone-24', name: '24. Western Mainland', enabled: true, areas: [area('area-24', 'Badagry, Agbara', undefined, 6500, 8000)] },
  { id: 'zone-25', name: '25. Ikorodu corridor', enabled: true, areas: [area('area-25', 'Ikorodu town, Igbogbo, Baiyeku, Ijede', undefined, 5500, 6500)] },
  { id: 'zone-26', name: '26. Epe corridor', enabled: true, areas: [area('area-26', 'Epe town', 7000)] },
  { id: 'zone-27', name: '27. Epe corridor', enabled: true, areas: [area('area-27', 'Farther Epe/Lekki outskirts', undefined, 8000, 10000)] },
];

export const EMPTY_FASHION_DELIVERY_CONFIG: FashionDeliveryConfig = {
  nonStudentDeliveryEnabled: false,
  pilotEnabled: false,
  zones: [],
};

export function normaliseFashionDeliveryConfig(value: any): FashionDeliveryConfig {
  const raw = value || EMPTY_FASHION_DELIVERY_CONFIG;
  return {
    nonStudentDeliveryEnabled: raw.nonStudentDeliveryEnabled === true,
    pilotEnabled: raw.pilotEnabled === true,
    seededAt: raw.seededAt,
    seedVersion: raw.seedVersion,
    zones: Array.isArray(raw.zones) ? raw.zones : [],
  };
}

export function findFashionDeliveryArea(config: FashionDeliveryConfig, areaId: string) {
  for (const zone of config.zones) {
    const found = zone.areas.find((item) => item.id === areaId);
    if (found) return { zone, area: found };
  }
  return null;
}

export function validateFashionDeliveryConfig(config: FashionDeliveryConfig) {
  const ids = new Set<string>();
  for (const zone of config.zones) {
    if (!zone.id || !zone.name.trim()) throw new Error('Every delivery zone needs a name.');
    if (ids.has(zone.id)) throw new Error('Delivery zone IDs must be unique.');
    ids.add(zone.id);
    for (const item of zone.areas) {
      if (!item.id || !item.name.trim() || ids.has(item.id)) throw new Error('Delivery areas must have unique IDs and names.');
      ids.add(item.id);
      if (item.pricingMode === 'FIXED' && !(Number(item.fixedFee) > 0)) throw new Error(`Enter a valid fixed fee for ${item.name}.`);
      if (item.pricingMode === 'RANGE' && (!(Number(item.minFee) > 0) || !(Number(item.maxFee) >= Number(item.minFee)))) throw new Error(`Enter a valid fee range for ${item.name}.`);
    }
  }
}

export async function getFashionDeliveryConfig(db: Firestore) {
  const snap = await db.collection('settings').doc('platform').get();
  return normaliseFashionDeliveryConfig(snap.exists ? snap.data()?.fashionDeliveryConfig : undefined);
}

export async function seedFashionDeliveryConfig(db: Firestore) {
  const settingsRef = db.collection('settings').doc('platform');
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(settingsRef);
    const current = normaliseFashionDeliveryConfig(snap.exists ? snap.data()?.fashionDeliveryConfig : undefined);
    if (current.seedVersion || current.zones.length > 0) throw new Error('FASHION_DELIVERY_ALREADY_SEEDED');
    tx.set(settingsRef, {
      fashionDeliveryConfig: {
        nonStudentDeliveryEnabled: false,
        pilotEnabled: false,
        seedVersion: 'lagos-price-list-v1',
        seededAt: FieldValue.serverTimestamp(),
        zones: INITIAL_FASHION_DELIVERY_ZONES,
      },
    }, { merge: true });
  });
  return normaliseFashionDeliveryConfig({ seedVersion: 'lagos-price-list-v1', zones: INITIAL_FASHION_DELIVERY_ZONES });
}
