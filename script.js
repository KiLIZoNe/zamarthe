const SUPABASE_URL = "https://ygttxszksmgqzzaifnlg.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlndHR4c3prc21ncXp6YWlmbmxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyODY2NjQsImV4cCI6MjA5Mjg2MjY2NH0.mnbPAMMFzMWA1qrljsx8xNT8NpdQ6NzzCNRacGgV_tU";const WHATSAPP_NUMBER = "573209015291";const CART_KEY = "zamarthe_cart";

let categoriasGlobal = [];
let productosGlobal = [];
let cart = [];

function getCart() {
    try {
        const stored = localStorage.getItem(CART_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

function saveCart(newCart) {
    cart = newCart;
    localStorage.setItem(CART_KEY, JSON.stringify(newCart));
    updateCartCount();
}

function updateCartCount() {
    const countElement = document.getElementById("cart-count");
    const cartToggle = document.getElementById("cart-toggle");
    if (!countElement) return;

    const totalItems = cart.reduce((sum, item) => sum + Number(item.cantidad || 0), 0);
    countElement.textContent = totalItems;

    if (cartToggle && totalItems > 0) {
        cartToggle.classList.add("cart-bump");
        window.clearTimeout(window.__cartBumpTimeout);
        window.__cartBumpTimeout = window.setTimeout(() => {
            cartToggle.classList.remove("cart-bump");
        }, 250);
    }
}

function showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(window.__toastTimeout);
    window.__toastTimeout = window.setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

function showCartMessage(message, isError = false) {
    const messageElement = document.getElementById("cart-message");
    if (!messageElement) return;
    messageElement.textContent = message;
    messageElement.style.color = isError ? "#c0392b" : "#27ae60";
}

function setCheckoutLoading(isLoading) {
    const checkoutButton = document.getElementById("checkout-button");
    if (!checkoutButton) return;

    if (isLoading) {
        checkoutButton.disabled = true;
        checkoutButton.classList.add("btn-loading");
        checkoutButton.dataset.originalText = checkoutButton.textContent;
        checkoutButton.textContent = "Procesando...";
    } else {
        checkoutButton.disabled = false;
        checkoutButton.classList.remove("btn-loading");
        checkoutButton.textContent = checkoutButton.dataset.originalText || "Finalizar compra";
    }
}

function openCartPanel() {
    const panel = document.getElementById("cart-panel");
    const overlay = document.getElementById("cart-overlay");
    if (panel) panel.classList.add("open");
    if (overlay) overlay.classList.add("open");
}

function closeCartPanel() {
    const panel = document.getElementById("cart-panel");
    const overlay = document.getElementById("cart-overlay");
    if (panel) panel.classList.remove("open");
    if (overlay) overlay.classList.remove("open");
}

function addToCart(producto) {
    const productoStock = Number(producto.stock || 0);
    if (productoStock <= 0) {
        showToast("Stock insuficiente para este producto.");
        return;
    }

    const existingItem = cart.find(item => String(item.id) === String(producto.id));
    const currentQuantity = Number(existingItem?.cantidad || 0);

    if (currentQuantity + 1 > productoStock) {
        showToast("No hay más stock disponible para este producto.");
        return;
    }

    if (existingItem) {
        existingItem.cantidad = currentQuantity + 1;
    } else {
        cart.push({
            id: producto.id,
            nombre: producto.nombre,
            precio: Number(producto.precio),
            imagen: producto.imagen,
            cantidad: 1
        });
    }

    saveCart(cart);
    renderCart();
    showCartMessage(`"${producto.nombre}" agregado al carrito`);
    openCartPanel();
}

function removeFromCart(id) {
    cart = cart.filter(item => String(item.id) !== String(id));
    saveCart(cart);
    renderCart();
}

function updateQuantity(id, cantidad) {
    const quantity = Number(cantidad);
    if (Number.isNaN(quantity) || quantity < 1) {
        removeFromCart(id);
        return;
    }

    const item = cart.find(producto => String(producto.id) === String(id));
    if (!item) return;
    item.cantidad = quantity;
    saveCart(cart);
    renderCart();
}

function formatCartWhatsAppMessage() {
    if (cart.length === 0) return "";

    const lines = [
        "Hola, quiero realizar una compra:\n"
    ];

    let total = 0;
    cart.forEach(item => {
        const precioUnitario = Number(item.precio || 0);
        const subtotal = precioUnitario * Number(item.cantidad || 0);
        total += subtotal;
        lines.push(`- ${item.nombre} x${item.cantidad} | $${precioUnitario.toLocaleString("es-CO")} c/u | Subtotal: $${subtotal.toLocaleString("es-CO")}`);
    });

    lines.push(`\nTotal: $${total.toLocaleString("es-CO")}`);
    return encodeURIComponent(lines.join("\n"));
}

async function procesarCompra() {
    if (!cart || cart.length === 0) {
        showToast("El carrito está vacío.");
        return false;
    }

    setCheckoutLoading(true);

    try {
     const pedidoResponse = await fetch(
  "https://ygttxszksmgqzzaifnlg.supabase.co/functions/v1/procesar-pedido",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_KEY,              // 🔥 OBLIGATORIO
      "Authorization": `Bearer ${SUPABASE_KEY}` // 🔥 MUY IMPORTANTE
    },
    body: JSON.stringify({
      items: cart
    })
  }
);

        if (!pedidoResponse.ok) {
             const error = await pedidoResponse.json();
                console.error("ERROR BACKEND:", error); // 🔥 ESTA LÍNEA NUEVA
              throw new Error(error.detail || error.error || "Error al crear pedido");
        }

        // 🔥 YA NO HAY FOR NI STOCK UPDATE
        clearCart();
        actualizarVistaProductos();

        showCartMessage("Compra realizada con éxito", false);
        return true;

    } catch (error) {
        console.error(error);
        showToast(`Error: ${error.message}`);
        return false;
    } finally {
        setCheckoutLoading(false);
    }
}

function clearCart() {
    cart = [];
    saveCart(cart);
    renderCart();
    showCartMessage("Compra realizada", false);
}

function renderCart() {
    const itemsContainer = document.getElementById("cart-items");
    const totalElement = document.getElementById("cart-total");
    if (!itemsContainer || !totalElement) return;

    itemsContainer.innerHTML = "";
    if (cart.length === 0) {
        itemsContainer.innerHTML = "<p class='cart-empty'>El carrito está vacío.</p>";
        totalElement.textContent = "$0";
        updateCartCount();
        return;
    }

    let total = 0;
    cart.forEach(producto => {
        total += Number(producto.precio || 0) * Number(producto.cantidad || 0);

        const item = document.createElement("div");
        item.className = "cart-item";
        item.innerHTML = `
            <img src="${producto.imagen}" alt="${producto.nombre}">
            <div class="cart-item-info">
                <strong>${producto.nombre}</strong>
                <p>$${Number(producto.precio).toLocaleString("es-CO")}</p>
                <div class="cart-item-actions">
                    <input type="number" min="1" value="${producto.cantidad}" class="cart-quantity" />
                    <button type="button" class="btn-wsp cart-remove">Eliminar</button>
                </div>
            </div>
        `;

        const quantityInput = item.querySelector(".cart-quantity");
        const removeButton = item.querySelector(".cart-remove");

        quantityInput.addEventListener("change", event => {
            updateQuantity(producto.id, event.target.value);
        });

        removeButton.addEventListener("click", () => {
            removeFromCart(producto.id);
        });

        itemsContainer.appendChild(item);
    });

    totalElement.textContent = `$${total.toLocaleString("es-CO")}`;
    updateCartCount();
}

function findCategoriaNombre(categoriaId) {
    const categoria = categoriasGlobal.find(item => String(item.id) === String(categoriaId));
    return categoria ? categoria.nombre : "Sin categoría";
}

function getStockLabel(stock) {
    const cantidad = Number(stock || 0);
    if (cantidad === 0) return "Agotado";
    if (cantidad < 5) return "🔥 Últimas unidades";
    return "";
}

function populateFiltroCategoria() {
    const select = document.getElementById("filtro-categoria");
    if (!select) return;

    select.innerHTML = '<option value="">Todas las categorías</option>';
    categoriasGlobal.forEach(cat => {
        select.innerHTML += `<option value="${cat.id}">${cat.nombre}</option>`;
    });
}

function filtrarBusqueda(texto) {
    const value = String(texto || "").trim().toLowerCase();
    if (!value) {
        return [...productosGlobal];
    }
    return productosGlobal.filter(p => String(p.nombre).toLowerCase().includes(value));
}

function aplicarFiltros(lista) {
    const categoria = document.getElementById("filtro-categoria")?.value;
    const min = Number(document.getElementById("precio-min")?.value || 0);
    const max = Number(document.getElementById("precio-max")?.value || 0);

    let resultado = [...lista];

    if (categoria) {
        resultado = resultado.filter(p => String(p.categoria_id) === String(categoria));
    }
    if (!Number.isNaN(min) && min > 0) {
        resultado = resultado.filter(p => Number(p.precio) >= min);
    }
    if (!Number.isNaN(max) && max > 0) {
        resultado = resultado.filter(p => Number(p.precio) <= max);
    }

    return resultado;
}

function resetFiltros() {
    const searchInput = document.getElementById("search-input");
    const filtroCategoria = document.getElementById("filtro-categoria");
    const precioMin = document.getElementById("precio-min");
    const precioMax = document.getElementById("precio-max");
    const ordenarSelect = document.getElementById("ordenar");

    if (searchInput) searchInput.value = "";
    if (filtroCategoria) filtroCategoria.value = "";
    if (precioMin) precioMin.value = "";
    if (precioMax) precioMax.value = "";
    if (ordenarSelect) ordenarSelect.value = "";

    filtrar("todos");
}

function ordenarProductos(lista) {
    const tipo = document.getElementById("ordenar")?.value;
    const resultado = [...lista];

    if (tipo === "precio-asc") {
        return resultado.sort((a, b) => Number(a.precio) - Number(b.precio));
    }
    if (tipo === "precio-desc") {
        return resultado.sort((a, b) => Number(b.precio) - Number(a.precio));
    }
    if (tipo === "vendidos") {
        return resultado.sort((a, b) => (Number(b.vendidos) || 0) - (Number(a.vendidos) || 0));
    }

    return resultado;
}

function actualizarVistaProductos() {
    const texto = document.getElementById("search-input")?.value || "";
    let lista = filtrarBusqueda(texto);
    lista = aplicarFiltros(lista);
    lista = ordenarProductos(lista);
    mostrarProductosWeb(lista);
}

function renderSkeletons(cantidad = 6) {
    const container = document.getElementById("productos-container");
    if (!container) return;

    let skeletonHtml = "";
    for (let i = 0; i < cantidad; i++) {
        skeletonHtml += `
            <div class="product skeleton">
                <div class="skeleton-img"></div>
                <div class="product-body">
                    <div class="skeleton-text"></div>
                    <div class="skeleton-text small"></div>
                </div>
            </div>
        `;
    }

    container.innerHTML = skeletonHtml;
}

function mostrarProductosWeb(productos) {
    const container = document.getElementById("productos-container");
    const message = document.getElementById("product-message");
    if (!container) return;

    container.innerHTML = "";
    if (message) {
        message.textContent = "";
    }

    if (!productos || productos.length === 0) {
        if (message) {
            message.textContent = "No hay productos disponibles.";
        }
        return;
    }

    productos.forEach(p => {
        const isOutOfStock = Number(p.stock || 0) === 0;
        const stockLabel = getStockLabel(p.stock);
        const soldHtml = Number(p.vendidos || 0) > 0 ? `<p class="sold">🔥 ${Number(p.vendidos).toLocaleString("es-CO")} vendidos</p>` : "";

        const card = document.createElement("div");
        card.className = "product";
        card.innerHTML = `
            <div class="product-img-container">
                <img src="${p.imagen}" alt="${p.nombre}" loading="lazy">
            </div>
            <div class="product-body">
                <h3>${p.nombre}</h3>
                <p class="product-price">$${Number(p.precio).toLocaleString("es-CO")}</p>
                <p class="product-category">${findCategoriaNombre(p.categoria_id)}</p>
                ${stockLabel ? `<p class="stock-label">${stockLabel}</p>` : ""}
                ${soldHtml}
            </div>
            <div class="product-buttons"></div>
        `;

        const buttonsContainer = card.querySelector(".product-buttons");

        const cartButton = document.createElement("button");
        cartButton.type = "button";
        cartButton.className = "btn-wsp";
        cartButton.textContent = isOutOfStock ? "Agotado" : "Agregar al carrito";
        cartButton.disabled = isOutOfStock;
        if (isOutOfStock) {
            cartButton.classList.add("btn-disabled");
        }
        cartButton.addEventListener("click", () => {
            addToCart({
                id: p.id,
                nombre: p.nombre,
                precio: p.precio,
                imagen: p.imagen,
                stock: p.stock
            });
            openCartPanel();
        });

        buttonsContainer.appendChild(cartButton);
        container.appendChild(card);
    });
}

async function cargarCategorias() {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/categorias?select=id,nombre`, {
    headers: {
        apikey: SUPABASE_KEY,
        Accept: "application/json"
    }
});

    if (!response.ok) {
        throw new Error(`Error cargando categorías: ${response.status}`);
    }

    return response.json();
}

async function cargarProductos() {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/productos?select=id,nombre,precio,stock,vendidos,categoria_id,whatsapp,imagen`, {
    headers: {
        apikey: SUPABASE_KEY,
        Accept: "application/json"
    }
});

    if (!response.ok) {
        throw new Error(`Error cargando productos: ${response.status}`);
    }

    return response.json();
}

function renderCategorias() {
    const container = document.getElementById("categorias-container");
    if (!container) return;
    container.innerHTML = "";

    const btnTodos = document.createElement("button");
    btnTodos.textContent = "Todos";
    btnTodos.className = "categoria-boton active";
    btnTodos.addEventListener("click", () => filtrar("todos"));
    container.appendChild(btnTodos);

    categoriasGlobal.forEach(cat => {
        const btn = document.createElement("button");
        btn.textContent = cat.nombre;
        btn.className = "categoria-boton";
        btn.addEventListener("click", () => filtrar(cat.id));
        container.appendChild(btn);
    });
}

function filtrar(categoriaId) {
    const buttons = document.querySelectorAll(".categoria-boton");
    buttons.forEach(button => {
        const isTodos = button.textContent === "Todos";
        const isActive = isTodos ? categoriaId === "todos" : button.textContent === categoriasGlobal.find(c => String(c.id) === String(categoriaId))?.nombre;
        button.classList.toggle("active", isActive);
    });

    const select = document.getElementById("filtro-categoria");
    if (select) {
        select.value = categoriaId === "todos" ? "" : categoriaId;
    }

    actualizarVistaProductos();
}

document.addEventListener("DOMContentLoaded", async function() {
    cart = getCart();
    updateCartCount();
    renderSkeletons();

    try {
        categoriasGlobal = await cargarCategorias();
        productosGlobal = await cargarProductos();

        renderCategorias();
        populateFiltroCategoria();
        mostrarProductosWeb(productosGlobal);
        renderCart();

        const discoverButton = document.getElementById("discover-button");
        if (discoverButton) {
            discoverButton.addEventListener("click", () => {
                const productsSection = document.getElementById("products");
                if (productsSection) {
                    productsSection.scrollIntoView({ behavior: "smooth" });
                }
            });
        }

        const cartToggle = document.getElementById("cart-toggle");
        if (cartToggle) {
            cartToggle.addEventListener("click", () => {
                renderCart();
                openCartPanel();
            });
        }

        const cartClose = document.getElementById("cart-close");
        if (cartClose) {
            cartClose.addEventListener("click", closeCartPanel);
        }

        const filtroCategoriaSelect = document.getElementById("filtro-categoria");
        const searchInput = document.getElementById("search-input");
        const precioMin = document.getElementById("precio-min");
        const precioMax = document.getElementById("precio-max");
        const ordenarSelect = document.getElementById("ordenar");

        if (filtroCategoriaSelect) {
            filtroCategoriaSelect.addEventListener("change", actualizarVistaProductos);
        }
        if (searchInput) {
            searchInput.addEventListener("input", actualizarVistaProductos);
        }
        if (precioMin) {
            precioMin.addEventListener("input", actualizarVistaProductos);
        }
        if (precioMax) {
            precioMax.addEventListener("input", actualizarVistaProductos);
        }
        if (ordenarSelect) {
            ordenarSelect.addEventListener("change", actualizarVistaProductos);
        }

        const resetFiltrosButton = document.getElementById("reset-filtros");
        if (resetFiltrosButton) {
            resetFiltrosButton.addEventListener("click", resetFiltros);
        }

        const cartOverlay = document.getElementById("cart-overlay");
        if (cartOverlay) {
            cartOverlay.addEventListener("click", closeCartPanel);
        }

        const checkoutButton = document.getElementById("checkout-button");
        if (checkoutButton) {
            checkoutButton.addEventListener("click", async () => {
                const mensaje = formatCartWhatsAppMessage();
                checkoutButton.disabled = true;
                const originalText = checkoutButton.textContent;
                checkoutButton.textContent = "Procesando...";

                const success = await procesarCompra();
                checkoutButton.disabled = false;
                checkoutButton.textContent = originalText;

                if (!success) return;

                showToast("Compra realizada 🎉 Redirigiendo...");
                setTimeout(() => {
                    window.location.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${mensaje}`;
                }, 1200);
                closeCartPanel();
            });
        }
    } catch (error) {
        console.error(error);
        const message = document.getElementById("product-message");
        if (message) {
            message.textContent = "No se pudieron cargar los productos. Intenta más tarde.";
        }
    }
});
