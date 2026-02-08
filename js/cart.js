class Cart {
    constructor() {
        this.items = JSON.parse(sessionStorage.getItem('tiajulia_cart')) || [];
        this.init();
    }

    init() {
        this.cacheElements();
        this.bindEvents();
        this.updateCount();
    }

    cacheElements() {
        this.elements = {
            cartBtn: document.getElementById('cartBtn'),
            cartCount: document.getElementById('cartCount'),
            cartModal: document.getElementById('cartModal'),
            cartItems: document.getElementById('cartItems'),
            cartTotal: document.getElementById('cartTotal'),
            cartEmpty: document.getElementById('cartEmpty'),
            checkoutBtn: document.getElementById('checkoutBtn'),
            checkoutModal: document.getElementById('checkoutModal'),
            checkoutList: document.getElementById('checkoutList'),
            checkoutTotalAmount: document.getElementById('checkoutTotalAmount'),
            sendWhatsappBtn: document.getElementById('sendWhatsappBtn'),
            closeModals: document.querySelectorAll('.close-modal')
        };
    }

    bindEvents() {
        // Toggle Cart Modal
        if (this.elements.cartBtn) {
            this.elements.cartBtn.addEventListener('click', () => {
                this.render();
                this.openModal('cartModal');
            });
        }

        // Close Modals
        this.elements.closeModals.forEach(btn => {
            btn.addEventListener('click', () => {
                this.closeAllModals();
            });
        });

        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeAllModals();
            }
        });

        // Checkout Button
        if (this.elements.checkoutBtn) {
            this.elements.checkoutBtn.addEventListener('click', () => {
                this.closeModal('cartModal');
                this.renderCheckout();
                this.openModal('checkoutModal');
            });
        }

        // WhatsApp Button
        if (this.elements.sendWhatsappBtn) {
            this.elements.sendWhatsappBtn.addEventListener('click', () => {
                this.sendToWhatsapp();
            });
        }

        // Cart Item Actions (Delegation)
        if (this.elements.cartItems) {
            this.elements.cartItems.addEventListener('click', (e) => {
                const target = e.target.closest('button');
                if (!target) return;

                const id = target.dataset.id;
                if (!id) return;

                if (target.classList.contains('increase')) {
                    this.updateQuantity(id, 1);
                } else if (target.classList.contains('decrease')) {
                    this.updateQuantity(id, -1);
                } else if (target.classList.contains('remove-btn')) {
                    this.remove(id);
                }
            });
        }
    }

    add(product) {
        const existing = this.items.find(item => item.id === product.id);

        if (existing) {
            // Check stock limit
            if (existing.quantity < product.stock) {
                existing.quantity++;
                TiaJuliaUtils.showToast(`Cantidad actualizada: ${product.name}`);
            } else {
                TiaJuliaUtils.showToast('No hay más stock disponible', 'error');
                return;
            }
        } else {
            this.items.push({
                ...product,
                quantity: 1
            });
            TiaJuliaUtils.showToast(`${product.name} agregado al carrito`);

            // Animation for cart button
            this.elements.cartBtn.animate([
                { transform: 'scale(1)' },
                { transform: 'scale(1.2)' },
                { transform: 'scale(1)' }
            ], 300);
        }

        this.save();
        this.updateCount();
    }

    remove(id) {
        this.items = this.items.filter(item => item.id !== id);
        this.save();
        this.updateCount();
        this.render();
    }

    updateQuantity(id, delta) {
        const item = this.items.find(item => item.id === id);
        if (!item) return;

        const newQty = item.quantity + delta;

        if (newQty <= 0) {
            if (confirm('¿Eliminar producto del carrito?')) {
                this.remove(id);
            }
        } else if (newQty <= item.stock) {
            item.quantity = newQty;
            this.save();
            this.render();
        } else {
            TiaJuliaUtils.showToast('Stock máximo alcanzado', 'error');
        }
    }

    save() {
        sessionStorage.setItem('tiajulia_cart', JSON.stringify(this.items));
    }

    updateCount() {
        const count = this.items.reduce((sum, item) => sum + item.quantity, 0);

        // Update floating button counter
        if (this.elements.cartCount) {
            this.elements.cartCount.textContent = count;

            if (count === 0) {
                this.elements.cartCount.style.display = 'none';
            } else {
                this.elements.cartCount.style.display = 'flex';
            }
        }

        // Update header counter
        const headerCount = document.getElementById('headerCartCount');
        if (headerCount) {
            headerCount.textContent = count;
            if (count === 0) {
                headerCount.classList.remove('show');
            } else {
                headerCount.classList.add('show');
            }
        }
    }

    getTotal() {
        return this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }

    render() {
        if (!this.elements.cartItems) return;

        if (this.items.length === 0) {
            this.elements.cartItems.style.display = 'none';
            this.elements.cartEmpty.style.display = 'block';
            this.elements.checkoutBtn.disabled = true;
            this.elements.cartTotal.textContent = 'S/ 0.00';
            return;
        }

        this.elements.cartItems.style.display = 'block';
        this.elements.cartEmpty.style.display = 'none';
        this.elements.checkoutBtn.disabled = false;

        this.elements.cartItems.innerHTML = this.items.map(item => `
            <div class="cart-item">
                <img src="${item.image}" alt="${item.name}" class="cart-item-image"
                     onerror="this.src='https://via.placeholder.com/60x60?text=IMG'">
                <div class="cart-item-details">
                    <h4>${item.name}</h4>
                    <div class="cart-item-price">${TiaJuliaUtils.formatPrice(item.price)}</div>
                </div>
                <div class="cart-controls">
                    <button class="qty-btn decrease" data-id="${item.id}">-</button>
                    <span class="cart-qty">${item.quantity}</span>
                    <button class="qty-btn increase" data-id="${item.id}">+</button>
                    <button class="remove-btn" data-id="${item.id}" title="Eliminar">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
            </div>
        `).join('');

        this.elements.cartTotal.textContent = TiaJuliaUtils.formatPrice(this.getTotal());
    }

    renderCheckout() {
        if (!this.elements.checkoutList) return;

        this.elements.checkoutList.innerHTML = this.items.map(item => `
            <li>
                <span>${item.quantity} x ${item.name}</span>
                <span>${TiaJuliaUtils.formatPrice(item.price * item.quantity)}</span>
            </li>
        `).join('');

        // Update payment amount display
        const paymentAmount = document.getElementById('paymentAmount');
        if (paymentAmount) {
            paymentAmount.textContent = TiaJuliaUtils.formatPrice(this.getTotal());
        }
    }

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
            // Trigger reflow
            modal.offsetHeight;
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.style.display = 'none';
                document.body.style.overflow = '';
            }, 350);
        }
    }

    closeAllModals() {
        this.closeModal('cartModal');
        this.closeModal('checkoutModal');
    }

    sendToWhatsapp() {
        const phone = '51970405671';
        const total = TiaJuliaUtils.formatPrice(this.getTotal());

        let message = `Hola, quiero realizar el siguiente pedido:\n\n`;
        message += `--- DETALLE DEL PEDIDO ---\n`;

        this.items.forEach(item => {
            message += `- ${item.quantity} x ${item.name}: ${TiaJuliaUtils.formatPrice(item.price * item.quantity)}\n`;
        });

        message += `\n*TOTAL: ${total}*\n`;
        message += `\nPago realizado por Yape.`;

        const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    }
}
