/**
 * La Tía Julia - Aplicación Principal con Supabase
 * Lógica de la tienda virtual
 */

document.addEventListener('DOMContentLoaded', () => {
    window.app = new TiaJuliaApp();
    window.app.init();
});

class TiaJuliaApp {
    constructor() {
        this.currentCategory = 'all';
        this.searchQuery = '';
        this.elements = {};
    }

    async init() {
        this.cacheElements();
        this.showLoading();

        // Cargar productos desde Supabase
        await window.productManager.loadProducts();

        // Cargar promociones desde Supabase
        await window.promotionManager.loadPromotions();

        // Suscribirse a cambios en tiempo real
        window.productManager.subscribeToChanges(() => {
            this.render();
        });

        window.promotionManager.subscribeToChanges(() => {
            this.renderPromotions();
        });

        this.bindEvents();

        // Inicializar Carrito
        window.cart = new Cart();

        this.render();
        this.hideLoading();
    }

    showLoading() {
        if (this.elements.productsGrid) {
            this.elements.productsGrid.innerHTML = `
                <div class="loading-state">
                    <div class="loading-spinner"></div>
                    <p>Cargando productos...</p>
                </div>
            `;
        }
    }

    hideLoading() {
        // Loading se oculta cuando se renderizan los productos
    }

    cacheElements() {
        this.elements = {
            searchInput: document.getElementById('searchInput'),
            categoryFilters: document.getElementById('categoryFilters'),
            productsGrid: document.getElementById('productsGrid'),
            promotionsGrid: document.getElementById('promotionsGrid'),
            statTotal: document.getElementById('statTotal'),
            statAvailable: document.getElementById('statAvailable'),
            currentCategoryTitle: document.getElementById('currentCategoryTitle')
        };
    }

    bindEvents() {
        // Búsqueda con debounce
        if (this.elements.searchInput) {
            this.elements.searchInput.addEventListener('input',
                TiaJuliaUtils.debounce((e) => this.handleSearch(e), 300)
            );
        }

        // Header Menu Button (opens drawer)
        const headerMenuBtn = document.getElementById('headerMenuBtn');
        if (headerMenuBtn) {
            headerMenuBtn.addEventListener('click', () => {
                this.toggleDrawer(true);
            });
        }

        // Filtros de categoría (Drawer Logic)
        if (this.elements.categoryFilters) {
            this.elements.categoryFilters.addEventListener('click', (e) => {

                // Open Drawer
                const triggerBtn = e.target.closest('.filter-trigger-btn');
                if (triggerBtn) {
                    this.toggleDrawer(true);
                    return;
                }

                // Close Drawer (X button or Overlay)
                if (e.target.closest('.drawer-close-btn') || e.target.classList.contains('category-drawer-overlay')) {
                    this.toggleDrawer(false);
                    return;
                }

                // Select Category
                if (e.target.classList.contains('filter-btn')) {
                    this.handleCategoryFilter(e.target);
                    this.toggleDrawer(false); // Auto-close on selection
                }
            });
        }

        // Delegación de eventos para agregar al carrito
        if (this.elements.productsGrid) {
            this.elements.productsGrid.addEventListener('click', (e) => {
                if (e.target.classList.contains('add-to-cart-btn')) {
                    const id = e.target.dataset.id;
                    // El ID puede ser número o string dependiendo de la DB
                    // Si viene de Supabase es probable que sea número o UUID
                    // Intentamos buscarlo tal cual, o convertido
                    let product = window.productManager.getById(id);
                    if (!product) product = window.productManager.getById(parseInt(id));

                    if (product) {
                        window.cart.add(product);
                    }
                }
            });
        }
    }

    handleSearch(e) {
        this.searchQuery = e.target.value.trim();
        this.renderProducts();
    }

    handleCategoryFilter(button) {
        // Actualizar estado activo
        document.querySelectorAll('.filter-btn').forEach(btn =>
            btn.classList.remove('active')
        );
        button.classList.add('active');

        // Actualizar categoría actual
        this.currentCategory = button.dataset.category;

        // Actualizar título
        const categoryName = button.textContent;
        if (this.elements.currentCategoryTitle) {
            this.elements.currentCategoryTitle.textContent =
                this.currentCategory === 'all' ? 'Todos los Productos' : categoryName;
        }

        this.renderProducts();
    }

    resetView() {
        // Reset Search
        this.searchQuery = '';
        if (this.elements.searchInput) this.elements.searchInput.value = '';

        // Reset Category
        this.currentCategory = 'all';
        document.querySelectorAll('.filter-btn').forEach(btn =>
            btn.classList.remove('active')
        );
        // Set 'Todos' as active if exists
        const allBtn = document.querySelector('.filter-btn[data-category="all"]');
        if (allBtn) allBtn.classList.add('active');

        // Reset Title
        if (this.elements.currentCategoryTitle) {
            this.elements.currentCategoryTitle.textContent = 'Todos los Productos';
        }

        // Render all products
        this.renderProducts();

        // Scroll to top of products or hero
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    handleSearch(e) {
        this.searchQuery = e.target.value.trim();
        this.renderProducts();
    }

    showLoading() {
        if (this.elements.productsGrid) {
            this.elements.productsGrid.innerHTML = `
                <div class="loading-state">
                    <div class="loading-spinner"></div>
                    <p>Cargando productos...</p>
                </div>
            `;
        }
    }

    render() {
        this.renderStats();
        this.renderCategories();
        this.renderPromotions();
        this.renderProducts();
    }

    renderStats() {
        const stats = window.productManager.getStats();

        if (this.elements.statTotal) {
            this.elements.statTotal.textContent = stats.total;
        }
        if (this.elements.statAvailable) {
            this.elements.statAvailable.textContent = stats.available;
        }
    }

    renderCategories() {
        if (!this.elements.categoryFilters) return;

        const categories = window.productManager.getCategories();

        this.elements.categoryFilters.innerHTML = `
            <!-- Filter Trigger (Mobile) -->
            <button class="filter-trigger-btn" aria-label="Abrir menú de categorías">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                    <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
                <span>Menú</span>
            </button>

            <!-- Category Drawer (Side Menu) -->
            <div class="category-drawer-overlay"></div>
            <div class="category-drawer">
                <div class="drawer-header">
                    <h3>Categorías</h3>
                    <button class="drawer-close-btn">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                <div class="drawer-content">
                    <button class="filter-btn active" data-category="all">
                        Todos
                    </button>
                    ${categories.map(cat => `
                        <button class="filter-btn" data-category="${cat.id}">
                            ${cat.name}
                        </button>
                    `).join('')}
                </div>
            </div>

            <!-- Desktop List (Hidden on Mobile via CSS) -->
            <div class="desktop-category-list">
                 <button class="filter-btn active" data-category="all">
                    Todos
                </button>
                ${categories.map(cat => `
                    <button class="filter-btn" data-category="${cat.id}">
                        ${cat.name}
                    </button>
                `).join('')}
            </div>
        `;
    }

    toggleDrawer(show) {
        const drawer = this.elements.categoryFilters.querySelector('.category-drawer');
        const overlay = this.elements.categoryFilters.querySelector('.category-drawer-overlay');

        if (drawer && overlay) {
            if (show) {
                drawer.classList.add('active');
                overlay.classList.add('active');
                document.body.style.overflow = 'hidden'; // Prevent background scrolling
            } else {
                drawer.classList.remove('active');
                overlay.classList.remove('active');
                document.body.style.overflow = '';
            }
        }
    }

    renderPromotions() {
        if (!this.elements.promotionsGrid) return;

        // Get promotions from the promotions table (new system)
        const promotions = window.promotionManager?.getPromotionsWithProducts() || [];

        // Fallback to old system if no promotions in new table
        const promoProducts = promotions.length > 0
            ? promotions
            : window.productManager.getPromotions().map(p => ({
                product: p,
                quantity: 1,
                promoPrice: p.price,
                productId: p.id
            }));

        if (promoProducts.length === 0) {
            this.elements.promotionsGrid.innerHTML = `
                <div class="hero-features">
                    <div class="feature-item">
                        <span class="feature-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        </span>
                        <span class="feature-text">Abierto todos los dias 7am – 11pm</span>
                    </div>
                    <div class="feature-item">
                        <span class="feature-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                        </span>
                        <span class="feature-text">Pedidos rapidos en el barrio</span>
                    </div>
                    <div class="feature-item">
                        <span class="feature-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                        </span>
                        <span class="feature-text">Stock actualizado en tiempo real</span>
                    </div>
                    <div class="feature-item">
                        <span class="feature-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
                        </span>
                        <span class="feature-text">Precios economicos todos los dias</span>
                    </div>
                </div>
            `;
            // Ocultar titulo de promociones si no hay productos
            const promoTitle = document.querySelector('.promotions-title');
            if (promoTitle) promoTitle.style.display = 'none';
            return;
        }

        // Mostrar titulo si hay productos
        const promoTitle = document.querySelector('.promotions-title');
        if (promoTitle) promoTitle.style.display = 'flex';

        // Triplicar productos para efecto infinito sin espacios vacios
        const duplicatedProducts = [...promoProducts, ...promoProducts, ...promoProducts];

        this.elements.promotionsGrid.innerHTML = `
            <div class="promo-carousel">
                <div class="promo-track">
                    ${duplicatedProducts.map(promo => {
            const product = promo.product;
            const promoText = `${promo.quantity} x S/${promo.promoPrice.toFixed(2)}`;
            return `
                        <div class="promo-card" data-promo-id="${promo.id}" data-product-id="${promo.productId}" data-quantity="${promo.quantity}" data-promo-price="${promo.promoPrice}" style="cursor: pointer;">
                            <img src="${product.image}" alt="${product.name}" class="promo-image" 
                                 onerror="this.src='https://via.placeholder.com/80x80?text=Producto'">
                            <div class="promo-name">${product.name}</div>
                            <div class="promo-badge">${promoText}</div>
                        </div>
                    `}).join('')}
                </div>
            </div>
        `;

        // Add click event to promo cards
        this.elements.promotionsGrid.querySelectorAll('.promo-card').forEach(card => {
            card.addEventListener('click', () => {
                const productId = card.dataset.productId;
                const quantity = parseInt(card.dataset.quantity) || 1;
                const promoPrice = parseFloat(card.dataset.promoPrice);

                let product = window.productManager.getById(productId);
                if (!product) product = window.productManager.getById(parseInt(productId));

                if (product && window.cart && promoPrice) {
                    // Calculate unit price for promo
                    const promoUnitPrice = promoPrice / quantity;
                    const promoProduct = {
                        ...product,
                        price: promoUnitPrice,
                        originalPrice: product.price,
                        isPromo: true
                    };

                    for (let i = 0; i < quantity; i++) {
                        window.cart.add(promoProduct);
                    }

                    // Open checkout modal
                    document.getElementById('cartBtn')?.click();
                }
            });
        });
    }

    renderProducts() {
        if (!this.elements.productsGrid) return;

        let products = [];

        // Aplicar filtro de búsqueda o categoría
        if (this.searchQuery) {
            products = window.productManager.search(this.searchQuery);
        } else {
            products = window.productManager.getByCategory(this.currentCategory);
        }

        // Verificar si hay productos
        if (products.length === 0) {
            this.elements.productsGrid.innerHTML = this.renderEmptyState();
            return;
        }

        // Renderizar tarjetas de productos
        this.elements.productsGrid.innerHTML = products.map(product =>
            this.renderProductCard(product)
        ).join('');
    }

    renderProductCard(product) {
        const stockStatus = TiaJuliaUtils.getStockStatus(product.stock);
        const category = window.productManager.getCategories()
            .find(c => c.id === product.category);
        const categoryName = category ? category.name : 'Sin categoría';
        const isOutOfStock = product.stock === 0;

        return `
            <article class="product-card ${isOutOfStock ? 'out-of-stock' : ''}">
                <div class="product-image-container">
                    <img src="${product.image}" alt="${product.name}" class="product-image"
                         onerror="this.src='https://via.placeholder.com/400x300?text=Producto'">
                    <div class="product-badges">
                        ${product.promotion && !isOutOfStock ? `
                            <span class="badge badge-promo">${product.promotionText || 'Oferta'}</span>
                        ` : ''}
                        ${isOutOfStock ? `
                            <span class="badge badge-out">Agotado</span>
                        ` : ''}
                    </div>
                </div>
                <div class="product-info">
                    <div class="product-category">${categoryName}</div>
                    <h3 class="product-name">${product.name}</h3>
                    <div class="product-price">${TiaJuliaUtils.formatPrice(product.price)}</div>
                    <div class="stock-indicator ${stockStatus.class}">
                        <span class="stock-dot"></span>
                        <span>Stock: ${stockStatus.text}</span>
                    </div>
                    <button class="product-action ${!isOutOfStock ? 'add-to-cart-btn' : ''}" 
                            ${isOutOfStock ? 'disabled' : ''}
                            data-id="${product.id}">
                        ${isOutOfStock ? 'Agotado' : 'Agregar al Carrito'}
                    </button>
                </div>
            </article>
        `;
    }

    renderEmptyState() {
        const title = this.searchQuery ? 'Sin coincidencias' : 'Próximamente';
        const message = this.searchQuery
            ? `No encontramos productos que coincidan con "${this.searchQuery}"`
            : 'Estamos abasteciendo esta sección. ¡Vuelve pronto!';

        return `
            <div class="empty-state">
                <div class="empty-icon">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                        <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                        <line x1="12" y1="22.08" x2="12" y2="12"></line>
                    </svg>
                </div>
                <h3 class="empty-title">${title}</h3>
                <p class="empty-text">${message}</p>
            </div>
        `;
    }
}

