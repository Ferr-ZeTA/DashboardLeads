# Dashboard de Leads RED

Dashboard comercial construido con React, JavaScript/JSX, Vite y Tailwind CSS.

## Desarrollo local

1. Copia `.env.example` a `.env.local` y define `RED_API_KEY` en ese archivo. No publiques la clave ni uses un prefijo `VITE_`.
2. Ejecuta `npm install` y después `npm run dev`.
3. Ejecuta `npm run lint` y `npm run build` para validar el proyecto.

Durante el desarrollo, Vite actúa como proxy de `/api/metrics/reuniones` hacia `https://prospektia.red.com.sv` e inyecta `X-API-KEY` desde el entorno del servidor. En Vercel, `api/metrics/reuniones.js` implementa la misma ruta como una función serverless y lee `RED_API_KEY` del entorno. El navegador llama al endpoint de mismo origen; la credencial no se compila en el bundle.

## Despliegue en Vercel

1. Importa el repositorio en Vercel y configura `Dashboard-Leds` como **Root Directory**.
2. Usa `npm run build` como **Build Command** y `dist` como **Output Directory**.
3. Añade `RED_API_KEY` en **Project Settings → Environment Variables** para los entornos donde se desplegará. No uses el prefijo `VITE_`.
4. Despliega o vuelve a desplegar el proyecto después de guardar la variable.

## Datos y reglas

La API real devuelve `{ items, total, limite, ... }`. En la auditoría, `total` corresponde al tamaño de la página, no al total global; el servicio por eso solicita offsets `0, 50, 100, ...` hasta recibir una página menor a 50. Se verificaron 1,324 registros en 27 páginas, sin IDs duplicados, y 661 leads GT / 663 SV. `cerrado/perdida` se mapea a perdido, `cerrado/cerrada` a ganado, `en_proceso` a activo, `no_agendado` a en espera y `stage_2_overdue` a detenido; un cerrado sin resultado se cuenta como inválido. El cruce completo `status × resultado_venta × opportunity_stage` suma los 1,324 registros y cuadra con la partición de estados.

Los filtros de ejecutivo, país y mes producen `resumenBase()`. Las vistas consumen esa misma selección. La API incluye la próxima gestión (`proximaGestion` o `proxima_gestion`) y la fecha de reunión (`start_time`); se muestran como fechas distintas y los vencimientos se calculan solo desde la próxima gestión real. La API no incluye calificación, fecha de cierre, inclusión a forecast o historial de etapas; esos campos se muestran como no disponibles y nunca se derivan de campos que significan otra cosa. En particular, el status `stage_2_overdue` no prueba por sí solo una fecha vencida. La etapa API 5 es `SEGUIMIENTO` y se combina con propuesta; no hay una etapa específica de documentación.

Los registros originales se conservan en memoria y están disponibles mediante la expansión de cada fila del directorio, dentro de Resumen. Resultados presenta categorías normalizadas a partir del texto libre `categoria_cierre`, así como rubros de cierres; no presenta ese texto como catálogo de equipos ni cuenta unidades vendidas. La API no distingue cierres manuales ni aporta un motivo manual estructurado: la alerta de motivos valida que cada pérdida tenga una categoría informativa. `calculateMetrics()` valida también la partición de estados en los datos globales y filtrados.
