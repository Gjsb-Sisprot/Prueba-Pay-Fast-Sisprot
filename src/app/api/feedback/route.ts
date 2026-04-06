import { NextRequest, NextResponse } from "next/server";

// Esta endpoint maneja el envío de feedback al webhook de n8n
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { paymentRating, internetRating, feedback, processDuration, clientId, timestamp } = body;

    // Validar campos requeridos
    if (!paymentRating) {
      return NextResponse.json(
        { error: "Rating es requerido" },
        { status: 400 }
      );
    }

    // Preparar el payload para n8n
    const payload = {
      rating:paymentRating,
      internetRating:internetRating,
      feedback: feedback || "",
      processDuration,
      clientId: clientId || null,
      timestamp: timestamp || new Date().toISOString(),
      source: "portal-pagos",
      type: paymentRating === "skip" ? "skipped" : "completed",
    };

    console.log("Enviando feedback al webhook con payload:", payload);

    // Enviar al webhook de n8n usando SSR
    const webhookResponse = await fetch(
      "https://n8n.sisprotgf.com/webhook/feedback-portal",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-auth-webhook": "01JRVJWSKM1BPVNR1W0XE08XYR",
        },
        body: JSON.stringify(payload),
      }
    );

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error("Error from feedback webhook:", errorText);
      throw new Error(`Webhook error: ${webhookResponse.status}`);
    }

    const webhookData = await webhookResponse.json().catch(() => ({}));

    return NextResponse.json({
      success: true,
      message: "Feedback enviado exitosamente",
      data: webhookData,
    });
  } catch (error) {
    console.error("Error sending feedback:", error);
    return NextResponse.json(
      { error: "Error al enviar feedback. Inténtalo de nuevo." },
      { status: 500 }
    );
  }
}
