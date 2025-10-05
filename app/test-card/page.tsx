"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { ArrowLeft, CreditCard } from "lucide-react"

declare global {
  interface Window {
    ShieldHelper: any;
  }
}

const PUBLIC_KEY = "pk_0DlsAzxxNVjbUEW1k4iPISJDnT6UEDrPVZVoJ6kBA6o9kQcG"

export default function TestCardPage() {
  const router = useRouter()
  const [amount, setAmount] = useState("10.00")
  const [installments, setInstallments] = useState("1")
  const [loading, setLoading] = useState(false)
  const [scriptLoaded, setScriptLoaded] = useState(false)
  const [settings, setSettings] = useState<any>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [transactionResult, setTransactionResult] = useState<any>(null)
  
  // Dados do cartão
  const [cardNumber, setCardNumber] = useState("")
  const [cardName, setCardName] = useState("")
  const [cardExpMonth, setCardExpMonth] = useState("")
  const [cardExpYear, setCardExpYear] = useState("")
  const [cardCvv, setCardCvv] = useState("")

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`])
    console.log(message)
  }

  // Carregar script do BlackCat
  useEffect(() => {
    addLog('🔄 Carregando script BlackCat...')
    
    const script = document.createElement('script')
    script.src = 'https://api.blackcatpagamentos.com/v1/js'
    script.async = true
    script.onload = () => {
      setScriptLoaded(true)
      addLog('✅ Script BlackCat carregado')
      setTimeout(() => {
        initializeBlackCat()
      }, 500)
    }
    script.onerror = () => {
      addLog('❌ Erro ao carregar script BlackCat')
    }
    document.head.appendChild(script)

    return () => {
      try {
        if (script.parentNode) {
          document.head.removeChild(script)
        }
      } catch (e) {
        console.log('Erro ao remover script:', e)
      }
    }
  }, [])

  const initializeBlackCat = async () => {
    try {
      if (!window.ShieldHelper) {
        addLog('❌ ShieldHelper não encontrado')
        return
      }

      const moduleName = window.ShieldHelper.getModuleName()
      await (window as any)[moduleName].setPublicKey(PUBLIC_KEY)
      addLog('✅ Public Key configurada')

      // Obter configurações 3DS
      await get3DSSettings()
    } catch (error) {
      addLog(`❌ Erro ao inicializar: ${error}`)
    }
  }

  const get3DSSettings = async () => {
    try {
      addLog('🔄 Obtendo configurações 3DS...')
      
      const response = await fetch(
        `https://api.blackcatpagamentos.com/api/v1/js/get3dsSettings?publicKey=${PUBLIC_KEY}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
        }
      )

      const data = await response.json()
      setSettings(data)
      addLog(`✅ Configurações 3DS obtidas: ${JSON.stringify(data)}`)

      // Se precisar de iframe, criar aqui
      if (data.threeDSSecurityType === 'IFRAME' && data.iframeUrl) {
        createIframe(data.iframeUrl)
      }
    } catch (error) {
      addLog(`❌ Erro ao obter configurações 3DS: ${error}`)
    }
  }

  const createIframe = (iframeUrl: string) => {
    const iframeId = window.ShieldHelper.getIframeId()
    const iframe = document.createElement("iframe")
    iframe.id = iframeId
    iframe.src = iframeUrl
    iframe.style.width = "100%"
    iframe.style.height = "400px"
    iframe.style.border = "none"

    const container = document.getElementById("iframe-container")
    if (container) {
      container.appendChild(iframe)
      addLog('✅ Iframe 3DS criado')
    }

    // Listener de validação
    window.ShieldHelper.subscribeIframeFormValidation((data: any) => {
      addLog(`📝 Validação iframe: ${JSON.stringify(data)}`)
    })
  }

  const handlePayment = async () => {
    setLoading(true)
    setTransactionResult(null)

    try {
      addLog('🚀 Iniciando processo de pagamento...')

      // Passo 1: Converter valor para centavos
      const currency = "BRL"
      const amountInCents = window.ShieldHelper.convertDecimalToCents(parseFloat(amount), currency)
      addLog(`💰 Valor convertido: ${amount} → ${amountInCents} centavos`)

      // Passo 2: Preparar 3DS
      addLog('🔐 Preparando 3DS...')
      await window.ShieldHelper.prepareThreeDS({
        amount: amountInCents,
        installments: parseInt(installments),
        currency: currency,
      })
      addLog('✅ 3DS preparado')

      // Passo 3: Criptografar dados do cartão
      addLog('🔒 Criptografando dados do cartão...')
      const moduleName = window.ShieldHelper.getModuleName()
      
      let cardData
      if (settings?.hideCardForm) {
        // Se hideCardForm = true, enviar dados nulos
        cardData = {
          number: null,
          holderName: null,
          expMonth: null,
          expYear: null,
          cvv: null,
        }
      } else {
        // Caso contrário, usar dados do formulário
        cardData = {
          number: cardNumber,
          holderName: cardName,
          expMonth: parseInt(cardExpMonth),
          expYear: parseInt(cardExpYear),
          cvv: cardCvv,
        }
      }

      const token = await (window as any)[moduleName].encrypt(cardData)
      addLog(`✅ Token gerado: ${token.substring(0, 20)}...`)

      // Passo 4: Criar transação
      addLog('📤 Criando transação...')
      const transactionData = {
        amount: amountInCents,
        currency: "BRL",
        paymentMethod: "credit_card",
        installments: parseInt(installments),
        card: {
          hash: token
        },
        customer: {
          name: cardName || "Cliente Teste",
          email: "teste@teste.com",
          phone: "11999999999",
          document: {
            type: "cpf",
            number: "12345678900"
          }
        },
        items: [{
          title: "Teste de Pagamento",
          unitPrice: amountInCents,
          quantity: 1,
          tangible: false
        }],
        returnUrl: window.location.origin + "/test-card"
      }

      const response = await fetch('/api/create-card-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transactionData)
      })

      const transaction = await response.json()
      setTransactionResult(transaction)
      addLog(`✅ Transação criada: ID ${transaction.id}`)

      // Passo 5: Finalizar 3DS
      addLog('🔐 Finalizando 3DS...')
      await window.ShieldHelper.finishThreeDS(transaction, {
        disableRedirect: false
      })
      addLog('✅ 3DS finalizado')

    } catch (error: any) {
      addLog(`❌ Erro: ${error.message || error}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-4">
      <div className="container mx-auto max-w-4xl py-8">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4 flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Formulário */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Teste de Pagamento com Cartão (3DS)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Valor (BRL)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="10.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Parcelas</label>
                <Input
                  type="number"
                  value={installments}
                  onChange={(e) => setInstallments(e.target.value)}
                  placeholder="1"
                />
              </div>

              {!settings?.hideCardForm && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">Número do Cartão</label>
                    <Input
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="1234 5678 9012 3456"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Nome no Cartão</label>
                    <Input
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      placeholder="NOME COMPLETO"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-sm font-medium mb-2">Mês</label>
                      <Input
                        value={cardExpMonth}
                        onChange={(e) => setCardExpMonth(e.target.value)}
                        placeholder="12"
                        maxLength={2}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Ano</label>
                      <Input
                        value={cardExpYear}
                        onChange={(e) => setCardExpYear(e.target.value)}
                        placeholder="2027"
                        maxLength={4}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">CVV</label>
                      <Input
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        placeholder="123"
                        maxLength={4}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Container para iframe 3DS */}
              <div id="iframe-container"></div>

              <Button
                onClick={handlePayment}
                disabled={loading || !scriptLoaded}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg font-bold"
              >
                {loading ? '⏳ Processando...' : '💳 Pagar com Cartão'}
              </Button>

              {settings && (
                <div className="text-xs bg-gray-100 p-3 rounded">
                  <strong>Configurações 3DS:</strong>
                  <pre className="mt-2 overflow-auto">{JSON.stringify(settings, null, 2)}</pre>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Logs */}
          <Card>
            <CardHeader>
              <CardTitle>📋 Logs do Processo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-black text-green-400 p-4 rounded font-mono text-xs h-96 overflow-auto">
                {logs.map((log, index) => (
                  <div key={index}>{log}</div>
                ))}
                {logs.length === 0 && <div className="text-gray-500">Aguardando ações...</div>}
              </div>

              {transactionResult && (
                <div className="mt-4 bg-blue-50 p-4 rounded">
                  <strong className="text-blue-800">Resultado da Transação:</strong>
                  <pre className="mt-2 text-xs overflow-auto">{JSON.stringify(transactionResult, null, 2)}</pre>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
