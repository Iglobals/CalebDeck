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
