import { NextRequest, NextResponse } from "next/server";

// This endpoint will handle PIN6 requests via SMS and email using SSR
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, mobile } = body;

    // Validate required fields
    if (!clientId || !mobile) {
      return NextResponse.json(
        { error: "Faltan campos requeridos: clientId y mobile" },
        { status: 400 }
      );
    }

    // Call the external webhook using SSR
    const webhookResponse = await fetch(
      "https://n8n.sisprotgf.com/webhook/send-pin6",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-auth-webhook": "01JRVJWSKM1BPVNR1W0XE08XYR",
        },
        body: JSON.stringify({
          id: clientId,
          telefono: mobile,
        }),
      }
    );

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error("Error from webhook:", errorText);
      throw new Error(`Webhook error: ${webhookResponse.status}`);
    }

    const webhookData = await webhookResponse.json();

    return NextResponse.json({
      success: true,
      message: "PIN6 enviado exitosamente por SMS y email",
      data: webhookData,
    });
  } catch (error) {
    console.error("Error requesting PIN6:", error);
    return NextResponse.json(
      { error: "Error al enviar PIN6. Inténtalo de nuevo." },
      { status: 500 }
    );
  }
}
