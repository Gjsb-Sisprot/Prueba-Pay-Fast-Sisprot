import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "ID de cliente requerido" },
        { status: 400 }
      );
    }

    const apiUrl = `${process.env.SISPROTGF_API_URL}/public/clients/${id}/`;

    console.log("🔍 Fetching client by ID:", apiUrl);

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "X-API-KEY": process.env.SISPROTGF_API_KEY || "",
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Error al obtener el cliente" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error en API de cliente por ID:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: "ID de cliente requerido" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const apiUrl = `${process.env.SISPROTGF_API_URL}/public/clients/${id}/`;

    console.log("🔍 Updating client by ID:", apiUrl);

    const response = await fetch(apiUrl, {
      method: "PATCH",
      headers: {
        "X-API-KEY": process.env.SISPROTGF_API_KEY || "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.detail || "Error al actualizar el cliente" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error en PATCH API de cliente:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
