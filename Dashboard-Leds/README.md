# Dashboard de Leads RED

Dashboard comercial de una sola página, construido con React, JavaScript/JSX, Vite y Tailwind CSS. La interfaz sigue la estructura de la referencia: filtros globales, KPIs, gráficas y tablas en una vista continua; no utiliza sidebar ni navegación entre módulos.

## Desarrollo local

1. Copia `.env.example` a `.env.local` y define `RED_API_KEY`. No publiques esta clave ni uses un prefijo `VITE_`.
2. Ejecuta `npm install` y después `npm run dev`.
3. Ejecuta `npm run lint` y `npm run build` para validar el proyecto.

Durante el desarrollo, Vite redirige `/api/metrics/reuniones` a Prospektia e inyecta `X-API-KEY` desde el servidor. En Vercel, `api/metrics/reuniones.js` implementa esa ruta y lee la misma variable de entorno. El navegador utiliza la ruta del mismo origen; la clave no se incluye en el bundle.

La API se vuelve a consultar cada dos horas mientras el dashboard está abierto y visible, al regresar a la pestaña cuando la última actualización tiene dos horas o más, o al pulsar **Actualizar**. Las solicitudes usan `cache: 'no-store'`.

## Datos y métricas

- `src/DashboardHome.jsx` reúne toda la interfaz y sus gráficas; `src/index.css` contiene el estilo responsive de la página única.
- Los filtros globales incluyen país, asesor, `Month to day` (meses enero-diciembre y días 1-31 seleccionables independientemente) y tipo de lead. Month to day reemplaza al filtro de mes y, cuando todos los meses y días están seleccionados (por defecto), no restringe los leads. Para el mes de referencia se usa `stage_feedback_json.6.fecha_cierre_real` únicamente en cierres exitosos con fecha válida; los demás leads se agrupan por `created_at`. La misma regla se aplica al filtro global, gráficas, tablas y detalle mensual, y al filtro mensual del ejecutivo.
- Los leads radicados son los que la API reporta como `status=cerrado` y `resultado_venta=cerrada`. La conversión mostrada es radicados / total de leads filtrados.
- Las cantidades se leen de los campos de etapa estructurados `cantidad_equipos`, `equipos` o `cantidad_oferta`. Las unidades se muestran como enteros redondeados; las unidades del ejecutivo y las unidades por lead se contabilizan solo para leads radicados, y el forecast muestra por separado sus unidades proyectadas.
- Existen overrides manuales puntuales en `leadUnits` para corregir unidades radicadas de leads específicos sin alterar la data de los demás registros: LD398 se contabiliza como 6 y LD519 de Luis Alfredo Sarti Gómez como 4.
- La clasificación de lead usa el campo `tipo_lead` (`calificado` o `no_calificado`). El canal no está disponible en la respuesta actual y por eso no se incluye como filtro ni como gráfica.
- En la vista analítica, el embudo muestra simultáneamente una tarjeta por cada mes disponible y, solo cuando todos los filtros globales están en “Todos”, una tarjeta para el total general. Los meses usan la fecha de referencia (cierre exitoso válido o, en su defecto, `created_at`); cada tarjeta muestra leads y conversión entre etapas. Dos tablas separadas resumen por mes Guatemala y El Salvador con calificación, radicados, conversión sobre total y unidades radicadas; cada mes abre un detalle del país y periodo con avance por etapa y listado de leads, sin forecast. La API expone la etapa actual, no el historial de transiciones.
- El resumen por asesor está agrupado por país e incluye leads totales, calificados, no calificados, radicados, conversión sobre total, promedio de unidades por radicado y unidades de leads radicados. Al seleccionar un ejecutivo, el panel ofrece métricas compactas, seguimientos priorizados, etapas, forecast y filtros propios de mes y tipo de lead.
- Desde las tablas de seguimientos y forecast se puede abrir el detalle individual de cada lead, incluyendo estado, etapa actual, fechas, comentarios y unidades radicadas cuando corresponda. Los filtros de mes del ejecutivo usan la misma fecha de referencia que el dashboard.
- En la Vista 2 se puede abrir el detalle de cada lead del forecast.
- Los checks de consistencia se calculan con el conjunto filtrado. `status` conserva autoridad si contradice `resultado_venta`.

La API pagina con `offset` de 50 registros. El servicio sigue solicitando páginas hasta recibir una página incompleta y rechaza identificadores duplicados. La credencial debe configurarse como `RED_API_KEY` en las variables de entorno del despliegue.

## Despliegue en Vercel

1. Configura `Dashboard-Leds` como **Root Directory**.
2. Usa `npm run build` como **Build Command** y `dist` como **Output Directory**.
3. Añade `RED_API_KEY` en **Project Settings → Environment Variables**.
4. Despliega de nuevo después de configurar la variable.
