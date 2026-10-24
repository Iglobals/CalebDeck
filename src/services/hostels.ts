export type HostelRuleType =
  | 'DOWNSTAIRS_COLLECTION'
  | 'FEMALE_HOSTEL_PICKUP'
  | 'CUSTOM'
  | 'NONE';

export interface HostelAcknowledgementRecord {
  required: boolean;
  accepted: boolean;
  acceptedAt?: string;
  hostelId: string;
  hostelName: string;
  title: string;
  message: string;
  checkboxLabel: string;
  collectionInstruction: string;
  pickupPoint: string;
  ruleType?: HostelRuleType;
}

export interface HostelConfig {
  id: string;
  name: string;
  isActive: boolean;
  isArchived?: boolean;
  gender?: 'male' | 'female' | 'mixed';
  isPremiumDelivery?: boolean;
  requiresAcknowledgement: boolean;
  acknowledgementTitle?: string;
  acknowledgementMessage?: string;
  acknowledgementCheckboxLabel?: string;
  collectionInstruction?: string;
  pickupPoint?: string;
  ruleType?: HostelRuleType;
  assignedRiderIds?: string[];
  defaultRiderId?: string;
  assistantRiderId?: string;
  updatedAt?: any;
}

export const DAVID_HOSTEL_DEFAULT_MESSAGE =
  "Please note: Riders cannot enter David’s Hostel unless they are authorized residents. If you select this hostel, you must come downstairs to collect your order. Please confirm that you understand and agree before continuing.";

export const DAVID_HOSTEL_DEFAULT_CHECKBOX =
  "I understand that riders cannot enter David’s Hostel and I agree to come downstairs to collect my order.";

export const DAVID_HOSTEL_DEFAULT_COLLECTION_INSTRUCTION =
  "Riders cannot enter David’s Hostel unless they are authorized residents. Student must come downstairs to collect their order.";

export const DAVID_HOSTEL_DEFAULT_PICKUP_POINT =
  "Downstairs at David's Hostel entrance";

export const FEMALE_HOSTEL_DEFAULT_MESSAGE =
  "Because riders cannot enter the female hostel premises, all orders for your hostel will be delivered to the designated external pickup point. You will need to meet the rider at the pickup location when they call.";

export const FEMALE_HOSTEL_DEFAULT_CHECKBOX =
  "I understand and agree to meet the rider at the designated pickup point outside my hostel.";

export const FEMALE_HOSTEL_DEFAULT_COLLECTION_INSTRUCTION =
  "Riders cannot enter female hostel premises. Student must meet the rider at the designated external pickup point.";

export const DEFAULT_HOSTELS: HostelConfig[] = [
  {
    id: 'david',
    name: "David's Hostel",
    isActive: true,
    gender: 'male',
    isPremiumDelivery: false,
    requiresAcknowledgement: true,
    ruleType: 'DOWNSTAIRS_COLLECTION',
    acknowledgementTitle: "David's Hostel Collection Requirement",
    acknowledgementMessage: DAVID_HOSTEL_DEFAULT_MESSAGE,
    acknowledgementCheckboxLabel: DAVID_HOSTEL_DEFAULT_CHECKBOX,
    collectionInstruction: DAVID_HOSTEL_DEFAULT_COLLECTION_INSTRUCTION,
    pickupPoint: DAVID_HOSTEL_DEFAULT_PICKUP_POINT,
    assignedRiderIds: [],
  },
  {
    id: 'deborah',
    name: 'Deborah Hall',
    isActive: true,
    gender: 'female',
    isPremiumDelivery: true,
    requiresAcknowledgement: true,
    ruleType: 'FEMALE_HOSTEL_PICKUP',
    acknowledgementTitle: 'Female Hostel Delivery Notice',
    acknowledgementMessage: FEMALE_HOSTEL_DEFAULT_MESSAGE,
    acknowledgementCheckboxLabel: FEMALE_HOSTEL_DEFAULT_CHECKBOX,
    collectionInstruction: 'Riders cannot enter Deborah Hall. Student must meet the rider at the Front of Mass Comm Building.',
    pickupPoint: 'Front of Mass Comm Building',
    assignedRiderIds: [],
  },
  {
    id: 'mercy',
    name: 'Mercy Hall',
    isActive: true,
    gender: 'female',
    isPremiumDelivery: true,
    requiresAcknowledgement: true,
    ruleType: 'FEMALE_HOSTEL_PICKUP',
    acknowledgementTitle: 'Female Hostel Delivery Notice',
    acknowledgementMessage: FEMALE_HOSTEL_DEFAULT_MESSAGE,
    acknowledgementCheckboxLabel: FEMALE_HOSTEL_DEFAULT_CHECKBOX,
    collectionInstruction: 'Riders cannot enter Mercy Hall. Student must meet the rider at the Front of Mass Comm Building.',
    pickupPoint: 'Front of Mass Comm Building',
    assignedRiderIds: [],
  },
  {
    id: 'mary',
    name: 'Mary Hall',
    isActive: true,
    gender: 'female',
    isPremiumDelivery: true,
    requiresAcknowledgement: true,
    ruleType: 'FEMALE_HOSTEL_PICKUP',
    acknowledgementTitle: 'Female Hostel Delivery Notice',
    acknowledgementMessage: FEMALE_HOSTEL_DEFAULT_MESSAGE,
    acknowledgementCheckboxLabel: FEMALE_HOSTEL_DEFAULT_CHECKBOX,
    collectionInstruction: 'Riders cannot enter Mary Hall. Student must meet the rider at Caleb Medicals.',
    pickupPoint: 'Caleb Medicals',
    assignedRiderIds: [],
  },
  {
    id: 'esme',
    name: 'Esme Hall',
    isActive: true,
    gender: 'female',
    isPremiumDelivery: true,
    requiresAcknowledgement: true,
    ruleType: 'FEMALE_HOSTEL_PICKUP',
    acknowledgementTitle: 'Female Hostel Delivery Notice',
    acknowledgementMessage: FEMALE_HOSTEL_DEFAULT_MESSAGE,
    acknowledgementCheckboxLabel: FEMALE_HOSTEL_DEFAULT_CHECKBOX,
    collectionInstruction: 'Riders cannot enter Esme Hall. Student must meet the rider at Caleb Medicals.',
    pickupPoint: 'Caleb Medicals',
    assignedRiderIds: [],
  },
  {
    id: 'rebecca',
    name: 'Rebecca Hall',
    isActive: true,
    gender: 'female',
    isPremiumDelivery: true,
    requiresAcknowledgement: true,
    ruleType: 'FEMALE_HOSTEL_PICKUP',
    acknowledgementTitle: 'Female Hostel Delivery Notice',
    acknowledgementMessage: FEMALE_HOSTEL_DEFAULT_MESSAGE,
    acknowledgementCheckboxLabel: FEMALE_HOSTEL_DEFAULT_CHECKBOX,
    collectionInstruction: 'Riders cannot enter Rebecca Hall. Student must meet the rider at Caleb Medicals.',
    pickupPoint: 'Caleb Medicals',
    assignedRiderIds: [],
  },
  {
    id: 'sussana',
    name: 'Sussana Hall',
    isActive: true,
    gender: 'female',
    isPremiumDelivery: true,
    requiresAcknowledgement: true,
    ruleType: 'FEMALE_HOSTEL_PICKUP',
    acknowledgementTitle: 'Female Hostel Delivery Notice',
    acknowledgementMessage: FEMALE_HOSTEL_DEFAULT_MESSAGE,
    acknowledgementCheckboxLabel: FEMALE_HOSTEL_DEFAULT_CHECKBOX,
    collectionInstruction: 'Riders cannot enter Sussana Hall. Student must meet the rider at Caleb Medicals.',
    pickupPoint: 'Caleb Medicals',
    assignedRiderIds: [],
  },
  {
    id: 'levi',
    name: 'Levi Hall',
    isActive: true,
    gender: 'male',
    isPremiumDelivery: false,
    requiresAcknowledgement: false,
    ruleType: 'NONE',
    collectionInstruction: 'Standard delivery to the front of the hostel/reception.',
    pickupPoint: 'Front of your hostel/reception',
    assignedRiderIds: [],
  },
  {
    id: 'integrity',
    name: 'Integrity Hall',
    isActive: true,
    gender: 'male',
    isPremiumDelivery: false,
    requiresAcknowledgement: false,
    ruleType: 'NONE',
    collectionInstruction: 'Standard delivery to the front of the hostel/reception.',
    pickupPoint: 'Front of your hostel/reception',
    assignedRiderIds: [],
  },
  {
    id: 'elisha',
    name: 'Elisha Hall',
    isActive: true,
    gender: 'male',
    isPremiumDelivery: false,
    requiresAcknowledgement: false,
    ruleType: 'NONE',
    collectionInstruction: 'Standard delivery to the front of the hostel/reception.',
    pickupPoint: 'Front of your hostel/reception',
    assignedRiderIds: [],
  },
  {
    id: 'joseph',
    name: 'Joseph Hall',
    isActive: true,
    gender: 'male',
    isPremiumDelivery: false,
    requiresAcknowledgement: false,
    ruleType: 'NONE',
    collectionInstruction: 'Standard delivery to the front of the hostel/reception.',
    pickupPoint: 'Front of your hostel/reception',
    assignedRiderIds: [],
  },
  {
    id: 'joshua',
    name: 'Joshua Hall',
    isActive: true,
    gender: 'male',
    isPremiumDelivery: false,
    requiresAcknowledgement: false,
    ruleType: 'NONE',
    collectionInstruction: 'Standard delivery to the front of the hostel/reception.',
    pickupPoint: 'Front of your hostel/reception',
    assignedRiderIds: [],
  },
];

export function normalizeHostelKey(value: string | null | undefined): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/\s+/g, ' ');
}

export function slugifyHostelId(name: string): string {
  const cleaned = normalizeHostelKey(name)
    .replace(/\b(hostel|hall)\b/g, '')
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (cleaned === 'davids' || cleaned === 'david') return 'david';
  return cleaned || `hostel-${Date.now().toString(36)}`;
}

export function isDavidHostelKey(value: string | null | undefined): boolean {
  const key = normalizeHostelKey(value);
  return (
    key === 'david' ||
    key === 'davids' ||
    key === 'david hostel' ||
    key === 'davids hostel' ||
    key === 'david hall' ||
    key === 'davids hall' ||
    key.includes('david hostel') ||
    key.includes('davids hostel')
  );
}

export function isLegacyFemaleHostelKey(
  value: string | null | undefined,
  premiumHostels?: string[]
): boolean {
  const key = normalizeHostelKey(value);
  if (!key) return false;
  if (isDavidHostelKey(key)) return false;

  const list =
    Array.isArray(premiumHostels) && premiumHostels.length > 0
      ? premiumHostels.map(h => normalizeHostelKey(h)).filter(Boolean)
      : ['sussana', 'rebecca', 'mary', 'esme', 'deborah', 'mercy'];

  return list.some(token => token && key.includes(token));
}

export function getDefaultHostelByKey(idOrName: string | null | undefined): HostelConfig | undefined {
  const key = normalizeHostelKey(idOrName);
  if (!key) return undefined;
  if (isDavidHostelKey(key)) {
    return DEFAULT_HOSTELS.find(h => h.id === 'david');
  }
  return DEFAULT_HOSTELS.find(
    h =>
      normalizeHostelKey(h.id) === key ||
      normalizeHostelKey(h.name) === key ||
      key.includes(normalizeHostelKey(h.id))
  );
}

/**
 * Merges Firestore hostel documents and optional platformSettings.hostelConfigs
 * with the authoritative DEFAULT_HOSTELS list so that:
 * 1. David's Hostel and all default hostels exist out of the box even before manual seeding.
 * 2. Legacy hostel docs missing restriction fields inherit their appropriate defaults.
 * 3. Admin-configured hostels (added, renamed, disabled, custom restrictions) take full precedence.
 */
export function mergeHostelsWithDefaults(
  firestoreHostels?: Partial<HostelConfig>[] | null,
  platformSettings?: { premiumHostels?: string[]; hostelConfigs?: Partial<HostelConfig>[] } | null,
  options?: { includeInactive?: boolean; includeArchived?: boolean }
): HostelConfig[] {
  const includeInactive = options?.includeInactive ?? false;
  const includeArchived = options?.includeArchived ?? false;

  const byId = new Map<string, HostelConfig>();

  // 1. Seed with defaults
  for (const def of DEFAULT_HOSTELS) {
    byId.set(def.id, { ...def, assignedRiderIds: [...(def.assignedRiderIds || [])] });
  }

  // Helper to merge a partial config into the map
  const applyConfig = (raw: Partial<HostelConfig> | null | undefined) => {
    if (!raw) return;
    const rawId = String(raw.id || '').trim();
    const rawName = String(raw.name || '').trim();
    if (!rawId && !rawName) return;

    // Match existing default by ID or by David/name match
    let targetId = rawId;
    if (!byId.has(targetId)) {
      const matchedDefault = getDefaultHostelByKey(rawId || rawName);
      if (matchedDefault && (!rawId || normalizeHostelKey(rawId) === normalizeHostelKey(matchedDefault.id))) {
        targetId = matchedDefault.id;
      } else if (!targetId) {
        targetId = slugifyHostelId(rawName);
      }
    }

    const existing = byId.get(targetId);
    const defaultMatch = existing || getDefaultHostelByKey(targetId) || getDefaultHostelByKey(rawName);

    const isDavid = isDavidHostelKey(targetId) || isDavidHostelKey(rawName);
    const isFemale =
      raw.isPremiumDelivery !== undefined
        ? Boolean(raw.isPremiumDelivery)
        : isLegacyFemaleHostelKey(targetId, platformSettings?.premiumHostels) ||
          isLegacyFemaleHostelKey(rawName, platformSettings?.premiumHostels) ||
          Boolean(defaultMatch?.isPremiumDelivery);

    const requiresAcknowledgement =
      typeof raw.requiresAcknowledgement === 'boolean'
        ? raw.requiresAcknowledgement
        : defaultMatch
        ? defaultMatch.requiresAcknowledgement
        : isDavid || isFemale;

    const ruleType: HostelRuleType =
      raw.ruleType ||
      defaultMatch?.ruleType ||
      (isDavid
        ? 'DOWNSTAIRS_COLLECTION'
        : isFemale
        ? 'FEMALE_HOSTEL_PICKUP'
        : requiresAcknowledgement
        ? 'CUSTOM'
        : 'NONE');

    const defaultPickupPoint =
      defaultMatch?.pickupPoint ||
      (isDavid
        ? DAVID_HOSTEL_DEFAULT_PICKUP_POINT
        : isFemale
        ? normalizeHostelKey(rawName || targetId).includes('deborah') ||
          normalizeHostelKey(rawName || targetId).includes('mercy')
          ? 'Front of Mass Comm Building'
          : 'Caleb Medicals'
        : 'Front of your hostel/reception');

    const pickupPoint = String(raw.pickupPoint || existing?.pickupPoint || defaultPickupPoint).trim();

    const defaultTitle =
      defaultMatch?.acknowledgementTitle ||
      (isDavid
        ? "David's Hostel Collection Requirement"
        : isFemale
        ? 'Female Hostel Delivery Notice'
        : `${rawName || existing?.name || 'Hostel'} Delivery Notice`);

    const defaultMessage =
      defaultMatch?.acknowledgementMessage ||
      (isDavid
        ? DAVID_HOSTEL_DEFAULT_MESSAGE
        : isFemale
        ? FEMALE_HOSTEL_DEFAULT_MESSAGE
        : `Please note: Delivery to ${rawName || existing?.name || 'this hostel'} requires student collection at ${pickupPoint}. Please confirm that you understand and agree before continuing.`);

    const defaultCheckbox =
      defaultMatch?.acknowledgementCheckboxLabel ||
      (isDavid
        ? DAVID_HOSTEL_DEFAULT_CHECKBOX
        : isFemale
        ? FEMALE_HOSTEL_DEFAULT_CHECKBOX
        : `I understand and agree to follow the collection instructions for ${rawName || existing?.name || 'this hostel'}.`);

    const defaultCollectionInstruction =
      defaultMatch?.collectionInstruction ||
      (isDavid
        ? DAVID_HOSTEL_DEFAULT_COLLECTION_INSTRUCTION
        : isFemale
        ? `Riders cannot enter ${rawName || existing?.name || 'female hostel'}. Student must meet the rider at ${pickupPoint}.`
        : requiresAcknowledgement
        ? `Student must collect order at: ${pickupPoint}.`
        : 'Standard delivery to the front of the hostel/reception.');

    const merged: HostelConfig = {
      id: targetId,
      name: rawName || existing?.name || defaultMatch?.name || targetId,
      isActive: typeof raw.isActive === 'boolean' ? raw.isActive : existing?.isActive ?? true,
      isArchived: typeof raw.isArchived === 'boolean' ? raw.isArchived : existing?.isArchived ?? false,
      gender: raw.gender || existing?.gender || defaultMatch?.gender || (isFemale ? 'female' : 'male'),
      isPremiumDelivery: isDavid ? Boolean(raw.isPremiumDelivery) : isFemale,
      requiresAcknowledgement,
      ruleType,
      acknowledgementTitle: String(raw.acknowledgementTitle || existing?.acknowledgementTitle || defaultTitle).trim(),
      acknowledgementMessage: String(raw.acknowledgementMessage || existing?.acknowledgementMessage || defaultMessage).trim(),
      acknowledgementCheckboxLabel: String(
        raw.acknowledgementCheckboxLabel || existing?.acknowledgementCheckboxLabel || defaultCheckbox
      ).trim(),
      collectionInstruction: String(
        raw.collectionInstruction || existing?.collectionInstruction || defaultCollectionInstruction
      ).trim(),
      pickupPoint,
      assignedRiderIds: Array.isArray(raw.assignedRiderIds)
        ? raw.assignedRiderIds
        : existing?.assignedRiderIds || [],
      defaultRiderId: raw.defaultRiderId !== undefined ? raw.defaultRiderId : existing?.defaultRiderId,
      assistantRiderId: raw.assistantRiderId !== undefined ? raw.assistantRiderId : existing?.assistantRiderId,
      updatedAt: raw.updatedAt ?? existing?.updatedAt,
    };

    byId.set(targetId, merged);
  };

  // 2. Apply platformSettings.hostelConfigs if present
  if (Array.isArray(platformSettings?.hostelConfigs)) {
    for (const cfg of platformSettings!.hostelConfigs!) {
      applyConfig(cfg);
    }
  }

  // 3. Apply Firestore hostel documents (authoritative collection)
  if (Array.isArray(firestoreHostels)) {
    for (const docItem of firestoreHostels) {
      applyConfig(docItem);
    }
  }

  // 4. Sync with platformSettings.premiumHostels if any custom token was added there
  if (Array.isArray(platformSettings?.premiumHostels)) {
    for (const hostel of byId.values()) {
      if (isDavidHostelKey(hostel.id) || isDavidHostelKey(hostel.name)) continue;
      if (
        isLegacyFemaleHostelKey(hostel.id, platformSettings.premiumHostels) ||
        isLegacyFemaleHostelKey(hostel.name, platformSettings.premiumHostels)
      ) {
        hostel.isPremiumDelivery = true;
      }
    }
  }

  const all = Array.from(byId.values());
  return all.filter(h => {
    if (!includeArchived && h.isArchived) return false;
    if (!includeInactive && !h.isActive) return false;
    return true;
  });
}

export function findHostelConfig(
  hostelIdOrName: string | null | undefined,
  hostels?: Partial<HostelConfig>[] | null,
  platformSettings?: { premiumHostels?: string[]; hostelConfigs?: Partial<HostelConfig>[] } | null
): HostelConfig | undefined {
  const key = normalizeHostelKey(hostelIdOrName);
  if (!key) return undefined;

  const merged = mergeHostelsWithDefaults(hostels, platformSettings, {
    includeInactive: true,
    includeArchived: true,
  });

  // Exact ID or name match first
  const exact = merged.find(
    h => normalizeHostelKey(h.id) === key || normalizeHostelKey(h.name) === key
  );
  if (exact) return exact;

  // David's Hostel alias match
  if (isDavidHostelKey(key)) {
    return merged.find(h => h.id === 'david' || isDavidHostelKey(h.name));
  }

  // Substring match (e.g. "deborah" in "Deborah Hall")
  return merged.find(
    h =>
      (normalizeHostelKey(h.id) && key.includes(normalizeHostelKey(h.id))) ||
      (normalizeHostelKey(h.name) && key.includes(normalizeHostelKey(h.name)))
  );
}

export interface ResolvedHostelRestriction {
  required: boolean;
  hostelId: string;
  hostelName: string;
  title: string;
  message: string;
  checkboxLabel: string;
  collectionInstruction: string;
  pickupPoint: string;
  isPremiumDelivery: boolean;
  ruleType: HostelRuleType;
  isActive: boolean;
}

export function resolveHostelRestriction(
  hostelIdOrName: string | null | undefined,
  hostels?: Partial<HostelConfig>[] | null,
  platformSettings?: { premiumHostels?: string[]; hostelConfigs?: Partial<HostelConfig>[] } | null
): ResolvedHostelRestriction {
  const raw = String(hostelIdOrName || '').trim();
  if (!raw) {
    return {
      required: false,
      hostelId: '',
      hostelName: '',
      title: '',
      message: '',
      checkboxLabel: '',
      collectionInstruction: '',
      pickupPoint: 'Front of your hostel/reception',
      isPremiumDelivery: false,
      ruleType: 'NONE',
      isActive: true,
    };
  }

  const matched = findHostelConfig(raw, hostels, platformSettings);
  if (matched) {
    return {
      required: Boolean(matched.requiresAcknowledgement),
      hostelId: matched.id,
      hostelName: matched.name,
      title: matched.acknowledgementTitle || `${matched.name} Delivery Notice`,
      message:
        matched.acknowledgementMessage ||
        (isDavidHostelKey(matched.id)
          ? DAVID_HOSTEL_DEFAULT_MESSAGE
          : FEMALE_HOSTEL_DEFAULT_MESSAGE),
      checkboxLabel:
        matched.acknowledgementCheckboxLabel ||
        (isDavidHostelKey(matched.id)
          ? DAVID_HOSTEL_DEFAULT_CHECKBOX
          : FEMALE_HOSTEL_DEFAULT_CHECKBOX),
      collectionInstruction:
        matched.collectionInstruction ||
        (isDavidHostelKey(matched.id)
          ? DAVID_HOSTEL_DEFAULT_COLLECTION_INSTRUCTION
          : `Student must collect order at ${matched.pickupPoint || 'the designated pickup point'}.`),
      pickupPoint: matched.pickupPoint || 'Front of your hostel/reception',
      isPremiumDelivery: Boolean(matched.isPremiumDelivery),
      ruleType: matched.ruleType || (matched.requiresAcknowledgement ? 'CUSTOM' : 'NONE'),
      isActive: matched.isActive !== false && !matched.isArchived,
    };
  }

  // Fallback for unknown hostel string that matches David's or legacy female hostel list
  if (isDavidHostelKey(raw)) {
    return {
      required: true,
      hostelId: 'david',
      hostelName: "David's Hostel",
      title: "David's Hostel Collection Requirement",
      message: DAVID_HOSTEL_DEFAULT_MESSAGE,
      checkboxLabel: DAVID_HOSTEL_DEFAULT_CHECKBOX,
      collectionInstruction: DAVID_HOSTEL_DEFAULT_COLLECTION_INSTRUCTION,
      pickupPoint: DAVID_HOSTEL_DEFAULT_PICKUP_POINT,
      isPremiumDelivery: false,
      ruleType: 'DOWNSTAIRS_COLLECTION',
      isActive: true,
    };
  }

  if (isLegacyFemaleHostelKey(raw, platformSettings?.premiumHostels)) {
    const key = normalizeHostelKey(raw);
    const pickupPoint =
      key.includes('deborah') || key.includes('mercy')
        ? 'Front of Mass Comm Building'
        : 'Caleb Medicals';
    return {
      required: true,
      hostelId: slugifyHostelId(raw),
      hostelName: raw,
      title: 'Female Hostel Delivery Notice',
      message: FEMALE_HOSTEL_DEFAULT_MESSAGE,
      checkboxLabel: FEMALE_HOSTEL_DEFAULT_CHECKBOX,
      collectionInstruction: `Riders cannot enter ${raw}. Student must meet the rider at ${pickupPoint}.`,
      pickupPoint,
      isPremiumDelivery: true,
      ruleType: 'FEMALE_HOSTEL_PICKUP',
      isActive: true,
    };
  }

  return {
    required: false,
    hostelId: raw,
    hostelName: raw,
    title: '',
    message: '',
    checkboxLabel: '',
    collectionInstruction: 'Standard delivery to the front of the hostel/reception.',
    pickupPoint: 'Front of your hostel/reception',
    isPremiumDelivery: false,
    ruleType: 'NONE',
    isActive: true,
  };
}

export interface ResolvedOrderHostelInfo {
  hostelId: string;
  hostelName: string;
  requiresAcknowledgement: boolean;
  acknowledged: boolean;
  pickupPoint: string;
  collectionInstruction: string;
  riderNotice: string;
  studentNotice: string;
  ruleType: HostelRuleType;
  isInactiveHostel: boolean;
}

/**
 * Resolves the complete hostel display, pickup point, and collection instruction
 * for an existing or historical order across Order Tracker, Admin Orders, Rider Views,
 * PDF Manifests, and Analytics.
 */
export function resolveOrderHostelInfo(
  order: any,
  hostels?: Partial<HostelConfig>[] | null,
  platformSettings?: { premiumHostels?: string[]; hostelConfigs?: Partial<HostelConfig>[] } | null
): ResolvedOrderHostelInfo {
  if (!order) {
    return {
      hostelId: '',
      hostelName: 'Campus Hostel',
      requiresAcknowledgement: false,
      acknowledged: false,
      pickupPoint: 'Front of your hostel/reception',
      collectionInstruction: '',
      riderNotice: '',
      studentNotice: '',
      ruleType: 'NONE',
      isInactiveHostel: false,
    };
  }

  // Non-student / off-campus fashion delivery orders handle their own street address
  if (order.deliveryRecipientType === 'NON_STUDENT' || order.isOffCampusDelivery) {
    const areaLabel = [order.deliveryAreaName, order.deliveryCity, order.deliveryState]
      .filter(Boolean)
      .join(', ');
    return {
      hostelId: 'off-campus',
      hostelName: areaLabel || order.hostelName || order.hostel || 'Lagos Delivery',
      requiresAcknowledgement: false,
      acknowledged: false,
      pickupPoint: order.deliveryAddress || areaLabel || 'Customer delivery address',
      collectionInstruction: order.deliveryAddressDetails || '',
      riderNotice: '',
      studentNotice: '',
      ruleType: 'NONE',
      isInactiveHostel: false,
    };
  }

  const savedAck: Partial<HostelAcknowledgementRecord> | undefined =
    order.hostelAcknowledgement && typeof order.hostelAcknowledgement === 'object'
      ? order.hostelAcknowledgement
      : undefined;

  const rawHostelId = String(order.hostelId || savedAck?.hostelId || order.hostel || '').trim();
  const rawHostelName = String(order.hostelName || savedAck?.hostelName || order.hostel || '').trim();

  const restriction = resolveHostelRestriction(
    rawHostelId || rawHostelName,
    hostels,
    platformSettings
  );

  // Preserve historical display name if order stored a full display name (not just a slug id)
  const isRawNameJustSlug =
    rawHostelName &&
    normalizeHostelKey(rawHostelName) === normalizeHostelKey(restriction.hostelId) &&
    restriction.hostelName &&
    normalizeHostelKey(restriction.hostelName) !== normalizeHostelKey(restriction.hostelId);

  const hostelName =
    (!isRawNameJustSlug && rawHostelName) ||
    restriction.hostelName ||
    rawHostelId ||
    'Campus Hostel';

  const requiresAcknowledgement =
    typeof savedAck?.required === 'boolean'
      ? savedAck.required
      : Boolean(order.requiresHostelAcknowledgement) ||
        Boolean(order.femaleHostelAgreement) ||
        restriction.required;

  const acknowledged =
    Boolean(savedAck?.accepted) ||
    Boolean(order.hostelAcknowledgementAccepted) ||
    Boolean(order.femaleHostelAgreement);

  const pickupPoint =
    String(order.pickupPoint || savedAck?.pickupPoint || restriction.pickupPoint || 'Front of your hostel/reception').trim();

  const collectionInstruction =
    String(
      order.collectionInstruction ||
        savedAck?.collectionInstruction ||
        restriction.collectionInstruction ||
        ''
    ).trim();

  const ruleType: HostelRuleType =
    savedAck?.ruleType ||
    restriction.ruleType ||
    (isDavidHostelKey(rawHostelId || rawHostelName)
      ? 'DOWNSTAIRS_COLLECTION'
      : requiresAcknowledgement
      ? 'CUSTOM'
      : 'NONE');

  let riderNotice = '';
  let studentNotice = '';

  if (requiresAcknowledgement) {
    if (ruleType === 'DOWNSTAIRS_COLLECTION' || isDavidHostelKey(rawHostelId || rawHostelName)) {
      riderNotice =
        collectionInstruction ||
        "Riders cannot enter David's Hostel unless authorized residents. Student must come downstairs to collect the order.";
      studentNotice =
        `Reminder: Riders cannot enter ${hostelName} unless they are authorized residents. Please come downstairs (${pickupPoint}) to collect your order when your rider calls.`;
    } else if (ruleType === 'FEMALE_HOSTEL_PICKUP') {
      riderNotice =
        collectionInstruction ||
        `Do not enter ${hostelName}. Meet student at ${pickupPoint}.`;
      studentNotice =
        `Reminder: Riders cannot enter ${hostelName}. Please meet your rider at ${pickupPoint} when they call.`;
    } else {
      riderNotice =
        collectionInstruction ||
        `Collection instruction for ${hostelName}: Meet student at ${pickupPoint}.`;
      studentNotice =
        collectionInstruction ||
        `Please collect your order at ${pickupPoint} when your rider arrives.`;
    }
  }

  return {
    hostelId: restriction.hostelId || rawHostelId || slugifyHostelId(hostelName),
    hostelName,
    requiresAcknowledgement,
    acknowledged,
    pickupPoint,
    collectionInstruction,
    riderNotice,
    studentNotice,
    ruleType,
    isInactiveHostel: !restriction.isActive,
  };
}
