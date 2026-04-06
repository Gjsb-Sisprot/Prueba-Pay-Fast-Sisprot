import {  NextResponse } from "next/server";

export async function GET() {
  try {

    const response = await fetch(
      `${process.env.SISPROTGF_API_URL}/public/payments/banks/`,
      {
        method: "GET",
        headers: {
          "X-API-KEY": process.env.SISPROTGF_API_KEY || "",
          "Content-Type": "application/json",
        },
      }
    );
    console.log('Response status:', response);

    if (!response.ok) {
      return NextResponse.json(
        { error: "Error al buscar bancos" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error en API de bancos:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}