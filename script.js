const container = document.getElementById("productos-container");
const carritoContainer = document.getElementById("carrito-container");
let carrito = [];

productos.forEach(producto => {
  const card = document.createElement("div");
  card.classList.add("card");

  card.innerHTML = `
    <img src="${producto.imagen}" alt="${producto.nombre}">
    <h3>${producto.nombre}</h3>
    <p>${producto.descripcion}</p>
    <button class="btn agregar-btn" data-id="${producto.id}">
  Agregar al carrito
</button>
  `;

  container.appendChild(card);

});

const botonesAgregar = document.querySelectorAll(".agregar-btn");
  botonesAgregar.forEach(boton => {
    boton.addEventListener("click", () => {
      const id = Number(boton.getAttribute("data-id"));
      agregarAlCarrito(id);
    });
  })

function agregarAlCarrito(id) {
  const productoEncontrado = productos.find(
    producto => producto.id === id
  );
  const productoEnCarrito = carrito.find(
    producto => producto.id === id
  );
  if (productoEnCarrito) {
    productoEnCarrito.cantidad++;
  } else {
    carrito.push({
      ...productoEncontrado,
      cantidad: 1
    });
  }
  console.log(carrito);
  renderizarCarrito();
}

function renderizarCarrito() {
  carritoContainer.innerHTML = "";
  carrito.forEach(producto => {
    carritoContainer.innerHTML += `
      <div class="item-carrito">
        <h3>${producto.nombre}</h3>
        <p>Cantidad: ${producto.cantidad}</p>
      </div>
    `;
  })
}