import { type NextRequest, NextResponse } from "next/server"
import fs from 'fs'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    // Criar objeto com dados do pedido
    const orderData = {
      orderId: data.orderId,
      timestamp: new Date().toISOString(),
      customer: data.customer,
      products: data.products,
      amount: data.amount,
      trackingParameters: data.trackingParameters,
      host: data.host
    }
    
    // Caminho do arquivo JSON
    const filePath = path.join(process.cwd(), 'orders-data.json')
    
    // Ler dados existentes ou criar objeto vazio
    let existingData: { [key: string]: any } = {}
    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8')
      existingData = JSON.parse(fileContent)
    } catch (error) {
      // Arquivo não existe ainda
    }
    
    // Adicionar/atualizar pedido (usar orderId como chave)
    existingData[data.orderId] = orderData
    
    // Salvar no arquivo
    fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2))
    
    console.log('💾 [Save Order] Pedido salvo:', data.orderId)
    
    return NextResponse.json({ 
      success: true,
      message: "Pedido salvo com sucesso"
    })
  } catch (error) {
    console.error('❌ [Save Order] Erro:', error)
    return NextResponse.json({ 
      success: false,
      error: "Erro ao salvar pedido"
    }, { status: 500 })
  }
}
