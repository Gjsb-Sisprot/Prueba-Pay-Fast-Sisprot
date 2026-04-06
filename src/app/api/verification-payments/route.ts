import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get("invoice");

    if (!invoiceId) {
      return NextResponse.json(
        { error: "Parámetro 'invoice' requerido" },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${process.env.SISPROTGF_API_URL}/public/payments/validation/logs/?invoice_id=${encodeURIComponent(
        invoiceId
      )}&event_type=not_found,payment`,
      {
        method: "GET",
        headers: {
          "X-API-KEY": process.env.SISPROTGF_API_KEY || "",
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Error al obtener pagos en verificacion" },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log("Datos obtenidos de la API de pagos en verificación:", data);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error en API de pagos en verificacion:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Allow id in query string or in JSON body
    const { searchParams } = new URL(request.url);
    let id = searchParams.get("id");

    const body = await request.json().catch(() => null);
    if (!id && body && body.id) id = String(body.id);

    if (!id) {
      return NextResponse.json({ error: "Parámetro 'id' requerido" }, { status: 400 });
    }

    // Expect an event_type in the body (e.g. { event_type: 'canceled' })
    const eventType = body?.event_type;
    if (!eventType) {
      return NextResponse.json({ error: "Parámetro 'event_type' requerido en el body" }, { status: 400 });
    }

    // Forward PATCH to external SISPROTGF API (best-effort endpoint)
    const externalUrl = `${process.env.SISPROTGF_API_URL}/public/payments/validation/logs/${encodeURIComponent(
      id
    )}/`;

    const response = await fetch(externalUrl, {
      method: "PATCH",
      headers: {
        "X-API-KEY": process.env.SISPROTGF_API_KEY || "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ event_type: eventType }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return NextResponse.json({ error: "Error updating verification payment", details: text }, { status: response.status });
    }

    // Some APIs return 204 No Content on successful patch
    if (response.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const data = await response.json().catch(() => ({}));
    return NextResponse.json({ success: true, data }, { status: response.status });
  } catch (error) {
    console.error("Error updating verification payment:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
