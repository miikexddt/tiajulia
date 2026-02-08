/**
 * La Tía Julia - Utilidades
 * Funciones compartidas para toda la aplicación
 */

// Formatear precio en soles peruanos
function formatPrice(price) {
    return `S/ ${price.toFixed(2)}`;
}

// Debounce para optimizar búsquedas
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Generar ID único
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Obtener estado del stock
function getStockStatus(stock) {
    if (stock === 0) {
        return { class: 'stock-out', text: 'Agotado', icon: '✕' };
    } else if (stock <= 5) {
        return { class: 'stock-low', text: `${stock} disponibles`, icon: '!' };
    } else {
        return { class: 'stock-ok', text: `${stock} disponibles`, icon: '✓' };
    }
}

// Normalizar texto para búsqueda
function normalizeText(text) {
    return text.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

// Mostrar notificación toast
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

// Exportar funciones para uso global
window.TiaJuliaUtils = {
    formatPrice,
    debounce,
    generateId,
    getStockStatus,
    normalizeText,
    showToast
};
