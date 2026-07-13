# Web de Nordwise — guía de uso

Esta carpeta contiene la web completa de Nordwise (español + inglés, 44 páginas).
**No necesitas saber programar** para editarla. Todo el contenido vive en archivos
de texto dentro de `content/`. El diseño y el código no hay que tocarlos.

---

## Cómo funciona (30 segundos)

1. **Editas** un archivo `.md` dentro de `content/` (con TextEdit, VS Code o pidiéndoselo a Claude).
2. **Doble clic en `build.command`** → se regenera la carpeta `public/` con toda la web.
3. **Publicas** la carpeta `public/` en Cloudflare Pages (arrastrándola en el panel, como hasta ahora).

Para ver la web en tu navegador antes de publicar: doble clic en `preview.command`
(se abre en http://localhost:8080; cierra la ventana de Terminal para parar).

> Requisito único: tener Node.js instalado (nodejs.org, versión LTS). Solo hace falta instalarlo una vez.

---

## Dónde está cada cosa

| Carpeta / archivo | Qué es |
|---|---|
| `content/es/` | Las páginas en español (una página = un archivo) |
| `content/en/` | Las páginas en inglés |
| `content/blog/es/` y `content/blog/en/` | Los artículos del blog |
| `content/config/es.md` y `en.md` | Menú, pie de página y botones globales |
| `assets/` | Diseño (CSS), JavaScript y favicon — no hace falta tocarlo |
| `build.js` | El generador — no hace falta tocarlo |
| `public/` | **La web generada.** Es lo que se sube a Cloudflare. No la edites a mano: se sobreescribe en cada build |

Los nombres de archivo con `--` indican subpáginas: `montar-llc--paquete-completo.md`
es la página `/montar-llc/paquete-completo/`.

---

## Editar los textos de una página

Abre el archivo de la página. Arriba, entre las dos líneas `---`, están todos sus
textos con nombres claros:

```
hero_title: Tu LLC en EEUU, | *sin pisar EEUU.*
hero_desc: Constituimos tu empresa americana de principio a fin...
```

Reglas rápidas:

- La barra `|` crea un **salto de línea** en los títulos.
- El texto entre `*asteriscos*` sale **en color burdeos** (el acento de marca).
- Cada `- title:` / `desc:` dentro de una lista es una tarjeta, un paso o una pregunta del FAQ. Puedes añadir o quitar elementos copiando el bloque completo.
- Lo que va **debajo** del segundo `---` es texto libre en Markdown (se usa en legales y posts).

### SEO de cada página

Al principio de cada archivo:

- `title:` → el título que sale en Google y en la pestaña (ideal 50-60 caracteres, con la palabra clave).
- `description:` → la descripción en Google (ideal 140-155 caracteres, que invite al clic).

Cambiar estos dos campos es la forma más directa de mejorar el SEO página a página.

---

## Publicar un artículo en el blog

1. Ve a `content/blog/es/` y duplica `_plantilla-post.md`.
2. Renómbralo (ej: `llc-para-argentinos.md`). Los archivos que empiezan por `_` no se publican.
3. Rellena `title`, `description`, `date` (formato 2026-07-06) y `slug` (la URL, ej: `llc-para-argentinos`).
4. Escribe el artículo debajo del segundo `---` en Markdown normal.
5. Doble clic en `build.command` y sube `public/` a Cloudflare.

El artículo aparece solo en el índice del blog, en el sitemap y con sus metadatos SEO.
Para la versión inglesa haz lo mismo en `content/blog/en/` y pon el mismo `ref:` en
ambos posts para que Google los relacione como traducciones.

---

## Pendientes que dejé marcados

- Los **testimonios** llevan `[PENDIENTE — testimonio X]`. Búscalos en `content/es/home.md`, `content/es/testimonios.md` y sus equivalentes en inglés, y sustitúyelos por las frases reales cuando tengas la autorización de cada cliente.
- Los **precios** de compliance anual, registered agent y residencias figuran como "Consúltanos". Cuando los cierres, cámbialos en el campo `price_value:` de cada página.
- El **aviso legal en inglés** es un resumen que remite a la versión española. Si algún día quieres la traducción completa, se sustituye el cuerpo de `content/en/legal-notice.md`.

## Qué ya está resuelto (SEO técnico)

Cada página sale con: title y meta description propios, URL limpia, `canonical`,
`hreflang` ES↔EN, Open Graph, datos estructurados (Organization, FAQPage en las
páginas con FAQ, Service en servicios y BlogPosting en los posts), `sitemap.xml`
y `robots.txt`. Al publicar, da de alta `https://nordwise.net/sitemap.xml` en
Google Search Console.
