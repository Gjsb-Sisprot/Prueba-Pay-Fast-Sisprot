import { NextResponse } from "next/server";
import { createTicket } from "@/modules/assistant/lib/glpi";

export async function GET() {
  try {
    const result = await createTicket({
      name: "Ticket de Prueba AI - Vercel Deployment",
      content: `
Esta es una prueba de integración del Asistente AI de Sisprot.
Si ves este ticket, la conexión entre Vercel y la API de GLPI es correcta.
Fecha: ${new Date().toLocaleString()}
      `.trim(),
      urgency: 1, // Baja urgencia para pruebas
    });

    if (result.success) {
      return NextResponse.json({
        status: "success",
        message: "¡Conexión con GLPI verificada exitosamente!",
        ticketId: result.ticketId,
        details: result.message
      });
    } else {
      return NextResponse.json({
        status: "error",
        message: "La conexión con GLPI falló.",
        error: result.error || result.message
      }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({
      status: "critical_error",
      message: "Ocurrió un error inesperado al intentar conectar con GLPI.",
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
