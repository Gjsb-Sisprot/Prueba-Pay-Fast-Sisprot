import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");

    if (!search) {
      return NextResponse.json(
        { error: "Parámetro 'search' requerido" },
        { status: 400 }
      );
    }
const apiUrl = new URL(`${process.env.SISPROTGF_API_URL}/public/clients/`);
apiUrl.searchParams.set("search", search);

console.log("🔍 URL completa con parámetros:", apiUrl.toString())
    const response = await fetch(
      `${process.env.SISPROTGF_API_URL}/public/clients/?identification=${encodeURIComponent(
        search
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
      return NextResponse.json(
        { error: "Error al buscar clientes" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error en API de clientes:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
