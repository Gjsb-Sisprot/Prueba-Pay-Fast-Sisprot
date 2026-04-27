import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    console.log("[TTS_API] Iniciando solicitud para:", text?.substring(0, 50) + "...");
    
    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    const VOICE_ID = "fqf2iY1NwgXWQDrrPZjv";
    const API_KEY = "sk_d240f9c9558339921a17ebfa9b902eb209f1cd634e2e710e";

    // Intentar con turbo_v2 que es más rápido y compatible
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": API_KEY,
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_turbo_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.8,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[TTS_API] Error de ElevenLabs:", response.status, errorText);
      return NextResponse.json(
        { error: `ElevenLabs Error ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    console.log("[TTS_API] Audio generado exitosamente");
    const audioBuffer = await response.arrayBuffer();
    
    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error: unknown) {
    console.error("[TTS_API] Error interno:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
