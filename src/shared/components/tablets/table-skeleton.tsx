// components/tablets/data-table-skeleton.tsx

import React from 'react';


export function DataTableSkeleton({ rows = 5, columns = 4 }: { rows?: number, columns?: number }) {
  const rowArray = Array.from({ length: rows });
  const columnArray = Array.from({ length: columns });

  return (
    <div className="rounded-lg border shadow-sm">
      {/* 🔹 Barra de herramientas superior (Simulando la acción de "Afiliar método") */}
      <div className="p-4 flex justify-end">
        <div className="h-9 w-32 bg-gray-200 rounded-md animate-pulse" />
      </div>

      {/* 🔹 Cuerpo de la Tabla */}
      <div className="w-full">
        {/* Encabezados de Columna */}
        <div className="grid h-12 border-b bg-gray-50/50" style={{ gridTemplateColumns: `repeat(${columns}, 1fr) 50px` }}>
          {columnArray.map((_, i) => (
            <div key={`header-${i}`} className="px-4 py-2 font-medium text-left">
              <div className="h-4 w-1/2 bg-gray-300 rounded animate-pulse" />
            </div>
          ))}
          {/* Espacio para la columna de acciones (por ejemplo, el menú) */}
          <div /> 
        </div>

        {/* Filas de Datos */}
        {rowArray.map((_, rowIndex) => (
          <div 
            key={rowIndex} 
            className="grid h-14 border-b last:border-b-0 items-center hover:bg-gray-50"
            // Ajusta el template para tener N columnas + 50px para la columna de acciones
            style={{ gridTemplateColumns: `repeat(${columns}, 1fr) 50px` }}
          >
            {columnArray.map((_, colIndex) => (
              <div key={`cell-${rowIndex}-${colIndex}`} className="px-4 py-2">
                <div className="h-4 bg-gray-200 rounded animate-pulse" style={{ width: `${Math.random() * (70 - 40) + 40}%` }} />
              </div>
            ))}
            {/* Celda de Acciones (Simulando el botón de opciones) */}
            <div className="px-4 py-2">
                <div className="h-4 w-4 bg-gray-300 rounded-full animate-pulse" />
            </div>
          </div>
        ))}
      </div>

      {/* 🔹 Paginación (Simulando controles) */}
      <div className="h-14 p-4 flex justify-between items-center border-t">
        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
        <div className="flex gap-2">
            <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse" />
            <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );
}