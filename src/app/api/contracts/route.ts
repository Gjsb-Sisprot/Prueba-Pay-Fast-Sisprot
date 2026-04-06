import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("client");

    if (!clientId) {
      return NextResponse.json(
        { error: "Parámetro 'client' requerido" },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${process.env.SISPROTGF_API_URL}/public/contracts/?client=${encodeURIComponent(
        clientId
      )}&portal=true`,
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
        { error: "Error al obtener contratos" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error en API de contratos:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
