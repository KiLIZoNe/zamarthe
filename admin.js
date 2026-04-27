const SUPABASE_URL = "https://ygttxszksmgqzzaifnlg.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlndHR4c3prc21ncXp6YWlmbmxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyODY2NjQsImV4cCI6MjA5Mjg2MjY2NH0.mnbPAMMFzMWA1qrljsx8xNT8NpdQ6NzzCNRacGgV_tU";

let authToken = null;
let productosGlobal = [];
let categoriasGlobal = [];

// 🔐 LOGIN


async function loginAdmin(email, password) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: {
            "apikey": SUPABASE_KEY,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            email: email,
            password: password
        })
    });

    const data = await res.json();

    console.log("Respuesta login:", data);

    if (!res.ok) {
        throw new Error(data.error_description || "Error en login");
    }

   
    authToken = data.access_token;

    return data;
}

// 🔄 RESTORE SESSION
function restoreSession() {
    const token = localStorage.getItem("token");
    if (token) authToken = token;
}

// 🚪 LOGOUT
function logoutAdmin() {
    localStorage.removeItem("token");
    location.reload();
}

// 📦 CARGAR PRODUCTOS
async function cargarProductos() {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/productos?select=*`, {
        headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${authToken}`
        }
    });
    return res.json();
}

// 🧩 CARGAR CATEGORIAS
async function cargarCategorias() {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/categorias`, {
        headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${authToken}`
        }
    });
    return res.json();
}

// 📂 MOSTRAR CATEGORIAS
function mostrarCategorias(data) {
    const cont = document.getElementById("categorias-list");
    cont.innerHTML = "";

    data.forEach(c => {
        cont.innerHTML += `
        <div class="producto-item">
            <div class="producto-info">
                <input type="text" id="cat-${c.id}" value="${c.nombre}">
            </div>
            <div class="producto-actions">
                <button onclick="actualizarCategoria(${c.id})">Guardar</button>
                <button onclick="eliminarCategoria(${c.id})">Eliminar</button>
            </div>
        </div>
        `;
    });
}

async function actualizarCategoria(id) {
    const nuevoNombre = document.getElementById(`cat-${id}`).value;

    // 🔥 VALIDACIÓN AQUÍ
    if (!nuevoNombre.trim()) {
        alert("El nombre no puede estar vacío");
        return;
    }

    const res = await fetch(`${SUPABASE_URL}/rest/v1/categorias?id=eq.${id}`, {
        method: "PATCH",
        headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ nombre: nuevoNombre })
    });

    if (!res.ok) {
        alert("Error al actualizar categoría");
        return;
    }

    categoriasGlobal = await cargarCategorias();
    mostrarCategorias(categoriasGlobal);
    populateCategoriaSelect();
}

async function agregarCategoria(nombre) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/categorias`, {
        method: "POST",
        headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ nombre })
    });

    if (!res.ok) throw new Error("Error al crear categoría");
}

async function eliminarCategoria(id) {
    if (!confirm("¿Eliminar categoría?")) return;

    // 🚨 evitar borrar si tiene productos
    if (productosGlobal.some(p => String(p.categoria_id) === String(id))) {
        alert("No puedes eliminar esta categoría porque tiene productos.");
        return;
    }

    const res = await fetch(`${SUPABASE_URL}/rest/v1/categorias?id=eq.${id}`, {
        method: "DELETE",
        headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${authToken}`
        }
    });

    if (!res.ok) throw new Error("Error al eliminar categoría");

    categoriasGlobal = await cargarCategorias();
    mostrarCategorias(categoriasGlobal);
}

// 📊 DASHBOARD
function actualizarDashboard(data) {
    document.getElementById("total-productos").innerText = data.length;

    let stock = 0;
    let vendidos = 0;

    data.forEach(p => {
        stock += p.stock || 0;
        vendidos += p.vendidos || 0;
    });

    document.getElementById("total-stock").innerText = stock;
    document.getElementById("total-vendidos").innerText = vendidos;
}

// 🧩 SELECT CATEGORIAS
function populateCategoriaSelect() {
    const select = document.getElementById("producto-categoria");
    select.innerHTML = '<option value="">Selecciona categoría</option>';

    categoriasGlobal.forEach(c => {
        select.innerHTML += `<option value="${c.id}">${c.nombre}</option>`;
    });
}

// 📦 MOSTRAR PRODUCTOS
function mostrarProductos(data) {
    const cont = document.getElementById("productos-panel-container");
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
                <button onclick="editarProducto(${p.id})">Editar</button>
                <button onclick="eliminar(${p.id})">Eliminar</button>
            </div>
        </div>
        `;
    });
}

// 🖊️ EDITAR
function editarProducto(id) {
    const producto = productosGlobal.find(p => p.id === id);

    document.getElementById("producto-id").value = producto.id;
    document.getElementById("producto-nombre").value = producto.nombre;
    document.getElementById("producto-precio").value = producto.precio;
    document.getElementById("producto-stock").value = producto.stock;
    document.getElementById("producto-categoria").value = producto.categoria_id;
    document.getElementById("producto-whatsapp").value = producto.whatsapp;
}

// 🗑️ ELIMINAR
async function eliminar(id) {
    await fetch(`${SUPABASE_URL}/rest/v1/productos?id=eq.${id}`, {
        method: "DELETE",
        headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${authToken}`
        }
    });

    initAdminPanel();
}

// 🖼️ SUBIR IMAGEN
async function subirImagen(file) {
    const name = `${Date.now()}-${file.name}`;

    const res = await fetch(
        `${SUPABASE_URL}/storage/v1/object/productos/${name}`,
        {
            method: "POST",
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${authToken}`,
                "Content-Type": file.type
            },
            body: file
        }
    );

    if (!res.ok) throw new Error("Error subiendo imagen");

    return `${SUPABASE_URL}/storage/v1/object/public/productos/${name}`;
}

// ➕ CREAR PRODUCTO
async function handleProductSubmit(e) {
    e.preventDefault();

    const id = document.getElementById("producto-id").value;

    const nombre = document.getElementById("producto-nombre").value;
    const precio = document.getElementById("producto-precio").value;
    const stock = document.getElementById("producto-stock").value;
    const categoria_id = document.getElementById("producto-categoria").value;
    const whatsapp = document.getElementById("producto-whatsapp").value;

    const file = document.getElementById("imagen").files[0];

    let imagenURL = null;

    if (file) {
        imagenURL = await subirImagen(file);
    }

    // 🔥 SI EXISTE ID → EDITAR
    if (id) {
        const updateData = {
            nombre,
            precio,
            stock,
            categoria_id,
            whatsapp
        };

        if (imagenURL) {
            updateData.imagen = imagenURL;
        }

        await fetch(`${SUPABASE_URL}/rest/v1/productos?id=eq.${id}`, {
            method: "PATCH",
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${authToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(updateData)
        });

    } else {
        // 🔥 CREAR
        await fetch(`${SUPABASE_URL}/rest/v1/productos`, {
            method: "POST",
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${authToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                nombre,
                precio,
                stock,
                categoria_id,
                whatsapp,
                imagen: imagenURL,
                vendidos: 0
            })
        });
    }

    e.target.reset();
    document.getElementById("producto-id").value = "";

    initAdminPanel();
}

// 🚀 INIT
async function initAdminPanel() {
    categoriasGlobal = await cargarCategorias();
    productosGlobal = await cargarProductos();

    populateCategoriaSelect();
    mostrarProductos(productosGlobal);
    actualizarDashboard(productosGlobal);
    mostrarCategorias(categoriasGlobal);

    document.getElementById("login-card").classList.add("hidden");
    document.getElementById("admin-panel").classList.remove("hidden");
}

// 🎬 START
document.addEventListener("DOMContentLoaded", () => {
    restoreSession();

    document.getElementById("login-form").addEventListener("submit", async e => {
        e.preventDefault();

        const email = document.getElementById("admin-email").value;
        const pass = document.getElementById("admin-password").value;

        try {
            await loginAdmin(email, pass);
            initAdminPanel();
        } catch (err) {
            document.getElementById("login-message").innerText = err.message;
        }
    });

    document.getElementById("logout-button").addEventListener("click", logoutAdmin);
    document.getElementById("producto-form").addEventListener("submit", handleProductSubmit);

    document.getElementById("categoria-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const nombre = document.getElementById("categoria-nombre").value;

    await agregarCategoria(nombre);

    categoriasGlobal = await cargarCategorias();
    mostrarCategorias(categoriasGlobal);
    populateCategoriaSelect(); // 🔥 actualiza el select

    document.getElementById("categoria-nombre").value = "";
});

    if (authToken) initAdminPanel();
});