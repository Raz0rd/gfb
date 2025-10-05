import { type NextRequest, NextResponse } from "next/server"

const SMS_API_KEY = "6YYTL0R2P8VOAJYG2JUZF5QGAEAVX28BMR0C9LPMVKDCFYXDG4ERLTZGD8PJ3ZDCZV1K4O3X48CV4NTRJONIV7S0ZQVDL3ZVGEXKN1ALDQMPHT7XXD2Z75CZMXXPR2SL"

export async function GET(request: NextRequest) {
  try {
    // Pegar parâmetros da URL manualmente
    const { searchParams } = new URL(request.url)
    
    // Data padrão: 5 dias atrás até hoje
    const hoje = new Date()
    const cincoDiasAtras = new Date()
    cincoDiasAtras.setDate(hoje.getDate() - 5)
    
    const dataFrom = searchParams.get('data_from') || cincoDiasAtras.toLocaleDateString('pt-BR')
    const dataTo = searchParams.get('data_to') || hoje.toLocaleDateString('pt-BR')
    
    console.log("📊 Buscando relatório SMS:", { dataFrom, dataTo })

    const url = `https://api.smsdev.com.br/v1/report/total?key=${SMS_API_KEY}&data_from=${dataFrom}&data_to=${dataTo}`
    console.log("🔗 URL:", url)
    
    const response = await fetch(url, {
      method: "GET",
    })

    console.log("📡 Status da resposta:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("❌ Erro da API SMSDev:", errorText)
      return NextResponse.json({ 
        situacao: "ERRO",
        descricao: `Erro da API: ${response.status} - ${errorText}` 
      })
    }

    const data = await response.json()
    console.log("✅ Relatório SMS:", data)
    
    return NextResponse.json(data)
  } catch (error) {
    console.error("❌ Erro ao buscar relatório SMS:", error)
    return NextResponse.json({ 
      situacao: "ERRO",
      descricao: error instanceof Error ? error.message : "Erro desconhecido"
    })
  }
}
