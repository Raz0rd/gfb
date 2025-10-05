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

  // Definir datas padrão (último mês)
  useEffect(() => {
    const today = new Date()
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate())
    
    setDataFrom(lastMonth.toLocaleDateString('pt-BR'))
    setDataTo(today.toLocaleDateString('pt-BR'))
    
    // Carregar relatório automaticamente
    fetchReport(lastMonth.toLocaleDateString('pt-BR'), today.toLocaleDateString('pt-BR'))
  }, [])

  const fetchReport = async (from?: string, to?: string) => {
    setLoading(true)
    try {
      const fromDate = from || dataFrom
      const toDate = to || dataTo
      
      const response = await fetch(`/api/sms-report?data_from=${fromDate}&data_to=${toDate}`)
      const data = await response.json()
      setReport(data)
    } catch (error) {
      console.error('Erro ao buscar relatório:', error)
    } finally {
      setLoading(false)
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
                {report.situacao === 'OK' ? (
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
