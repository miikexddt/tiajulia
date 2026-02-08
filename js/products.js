/**
 * La Tía Julia - Gestión de Productos con Supabase
 * Base de datos compartida en la nube
 */

// Categorías (estas se mantienen locales por ahora)
const defaultCategories = [
    { id: 'golosinas', name: 'Golosinas' },
    { id: 'bebidas', name: 'Bebidas' },
    { id: 'lacteos', name: 'Lácteos' },
    { id: 'abarrotes', name: 'Abarrotes' },
    { id: 'limpieza', name: 'Limpieza' },
    { id: 'higiene', name: 'Higiene Personal' },
    { id: 'panaderia', name: 'Panadería' },
    { id: 'otros', name: 'Otros' }
];

// Clase para manejar productos con Supabase
class ProductManager {
    constructor() {
        this.products = [];
        this.categories = defaultCategories;
        this.isLoading = false;
    }

    // Cargar productos desde Supabase
    async loadProducts() {
        this.isLoading = true;
        try {
            const { data, error } = await window.supabaseClient
                .from('products')
                .select('*')
                .order('name');

            if (error) throw error;

            // Mapear campos de Supabase a formato local
            this.products = data.map(p => ({
                id: p.id,
                name: p.name,
                price: parseFloat(p.price),
                stock: p.stock,
                category: p.category,
                image: p.image || 'https://via.placeholder.com/400x300?text=Producto',
                promotion: p.promotion,
                promotionText: p.promotion_text
            }));

            return this.products;
        } catch (error) {
            console.error('Error cargando productos:', error);
            // Fallback a localStorage si Supabase falla
            return this.loadFromLocalStorage();
        } finally {
            this.isLoading = false;
        }
    }

    // Fallback a localStorage
    loadFromLocalStorage() {
        const stored = localStorage.getItem('tiajulia_products');
        if (stored) {
            this.products = JSON.parse(stored);
        }
        return this.products;
    }

    // Obtener todos los productos (ya cargados)
    getAll() {
        return this.products;
    }

    // Obtener producto por ID
    getById(id) {
        return this.products.find(p => p.id === id);
    }

    // Obtener productos por categoría
    getByCategory(categoryId) {
        if (!categoryId || categoryId === 'all') {
            return this.products;
        }
        return this.products.filter(p => p.category === categoryId);
    }

    // Buscar productos
    search(query) {
        const normalizedQuery = TiaJuliaUtils.normalizeText(query);
        return this.products.filter(p =>
            TiaJuliaUtils.normalizeText(p.name).includes(normalizedQuery)
        );
    }

    // Obtener productos en promoción
    getPromotions() {
        return this.products.filter(p => p.promotion && p.stock > 0);
    }

    // Agregar producto a Supabase
    async add(product) {
        try {
            const { data, error } = await window.supabaseClient
                .from('products')
                .insert([{
                    name: product.name,
                    price: product.price,
                    stock: product.stock,
                    category: product.category,
                    image: product.image,
                    promotion: product.promotion || false,
                    promotion_text: product.promotionText || null
                }])
                .select()
                .single();

            if (error) throw error;

            // Recargar productos
            await this.loadProducts();
            return data;
        } catch (error) {
            console.error('Error agregando producto:', error);
            throw error;
        }
    }

    // Actualizar producto en Supabase
    async update(id, updates) {
        try {
            const { data, error } = await window.supabaseClient
                .from('products')
                .update({
                    name: updates.name,
                    price: updates.price,
                    stock: updates.stock,
                    category: updates.category,
                    image: updates.image,
                    promotion: updates.promotion || false,
                    promotion_text: updates.promotionText || null
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            // Recargar productos
            await this.loadProducts();
            return data;
        } catch (error) {
            console.error('Error actualizando producto:', error);
            throw error;
        }
    }

    // Eliminar producto de Supabase
    async delete(id) {
        try {
            const { error } = await window.supabaseClient
                .from('products')
                .delete()
                .eq('id', id);

            if (error) throw error;

            // Recargar productos
            await this.loadProducts();
            return true;
        } catch (error) {
            console.error('Error eliminando producto:', error);
            throw error;
        }
    }

    // Actualizar solo el stock
    async updateStock(id, newStock) {
        try {
            const { error } = await window.supabaseClient
                .from('products')
                .update({ stock: Math.max(0, newStock) })
                .eq('id', id);

            if (error) throw error;

            // Actualizar localmente para respuesta rápida
            const product = this.products.find(p => p.id === id);
            if (product) {
                product.stock = Math.max(0, newStock);
            }

            return true;
        } catch (error) {
            console.error('Error actualizando stock:', error);
            throw error;
        }
    }

    // Obtener estadísticas
    getStats() {
        const total = this.products.length;
        const available = this.products.filter(p => p.stock > 0).length;
        const lowStock = this.products.filter(p => p.stock > 0 && p.stock <= 5).length;
        const outOfStock = this.products.filter(p => p.stock === 0).length;
        const totalStock = this.products.reduce((sum, p) => sum + p.stock, 0);

        return { total, available, lowStock, outOfStock, totalStock };
    }

    // Obtener todas las categorías
    getCategories() {
        return this.categories;
    }

    // Suscribirse a cambios en tiempo real
    subscribeToChanges(callback) {
        return window.supabaseClient
            .channel('products-changes')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'products' },
                async () => {
                    await this.loadProducts();
                    if (callback) callback(this.products);
                }
            )
            .subscribe();
    }
}

// Instancia global
window.productManager = new ProductManager();

// Clase para manejar promociones con Supabase
class PromotionManager {
    constructor() {
        this.promotions = [];
        this.isLoading = false;
    }

    // Cargar promociones desde Supabase
    async loadPromotions() {
        this.isLoading = true;
        try {
            const { data, error } = await window.supabaseClient
                .from('promotions')
                .select('*')
                .eq('active', true)
                .order('created_at', { ascending: false });

            if (error) throw error;

            this.promotions = data.map(p => ({
                id: p.id,
                productId: p.product_id,
                quantity: p.quantity,
                promoPrice: parseFloat(p.promo_price),
                active: p.active,
                createdAt: p.created_at
            }));

            return this.promotions;
        } catch (error) {
            console.error('Error cargando promociones:', error);
            return [];
        } finally {
            this.isLoading = false;
        }
    }

    // Obtener todas las promociones activas
    getAll() {
        return this.promotions;
    }

    // Obtener promocion por ID de producto
    getByProductId(productId) {
        return this.promotions.find(p => p.productId === productId);
    }

    // Obtener promociones con datos de producto
    getPromotionsWithProducts() {
        return this.promotions.map(promo => {
            const product = window.productManager.getById(promo.productId);
            return {
                ...promo,
                product: product
            };
        }).filter(p => p.product && p.product.stock > 0);
    }

    // Agregar promocion
    async add(promotion) {
        try {
            const { data, error } = await window.supabaseClient
                .from('promotions')
                .insert([{
                    product_id: promotion.productId,
                    quantity: promotion.quantity,
                    promo_price: promotion.promoPrice,
                    active: true
                }])
                .select()
                .single();

            if (error) throw error;

            await this.loadPromotions();
            return data;
        } catch (error) {
            console.error('Error agregando promocion:', error);
            throw error;
        }
    }

    // Actualizar promocion
    async update(id, updates) {
        try {
            const { data, error } = await window.supabaseClient
                .from('promotions')
                .update({
                    product_id: updates.productId,
                    quantity: updates.quantity,
                    promo_price: updates.promoPrice,
                    active: updates.active
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            await this.loadPromotions();
            return data;
        } catch (error) {
            console.error('Error actualizando promocion:', error);
            throw error;
        }
    }

    // Eliminar promocion
    async delete(id) {
        try {
            const { error } = await window.supabaseClient
                .from('promotions')
                .delete()
                .eq('id', id);

            if (error) throw error;

            await this.loadPromotions();
            return true;
        } catch (error) {
            console.error('Error eliminando promocion:', error);
            throw error;
        }
    }

    // Desactivar promocion
    async deactivate(id) {
        try {
            const { error } = await window.supabaseClient
                .from('promotions')
                .update({ active: false })
                .eq('id', id);

            if (error) throw error;

            await this.loadPromotions();
            return true;
        } catch (error) {
            console.error('Error desactivando promocion:', error);
            throw error;
        }
    }

    // Suscribirse a cambios en tiempo real
    subscribeToChanges(callback) {
        return window.supabaseClient
            .channel('promotions-changes')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'promotions' },
                async () => {
                    await this.loadPromotions();
                    if (callback) callback(this.promotions);
                }
            )
            .subscribe();
    }
}

// Instancia global
window.promotionManager = new PromotionManager();
