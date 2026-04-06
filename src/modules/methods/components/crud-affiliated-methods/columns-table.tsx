import { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { useState } from "react";
import { ConfirmModal } from "@/shared/components/modals/confirm-modal";
import { deleteAffiliateMethod } from "@/shared/lib/api/methods";
import { PaymentMethod as PaymentMethodItem } from "@/shared/types/affiliated-methods";

type AffiliateMethod = {
  id: number;
  name: string | null;
  method_name: string;
  sender: string;
  bank_data: string;
  identification_display: string;
  status: boolean;
  created_by_name: string;
  created_at: string;
};

export const getColumns = (
  reloadMethods?: () => void | Promise<void>,
  onEdit?: (m: PaymentMethodItem) => void
): ColumnDef<AffiliateMethod>[] => [
  { accessorKey: "name", header: "Nombre" },
  { accessorKey: "method_name", header: "Método" },
  { accessorKey: "identification_display", header: "Identificación" },
  { accessorKey: "sender", header: "Remitente" },
  { accessorKey: "bank_data.name", header: "Banco" },

  // {
  //   accessorKey: "status",
  //   header: "Estado",
  //   cell: ({ row }) =>
  //     row.original.status ? (
  //       <span className="text-green-600 font-medium">Activo</span>
  //     ) : (
  //       <span className="text-red-600 font-medium">Inactivo</span>
  //     ),
  // },
  // { accessorKey: "created_by_name", header: "Creado por" },
  // {
  //   accessorKey: "created_at",
  //   header: "Fecha de creación",
  //   cell: ({ row }) => new Date(row.original.created_at).toLocaleString(),
  // },
  {
    id: "actions",
    header: "Acción",
    cell: ({ row }) => {
      const method = row.original;
      function ActionButtons({ method }: { method: AffiliateMethod }) {
        const [open, setOpen] = useState(false);
        const [loading, setLoading] = useState(false);

        async function handleConfirmDelete() {
          setLoading(true);
          try {
            // Llamada al helper que implementa DELETE a /api/methods/affiliate
            const res = await deleteAffiliateMethod(method.id);
            console.log("Eliminar result:", res);
            // Si hay una función de recarga, ejecutarla para actualizar la tabla
            if (reloadMethods) await reloadMethods();
          } catch (err) {
            console.error("Error eliminando método afiliado:", err);
          } finally {
            setLoading(false);
            setOpen(false);
          }
        }

        return (
          <>
            <div className="flex items-center justify-center">
              {/* Botón editar */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit?.(method as unknown as PaymentMethodItem)}
                className="text-blue-600 hover:text-blue-800"
                title="Editar método"
              >
                <Pencil className="h-4 w-4" />
              </Button>

              {/* Botón eliminar */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(true)}
                className="text-red-600 hover:text-red-800"
                title="Eliminar método"
              >
                <Trash className="h-4 w-4" />
              </Button>
            </div>

            <ConfirmModal
              open={open}
              onClose={() => setOpen(false)}
              onConfirm={handleConfirmDelete}
              message={`¿Estás seguro que deseas eliminar el método "${method.name ?? method.method_name}"?`}
              confirmLabel={loading ? "Eliminando..." : "Sí, eliminar"}
              cancelLabel="No"
            />
          </>
        );
      }

      return <ActionButtons method={method} />;
    },
  },
];
