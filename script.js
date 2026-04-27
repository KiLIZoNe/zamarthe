const SUPABASE_URL = "https://ygttxszksmgqzzaifnlg.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlndHR4c3prc21ncXp6YWlmbmxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyODY2NjQsImV4cCI6MjA5Mjg2MjY2NH0.mnbPAMMFzMWA1qrljsx8xNT8NpdQ6NzzCNRacGgV_tU";

let categoriasGlobal = [];
let productosGlobal = [];

async function cargarCategorias() {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/categorias?select=id,nombre`, {
        headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
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
            Authorization: `Bearer ${SUPABASE_KEY}`,
            Accept: "application/json"
        }
    });

    if (!response.ok) {
        throw new Error(`Error cargando productos: ${response.status}`);
    }

    return response.json();
}

function findCategoriaNombre(categoriaId) {
    const categoria = categoriasGlobal.find(item => String(item.id) === String(categoriaId));
    return categoria ? categoria.nombre : "Sin categoría";
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
        const card = document.createElement("div");
        card.className = "product";

        card.innerHTML = `
            <img src="${p.imagen}" alt="${p.nombre}">
            <h3>${p.nombre}</h3>
            <p>$${Number(p.precio).toLocaleString("es-CO")}</p>
            <p class="product-category">${findCategoriaNombre(p.categoria_id)}</p>
            <a href="https://wa.me/${p.whatsapp}?text=${encodeURIComponent(
              `Hola, quiero comprar: ${p.nombre} por $${Number(p.precio).toLocaleString("es-CO")}`
            )}" target="_blank" class="btn-wsp">
                 Comprar
            </a>
        `;

        container.appendChild(card);
    });
}

function renderCategorias() {
    const container = document.getElementById("categorias-container");
    if (!container) return;
    container.innerHTML = "";

    const btnTodos = document.createElement("button");
    btnTodos.textContent = "Todos";
    btnTodos.className = "categoria-boton active";
    btnTodos.onclick = () => filtrar("todos");
    container.appendChild(btnTodos);

    categoriasGlobal.forEach(cat => {
        const btn = document.createElement("button");
        btn.textContent = cat.nombre;
        btn.className = "categoria-boton";
        btn.onclick = () => filtrar(cat.id);
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

    const filtrados = categoriaId === "todos"
        ? productosGlobal
        : productosGlobal.filter(p => String(p.categoria_id) === String(categoriaId));

    mostrarProductosWeb(filtrados);
}

document.addEventListener("DOMContentLoaded", async function() {
    try {
        categoriasGlobal = await cargarCategorias();
        productosGlobal = await cargarProductos();

        renderCategorias();
        mostrarProductosWeb(productosGlobal);

        const discoverButton = document.getElementById("discover-button");
        if (discoverButton) {
            discoverButton.addEventListener("click", () => {
                const productsSection = document.getElementById("products");
                if (productsSection) {
                    productsSection.scrollIntoView({ behavior: "smooth" });
                }
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
