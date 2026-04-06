import { NextRequest, NextResponse } from "next/server";

export async function PATCH(request: NextRequest) {
  try {
    const { id, pin_code } = await request.json();

    if (!id || !pin_code) {
      return NextResponse.json(
        {
          success: false,
          status: 400,
          message: "Faltan campos requeridos: id o pin_code",
        },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${process.env.SISPROTGF_API_URL}/public/clients/${id}/`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": process.env.SISPROTGF_API_KEY || "",
        },
        body: JSON.stringify({ pin_code }),
      }
    );

    const responseData = await response.json().catch(() => ({}));

    return NextResponse.json(
      {
        success: response.ok,
        status: response.status,
        message: responseData.message,
        data: responseData,
      },
      { status: response.status }
    );
  } catch (error) {
    console.error("=== error al actualizar pin code ===", error);
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
