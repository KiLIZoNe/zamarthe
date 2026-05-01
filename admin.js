const SUPABASE_URL = "https://ygttxszksmgqzzaifnlg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlndHR4c3prc21ncXp6YWlmbmxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyODY2NjQsImV4cCI6MjA5Mjg2MjY2NH0.mnbPAMMFzMWA1qrljsx8xNT8NpdQ6NzzCNRacGgV_tU";

let authToken = null;
let productosGlobal = [];
let categoriasGlobal = [];
let pedidosGlobal = [];

function showLoginMessage(message, isError = true) {
    const loginMessage = document.getElementById("login-message");
    if (!loginMessage) return;
    loginMessage.textContent = message;
    loginMessage.style.color = isError ? "#c0392b" : "#2c3e50";
}

function showFormMessage(message, isError = true) {
    const form = document.getElementById("producto-form");
    if (!form) return;

    let messageElement = form.querySelector(".form-message");
    if (!messageElement) {
        messageElement = document.createElement("p");
        messageElement.className = "form-message";
        form.appendChild(messageElement);
    }

    messageElement.textContent = message;
    messageElement.style.color = isError ? "#c0392b" : "#27ae60";
    messageElement.style.display = message ? "block" : "none";
}

function clearFormMessage() {
    showFormMessage("", false);
}

function parseJson(res) {
    return res.text().then(text => {
        try {
            return text ? JSON.parse(text) : null;
        } catch {
            return null;
        }
    });
}

async function handleResponse(res, errorMessage = "Error en la petición") {
    const body = await parseJson(res);
    if (!res.ok) {
        const detail = body?.error_description || body?.message || body?.error || body?.msg || res.statusText;
        throw new Error(`${errorMessage}: ${detail || res.status}`);
    }
    return body;
}

function validateProductForm({ nombre, precio, stock, categoria_id, whatsapp }) {
    if (!nombre || !nombre.trim()) {
        return "El nombre del producto es obligatorio.";
    }

    const precioNumber = Number(precio);
    if (Number.isNaN(precioNumber) || precioNumber <= 0) {
        return "El precio debe ser un número mayor a 0.";
    }

    const stockNumber = Number(stock);
    if (!Number.isInteger(stockNumber) || stockNumber < 0) {
        return "El stock debe ser un número entero igual o mayor a 0.";
    }

    if (!categoria_id) {
        return "Debes seleccionar una categoría.";
    }

    if (!/^[0-9]+$/.test(whatsapp)) {
        return "El WhatsApp solo puede contener números.";
    }

    return "";
}

function restoreSession() {
    const token = localStorage.getItem("token");
    if (token) {
        authToken = token;
    }
}

function logoutAdmin() {
    localStorage.removeItem("token");
    authToken = null;
    window.location.reload();
}

function getDefaultHeaders(isJson = true) {
    const headers = {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${authToken}`
    };

    if (isJson) {
        headers["Content-Type"] = "application/json";
    }

    return headers;
}

async function cargarProductos() {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/productos?select=*`, {
        headers: getDefaultHeaders(false)
    });
    return handleResponse(res, "Error cargando productos");
}

async function cargarCategorias() {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/categorias`, {
        headers: getDefaultHeaders(false)
    });
    return handleResponse(res, "Error cargando categorías");
}

function mostrarCategorias(data) {
    const cont = document.getElementById("categorias-list");
    if (!cont) return;
    cont.innerHTML = "";

    data.forEach(c => {
        cont.innerHTML += `
        <div class="producto-item">
            <div class="producto-info">
                <input type="text" id="cat-${c.id}" value="${c.nombre}">
            </div>
            <div class="producto-actions">
                <button onclick="actualizarCategoria('${c.id}')">Guardar</button>
                <button onclick="eliminarCategoria('${c.id}')">Eliminar</button>
            </div>
        </div>
        `;
    });
}

async function cargarPedidos() {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/pedidos?select=*`, {
        headers: getDefaultHeaders(false)
    });
    return handleResponse(res, "Error cargando pedidos");
}

function formatDate(dateString) {
    if (!dateString) return "Sin fecha";
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? dateString : date.toLocaleString("es-CO", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function parsePedidoItems(pedido) {
    const rawItems = pedido.items || pedido.productos || pedido.detalle || pedido.line_items;
    if (!rawItems) return [];

    if (Array.isArray(rawItems)) return rawItems;

    try {
        return typeof rawItems === "string" ? JSON.parse(rawItems) : [];
    } catch {
        return [];
    }
}

function mostrarPedidos(data) {
    const cont = document.getElementById("pedidos-list");
    if (!cont) return;
    cont.innerHTML = "";

    if (!data || data.length === 0) {
        cont.innerHTML = "<p>No hay pedidos registrados.</p>";
        return;
    }

    data.forEach(p => {
        const items = parsePedidoItems(p);
        cont.innerHTML += `
        <div class="producto-item pedido-item">
            <button type="button" class="pedido-delete" onclick="eliminarPedido('${p.id}')" title="Eliminar pedido permanentemente">×</button>
            <div class="producto-info">
                <strong>Pedido #${p.id}</strong>
                <p>Fecha: ${formatDate(p.fecha)}</p>
                <p>Total: ${p.total ?? "-"}</p>
                <p>
                    Estado:
                    <select onchange="actualizarEstadoPedido('${p.id}', this.value)">
                        <option value="pendiente" ${p.estado === "pendiente" ? "selected" : ""}>pendiente</option>
                        <option value="enviado" ${p.estado === "enviado" ? "selected" : ""}>enviado</option>
                        <option value="entregado" ${p.estado === "entregado" ? "selected" : ""}>entregado</option>
                        <option value="cancelado" ${p.estado === "cancelado" ? "selected" : ""}>cancelado</option>
                    </select>
                </p>
                <button type="button" onclick="togglePedidoDetalle('${p.id}', this)">Ver detalle</button>
                <div id="pedido-detalle-${p.id}" class="pedido-detalle">
                    ${items.length > 0 ? items.map(item => `
                        <div class="pedido-item-detalle">
                            <strong>${item.nombre || item.producto || item.title || "Producto"}</strong>
                            <p>Cantidad: ${item.cantidad ?? item.qty ?? item.quantity ?? "-"}</p>
                            <p>Precio: ${item.precio ?? item.price ?? "-"}</p>
                        </div>
                    `).join("") : "<p>No hay productos en este pedido.</p>"}
                </div>
            </div>
        </div>
        `;
    });
}

function togglePedidoDetalle(id, button) {
    id = String(id);
    const detalle = document.getElementById(`pedido-detalle-${id}`);
    if (!detalle) return;

    const isOpen = detalle.classList.toggle("open");

    if (button) {
        button.textContent = isOpen ? "Ocultar detalle" : "Ver detalle";
    }
}

async function actualizarEstadoPedido(id, estado) {
    id = String(id);
    const pedido = pedidosGlobal.find(p => String(p.id) === id);
    if (!pedido) {
        alert("Pedido no encontrado.");
        return;
    }

    try {
        const prevEstado = pedido.estado;
        if (estado === "entregado" && prevEstado !== "entregado") {
            const items = parsePedidoItems(pedido);
            for (const item of items) {
                const producto = productosGlobal.find(p => String(p.id) === String(item.id));
                if (!producto) continue;

                const cantidad = Number(item.cantidad || item.qty || item.quantity || 0);
                if (Number.isNaN(cantidad) || cantidad <= 0) continue;

                const nuevoStock = Number(producto.stock || 0) - cantidad;
                const nuevosVendidos = Number(producto.vendidos || 0) + cantidad;

                const stockResponse = await fetch(`${SUPABASE_URL}/rest/v1/productos?id=eq.${producto.id}`, {
                    method: "PATCH",
                    headers: getDefaultHeaders(),
                    body: JSON.stringify({
                        stock: nuevoStock,
                        vendidos: nuevosVendidos
                    })
                });

                await handleResponse(stockResponse, `Error actualizando stock de ${producto.nombre || producto.id}`);

                producto.stock = nuevoStock;
                producto.vendidos = nuevosVendidos;
            }
        } else if (prevEstado === "entregado" && estado !== "entregado") {
            const items = parsePedidoItems(pedido);
            for (const item of items) {
                const producto = productosGlobal.find(p => String(p.id) === String(item.id));
                if (!producto) continue;

                const cantidad = Number(item.cantidad || item.qty || item.quantity || 0);
                if (Number.isNaN(cantidad) || cantidad <= 0) continue;

                const nuevoStock = Number(producto.stock || 0) + cantidad;
                const nuevosVendidos = Math.max(0, Number(producto.vendidos || 0) - cantidad);

                const stockResponse = await fetch(`${SUPABASE_URL}/rest/v1/productos?id=eq.${producto.id}`, {
                    method: "PATCH",
                    headers: getDefaultHeaders(),
                    body: JSON.stringify({
                        stock: nuevoStock,
                        vendidos: nuevosVendidos
                    })
                });

                await handleResponse(stockResponse, `Error revirtiendo stock de ${producto.nombre || producto.id}`);

                producto.stock = nuevoStock;
                producto.vendidos = nuevosVendidos;
            }
        }

        const res = await fetch(`${SUPABASE_URL}/rest/v1/pedidos?id=eq.${id}`, {
            method: "PATCH",
            headers: getDefaultHeaders(),
            body: JSON.stringify({ estado })
        });

        await handleResponse(res, "Error actualizando estado de pedido");

        pedidosGlobal = pedidosGlobal.map(p => String(p.id) === String(id) ? { ...p, estado } : p);
        mostrarPedidos(pedidosGlobal);
        actualizarDashboard(productosGlobal);
    } catch (error) {
        console.error(error);
        alert(`No se pudo actualizar el estado del pedido. ${error.message || "Intenta de nuevo más tarde."}`);
    }
}

async function eliminarPedido(id) {
    id = String(id);
    if (!confirm("Este pedido se eliminará permanentemente. ¿Deseas continuar?")) return;

    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/pedidos?id=eq.${id}`, {
            method: "DELETE",
            headers: getDefaultHeaders()
        });

        await handleResponse(res, "Error al eliminar el pedido");
        pedidosGlobal = pedidosGlobal.filter(p => String(p.id) !== id);
        mostrarPedidos(pedidosGlobal);
    } catch (error) {
        console.error(error);
        alert(`No se pudo eliminar el pedido. ${error.message || "Intenta de nuevo más tarde."}`);
    }
}

async function actualizarCategoria(id) {
    id = String(id);
    const nuevoNombre = document.getElementById(`cat-${id}`).value;

    if (!nuevoNombre.trim()) {
        alert("El nombre no puede estar vacío");
        return;
    }

    const res = await fetch(`${SUPABASE_URL}/rest/v1/categorias?id=eq.${id}`, {
        method: "PATCH",
        headers: getDefaultHeaders(),
        body: JSON.stringify({ nombre: nuevoNombre })
    });

    await handleResponse(res, "Error al actualizar categoría");

    categoriasGlobal = await cargarCategorias();
    populateCategoriaSelect();
    mostrarCategorias(categoriasGlobal);
}

async function agregarCategoria(nombre) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/categorias`, {
        method: "POST",
        headers: {
            ...getDefaultHeaders(),
            Prefer: "return=representation"
        },
        body: JSON.stringify({ nombre })
    });

    const result = await handleResponse(res, "Error al crear categoría");
    const [newCategoria] = result || [];

    if (newCategoria) {
        categoriasGlobal.push(newCategoria);
        populateCategoriaSelect();
        mostrarCategorias(categoriasGlobal);
    }
}

async function eliminarCategoria(id) {
    id = String(id);
    if (!confirm("¿Eliminar categoría?")) return;

    if (productosGlobal.some(p => String(p.categoria_id) === id)) {
        alert("No puedes eliminar esta categoría porque tiene productos.");
        return;
    }

    const res = await fetch(`${SUPABASE_URL}/rest/v1/categorias?id=eq.${id}`, {
        method: "DELETE",
        headers: getDefaultHeaders()
    });

    await handleResponse(res, "Error al eliminar categoría");

    categoriasGlobal = categoriasGlobal.filter(c => String(c.id) !== String(id));
    populateCategoriaSelect();
    mostrarCategorias(categoriasGlobal);
}

function actualizarDashboard(data) {
    document.getElementById("total-productos").innerText = data.length;

    let stock = 0;
    let vendidos = 0;
    let ingresos = 0;

    data.forEach(p => {
        stock += Number(p.stock) || 0;
        vendidos += Number(p.vendidos) || 0;
    });

    pedidosGlobal.forEach(p => {
        ingresos += Number(p.total) || 0;
    });

    document.getElementById("total-stock").innerText = stock;
    document.getElementById("total-vendidos").innerText = vendidos;
    const ingresosElement = document.getElementById("total-ingresos");
    if (ingresosElement) {
        ingresosElement.innerText = `$${ingresos.toLocaleString("es-CO")}`;
    }
}

function populateCategoriaSelect() {
    const select = document.getElementById("producto-categoria");
    if (!select) return;

    select.innerHTML = '<option value="">Selecciona categoría</option>';

    categoriasGlobal.forEach(c => {
        select.innerHTML += `<option value="${c.id}">${c.nombre}</option>`;
    });
}

function mostrarProductos(data) {
    const cont = document.getElementById("productos-panel-container");
    if (!cont) return;
    cont.innerHTML = "";

    data.forEach(p => {
        cont.innerHTML += `
        <div class="producto-item">
            <div class="producto-info">
                <strong>${p.nombre}</strong>
                <p>$${p.precio}</p>
                <p>Stock: ${p.stock}</p>
            </div>

            <div class="producto-actions">
                <button onclick="editarProducto('${p.id}')">Editar</button>
                <button onclick="eliminarProducto('${p.id}')">Eliminar</button>
            </div>
        </div>
        `;
    });
}

function editarProducto(id) {
    id = String(id);
    const producto = productosGlobal.find(p => String(p.id) === id);
    if (!producto) return;

    document.getElementById("producto-id").value = producto.id;
    document.getElementById("producto-nombre").value = producto.nombre;
    document.getElementById("producto-precio").value = producto.precio;
    document.getElementById("producto-stock").value = producto.stock;
    document.getElementById("producto-categoria").value = producto.categoria_id;
    document.getElementById("producto-whatsapp").value = producto.whatsapp;

    const preview = document.getElementById("preview-img");
    if (preview && producto.imagen) {
        preview.src = producto.imagen;
        preview.style.display = "block";
    }
}

async function eliminarProducto(id) {
    id = String(id);
    if (!confirm("¿Eliminar producto?")) return;

    const res = await fetch(`${SUPABASE_URL}/rest/v1/productos?id=eq.${id}`, {
        method: "DELETE",
        headers: getDefaultHeaders()
    });

    await handleResponse(res, "Error al eliminar producto");

    productosGlobal = productosGlobal.filter(p => p.id !== id);
    mostrarProductos(productosGlobal);
    actualizarDashboard(productosGlobal);
}

async function compressImage(file) {
    if (!file || !file.type.startsWith("image/")) {
        throw new Error("Archivo no válido para comprimir");
    }

    const bitmap = await createImageBitmap(file);
    const maxSize = 800;
    const ratio = Math.min(maxSize / bitmap.width, maxSize / bitmap.height, 1);
    const width = Math.round(bitmap.width * ratio);
    const height = Math.round(bitmap.height * ratio);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(result => {
            if (result) resolve(result);
            else reject(new Error("No se pudo crear el blob WebP"));
        }, "image/webp", 0.7);
    });

    return blob;
}

function mostrarPreviewImagen(file) {
    const preview = document.getElementById("preview-img");
    if (!preview) return;

    if (!file) {
        preview.src = "";
        preview.style.display = "none";
        return;
    }

    const objectUrl = URL.createObjectURL(file);
    preview.src = objectUrl;
    preview.style.display = "block";
    preview.onload = () => URL.revokeObjectURL(objectUrl);
}

async function subirImagen(file) {
    const name = `${Date.now()}.webp`;

    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/productos/${name}`, {
        method: "POST",
        headers: {
            ...getDefaultHeaders(false),
            "Content-Type": "image/webp"
        },
        body: file
    });

    await handleResponse(res, "Error subiendo imagen");
    return `${SUPABASE_URL}/storage/v1/object/public/productos/${name}`;
}

async function handleProductSubmit(e) {
    e.preventDefault();
    clearFormMessage();

    const id = document.getElementById("producto-id").value;
    const nombre = document.getElementById("producto-nombre").value;
    const precio = document.getElementById("producto-precio").value;
    const stock = document.getElementById("producto-stock").value;
    const categoria_id = document.getElementById("producto-categoria").value;
    const whatsapp = document.getElementById("producto-whatsapp").value;
    const file = document.getElementById("imagen").files[0];

    const validationError = validateProductForm({ nombre, precio, stock, categoria_id, whatsapp });
    if (validationError) {
        showFormMessage(validationError, true);
        return;
    }

    let imagenURL = null;
    try {
        if (file) {
            const optimizedImage = await compressImage(file);
            imagenURL = await subirImagen(optimizedImage);
        }

        if (id) {
            const updateData = {
                nombre,
                precio: Number(precio),
                stock: Number(stock),
                categoria_id,
                whatsapp
            };

            if (imagenURL) {
                updateData.imagen = imagenURL;
            }

            const res = await fetch(`${SUPABASE_URL}/rest/v1/productos?id=eq.${id}`, {
                method: "PATCH",
                headers: {
                    ...getDefaultHeaders(),
                    Prefer: "return=representation"
                },
                body: JSON.stringify(updateData)
            });

            const updated = await handleResponse(res, "Error al actualizar producto");
            const [updatedProduct] = updated || [];
            if (updatedProduct) {
                productosGlobal = productosGlobal.map(producto => producto.id === updatedProduct.id ? updatedProduct : producto);
            }
            showFormMessage("Producto actualizado con éxito.", false);
        } else {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/productos`, {
                method: "POST",
                headers: {
                    ...getDefaultHeaders(),
                    Prefer: "return=representation"
                },
                body: JSON.stringify({
                    nombre,
                    precio: Number(precio),
                    stock: Number(stock),
                    categoria_id,
                    whatsapp,
                    imagen: imagenURL,
                    vendidos: 0
                })
            });

            const created = await handleResponse(res, "Error al crear producto");
            const [newProduct] = created || [];
            if (newProduct) {
                productosGlobal.push(newProduct);
            }
            showFormMessage("Producto creado con éxito.", false);
        }

        document.getElementById("producto-form").reset();
        mostrarPreviewImagen(null);
        document.getElementById("producto-id").value = "";
        mostrarProductos(productosGlobal);
        actualizarDashboard(productosGlobal);
    } catch (error) {
        showFormMessage(error.message, true);
    }
}

async function initAdminPanel() {
    if (!authToken) return;

    categoriasGlobal = await cargarCategorias();
    productosGlobal = await cargarProductos();
    pedidosGlobal = await cargarPedidos();

    populateCategoriaSelect();
    mostrarProductos(productosGlobal);
    actualizarDashboard(productosGlobal);
    mostrarCategorias(categoriasGlobal);
    mostrarPedidos(pedidosGlobal);

    document.getElementById("login-card").classList.add("hidden");
    document.getElementById("admin-panel").classList.remove("hidden");
}

async function loginAdmin(email, password) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: {
            apikey: SUPABASE_ANON_KEY,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
    });

    const data = await handleResponse(res, "Error en login");
    authToken = data.access_token;
    localStorage.setItem("token", authToken);
    return data;
}

document.addEventListener("DOMContentLoaded", () => {
    restoreSession();

    document.getElementById("login-form").addEventListener("submit", async e => {
        e.preventDefault();
        showLoginMessage("");

        const email = document.getElementById("admin-email").value;
        const pass = document.getElementById("admin-password").value;

        try {
            await loginAdmin(email, pass);
            await initAdminPanel();
        } catch (err) {
            showLoginMessage(err.message);
        }
    });

    document.getElementById("logout-button").addEventListener("click", logoutAdmin);
    document.getElementById("producto-form").addEventListener("submit", handleProductSubmit);
    document.getElementById("imagen").addEventListener("change", event => {
        mostrarPreviewImagen(event.target.files[0]);
    });

    document.getElementById("categoria-form").addEventListener("submit", async e => {
        e.preventDefault();
        const nombre = document.getElementById("categoria-nombre").value;

        try {
            await agregarCategoria(nombre);
            document.getElementById("categoria-nombre").value = "";
            showFormMessage("Categoría agregada con éxito.", false);
        } catch (error) {
            showFormMessage(error.message, true);
        }
    });

    if (authToken) {
        initAdminPanel();
    }
});