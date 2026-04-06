import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();   

    const response = await fetch(
      `${process.env.SISPROTGF_API_URL}/banks/bnc/generate_qr/`,
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
    console.error("=== ERROR EN GENERACION DE QR ===", error);
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
