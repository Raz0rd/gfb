import { type NextRequest, NextResponse } from "next/server"

const SMS_API_KEY = "6YYTL0R2P8VOAJYG2JUZF5QGAEAVX28BMR0C9LPMVKDCFYXDG4ERLTZGD8PJ3ZDCZV1K4O3X48CV4NTRJONIV7S0ZQVDL3ZVGEXKN1ALDQMPHT7XXD2Z75CZMXXPR2SL"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const dataFrom = searchParams.get('data_from') || '01/01/2024'
    const dataTo = searchParams.get('data_to') || new Date().toLocaleDateString('pt-BR')
    
    console.log("📊 Buscando relatório SMS:", { dataFrom, dataTo })

    const url = `https://api.smsdev.com.br/v1/report/total?key=${SMS_API_KEY}&data_from=${dataFrom}&data_to=${dataTo}`
    
    const response = await fetch(url, {
      method: "GET",
    })

    const data = await response.json()
    console.log("✅ Relatório SMS:", data)
    
    return NextResponse.json(data)
  } catch (error) {
    console.error("❌ Erro ao buscar relatório SMS:", error)
    return NextResponse.json({ 
      error: "Erro ao buscar relatório SMS" 
    }, { status: 500 })
  }
}
