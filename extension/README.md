# Extensión de Chrome — Captura de LinkedIn

Guarda el perfil de LinkedIn que tienes abierto como lead o contacto en tu
CRM, con un clic.

## Cómo funciona

- **Extracción manual, a demanda**: la extensión no hace nada sola en
  segundo plano. Solo lee la página cuando tú, viendo un perfil, abres el
  popup y pulsas "Extraer de esta página". No hay scraping automatizado
  ni en bucle — es exactamente equivalente a copiar el nombre y la
  empresa a mano, solo que más rápido.
- **Mejor esfuerzo, no garantizado**: LinkedIn no publica la estructura
  de su HTML y la cambia con frecuencia. La extracción puede fallar o
  traer campos vacíos — por diseño, el formulario siempre te deja
  revisar y editar antes de guardar; nunca se guarda nada automáticamente
  sin que lo veas primero.
- **Términos de servicio de LinkedIn**: LinkedIn restringe el scraping
  automatizado de su plataforma. Esta extensión está pensada para uso
  manual, perfil a perfil, mientras navegas — no para extracción masiva.
  Si vas a usarla en un contexto profesional, revisa que tu uso concreto
  cumpla los términos vigentes de LinkedIn.

## Instalación (modo desarrollador)

1. Abre `chrome://extensions` en Chrome.
2. Activa "Modo de desarrollador" (interruptor arriba a la derecha).
3. Haz clic en "Cargar descomprimida" y selecciona esta carpeta
   (`extension/`).
4. El icono de la extensión aparecerá en la barra de herramientas.

## Configuración

1. Haz clic en el icono de la extensión → si no hay cuenta conectada, haz
   clic en "Conectar cuenta" (o haz clic derecho sobre el icono → Opciones).
2. Rellena la URL de tu backend (por defecto `http://localhost:3000` si
   lo tienes corriendo en local con Docker Compose), tu identificador de
   negocio, y tu email/contraseña del CRM.
3. La contraseña **no se guarda** — solo se usa una vez para obtener un
   token de acceso, que caduca a las 8 horas igual que en la web del CRM.
   Cuando caduque, la extensión te pedirá volver a conectar.

## Uso

1. Abre el perfil de LinkedIn que quieras guardar.
2. Haz clic en el icono de la extensión.
3. Haz clic en "Extraer de esta página" — se rellenan los campos que se
   hayan podido leer (nombre, empresa, titular, ubicación).
4. Revisa y corrige lo que haga falta.
5. Elige si quieres guardarlo como **Lead**, **Partner**, o **Contacto
   interesante**.
6. Haz clic en "Guardar en el CRM".

## Limitaciones conocidas

- Solo extrae de la pestaña activa en el momento de pulsar el botón —
  no navega ni abre pestañas por su cuenta.
- No extrae el email ni el teléfono (LinkedIn no los muestra en la vista
  pública del perfil salvo que el usuario lo haya compartido de forma
  visible) — esos campos se rellenan a mano si los tienes.
- Los selectores de extracción (`lib/extract-linkedin.js`) son best-effort
  y puede que necesiten actualizarse si LinkedIn cambia su HTML.
