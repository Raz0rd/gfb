import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Log temporário para debug
    if (body.status === 'paid') {
      console.log('🟢 PAID recebido na API:', {
        orderId: body.orderId,
        status: body.status,
        timestamp: new Date().toISOString()
      })
    }

    const response = await fetch("https://api.utmify.com.br/api-credentials/orders", {
      method: "POST",
      headers: {
        "x-api-token": "rhb1izmPmgoYzOLYrwfRxt1ZGTjO5OKxo9to",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      return NextResponse.json({ 
        error: "Erro ao enviar dados para UTMify",
        status: response.status
      }, { status: 500 })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ 
      error: "Erro ao enviar dados para UTMify"
    }, { status: 500 })
  }
}
