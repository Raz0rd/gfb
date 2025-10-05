import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log("📤 Criando transação com cartão:", JSON.stringify(body, null, 2))

    const response = await fetch("https://api.blackcatpagamentos.com/v1/transactions", {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization:
          "Basic cGtfMERsc0F6eHhOVmpiVUVXMWs0aVBJU0pEblQ2VUVEclBWWlZvSjZrQkE2bzlrUWNHOnNrX1dpWUt1eXB4cFhLeXdoZjgwVm9pS2xCcFZnZWJpdENDVU5sN01GbVZ4WUh5cWxacg==",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("❌ Erro BlackCat Response:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      })
      return NextResponse.json({ 
        error: "Erro ao criar transação",
        details: errorText,
        status: response.status
      }, { status: response.status })
    }

    const data = await response.json()
    console.log("✅ Transação criada com sucesso:", data)
    return NextResponse.json(data)
  } catch (error) {
    console.error("❌ Erro ao criar transação:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
