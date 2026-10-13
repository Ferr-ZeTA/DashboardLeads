# Dashboard de Leads RED

Dashboard comercial de una sola página, construido con React, JavaScript/JSX, Vite y Tailwind CSS. La interfaz sigue la estructura de la referencia: filtros globales, KPIs, gráficas y tablas en una vista continua; no utiliza sidebar ni navegación entre módulos.

## Desarrollo local

1. Copia `.env.example` a `.env.local` y define `RED_API_KEY`. No publiques la clave ni uses un prefijo `VITE_`.
2. Ejecuta `npm install` y después `npm run dev`.
3. Ejecuta `npm run lint` y `npm run build` para validar el proyecto.

Durante el desarrollo, Vite redirige `/api/metrics/reuniones` a Prospektia e inyecta `X-API-KEY` desde el servidor. En Vercel, `api/metrics/reuniones.js` implementa esa ruta y lee la misma variable de entorno. El navegador utiliza la ruta del mismo origen; la clave no se incluye en el bundle.

La API se vuelve a consultar cada cinco minutos mientras el dashboard está abierto y visible, al regresar a la pestaña cuando la última actualización tiene cinco minutos o más, o al pulsar **Actualizar**. Las solicitudes usan `cache: 'no-store'`.

## Datos y métricas

- `src/DashboardHome.jsx` reúne toda la interfaz y sus gráficas; `src/index.css` contiene el estilo responsive de la página única.
- El filtro de mes y la gráfica mensual usan `created_at`. Los demás filtros son país, asesor, `tipo_lead` y estado comercial. Todos se aplican al mismo conjunto antes de calcular KPIs, gráficas y tablas.
- Los leads radicados son los que la API reporta como `status=cerrado` y `resultado_venta=cerrada`. La conversión mostrada es radicados / total de leads filtrados.
- Las cantidades se presentan como **equipos reportados**. Se leen de los campos de etapa estructurados `cantidad_equipos`, `equipos` o `cantidad_oferta`; no se presentan como ventas confirmadas. Los promedios se calculan únicamente cuando existe una cantidad reportada para el radicado.
- La clasificación de lead usa el campo `tipo_lead` (`calificado` o `no_calificado`). El canal no está disponible en la respuesta actual y por eso no se incluye como filtro ni como gráfica.
- El panel de embudo agrupa por país y mes de creación; sus etapas son total de leads, calificados y radicados. La API expone la etapa actual, no el historial de transiciones.
- Los checks de consistencia se calculan con el conjunto filtrado. `status` conserva autoridad si contradice `resultado_venta`.

La API pagina con `offset` de 50 registros. El servicio sigue solicitando páginas hasta recibir una página incompleta y rechaza identificadores duplicados. La credencial debe configurarse como `RED_API_KEY` en las variables de entorno del despliegue.

## Despliegue en Vercel

1. Configura `Dashboard-Leds` como **Root Directory**.
2. Usa `npm run build` como **Build Command** y `dist` como **Output Directory**.
3. Añade `RED_API_KEY` en **Project Settings → Environment Variables**.
4. Despliega de nuevo después de configurar la variable.
