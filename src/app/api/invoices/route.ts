import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contractId = searchParams.get("contract");

    if (!contractId) {
      return NextResponse.json(
        { error: "Parámetro 'contract' requerido" },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${process.env.SISPROTGF_API_URL}/public/invoices/?contract=${encodeURIComponent(
        contractId
      )}&status=23&portal=true`,
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
        { error: "Error al obtener facturas" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error en API de facturas:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
