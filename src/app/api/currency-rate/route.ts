import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    if (!date) {
      return NextResponse.json(
        { error: "Parámetro 'date' requerido" },
        { status: 400 }
      );
    }

    const response = await fetch(
      `https://api.sisprotgf.com/api/base/currency_rate/?date=${encodeURIComponent(
        date
      )}`,
      {
        method: "GET",
        headers: {
          "X-API-KEY": process.env.SISPROTGF_API_KEY || "",
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      console.error(
        `Error API currency_rate: ${response.status} - ${response.statusText}`
      );
      return NextResponse.json(
        { error: "Error al obtener la tasa de cambio" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error en API de tasa de cambio:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
