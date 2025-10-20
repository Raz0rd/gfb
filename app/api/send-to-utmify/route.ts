import { type NextRequest, NextResponse } from "next/server"

// Função para obter API Key baseada no domínio
function getUtmifyApiKey(request: NextRequest): string {
  // Obter host da requisição
  const host = request.headers.get('host') || ''
  const referer = request.headers.get('referer') || ''
  
  // Normalizar: remover protocolo, www, porta e converter para lowercase
  const normalizeHost = (url: string): string => {
    return url
      .toLowerCase()
      .replace(/^https?:\/\//, '')  // Remove http:// ou https://
      .replace(/^www\./, '')         // Remove www.
      .split(':')[0]                 // Remove porta
      .split('/')[0]                 // Remove path
  }
  
  const normalizedHost = normalizeHost(host)
  const normalizedReferer = normalizeHost(referer)
  
  // Verificar entregasexpressnasuaporta.store
  if (normalizedHost.includes('entregasexpressnasuaporta.store') || 
      normalizedReferer.includes('entregasexpressnasuaporta.store')) {
    return 'soKGdNa8RKDPzAF06pNJydotUPanUGd84yXy'
  }
  
  // Verificar gasbutano.pro (padrão)
  if (normalizedHost.includes('gasbutano.pro') || 
      normalizedReferer.includes('gasbutano.pro')) {
    return 'rhb1izmPmgoYzOLYrwfRxt1ZGTjO5OKxo9to'
  }
  
  // Fallback padrão (gasbutano)
  return 'rhb1izmPmgoYzOLYrwfRxt1ZGTjO5OKxo9to'
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Obter API Key dinâmica baseada no domínio
    const apiKey = getUtmifyApiKey(request)
    
    // Log no servidor
    console.log('📤 [UTMify API] Recebendo requisição:', {
      status: body.status,
      orderId: body.orderId,
      approvedDate: body.approvedDate,
      apiKey: apiKey.substring(0, 10) + '...'
    })

    const response = await fetch("https://api.utmify.com.br/api-credentials/orders", {
      method: "POST",
      headers: {
        "x-api-token": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    console.log('📥 [UTMify API] Resposta:', {
      status: response.status,
      ok: response.ok,
      orderId: body.orderId
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ [UTMify API] Erro:', errorText)
      return NextResponse.json({ 
        error: "Erro ao enviar dados para UTMify",
        status: response.status,
        details: errorText
      }, { status: 500 })
    }

    const data = await response.json()
    console.log('✅ [UTMify API] Sucesso:', data)
    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ [UTMify API] Exception:', error)
    return NextResponse.json({ 
      error: "Erro ao enviar dados para UTMify",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
