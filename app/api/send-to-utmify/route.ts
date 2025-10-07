import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log("📤 Enviando para UTMify:", JSON.stringify(body, null, 2))

    const response = await fetch("https://api.utmify.com.br/api-credentials/orders", {
      method: "POST",
      headers: {
        "x-api-token": "6q5U6LSdt5Weyl29TPV9ui7jgdLuUtH3X0eo",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("❌ Erro UTMify Response:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      })
      return NextResponse.json({ 
        error: "Erro ao enviar dados para UTMify",
        details: errorText,
        status: response.status
      }, { status: 500 })
    }

    const data = await response.json()
    console.log("✅ Resposta UTMify:", data)
    return NextResponse.json(data)
  } catch (error) {
    console.error("❌ Erro ao enviar para UTMify:", error)
    return NextResponse.json({ 
      error: "Erro ao enviar dados para UTMify",
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
