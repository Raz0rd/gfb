import { type NextRequest, NextResponse } from "next/server"

const SMS_API_KEY = "6YYTL0R2P8VOAJYG2JUZF5QGAEAVX28BMR0C9LPMVKDCFYXDG4ERLTZGD8PJ3ZDCZV1K4O3X48CV4NTRJONIV7S0ZQVDL3ZVGEXKN1ALDQMPHT7XXD2Z75CZMXXPR2SL"

export async function POST(request: NextRequest) {
  try {
    const { phone, message } = await request.json()
    
    // Limpar telefone (remover caracteres especiais)
    const cleanPhone = phone.replace(/\D/g, '')
    
    console.log("📱 Enviando SMS:", { phone: cleanPhone, message })

    const url = `https://api.smsdev.com.br/v1/send?key=${SMS_API_KEY}&type=9&number=${cleanPhone}&msg=${encodeURIComponent(message)}`
    
    const response = await fetch(url, {
      method: "GET",
    })

    const data = await response.text()
    console.log("✅ Resposta SMS API:", data)
    
    return NextResponse.json({ 
      success: true,
      response: data,
      phone: cleanPhone,
      message
    })
  } catch (error) {
    console.error("❌ Erro ao enviar SMS:", error)
    return NextResponse.json({ 
      success: false,
      error: "Erro ao enviar SMS" 
    }, { status: 500 })
  }
}
