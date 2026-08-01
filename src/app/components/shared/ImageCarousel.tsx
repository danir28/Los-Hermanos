import { useState } from "react";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";

// Carrusel de fotos de un producto: flechas + puntos de navegación. Si no hay ninguna foto
// cargada todavía (producto recién creado en el admin, sin subir imágenes aún) muestra un
// placeholder en vez de romper — ya no es obligatorio tener foto para dar de alta un producto.
export function ImageCarousel({ urls, alt, className = "" }: { urls: string[]; alt: string; className?: string }) {
  const [index, setIndex] = useState(0);

  if (urls.length === 0) {
    return (
      <div className={`flex items-center justify-center bg-muted text-muted-foreground ${className}`}>
        <ImageOff size={28} />
      </div>
    );
  }

  const goTo = (i: number) => setIndex((i + urls.length) % urls.length);

  return (
    <div className={`relative group ${className}`}>
      <img src={urls[index]} alt={alt} className="w-full h-full object-cover" />
      {urls.length > 1 && (
        <>
          <button type="button" onClick={e => { e.stopPropagation(); goTo(index - 1); }}
            className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <ChevronLeft size={16} />
          </button>
          <button type="button" onClick={e => { e.stopPropagation(); goTo(index + 1); }}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <ChevronRight size={16} />
          </button>
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1">
            {urls.map((url, i) => (
              <button key={url} type="button" onClick={e => { e.stopPropagation(); setIndex(i); }}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${i === index ? "bg-white" : "bg-white/50"}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
