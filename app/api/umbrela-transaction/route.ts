import { NextResponse } from 'next/server'

const UMBRELA_API_KEY = '84f2022f-a84b-4d63-a727-1780e6261fe8'
const UMBRELA_BASE_URL = 'https://api-gateway.umbrellapag.com/api'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const response = await fetch(`${UMBRELA_BASE_URL}/user/transactions`, {
      method: 'POST',
      headers: {
        'x-api-key': UMBRELA_API_KEY,
        'User-Agent': 'UMBRELLAB2B/1.0',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: body.amount,
        currency: 'BRL',
        paymentMethod: 'PIX',
        customer: body.customer,
        shipping: body.shipping,
        items: body.items,
        pix: body.pix,
        postbackUrl: body.postbackUrl || '',
        metadata: body.metadata || '',
        traceable: true,
        ip: body.ip || '0.0.0.0',
      }),
    })

    const data = await response.json()

    if (data.status === 200) {
      return NextResponse.json({
        id: data.data.id,
        status: data.data.status,
        amount: data.data.amount,
        paymentMethod: data.data.paymentMethod,
        qrCode: data.data.qrCode,
        pix: {
          qrcode: data.data.qrCode, // ✅ Adicionar qrcode aqui para exibir no frontend
          expirationDate: data.data.pix?.expirationDate,
        },
        customer: data.data.customer,
        items: data.data.items,
      })
    }

    return NextResponse.json(
      { error: 'Erro ao criar transação', details: data },
      { status: 400 }
    )
  } catch (error) {
    console.error('Erro na API Umbrela:', error)
    return NextResponse.json(
      { error: 'Erro interno ao processar transação' },
      { status: 500 }
    )
  }
}
