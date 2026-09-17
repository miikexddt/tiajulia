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

    // Clave de caché
    static CACHE_KEY = 'tiajulia_admin_products';
    static CACHE_TTL = 5 * 60 * 1000; // 5 minutos

    // Guardar productos en caché
    _saveCache(products) {
        try {
            sessionStorage.setItem(ProductManager.CACHE_KEY, JSON.stringify({
                data: products,
                ts: Date.now()
            }));
        } catch (e) { /* sessionStorage lleno, ignorar */ }
    }

    // Leer caché (retorna null si expiró o no existe)
    _readCache() {
        try {
            const raw = sessionStorage.getItem(ProductManager.CACHE_KEY);
            if (!raw) return null;
            const { data, ts } = JSON.parse(raw);
            if (Date.now() - ts > ProductManager.CACHE_TTL) return null;
            return data;
        } catch (e) { return null; }
    }

    // Mapear fila de Supabase a formato local
    _mapProduct(p) {
        return {
            id: p.id,
            name: p.name,
            price: parseFloat(p.price),
            stock: p.stock,
            category: p.category,
            image: p.image || 'https://via.placeholder.com/400x300?text=Producto',
            promotion: p.promotion,
            promotionText: p.promotion_text
        };
    }

    // Cargar productos: usa caché inmediata + refresca Supabase en fondo
    async loadProducts() {
        // 1. Si hay caché válida, poblar this.products al instante y retornar
        const cached = this._readCache();
        if (cached && cached.length > 0) {
            this.products = cached;
            // Refrescar desde Supabase en segundo plano (sin bloquear)
            this._refreshFromSupabase();
            return this.products;
        }

        // 2. Sin caché: fetch bloqueante normal (primera visita)
        return await this._refreshFromSupabase();
    }

    // Fetch desde Supabase y actualiza caché (puede ser en segundo plano)
    async _refreshFromSupabase() {
        this.isLoading = true;
        try {
            const { data, error } = await window.supabaseClient
                .from('products')
                .select('*')
                .order('name');

            if (error) throw error;

            this.products = data.map(p => this._mapProduct(p));
            this._saveCache(this.products);
            return this.products;
        } catch (error) {
            console.error('Error cargando productos:', error);
            if (this.products.length === 0) return this.loadFromLocalStorage();
            return this.products;
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
                    await this._refreshFromSupabase();
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

    // Clave de caché
    static CACHE_KEY = 'tiajulia_admin_promotions';
    static CACHE_TTL = 5 * 60 * 1000; // 5 minutos

    _saveCache(promotions) {
        try {
            sessionStorage.setItem(PromotionManager.CACHE_KEY, JSON.stringify({
                data: promotions,
                ts: Date.now()
            }));
        } catch (e) { /* sessionStorage lleno, ignorar */ }
    }

    _readCache() {
        try {
            const raw = sessionStorage.getItem(PromotionManager.CACHE_KEY);
            if (!raw) return null;
            const { data, ts } = JSON.parse(raw);
            if (Date.now() - ts > PromotionManager.CACHE_TTL) return null;
            return data;
        } catch (e) { return null; }
    }

    _mapPromotion(p) {
        return {
            id: p.id,
            productId: p.product_id,
            quantity: p.quantity,
            promoPrice: parseFloat(p.promo_price),
            active: p.active,
            createdAt: p.created_at
        };
    }

    // Cargar promociones: usa caché inmediata + refresca Supabase en fondo
    async loadPromotions() {
        // 1. Mostrar caché inmediatamente si existe
        const cached = this._readCache();
        if (cached) {
            this.promotions = cached;
            this._refreshFromSupabase();
            return this.promotions;
        }

        // 2. Fetch bloqueante normal
        return await this._refreshFromSupabase();
    }

    async _refreshFromSupabase() {
        this.isLoading = true;
        try {
            const { data, error } = await window.supabaseClient
                .from('promotions')
                .select('*')
                .eq('active', true)
                .order('created_at', { ascending: false });

            if (error) throw error;

            this.promotions = data.map(p => this._mapPromotion(p));
            this._saveCache(this.promotions);
            return this.promotions;
        } catch (error) {
            console.error('Error cargando promociones:', error);
            return this.promotions;
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
                    await this._refreshFromSupabase();
                    if (callback) callback(this.promotions);
                }
            )
            .subscribe();
    }
}

// Instancia global
window.promotionManager = new PromotionManager();
