const container = document.getElementById("productos-container");

productos.forEach(producto => {
  const card = document.createElement("div");
  card.classList.add("card");

  card.innerHTML = `
    <img src="${producto.imagen}" alt="${producto.nombre}">
    <h3>${producto.nombre}</h3>
    <p>${producto.descripcion}</p>
    <a href="https://wa.me/5493493436619?text=Hola,%20quiero%20pedir%20${producto.nombre}" class="btn">
  Pedir por WhatsApp
</a>
  `;

  container.appendChild(card);
});