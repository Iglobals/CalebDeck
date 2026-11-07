/**
 * Campus cafeteria catalogue already used by /cafeteria and the signed-in home.
 * IDs are product constants (old / new, front / back), not Firestore documents.
 */
export const CAFETERIA_OPTIONS = [
    {
        id: 'old',
        name: 'Old Cafeteria',
        image: '/old-cafe-pic.jpeg',
        prepTime: '12 min',
        popular: false,
        hasSections: false,
    },
    {
        id: 'new',
        name: 'New Cafeteria',
        image: '/new-cafe pic.jpeg',
        prepTime: '15 min',
        popular: true,
        hasSections: true,
    },
] as const;

export const NEW_CAFETERIA_SECTIONS = [
    { id: 'front', name: 'Front', description: 'Main serving area' },
    { id: 'back', name: 'Back', description: 'Alternative counter' },
] as const;

export type CafeteriaId = (typeof CAFETERIA_OPTIONS)[number]['id'];
export type CafeteriaSectionId = (typeof NEW_CAFETERIA_SECTIONS)[number]['id'] | 'none';

export function cafeteriaNameForId(cafeteriaId: string): string {
    return CAFETERIA_OPTIONS.find((c) => c.id === cafeteriaId)?.name || 'Cafeteria';
}

const cleanCafeteriaStr = (val: unknown): string => {
    if (val === null || val === undefined) return '';
    const trimmed = String(val).trim();
    if (!trimmed || trimmed.toLowerCase() === 'undefined' || trimmed.toLowerCase() === 'null') return '';
    return trimmed;
};

/**
 * Resolves the human-readable cafeteria + section name strictly from explicit
 * cafeteria fields captured at order selection/creation.
 *
 * Rules:
 * - Never infers cafeteria from hostel, menu items, or delivery location.
 * - New Cafeteria + front -> "New Cafe Front"
 * - New Cafeteria + back  -> "New Cafe Back"
 * - Old Cafeteria         -> "Old Cafeteria"
 * - Missing historical cafeteria data -> "Not recorded"
 */
export function formatCafeteriaSectionLabel(
    cafeteriaIdOrObj?: string | null | { cafeteriaId?: string | null; sectionId?: string | null; cafeteria?: string | null; cafeteriaDisplay?: string | null },
    sectionId?: string | null,
    cafeteria?: string | null
): string {
    if (cafeteriaIdOrObj && typeof cafeteriaIdOrObj === 'object') {
        return formatCafeteriaSectionLabel(
            cafeteriaIdOrObj.cafeteriaId,
            cafeteriaIdOrObj.sectionId,
            cafeteriaIdOrObj.cafeteriaDisplay || cafeteriaIdOrObj.cafeteria
        );
    }
    const rawId = cleanCafeteriaStr(cafeteriaIdOrObj).toLowerCase();
    const rawSection = cleanCafeteriaStr(sectionId).toLowerCase();
    const rawName = cleanCafeteriaStr(cafeteria);
    const lowerName = rawName.toLowerCase();

    if (lowerName === 'new cafe front' || lowerName === 'new cafeteria front' || lowerName === 'new cafeteria (front)') {
        return 'New Cafe Front';
    }
    if (lowerName === 'new cafe back' || lowerName === 'new cafeteria back' || lowerName === 'new cafeteria (back)') {
        return 'New Cafe Back';
    }
    if (rawId === 'new' || lowerName === 'new cafeteria' || lowerName === 'new cafe') {
        if (rawSection === 'front') return 'New Cafe Front';
        if (rawSection === 'back') return 'New Cafe Back';
        return 'New Cafeteria';
    }
    if (rawId === 'old' || lowerName === 'old cafeteria' || lowerName === 'old cafe') {
        return 'Old Cafeteria';
    }
    if (rawName) {
        return rawName;
    }
    return 'Not recorded';
}

export function resolveOrderCafeteriaLabel(order: any, fallback: string = 'Not recorded'): string {
    if (!order || typeof order !== 'object') return fallback;
    const label = formatCafeteriaSectionLabel(
        order.cafeteriaId,
        order.sectionId,
        order.cafeteriaDisplay || order.cafeteria
    );
    return label === 'Not recorded' ? fallback : label;
}

const CAFETERIA_STORAGE_KEY = 'cd_selected_cafeteria';

export interface SelectedCafeteriaState {
    cafeteria: string;
    cafeteriaId: string;
    sectionId: string;
    cafeteriaDisplay: string;
}

export function persistSelectedCafeteria(selection: {
    cafeteria?: string | null;
    cafeteriaId?: string | null;
    sectionId?: string | null;
}): SelectedCafeteriaState | null {
    const cafeteriaId = cleanCafeteriaStr(selection.cafeteriaId).toLowerCase();
    if (!cafeteriaId) return null;
    const sectionId = cafeteriaId === 'old'
        ? 'none'
        : (cleanCafeteriaStr(selection.sectionId).toLowerCase() || 'none');
    const baseName = cafeteriaNameForId(cafeteriaId);
    const cafeteriaDisplay = formatCafeteriaSectionLabel(cafeteriaId, sectionId, selection.cafeteria || baseName);
    const state: SelectedCafeteriaState = {
        cafeteria: cafeteriaDisplay !== 'Not recorded' ? cafeteriaDisplay : baseName,
        cafeteriaId,
        sectionId,
        cafeteriaDisplay: cafeteriaDisplay !== 'Not recorded' ? cafeteriaDisplay : baseName,
    };
    if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
        try {
            sessionStorage.setItem(CAFETERIA_STORAGE_KEY, JSON.stringify(state));
        } catch {
            // Ignore storage quota errors
        }
    }
    return state;
}

export function readPersistedCafeteria(expectedCafeteriaId?: string | null): SelectedCafeteriaState | null {
    if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') return null;
    try {
        const raw = sessionStorage.getItem(CAFETERIA_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || !parsed.cafeteriaId) return null;
        if (expectedCafeteriaId && String(parsed.cafeteriaId).toLowerCase() !== String(expectedCafeteriaId).toLowerCase()) {
            return null;
        }
        return parsed as SelectedCafeteriaState;
    } catch {
        return null;
    }
}
