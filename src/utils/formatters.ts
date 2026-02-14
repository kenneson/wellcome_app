/**
 * Utility functions for formatting data throughout the app
 */

/**
 * Formats a price value to Brazilian Real currency format
 * @param price - The price value (number or string)
 * @returns Formatted price string (e.g., "R$ 45,00" or "Grátis")
 */
export const formatPrice = (price: number | string | null | undefined): string => {
    if (price === null || price === undefined) return 'Grátis';
    
    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice <= 0) return 'Grátis';
    
    return `R$ ${numPrice.toFixed(2).replace('.', ',')}`;
};

/**
 * Formats an event date to readable Brazilian Portuguese format
 * @param date - ISO date string or Date object
 * @returns Formatted date string (e.g., "25 de fevereiro - às 19:30")
 */
export const formatEventDate = (date: string | Date): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(d.getTime())) return '';
    
    const dateStr = d.toLocaleDateString('pt-BR', {
        day: 'numeric',
        month: 'long',
    });
    
    const timeStr = d.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
    });
    
    return `${dateStr} - às ${timeStr}`;
};

/**
 * Formats available spots information
 * @param taken - Number of taken spots
 * @param total - Total number of spots
 * @returns Formatted spots string (e.g., "3 disponíveis" or "Esgotado")
 */
export const formatSpotsAvailable = (taken: number, total: number): string => {
    const remaining = total - taken;
    
    if (remaining <= 0) return 'Esgotado';
    if (remaining === 1) return '1 disponível';
    return `${remaining} disponíveis`;
};

/**
 * Formats a full name to first name only
 * @param fullName - Full name string
 * @returns First name only
 */
export const formatFirstName = (fullName: string | null | undefined): string => {
    if (!fullName) return 'Usuário';
    return fullName.split(' ')[0];
};

/**
 * Formats a short date (e.g., for profile event history)
 * @param date - ISO date string or Date object
 * @returns Short formatted date (e.g., "25 fev")
 */
export const formatShortDate = (date: string | Date): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(d.getTime())) return '';
    
    return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
    });
};
