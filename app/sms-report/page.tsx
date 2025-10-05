"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { ArrowLeft, MessageSquare, RefreshCw } from "lucide-react"

export default function SmsReportPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<any>(null)
  const [dataFrom, setDataFrom] = useState("")
  const [dataTo, setDataTo] = useState("")
  const [sendingTest, setSendingTest] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)

  // Definir datas padrão (últimos 5 dias)
  useEffect(() => {
    const today = new Date()
    const fiveDaysAgo = new Date()
    fiveDaysAgo.setDate(today.getDate() - 5)
    
    setDataFrom(fiveDaysAgo.toLocaleDateString('pt-BR'))
    setDataTo(today.toLocaleDateString('pt-BR'))
    
    // Carregar relatório automaticamente
    fetchReport(fiveDaysAgo.toLocaleDateString('pt-BR'), today.toLocaleDateString('pt-BR'))
  }, [])

  const fetchReport = async (from?: string, to?: string) => {
    setLoading(true)
    try {
      const fromDate = from || dataFrom
      const toDate = to || dataTo
      
      console.log('📊 Buscando relatório...', { fromDate, toDate })
      
      const response = await fetch(`/api/sms-report?data_from=${encodeURIComponent(fromDate)}&data_to=${encodeURIComponent(toDate)}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('✅ Relatório recebido:', data)
      setReport(data)
    } catch (error) {
      console.error('❌ Erro ao buscar relatório:', error)
      setReport({
        situacao: 'ERRO',
        descricao: error instanceof Error ? error.message : 'Erro desconhecido'
      })
    } finally {
      setLoading(false)
    }
  }

  const sendTestSMS = async () => {
    setSendingTest(true)
    setTestResult(null)
    try {
      const testPhone = "85982271217"
      const message = "Teste Unigas: Sistema de SMS funcionando perfeitamente!"
      const apiKey = "6YYTL0R2P8VOAJYG2JUZF5QGAEAVX28BMR0C9LPMVKDCFYXDG4ERLTZGD8PJ3ZDCZV1K4O3X48CV4NTRJONIV7S0ZQVDL3ZVGEXKN1ALDQMPHT7XXD2Z75CZMXXPR2SL"
      
      console.log('📱 Enviando SMS de teste para:', testPhone)
      
      const url = `https://api.smsdev.com.br/v1/send?key=${apiKey}&type=9&number=${testPhone}&msg=${encodeURIComponent(message)}`
      
      const response = await fetch(url, { method: 'GET' })
      const data = await response.json()
      
      console.log('✅ Resposta do envio:', data)
      setTestResult(data)
      
      // Atualizar relatório após enviar
      setTimeout(() => fetchReport(), 2000)
    } catch (error) {
      console.error('❌ Erro ao enviar SMS de teste:', error)
      setTestResult({ error: 'Erro ao enviar SMS' })
    } finally {
      setSendingTest(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 p-4">
      <div className="container mx-auto max-w-4xl py-8">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4 flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Relatório de SMS Enviados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Botão de Teste */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-blue-800">📱 Enviar SMS de Teste</h4>
                  <p className="text-sm text-blue-600">Para: 85982271217</p>
                </div>
                <Button
                  onClick={sendTestSMS}
                  disabled={sendingTest}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {sendingTest ? 'Enviando...' : '📤 Enviar Teste'}
                </Button>
              </div>
              
              {testResult && (
                <div className="mt-3 p-3 bg-white rounded border">
                  <p className="text-sm font-semibold">Resultado:</p>
                  <pre className="text-xs mt-2 overflow-auto">{JSON.stringify(testResult, null, 2)}</pre>
                  {testResult.id && (
                    <p className="text-green-600 font-bold mt-2">✅ ID do SMS: {testResult.id}</p>
                  )}
                </div>
              )}
            </div>

            {/* Filtros */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Data Início</label>
                <Input
                  value={dataFrom}
                  onChange={(e) => setDataFrom(e.target.value)}
                  placeholder="01/01/2024"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Data Fim</label>
                <Input
                  value={dataTo}
                  onChange={(e) => setDataTo(e.target.value)}
                  placeholder="31/01/2024"
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={() => fetchReport()}
                  disabled={loading}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  {loading ? 'Carregando...' : 'Atualizar'}
                </Button>
              </div>
            </div>

            {/* Resultados */}
            {report && (
              <div className="space-y-4">
                {!report.descricao && !report.situacao ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-yellow-800">
                      ℹ️ Nenhum dado encontrado para este período. Você ainda não enviou SMS ou não há registros.
                    </p>
                  </div>
                ) : report.situacao === 'OK' ? (
                  <>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-green-800 font-semibold">
                        ✅ {report.descricao}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="bg-white border rounded-lg p-4">
                        <p className="text-sm text-gray-600">Enviadas</p>
                        <p className="text-2xl font-bold text-blue-600">{report.enviada}</p>
                      </div>
                      
                      <div className="bg-white border rounded-lg p-4">
                        <p className="text-sm text-gray-600">Recebidas</p>
                        <p className="text-2xl font-bold text-green-600">{report.recebida}</p>
                      </div>
                      
                      <div className="bg-white border rounded-lg p-4">
                        <p className="text-sm text-gray-600">Blacklist</p>
                        <p className="text-2xl font-bold text-red-600">{report.blacklist}</p>
                      </div>
                      
                      <div className="bg-white border rounded-lg p-4">
                        <p className="text-sm text-gray-600">Canceladas</p>
                        <p className="text-2xl font-bold text-orange-600">{report.cancelada}</p>
                      </div>
                      
                      <div className="bg-white border rounded-lg p-4">
                        <p className="text-sm text-gray-600">Créditos Usados</p>
                        <p className="text-2xl font-bold text-purple-600">{report.qtd_credito}</p>
                      </div>
                      
                      <div className="bg-white border rounded-lg p-4">
                        <p className="text-sm text-gray-600">Período</p>
                        <p className="text-sm font-semibold">{report.data_inicio}</p>
                        <p className="text-sm font-semibold">até {report.data_fim}</p>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-800">
                        <strong>Taxa de Entrega:</strong> {report.recebida && report.enviada ? 
                          ((parseInt(report.recebida) / parseInt(report.enviada)) * 100).toFixed(1) : 0}%
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800">
                      ❌ Erro: {report.descricao || 'Erro ao buscar relatório'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {!report && !loading && (
              <div className="text-center text-gray-500 py-8">
                Selecione um período e clique em Atualizar
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
