/**
 * La Tía Julia - Panel de Administración con Supabase
 * Gestión de productos, precios, stock y categorías
 */

// ===== CONFIGURACIÓN DE SEGURIDAD =====
// La autenticación ahora es manejada por Supabase Auth
// ======================================

document.addEventListener('DOMContentLoaded', () => {
    window.adminApp = new AdminPanel();
    window.adminApp.initAuth();
});

class AdminPanel {
    constructor() {
        this.editingProductId = null;
        this.editingPromoId = null;
        this.deletingProductId = null;
        this.elements = {};
        this.user = null;
    }

    // ===== Autenticación =====
    async initAuth() {
        this.cacheAuthElements();
        this.bindAuthEvents();

        // Verificar sesión actual
        const { data: { session } } = await window.supabaseClient.auth.getSession();

        if (session) {
            this.handleAuthSuccess(session.user);
        } else {
            this.showLoginScreen();
        }

        // Escuchar cambios de autenticación
        window.supabaseClient.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN') {
                this.handleAuthSuccess(session.user);
            } else if (event === 'SIGNED_OUT') {
                this.handleAuthLogout();
            }
        });
    }

    cacheAuthElements() {
        this.elements.loginOverlay = document.getElementById('loginOverlay');
        this.elements.adminHeader = document.getElementById('adminHeader');
        this.elements.adminContent = document.getElementById('adminContent');
        this.elements.loginForm = document.getElementById('loginForm');
        this.elements.loginError = document.getElementById('loginError');
        this.elements.loginSubmitBtn = document.getElementById('loginSubmitBtn');
        this.elements.adminEmail = document.getElementById('adminEmail');
        this.elements.adminPassword = document.getElementById('adminPassword');
    }

    bindAuthEvents() {
        if (this.elements.loginForm) {
            this.elements.loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.login();
            });
        }
    }

    async login() {
        const email = this.elements.adminEmail.value.trim();
        const password = this.elements.adminPassword.value;

        if (!email || !password) {
            this.showLoginError('Por favor ingresa correo y contraseña');
            return;
        }

        this.setLoginLoading(true);
        this.showLoginError(null); // Clear errors

        try {
            const { data, error } = await window.supabaseClient.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            // El listener onAuthStateChange manejará el resto
        } catch (error) {
            console.error('Login error:', error);
            this.showLoginError('Credenciales incorrectas o error de conexión');
            this.setLoginLoading(false);
        }
    }

    async logout() {
        try {
            const { error } = await window.supabaseClient.auth.signOut();
            if (error) throw error;
            window.location.reload();
        } catch (error) {
            console.error('Logout error:', error);
            TiaJuliaUtils.showToast('Error al cerrar sesión', 'error');
        }
    }

    handleAuthSuccess(user) {
        this.user = user;
        this.showAdminPanel();
        this.init(); // Cargar datos del panel
        TiaJuliaUtils.showToast('Bienvenido al panel');
    }

    handleAuthLogout() {
        this.user = null;
        this.showLoginScreen();
    }

    showLoginScreen() {
        if (this.elements.loginOverlay) this.elements.loginOverlay.classList.remove('hidden');
        if (this.elements.adminHeader) this.elements.adminHeader.style.display = 'none';
        if (this.elements.adminContent) this.elements.adminContent.style.display = 'none';

        // Reset form
        if (this.elements.loginForm) this.elements.loginForm.reset();
        this.setLoginLoading(false);
    }

    showAdminPanel() {
        if (this.elements.loginOverlay) this.elements.loginOverlay.classList.add('hidden');
        if (this.elements.adminHeader) this.elements.adminHeader.style.display = 'flex';
        if (this.elements.adminContent) this.elements.adminContent.style.display = 'block';
    }

    showLoginError(message) {
        if (!this.elements.loginError) return;

        if (message) {
            this.elements.loginError.textContent = message;
            this.elements.loginError.style.display = 'block';
        } else {
            this.elements.loginError.style.display = 'none';
        }
    }

    setLoginLoading(isLoading) {
        if (!this.elements.loginSubmitBtn) return;

        const btnText = this.elements.loginSubmitBtn.querySelector('.btn-text');
        const btnLoader = this.elements.loginSubmitBtn.querySelector('.btn-loader');

        if (isLoading) {
            this.elements.loginSubmitBtn.disabled = true;
            if (btnText) btnText.style.display = 'none';
            if (btnLoader) btnLoader.style.display = 'block';
        } else {
            this.elements.loginSubmitBtn.disabled = false;
            if (btnText) btnText.style.display = 'block';
            if (btnLoader) btnLoader.style.display = 'none';
        }
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
        this.render();
        this.hideLoading();
    }

    showLoading() {
        if (this.elements.productsTableBody) {
            this.elements.productsTableBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 3rem;">
                        <div class="loading-spinner"></div>
                        <p>Cargando productos desde Supabase...</p>
                    </td>
                </tr>
            `;
        }
    }

    hideLoading() {
        // Se oculta cuando se renderiza la tabla
    }

    cacheElements() {
        this.elements = {
            // Form elements
            productForm: document.getElementById('productForm'),
            formTitle: document.getElementById('formTitle'),
            productId: document.getElementById('productId'),
            productName: document.getElementById('productName'),
            productPrice: document.getElementById('productPrice'),
            productStock: document.getElementById('productStock'),
            productCategory: document.getElementById('productCategory'),
            productImage: document.getElementById('productImage'),
            productPromotion: document.getElementById('productPromotion'),
            promotionTextGroup: document.getElementById('promotionTextGroup'),
            productPromotionText: document.getElementById('productPromotionText'),
            imagePreview: document.getElementById('imagePreview'),

            // Table and stats
            productsTableBody: document.getElementById('productsTableBody'),
            adminSearch: document.getElementById('adminSearch'),
            categoryFilter: document.getElementById('categoryFilter'),

            // Stats
            statTotal: document.getElementById('statTotal'),
            statAvailable: document.getElementById('statAvailable'),
            statLowStock: document.getElementById('statLowStock'),
            statOutOfStock: document.getElementById('statOutOfStock'),

            // Buttons
            btnCancel: document.getElementById('btnCancel'),
            btnReset: document.getElementById('btnReset'),
            btnLogout: document.getElementById('btnLogout'),

            // Modal
            deleteModal: document.getElementById('deleteModal'),
            confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),
            cancelDeleteBtn: document.getElementById('cancelDeleteBtn'),
            deleteProductName: document.getElementById('deleteProductName'),

            // Tabs
            tabProducts: document.getElementById('tabProducts'),
            tabPromotions: document.getElementById('tabPromotions'),
            productsContent: document.getElementById('productsContent'),
            promotionsContent: document.getElementById('promotionsContent'),

            // Promotions
            promotionForm: document.getElementById('promotionForm'),
            promoFormTitle: document.getElementById('promoFormTitle'),
            promoProduct: document.getElementById('promoProduct'),
            promoQuantity: document.getElementById('promoQuantity'),
            promoPrice: document.getElementById('promoPrice'),
            promoPreview: document.getElementById('promoPreview'),
            promoPreviewText: document.getElementById('promoPreviewText'),
            promotionsTableBody: document.getElementById('promotionsTableBody'),
            btnCancelPromo: document.getElementById('btnCancelPromo')
        };
    }

    bindEvents() {
        // Form submission
        if (this.elements.productForm) {
            this.elements.productForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleFormSubmit();
            });
        }

        // Cancel edit
        if (this.elements.btnCancel) {
            this.elements.btnCancel.addEventListener('click', () => {
                this.resetForm();
            });
        }

        // Logout
        if (this.elements.btnLogout) {
            this.elements.btnLogout.addEventListener('click', () => {
                this.logout();
            });
        }

        // Reset data (disabled for Supabase)
        if (this.elements.btnReset) {
            this.elements.btnReset.addEventListener('click', () => {
                TiaJuliaUtils.showToast('Esta función no está disponible con Supabase', 'warning');
            });
        }

        // Image URL preview
        if (this.elements.productImage) {
            this.elements.productImage.addEventListener('input',
                TiaJuliaUtils.debounce(() => this.updateImagePreview(), 500)
            );
        }

        // Promotion checkbox toggle
        if (this.elements.productPromotion) {
            this.elements.productPromotion.addEventListener('change', () => {
                this.togglePromotionText();
            });
        }

        // Search
        if (this.elements.adminSearch) {
            this.elements.adminSearch.addEventListener('input',
                TiaJuliaUtils.debounce(() => this.renderProductsTable(), 300)
            );
        }

        // Category filter
        if (this.elements.categoryFilter) {
            this.elements.categoryFilter.addEventListener('change', () => {
                this.renderProductsTable();
            });
        }

        // Delete modal
        if (this.elements.cancelDeleteBtn) {
            this.elements.cancelDeleteBtn.addEventListener('click', () => {
                this.closeDeleteModal();
            });
        }

        if (this.elements.confirmDeleteBtn) {
            this.elements.confirmDeleteBtn.addEventListener('click', async () => {
                await this.confirmDelete();
            });
        }

        // Close modal on overlay click
        if (this.elements.deleteModal) {
            this.elements.deleteModal.addEventListener('click', (e) => {
                if (e.target === this.elements.deleteModal) {
                    this.closeDeleteModal();
                }
            });
        }

        // Tab switching
        if (this.elements.tabProducts) {
            this.elements.tabProducts.addEventListener('click', () => this.switchTab('products'));
        }
        if (this.elements.tabPromotions) {
            this.elements.tabPromotions.addEventListener('click', () => this.switchTab('promotions'));
        }

        // Promotion form submission
        if (this.elements.promotionForm) {
            this.elements.promotionForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handlePromoFormSubmit();
            });
        }

        // Cancel promo edit
        if (this.elements.btnCancelPromo) {
            this.elements.btnCancelPromo.addEventListener('click', () => {
                this.resetPromoForm();
            });
        }

        // Promo preview update
        if (this.elements.promoQuantity) {
            this.elements.promoQuantity.addEventListener('input', () => this.updatePromoPreview());
        }
        if (this.elements.promoPrice) {
            this.elements.promoPrice.addEventListener('input', () => this.updatePromoPreview());
        }
        if (this.elements.promoProduct) {
            this.elements.promoProduct.addEventListener('change', () => this.updatePromoPreview());
        }
    }

    render() {
        this.renderStats();
        this.renderCategoryOptions();
        this.renderProductsTable();
        this.renderPromoProductOptions();
        this.renderPromotions();
    }

    renderStats() {
        const stats = window.productManager.getStats();

        if (this.elements.statTotal) {
            this.elements.statTotal.textContent = stats.total;
        }
        if (this.elements.statAvailable) {
            this.elements.statAvailable.textContent = stats.available;
        }
        if (this.elements.statLowStock) {
            this.elements.statLowStock.textContent = stats.lowStock;
        }
        if (this.elements.statOutOfStock) {
            this.elements.statOutOfStock.textContent = stats.outOfStock;
        }
    }

    renderCategoryOptions() {
        const categories = window.productManager.getCategories();

        // Form select
        if (this.elements.productCategory) {
            this.elements.productCategory.innerHTML = `
                <option value="">Seleccionar categoría</option>
                ${categories.map(cat => `
                    <option value="${cat.id}">${cat.name}</option>
                `).join('')}
            `;
        }

        // Filter select
        if (this.elements.categoryFilter) {
            this.elements.categoryFilter.innerHTML = `
                <option value="all">Todas las categorías</option>
                ${categories.map(cat => `
                    <option value="${cat.id}">${cat.name}</option>
                `).join('')}
            `;
        }
    }

    renderProductsTable() {
        if (!this.elements.productsTableBody) return;

        let products = window.productManager.getAll();

        // Apply search filter
        const searchQuery = this.elements.adminSearch?.value.trim() || '';
        if (searchQuery) {
            products = window.productManager.search(searchQuery);
        }

        // Apply category filter
        const categoryFilter = this.elements.categoryFilter?.value || 'all';
        if (categoryFilter !== 'all') {
            products = products.filter(p => p.category === categoryFilter);
        }

        if (products.length === 0) {
            this.elements.productsTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="admin-empty">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="m21 21-4.35-4.35M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z"/>
                        </svg>
                        <p>No se encontraron productos</p>
                    </td>
                </tr>
            `;
            return;
        }

        this.elements.productsTableBody.innerHTML = products.map(product => {
            const stockStatus = TiaJuliaUtils.getStockStatus(product.stock);
            const category = window.productManager.getCategories()
                .find(c => c.id === product.category);
            const categoryName = category ? category.name : 'Sin categoría';

            return `
                <tr data-id="${product.id}">
                    <td>
                        <img src="${product.image}" alt="${product.name}" class="product-row-image"
                             onerror="this.src='https://via.placeholder.com/50x50?text=?'">
                    </td>
                    <td>
                        <div class="product-row-name">${product.name}</div>
                        <div class="product-row-category">${categoryName}</div>
                    </td>
                    <td class="product-row-price">${TiaJuliaUtils.formatPrice(product.price)}</td>
                    <td>
                        <div class="stock-edit">
                            <button type="button" class="stock-btn stock-btn-minus" 
                                    onclick="adminApp.updateStock('${product.id}', -1)">−</button>
                            <input type="number" class="stock-edit-input" value="${product.stock}" 
                                   min="0" onchange="adminApp.setStock('${product.id}', this.value)">
                            <button type="button" class="stock-btn stock-btn-plus"
                                    onclick="adminApp.updateStock('${product.id}', 1)">+</button>
                        </div>
                    </td>
                    <td>
                        <span class="product-row-stock ${stockStatus.class}">
                            ${stockStatus.text}
                        </span>
                    </td>
                    <td>
                        <div class="product-actions">
                            <button type="button" class="btn btn-sm btn-secondary" 
                                    onclick="adminApp.editProduct('${product.id}')">
                                Editar
                            </button>
                            <button type="button" class="btn btn-sm btn-danger"
                                    onclick="adminApp.showDeleteModal('${product.id}')">
                                Eliminar
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    async handleFormSubmit() {
        const formData = this.getFormData();

        // Validate
        if (!formData.name || !formData.category) {
            TiaJuliaUtils.showToast('Por favor completa los campos requeridos', 'error');
            return;
        }

        try {
            if (this.editingProductId) {
                // Update existing product
                await window.productManager.update(this.editingProductId, formData);
                TiaJuliaUtils.showToast('Producto actualizado en Supabase');
            } else {
                // Add new product
                await window.productManager.add(formData);
                TiaJuliaUtils.showToast('Producto agregado a Supabase');
            }

            this.resetForm();
            this.render();
        } catch (error) {
            TiaJuliaUtils.showToast('Error al guardar: ' + error.message, 'error');
        }
    }

    getFormData() {
        return {
            name: this.elements.productName?.value.trim() || '',
            price: parseFloat(this.elements.productPrice?.value) || 0,
            stock: parseInt(this.elements.productStock?.value) || 0,
            category: this.elements.productCategory?.value || '',
            image: this.elements.productImage?.value.trim() || 'https://via.placeholder.com/400x300?text=Producto',
            promotion: this.elements.productPromotion?.checked || false,
            promotionText: this.elements.productPromotionText?.value.trim() || 'Oferta'
        };
    }

    editProduct(productId) {
        const product = window.productManager.getById(productId);
        if (!product) return;

        this.editingProductId = productId;

        // Fill form with product data
        if (this.elements.formTitle) {
            this.elements.formTitle.textContent = 'Editar Producto';
        }
        if (this.elements.productName) {
            this.elements.productName.value = product.name;
        }
        if (this.elements.productPrice) {
            this.elements.productPrice.value = product.price;
        }
        if (this.elements.productStock) {
            this.elements.productStock.value = product.stock;
        }
        if (this.elements.productCategory) {
            this.elements.productCategory.value = product.category;
        }
        if (this.elements.productImage) {
            this.elements.productImage.value = product.image;
        }
        if (this.elements.productPromotion) {
            this.elements.productPromotion.checked = product.promotion;
        }
        if (this.elements.productPromotionText) {
            this.elements.productPromotionText.value = product.promotionText || '';
        }

        this.togglePromotionText();
        this.updateImagePreview();

        // Show cancel button
        if (this.elements.btnCancel) {
            this.elements.btnCancel.style.display = 'inline-flex';
        }

        // Scroll to form
        this.elements.productForm?.scrollIntoView({ behavior: 'smooth' });
    }

    resetForm() {
        this.editingProductId = null;

        if (this.elements.productForm) {
            this.elements.productForm.reset();
        }
        if (this.elements.formTitle) {
            this.elements.formTitle.textContent = 'Agregar Producto';
        }
        if (this.elements.btnCancel) {
            this.elements.btnCancel.style.display = 'none';
        }
        if (this.elements.promotionTextGroup) {
            this.elements.promotionTextGroup.style.display = 'none';
        }
        if (this.elements.imagePreview) {
            this.elements.imagePreview.innerHTML = `
                <div class="image-preview-placeholder">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>
                    <p>Vista previa de imagen</p>
                </div>
            `;
        }
    }

    updateImagePreview() {
        const imageUrl = this.elements.productImage?.value.trim();

        if (!this.elements.imagePreview) return;

        if (imageUrl) {
            this.elements.imagePreview.innerHTML = `
                <img src="${imageUrl}" alt="Preview" 
                     onerror="this.parentElement.innerHTML='<div class=\\'image-preview-placeholder\\'><p>Error al cargar imagen</p></div>'">
            `;
        } else {
            this.elements.imagePreview.innerHTML = `
                <div class="image-preview-placeholder">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>
                    <p>Vista previa de imagen</p>
                </div>
            `;
        }
    }

    togglePromotionText() {
        if (!this.elements.promotionTextGroup) return;

        const isPromotion = this.elements.productPromotion?.checked;
        this.elements.promotionTextGroup.style.display = isPromotion ? 'block' : 'none';
    }

    // Stock quick edit
    async updateStock(productId, delta) {
        const product = window.productManager.getById(productId);
        if (!product) return;

        const newStock = Math.max(0, product.stock + delta);

        try {
            await window.productManager.updateStock(productId, newStock);
            this.render();
        } catch (error) {
            TiaJuliaUtils.showToast('Error al actualizar stock', 'error');
        }
    }

    async setStock(productId, value) {
        const newStock = Math.max(0, parseInt(value) || 0);

        try {
            await window.productManager.updateStock(productId, newStock);
            this.render();
        } catch (error) {
            TiaJuliaUtils.showToast('Error al actualizar stock', 'error');
        }
    }

    // Professional delete confirmation modal
    showDeleteModal(productId) {
        const product = window.productManager.getById(productId);
        if (!product) return;

        // Remove any existing modal
        const existing = document.getElementById('customDeleteModal');
        if (existing) existing.remove();

        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.id = 'customDeleteModal';
        overlay.style.cssText = `
            position: fixed; inset: 0; z-index: 99999;
            background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
            display: flex; align-items: center; justify-content: center;
            opacity: 0; transition: opacity 0.25s ease;
        `;

        // Create modal box
        overlay.innerHTML = `
            <div style="
                background: #fff; border-radius: 16px; padding: 32px;
                max-width: 400px; width: 90%; box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                transform: scale(0.9); transition: transform 0.25s ease;
                text-align: center; font-family: 'Outfit', sans-serif;
            " id="deleteModalBox">
                <div style="
                    width: 56px; height: 56px; margin: 0 auto 16px;
                    background: #fff3f3; border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                ">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#e53935" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 6h18"></path>
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                </div>
                <h3 style="margin: 0 0 8px; font-size: 1.2rem; font-weight: 700; color: #1a1a2e;">
                    Eliminar Producto
                </h3>
                <p style="margin: 0 0 6px; font-size: 0.95rem; color: #555;">
                    ¿Estás seguro de que deseas eliminar
                </p>
                <p style="margin: 0 0 20px; font-size: 1rem; font-weight: 600; color: #1a1a2e;">
                    "${product.name}"?
                </p>
                <p style="margin: 0 0 24px; font-size: 0.8rem; color: #999;">
                    Esta acción no se puede deshacer.
                </p>
                <div style="display: flex; gap: 12px; justify-content: center;">
                    <button id="deleteModalCancel" style="
                        padding: 10px 24px; border-radius: 10px; border: 2px solid #e0e0e0;
                        background: #fff; color: #555; font-weight: 600; font-size: 0.9rem;
                        cursor: pointer; transition: all 0.2s ease; font-family: inherit;
                    ">Cancelar</button>
                    <button id="deleteModalConfirm" style="
                        padding: 10px 24px; border-radius: 10px; border: none;
                        background: #e53935; color: #fff; font-weight: 600; font-size: 0.9rem;
                        cursor: pointer; transition: all 0.2s ease; font-family: inherit;
                    ">Sí, eliminar</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Animate in
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            document.getElementById('deleteModalBox').style.transform = 'scale(1)';
        });

        // Add hover effects
        const cancelBtn = document.getElementById('deleteModalCancel');
        const confirmBtn = document.getElementById('deleteModalConfirm');

        cancelBtn.onmouseenter = () => { cancelBtn.style.background = '#f5f5f5'; cancelBtn.style.borderColor = '#ccc'; };
        cancelBtn.onmouseleave = () => { cancelBtn.style.background = '#fff'; cancelBtn.style.borderColor = '#e0e0e0'; };
        confirmBtn.onmouseenter = () => { confirmBtn.style.background = '#c62828'; confirmBtn.style.transform = 'translateY(-1px)'; };
        confirmBtn.onmouseleave = () => { confirmBtn.style.background = '#e53935'; confirmBtn.style.transform = 'translateY(0)'; };

        // Close modal helper
        const closeModal = () => {
            overlay.style.opacity = '0';
            document.getElementById('deleteModalBox').style.transform = 'scale(0.9)';
            setTimeout(() => overlay.remove(), 250);
        };

        // Cancel button
        cancelBtn.addEventListener('click', closeModal);

        // Click outside to close
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal();
        });

        // Escape key to close
        const escHandler = (e) => {
            if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', escHandler); }
        };
        document.addEventListener('keydown', escHandler);

        // Confirm delete
        confirmBtn.addEventListener('click', async () => {
            confirmBtn.textContent = 'Eliminando...';
            confirmBtn.style.opacity = '0.7';
            confirmBtn.disabled = true;
            try {
                await window.productManager.delete(productId);
                TiaJuliaUtils.showToast('Producto eliminado de Supabase');
                this.render();
            } catch (error) {
                TiaJuliaUtils.showToast('Error al eliminar: ' + error.message, 'error');
            }
            closeModal();
        });
    }

    closeDeleteModal() {
        const existing = document.getElementById('customDeleteModal');
        if (existing) existing.remove();
    }

    // ===== Promociones =====

    switchTab(tab) {
        // Update tab buttons
        if (this.elements.tabProducts) {
            this.elements.tabProducts.classList.toggle('active', tab === 'products');
        }
        if (this.elements.tabPromotions) {
            this.elements.tabPromotions.classList.toggle('active', tab === 'promotions');
        }

        // Update tab content
        if (this.elements.productsContent) {
            this.elements.productsContent.classList.toggle('active', tab === 'products');
        }
        if (this.elements.promotionsContent) {
            this.elements.promotionsContent.classList.toggle('active', tab === 'promotions');
        }
    }

    renderPromoProductOptions() {
        if (!this.elements.promoProduct) return;

        const products = window.productManager.getAll();
        const options = products.map(p =>
            `<option value="${p.id}">${p.name} - S/${p.price.toFixed(2)}</option>`
        ).join('');

        this.elements.promoProduct.innerHTML = `
            <option value="">Seleccionar producto...</option>
            ${options}
        `;
    }

    renderPromotions() {
        if (!this.elements.promotionsTableBody) return;

        const promotions = window.promotionManager.getPromotionsWithProducts();

        if (promotions.length === 0) {
            this.elements.promotionsTableBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 40px; color: var(--text-secondary);">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin: 0 auto 16px; display: block; opacity: 0.5;">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                        </svg>
                        No hay promociones activas.<br>
                        <small>Crea una promocion usando el formulario de la derecha.</small>
                    </td>
                </tr>
            `;
            return;
        }

        this.elements.promotionsTableBody.innerHTML = promotions.map(promo => {
            const product = promo.product;
            return `
                <tr>
                    <td>
                        <img src="${product.image || 'https://via.placeholder.com/50x50?text=P'}" 
                             alt="${product.name}" 
                             class="product-row-image"
                             onerror="this.src='https://via.placeholder.com/50x50?text=P'">
                    </td>
                    <td>
                        <div class="product-row-name">${product.name}</div>
                    </td>
                    <td>
                        <span class="promo-badge-table">${promo.quantity} x</span>
                    </td>
                    <td>
                        <span class="product-row-price">S/${promo.promoPrice.toFixed(2)}</span>
                    </td>
                    <td>
                        <span class="product-row-stock stock-ok">Activa</span>
                    </td>
                    <td>
                        <div class="product-actions">
                            <button class="btn btn-sm btn-danger" onclick="adminApp.deletePromo('${promo.id}')" title="Eliminar">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M3 6h18"></path>
                                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                                </svg>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    updatePromoPreview() {
        const quantity = parseInt(this.elements.promoQuantity?.value) || 1;
        const price = parseFloat(this.elements.promoPrice?.value) || 0;
        const productId = this.elements.promoProduct?.value;

        if (productId && quantity > 0 && price > 0) {
            const product = window.productManager.getById(productId);
            if (product && this.elements.promoPreview && this.elements.promoPreviewText) {
                this.elements.promoPreview.style.display = 'block';
                this.elements.promoPreviewText.textContent = `${quantity} x S/${price.toFixed(2)}`;
            }
        } else if (this.elements.promoPreview) {
            this.elements.promoPreview.style.display = 'none';
        }
    }

    async handlePromoFormSubmit() {
        const productId = this.elements.promoProduct?.value;
        const quantity = parseInt(this.elements.promoQuantity?.value);
        const promoPrice = parseFloat(this.elements.promoPrice?.value);

        if (!productId || !quantity || !promoPrice) {
            TiaJuliaUtils.showToast('Completa todos los campos', 'error');
            return;
        }

        try {
            if (this.editingPromoId) {
                await window.promotionManager.update(this.editingPromoId, {
                    productId,
                    quantity,
                    promoPrice,
                    active: true
                });
                TiaJuliaUtils.showToast('Promocion actualizada');
            } else {
                await window.promotionManager.add({
                    productId,
                    quantity,
                    promoPrice
                });
                TiaJuliaUtils.showToast('Promocion creada exitosamente');
            }

            this.resetPromoForm();
            this.renderPromotions();
        } catch (error) {
            console.error('Error guardando promocion:', error);
            TiaJuliaUtils.showToast('Error al guardar: ' + error.message, 'error');
        }
    }

    resetPromoForm() {
        this.editingPromoId = null;

        if (this.elements.promotionForm) {
            this.elements.promotionForm.reset();
        }
        if (this.elements.promoFormTitle) {
            this.elements.promoFormTitle.textContent = 'Crear Promocion';
        }
        if (this.elements.promoPreview) {
            this.elements.promoPreview.style.display = 'none';
        }
        if (this.elements.btnCancelPromo) {
            this.elements.btnCancelPromo.style.display = 'none';
        }
    }

    async deletePromo(promoId) {
        // Find the promotion
        const promotions = window.promotionManager.getPromotionsWithProducts();
        const promo = promotions.find(p => p.id === promoId);
        if (!promo || !promo.product) return;

        // Remove any existing modal
        const existing = document.getElementById('customDeleteModal');
        if (existing) existing.remove();

        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.id = 'customDeleteModal';
        overlay.style.cssText = `
            position: fixed; inset: 0; z-index: 99999;
            background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
            display: flex; align-items: center; justify-content: center;
            opacity: 0; transition: opacity 0.25s ease;
        `;

        // Create modal box
        overlay.innerHTML = `
            <div style="
                background: #fff; border-radius: 16px; padding: 32px;
                max-width: 400px; width: 90%; box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                transform: scale(0.9); transition: transform 0.25s ease;
                text-align: center; font-family: 'Outfit', sans-serif;
            " id="deleteModalBox">
                <div style="
                    width: 56px; height: 56px; margin: 0 auto 16px;
                    background: #fff3f3; border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                ">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#e53935" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 6h18"></path>
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                </div>
                <h3 style="margin: 0 0 8px; font-size: 1.2rem; font-weight: 700; color: #1a1a2e;">
                    Eliminar Promoción
                </h3>
                <p style="margin: 0 0 6px; font-size: 0.95rem; color: #555;">
                    ¿Estás seguro de que deseas eliminar la promoción de
                </p>
                <p style="margin: 0 0 20px; font-size: 1rem; font-weight: 600; color: #1a1a2e;">
                    "${promo.product.name}"?
                </p>
                <p style="margin: 0 0 24px; font-size: 0.8rem; color: #999;">
                    Esta acción no se puede deshacer.
                </p>
                <div style="display: flex; gap: 12px; justify-content: center;">
                    <button id="deleteModalCancel" style="
                        padding: 10px 24px; border-radius: 10px; border: 2px solid #e0e0e0;
                        background: #fff; color: #555; font-weight: 600; font-size: 0.9rem;
                        cursor: pointer; transition: all 0.2s ease; font-family: inherit;
                    ">Cancelar</button>
                    <button id="deleteModalConfirm" style="
                        padding: 10px 24px; border-radius: 10px; border: none;
                        background: #e53935; color: #fff; font-weight: 600; font-size: 0.9rem;
                        cursor: pointer; transition: all 0.2s ease; font-family: inherit;
                    ">Sí, eliminar</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Animate in
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            document.getElementById('deleteModalBox').style.transform = 'scale(1)';
        });

        // Add hover effects
        const cancelBtn = document.getElementById('deleteModalCancel');
        const confirmBtn = document.getElementById('deleteModalConfirm');

        cancelBtn.onmouseenter = () => { cancelBtn.style.background = '#f5f5f5'; cancelBtn.style.borderColor = '#ccc'; };
        cancelBtn.onmouseleave = () => { cancelBtn.style.background = '#fff'; cancelBtn.style.borderColor = '#e0e0e0'; };
        confirmBtn.onmouseenter = () => { confirmBtn.style.background = '#c62828'; confirmBtn.style.transform = 'translateY(-1px)'; };
        confirmBtn.onmouseleave = () => { confirmBtn.style.background = '#e53935'; confirmBtn.style.transform = 'translateY(0)'; };

        // Close modal helper
        const closeModal = () => {
            overlay.style.opacity = '0';
            document.getElementById('deleteModalBox').style.transform = 'scale(0.9)';
            setTimeout(() => overlay.remove(), 250);
        };

        // Cancel button
        cancelBtn.addEventListener('click', closeModal);

        // Click outside to close
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal();
        });

        // Escape key to close
        const escHandler = (e) => {
            if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', escHandler); }
        };
        document.addEventListener('keydown', escHandler);

        // Confirm delete
        confirmBtn.addEventListener('click', async () => {
            confirmBtn.textContent = 'Eliminando...';
            confirmBtn.style.opacity = '0.7';
            confirmBtn.disabled = true;
            try {
                await window.promotionManager.delete(promoId);
                TiaJuliaUtils.showToast('Promoción eliminada');
                this.renderPromotions();
            } catch (error) {
                TiaJuliaUtils.showToast('Error al eliminar: ' + error.message, 'error');
            }
            closeModal();
        });
    }
}
