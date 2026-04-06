import { ResponseAnnouncementItem, ViewPayloadItem } from "@/shared/types/announcements";
import { useClientStore } from "@/shared/lib/store/client-store";

/**
 * Hook para obtener la lista de anuncios para el cliente seleccionado.
 * No realiza la llamada automáticamente; retorna una función para activarla.
 * * @returns Un objeto con la función asíncrona 'getAnnouncements'.
 */
export function useAnnouncement() {
  const { selectedClient } = useClientStore();
  const clientId = selectedClient?.id;

  const getAnnouncements = async (): Promise<ResponseAnnouncementItem[]> => {

    if (!clientId) {
      console.warn("Client ID no disponible. No se pueden buscar anuncios.");
      throw new Error("Client ID is required to fetch announcements.");
    }

    try {
      const url = `/api/announcements?client_id=${encodeURIComponent(clientId)}`;
      
      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error ${response.status}: No se pudieron obtener los anuncios.`);
      }

      const data: ResponseAnnouncementItem[] = await response.json();
      return data;
      
    } catch (error) {
      console.error("Error fetching announcements in hook:", error);
      throw error;
    }
  };


  const markAnnouncementsAsViewed = async (announcements: ResponseAnnouncementItem[]) => {
    if (announcements.length === 0) {
        return; // No hay nada que marcar como visto
    }

    // Mapear el array de anuncios al formato requerido por la API externa
    const payload: ViewPayloadItem[] = announcements.map(announcement => ({
        client_id: clientId,
        portal_announcement: announcement.id, // Asume que 'id' es el ID del anuncio
    }));

    try {
        // Llama a tu API Route local en /api
        const response = await fetch('/api/announcements', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Fallo al marcar anuncios como vistos.');
        }

        console.log("Anuncios marcados como vistos con éxito.");
        // Opcional: Retornar los datos de respuesta
        return await response.json(); 

    } catch (error) {
        console.error("Error al marcar anuncios como vistos:", error);
        throw error;
    }
}
  
  return { getAnnouncements, markAnnouncementsAsViewed };
}