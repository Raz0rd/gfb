import { NextResponse } from 'next/server'

const UMBRELA_API_KEY = '84f2022f-a84b-4d63-a727-1780e6261fe8'
const UMBRELA_BASE_URL = 'https://api-gateway.umbrellapag.com/api'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const transactionId = searchParams.get('transactionId')

    if (!transactionId) {
      return NextResponse.json(
        { error: 'Transaction ID é obrigatório' },
        { status: 400 }
      )
    }

    const response = await fetch(
      `${UMBRELA_BASE_URL}/user/transactions/${transactionId}`,
      {
        method: 'GET',
        headers: {
          'x-api-key': UMBRELA_API_KEY,
          'User-Agent': 'UMBRELLAB2B/1.0',
        },
        cache: 'no-store', // Sem cache para sempre buscar status atualizado
      }
    )

    const data = await response.json()

    if (data.status === 200) {
      return NextResponse.json({
        id: data.data.id,
        status: data.data.status,
        amount: data.data.amount,
        paymentMethod: data.data.paymentMethod,
        paidAt: data.data.paidAt,
        isPaid: data.data.status === 'PAID',
      })
    }

    return NextResponse.json(
      { error: 'Erro ao verificar pagamento', details: data },
      { status: 400 }
    )
  } catch (error) {
    console.error('Erro ao verificar pagamento Umbrela:', error)
    return NextResponse.json(
      { error: 'Erro interno ao verificar pagamento' },
      { status: 500 }
    )
  }
}
