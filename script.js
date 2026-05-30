const container = document.getElementById("productos-container");
const carritoContainer = document.getElementById("carrito-container");
const botonWhatsapp = document.getElementById("enviar-whatsapp");
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
    botonWhatsapp.addEventListener("click", enviarPedidoWhatsapp);
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
  let total = 0;
  carrito.forEach(producto => {
    total += producto.precio * producto.cantidad;

    carritoContainer.innerHTML += `
      <div class="item-carrito">
        <h3>${producto.nombre}</h3>
        <p>Cantidad: ${producto.cantidad}</p>
        <p>
          Subtotal: $${producto.precio * producto.cantidad}
        </p>

        <button
          class="restar-btn"
          data-id="${producto.id}"
        >
          -
        </button>  

        <button 
          class="eliminar-btn"
          data-id="${producto.id}"
        >
          Eliminar
        </button>
      </div>
    `;
  });

  carritoContainer.innerHTML += `
    <h3 class="total">
      Total: $${total}
    </h3>
  `;

  const botonesEliminar = document.querySelectorAll(".eliminar-btn");
  botonesEliminar.forEach(boton => {
    boton.addEventListener("click", () => {
      const id = Number(boton.dataset.id);
      eliminarProducto(id);
    });
  });

  const botonesRestar = document.querySelectorAll(".restar-btn");
  botonesRestar.forEach(boton => {
    boton.addEventListener("click", () => {
      const id = Number(boton.dataset.id);
      restarProducto(id);
    });
  });
}
function eliminarProducto(id) {
  carrito = carrito.filter(
    producto => producto.id != id
  );
  renderizarCarrito();
}

function restarProducto(id) {
  const producto = carrito.find(
    producto => producto.id === id
  );
  if (!producto) return;
  producto.cantidad--;
  if (producto.cantidad <= 0) {
    eliminarProducto(id);
    return;
  } 
  renderizarCarrito();
}

function enviarPedidoWhatsapp() {
  if (carrito.length === 0) {
    alert("Agregá productos antes de enviar el pedido");
    return;
  }
  let mensaje = "Hola, quiero pedir:%0A%0A";

  carrito.forEach(producto => {
    mensaje += `- ${producto.nombre} x${producto.cantidad}%0A`;
  });

  let total = 0;

  carrito.forEach(producto => {
    total += producto.precio * producto.cantidad;
  });

  mensaje += `%0ATotal: $${total}`;

  const url = `https://wa.me/5493493436619?text=${mensaje}`;

  window.open(url);
}