# Sistema de Gestión v3.0 — Amapola

## Inicio rápido

```bash
unzip amapola-react-app-v3.zip
cd react-app-v3
npm install
npm run dev
```

Abrí http://localhost:3000 en tu navegador.

## Funcionalidades v3

- **Ventas (POS)**: Punto de venta + historial de ventas del mes expandible (sin eliminar)
- **Inventario**: CRUD con margen correcto (100% = duplica costo), lotes, vencimiento, ordenable por nombre/stock/proveedor
- **Pedidos**: Ingreso de mercadería con búsqueda, costo editable por item, editar pedidos existentes
- **Reportes**: Login con PIN (default: 1234), ganancia neta, gasto por proveedor, alertas de vencimiento, ajustes de stock
- **Configuración**: Nombre, slogan, categorías, días de alerta, PIN configurable

## Correcciones v3

- Margen 100% muestra 100% (no 50%)
- Sin ceros a la izquierda en inputs numéricos
- Decimales permitidos en toda la app (step 0.01)
- POS no suma sin cantidad ingresada
- Lote y vencimiento disponibles al crear producto nuevo

## Build para producción

```bash
npm run build    # genera carpeta dist/
npm run preview  # previsualizar build
```
