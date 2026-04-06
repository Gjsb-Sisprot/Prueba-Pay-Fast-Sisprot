import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const client_id = searchParams.get("client_id");

    if (!client_id) {
      return NextResponse.json(
        { error: "Parámetro 'client_id' requerido" },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${process.env.SISPROTGF_API_URL}/public/portal_announcements/?unseen_by_client=${encodeURIComponent(
        client_id
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
        { error: "Error al buscar anuncios" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error en API de anuncios:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parsear el body como un array de objetos
    const body: Array<{ client_id: number, portal_announcement: number }> = await request.json();

    if (!Array.isArray(body) || body.length === 0) {
      return NextResponse.json(
        { error: "El cuerpo de la solicitud debe ser un array no vacío de registros de vista." },
        { status: 400 }
      );
    }
    
    const response = await fetch(
      `${process.env.SISPROTGF_API_URL}/public/portal_announcements/view/`,
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
    if (response.status !== 201) {
         console.error("Error al registrar vistas en SISPROTGF:", responseData);
         return NextResponse.json(
            { 
                error: "Error al registrar la vista de los anuncios", 
                details: responseData.detail || responseData, 
            },
            { status: response.status }
        );
    }
    return NextResponse.json(
      {
        success: true,
        status: response.status,
        message: "Vistas de anuncios registradas con éxito.",
        data: responseData,
      },
      { status: 201 }
    );
  
  } catch (error) {
    console.error("Error en API de anuncios (POST):", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
