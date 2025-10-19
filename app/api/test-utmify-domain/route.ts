import { type NextRequest, NextResponse } from "next/server"

// Mesma função de detecção
function getUtmifyApiKey(request: NextRequest): string {
  const host = request.headers.get('host') || ''
  const referer = request.headers.get('referer') || ''
  
  const normalizeHost = (url: string): string => {
    return url
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split(':')[0]
      .split('/')[0]
  }
  
  const normalizedHost = normalizeHost(host)
  const normalizedReferer = normalizeHost(referer)
  
  if (normalizedHost.includes('entregasexpressnasuaporta.store') || 
      normalizedReferer.includes('entregasexpressnasuaporta.store')) {
    return 'soKGdNa8RKDPzAF06pNJydotUPanUGd84yXy'
  }
  
  if (normalizedHost.includes('gasbutano.pro') || 
      normalizedReferer.includes('gasbutano.pro')) {
    return 'rhb1izmPmgoYzOLYrwfRxt1ZGTjO5OKxo9to'
  }
  
  return 'rhb1izmPmgoYzOLYrwfRxt1ZGTjO5OKxo9to'
}

export async function GET(request: NextRequest) {
  const host = request.headers.get('host') || ''
  const referer = request.headers.get('referer') || ''
  const origin = request.headers.get('origin') || ''
  
  const apiKey = getUtmifyApiKey(request)
  
  // Determinar qual domínio foi detectado
  let detectedDomain = 'gasbutano.pro (padrão)'
  if (apiKey === 'soKGdNa8RKDPzAF06pNJydotUPanUGd84yXy') {
    detectedDomain = 'entregasexpressnasuaporta.store'
  }
  
  return NextResponse.json({
    success: true,
    detectedDomain,
    apiKey: apiKey.substring(0, 10) + '...' + apiKey.substring(apiKey.length - 4),
    headers: {
      host,
      referer,
      origin
    },
    message: '✅ Detecção funcionando corretamente!'
  })
}
