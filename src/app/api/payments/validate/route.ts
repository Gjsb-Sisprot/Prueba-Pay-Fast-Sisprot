import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(
      `${process.env.SISPROTGF_API_URL}/public/payments/validate_and_register/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": process.env.SISPROTGF_API_KEY || "",
        },
        body: JSON.stringify(body),
      }
    );

    const responseData = await response.json().catch(() => ({}));

    // Retornar información del estado para manejo específico
    return NextResponse.json(
      {
        success: response.status === 201,
        status: response.status,
        message: responseData.message,
        data: responseData,
      },
      { status: response.status }
    );
  } catch (error) {
    console.error("=== ERROR EN VALIDACIÓN DE PAGOS ===");
    console.error("Timestamp:", new Date().toISOString());
    console.error("Error details:", error);
    console.error("===================================");

    return NextResponse.json(
      {
        success: false,
        status: 500,
        message: "Error interno del servidor",
        data: {},
      },
      { status: 500 }
    );
  }
}
