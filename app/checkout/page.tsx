"use client"

import type React from "react"

// Declaração de tipo para gtag
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
  }
}
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ArrowLeft, MapPin, Clock, CreditCard, Smartphone, Copy, CheckCircle, Star, Plus, X } from "lucide-react"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"

interface AddressData {
  cep: string
  logradouro: string
  bairro: string
  localidade: string
  uf: string
}

interface CustomerData {
  name: string
  phone: string
  complement: string
  number: string
}

interface PixResponse {
  id: number
  status: string
  amount: number
  paymentMethod: string
  pix: {
    qrcode: string
    expirationDate: string
    end2EndId?: string
    receiptUrl?: string
  }
  customer: {
    name: string
    email: string
    phone: string
  }
  items: Array<{
    title: string
    quantity: number
    unitPrice: number
  }>
}

// Função para sanitizar inputs e prevenir XSS
const sanitizeInput = (input: string, allowSpaces: boolean = false): string => {
  // Remove tags HTML, scripts e caracteres perigosos
  let sanitized = input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/[<>'"]/g, '')
  
  // Se não permitir espaços, remove todos os espaços
  if (!allowSpaces) {
    sanitized = sanitized.replace(/\s+/g, '')
  } else {
    // Se permitir espaços, apenas normaliza espaços múltiplos para um único espaço
    sanitized = sanitized.replace(/\s{2,}/g, ' ')
  }
  
  // Não usar trim() para permitir espaços durante digitação
  return sanitized
}

// Função para validar se input contém código malicioso
const isInputSafe = (input: string): boolean => {
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /eval\(/i,
    /expression\(/i
  ]
  
  return !dangerousPatterns.some(pattern => pattern.test(input))
}

export default function CheckoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const productName = searchParams.get("product") || "Produto"
  
  // Capturar parâmetros UTM da URL ao carregar a página
  useEffect(() => {
    const utmParams = {
      src: searchParams.get('src'),
      sck: searchParams.get('sck'),
      utm_source: searchParams.get('utm_source'),
      utm_campaign: searchParams.get('utm_campaign'),
      utm_medium: searchParams.get('utm_medium'),
      utm_content: searchParams.get('utm_content'),
      utm_term: searchParams.get('utm_term')
    }
    
    // Salvar parâmetros UTM se existirem
    if (Object.values(utmParams).some(val => val !== null)) {
      localStorage.setItem('utm-params', JSON.stringify(utmParams))
    }
  }, [])

  const productPrices: { [key: string]: number } = {
    "Gás de cozinha 13 kg (P13)": 7120, // R$ 71,20 em centavos (era R$ 89,00 - 20%)
    "Gás de Cozinha 13kg": 7120, // R$ 71,20 em centavos (compatibilidade)
    "Água Mineral Indaiá 20L": 960, // R$ 9,60 em centavos (era R$ 12,00 - 20%)
    "Garrafão de água Mineral 20L": 1496, // R$ 14,96 em centavos (era R$ 18,70 - 20%)
    "Água Mineral Serragrande 20L": 960, // R$ 9,60 em centavos (era R$ 12,00 - 20%)
    "Botijão de Gás 8kg P8": 6000, // R$ 60,00 em centavos (era R$ 75,00 - 20%)
    "Botijão de Gás 8kg": 6000, // R$ 60,00 em centavos (compatibilidade)
    "3 Garrafões de Água 20L": 3976, // R$ 39,76 em centavos (era R$ 49,70 - 20%)
    "Combo 2 Botijões de Gás 13kg": 13600, // R$ 136,00 em centavos (era R$ 170,00 - 20%)
    "Combo Gás + Garrafão": 7920, // R$ 79,20 em centavos (era R$ 99,00 - 20%)
  }

  const [addressData, setAddressData] = useState<AddressData | null>(null)
  const [cep, setCep] = useState("")
  const [customerData, setCustomerData] = useState<CustomerData>({
    name: "",
    phone: "",
    complement: "",
    number: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [step, setStep] = useState(1) // 1: CEP, 2: Dados, 3: PIX
  const [pixData, setPixData] = useState<PixResponse | null>(null)
  const [pixLoading, setPixLoading] = useState(false)
  const [pixError, setPixError] = useState("")
  const [copied, setCopied] = useState(false)
  const [kitMangueira, setKitMangueira] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [currentToast, setCurrentToast] = useState("")
  const [conversionReported, setConversionReported] = useState(false)
  const [selectedWaterBrand, setSelectedWaterBrand] = useState("Naturágua")
  const [selectedGasBrand, setSelectedGasBrand] = useState("Liquigas")
  const [pixTimer, setPixTimer] = useState(900) // 15 minutos em segundos
  const [utmifySent, setUtmifySent] = useState({ pending: false, paid: false })
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null)
  const [showPixDiscountModal, setShowPixDiscountModal] = useState(false)
  const [pixDiscount, setPixDiscount] = useState(0)
  const [smsReminderSent, setSmsReminderSent] = useState(false)

  // Marcas de água disponíveis
  const waterBrands = [
    "Naturágua",
    "Indaiá", 
    "Serra Grande",
    "Límpida",
    "Santa Sofia",
    "Pacoti",
    "Marilia",
    "Neblina",
    "Sagrada",
    "Litoragua"
  ]

  // Marcas de gás disponíveis
  const gasBrands = [
    "Copagaz",
    "Nacional Gás",
    "Liquigas", 
    "Ultragas",
    "SupergasBras"
  ]

  // Dados dos reviews
  const reviews = [
    {
      name: "Maria Silva",
      rating: 5,
      comment: "Excelente serviço! Entrega super rápida e produto de qualidade. Recomendo!",
      image: "/reviews/review1.jpg",
      product: "Gás P13"
    },
    {
      name: "João Santos",
      rating: 5,
      comment: "Muito prático não precisar trocar o botijão. Chegou rapidinho e o entregador foi super educado.",
      image: "/reviews/reviewGasInstalado.jpg",
      product: "Gás P13 + Kit Mangueira"
    },
    {
      name: "Ana Costa",
      rating: 5,
      comment: "Adorei o combo! Veio tudo certinho e o preço é muito bom. Já virei cliente!",
      image: "/reviews/reviewcombo2Botijao.jpg",
      product: "Combo 2 Botijões"
    },
    {
      name: "Carlos Oliveira",
      rating: 5,
      comment: "Água mineral de excelente qualidade. Garrafões novos, sem precisar devolver. Perfeito!",
      image: "/reviews/review3garrafoes.jpg",
      product: "3 Garrafões"
    },
    {
      name: "Fernanda Lima",
      rating: 5,
      comment: "Serviço impecável! Em 25 minutos estava aqui. Super recomendo para quem quer praticidade.",
      image: "/reviews/review2.jpg",
      product: "Água Mineral"
    },
    {
      name: "Roberto Mendes",
      rating: 5,
      comment: "Finalmente um serviço que funciona! Gás novo, sem troca, entrega rápida. Nota 10!",
      image: "/reviews/review3.jpg",
      product: "Gás P13"
    }
  ]

  // Mensagens de toast para simular compras
  const toastMessages = [
    "Maria de Belo Horizonte acabou de comprar 1 Gás P13",
    "João de Contagem acabou de comprar o Combo 2 Botijões",
    "Ana de Betim acabou de comprar 3 Garrafões de Água",
    "Carlos de Nova Lima acabou de comprar 1 Garrafão de Água",
    "Fernanda de Sabará acabou de comprar o Combo Gás + Garrafão",
    "Roberto de Ribeirão das Neves acabou de comprar 1 Gás P8"
  ]

  useEffect(() => {
    // Verificar se já tem dados do CEP no localStorage
    const savedAddress = localStorage.getItem("unigas-address")
    if (savedAddress) {
      const parsedAddress = JSON.parse(savedAddress)
      setAddressData(parsedAddress)
      setCep(parsedAddress.cep)
      setStep(2)
    }
  }, [])

  // Toast de compras em tempo real
  useEffect(() => {
    const showRandomToast = () => {
      const randomMessage = toastMessages[Math.floor(Math.random() * toastMessages.length)]
      setCurrentToast(randomMessage)
      setShowToast(true)
      
      setTimeout(() => {
        setShowToast(false)
      }, 4000)
    }

    // Mostrar primeiro toast após 3 segundos
    const firstTimeout = setTimeout(showRandomToast, 3000)
    
    // Depois mostrar a cada 15-25 segundos
    const interval = setInterval(() => {
      showRandomToast()
    }, Math.random() * 10000 + 15000) // 15-25 segundos

    return () => {
      clearTimeout(firstTimeout)
      clearInterval(interval)
    }
  }, [])

  const fetchAddressData = async (cepValue: string) => {
    setLoading(true)
    setError("")

    try {
      const cleanCep = cepValue.replace(/\D/g, "")
      if (cleanCep.length !== 8) {
        setError("CEP deve ter 8 dígitos")
        return
      }

      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
      const data = await response.json()

      if (data.erro) {
        setError("CEP não encontrado")
        return
      }

      setAddressData(data)
      localStorage.setItem("unigas-address", JSON.stringify(data))
      setStep(2)
    } catch (err) {
      setError("Erro ao buscar CEP")
    } finally {
      setLoading(false)
    }
  }

  const handleCepSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await fetchAddressData(cep)
  }

  const handleCustomerDataSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (customerData.name && customerData.phone && customerData.number) {
      setStep(3)
      // Mostrar modal de desconto PIX
      setShowPixDiscountModal(true)
    }
  }
  
  const handleAcceptDiscount = () => {
    setShowPixDiscountModal(false)
    generatePix(true)
  }
  
  const handleDeclineDiscount = () => {
    setShowPixDiscountModal(false)
  }

  const generatePix = async (applyDiscount: boolean = false) => {
    setPixLoading(true)
    setPixError("")

    try {
      let totalPrice = getTotalPrice()
      let productPrice = productPrices[productName] || 1000
      let kitPrice = kitMangueira ? 980 : 0
      
      // Aplicar desconto de 10% se aceito
      if (applyDiscount) {
        const discount = Math.round(totalPrice * 0.10)
        setPixDiscount(discount)
        totalPrice = totalPrice - discount
        
        // Aplicar desconto proporcionalmente aos items
        productPrice = Math.round(productPrice * 0.90)
        if (kitMangueira) {
          kitPrice = Math.round(kitPrice * 0.90)
        }
      }
      
      let productTitle = productName
      
      if (isWaterProduct() && selectedWaterBrand) {
        productTitle = `${productName} - Marca: ${selectedWaterBrand}`
      } else if (isGasProduct() && selectedGasBrand) {
        productTitle = `${productName} - Marca: ${selectedGasBrand}`
      }
      
      // Adicionar informação de desconto no título se aplicado
      if (applyDiscount) {
        productTitle += " (10% desconto PIX)"
      }
        
      const items = [
        {
          title: productTitle,
          unitPrice: productPrice,
          tangible: true,
          quantity: 1,
        }
      ]

      // Adicionar kit mangueira se selecionado
      if (kitMangueira) {
        items.push({
          title: applyDiscount ? "Kit Mangueira para Gás (10% desconto PIX)" : "Kit Mangueira para Gás",
          unitPrice: kitPrice,
          tangible: true,
          quantity: 1,
        })
      }

      const requestData = {
        amount: totalPrice,
        paymentMethod: "pix",
        items: items,
        customer: {
          name: customerData.name,
          email: `${customerData.phone.replace(/\D/g, "")}@cliente.com`, // Email fictício baseado no telefone
          phone: customerData.phone.replace(/\D/g, ""),
          document: {
            number: "00000000000", // CPF fictício - você pode adicionar um campo para isso
            type: "cpf",
          },
        },
      }

      const response = await fetch("/api/generate-pix", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      })

      if (!response.ok) {
        throw new Error("Erro ao gerar PIX")
      }

      const pixResponse: PixResponse = await response.json()
      setPixData(pixResponse)
      
      // Reportar início de checkout para Google Ads
      reportCheckoutStart()
    } catch (err) {
      setPixError("Erro ao gerar PIX. Tente novamente.")
      console.error("Erro PIX:", err)
    } finally {
      setPixLoading(false)
    }
  }

  const copyPixCode = async () => {
    if (pixData?.pix?.qrcode) {
      try {
        await navigator.clipboard.writeText(pixData.pix.qrcode)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (err) {
        console.error("Erro ao copiar:", err)
      }
    }
  }

  const formatPrice = (priceInCents: number) => {
    return (priceInCents / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })
  }

  // Verificar se o produto é água
  const isWaterProduct = () => {
    return productName.toLowerCase().includes("água") || 
           productName.toLowerCase().includes("garrafão") ||
           productName.toLowerCase().includes("garrafões")
  }

  // Verificar se o produto é gás
  const isGasProduct = () => {
    return productName.toLowerCase().includes("gás") || 
           productName.toLowerCase().includes("botijão") ||
           productName.toLowerCase().includes("botijões")
  }

  // Calcular preço total incluindo kit mangueira
  const getTotalPrice = () => {
    const basePrice = productPrices[productName] || 1000
    const kitPrice = kitMangueira ? 980 : 0 // R$ 9,80 em centavos
    return basePrice + kitPrice
  }

  // Função para reportar início de checkout (quando gera PIX)
  const reportCheckoutStart = () => {
    if (typeof window === 'undefined' || !window.gtag) {
      console.error('❌ Google Tag não encontrado para início de checkout')
      return
    }
    
    try {
      console.log('🛒 Enviando conversão de início de checkout:', {
        send_to: 'AW-17545933033/dfuaCPPBjakbEOnhxq5B'
      })
      
      window.gtag('event', 'conversion', {
        'send_to': 'AW-17545933033/dfuaCPPBjakbEOnhxq5B'
      })
      
      console.log('✅ Conversão de início de checkout enviada!')
    } catch (error) {
      console.error('❌ Erro ao enviar conversão de início de checkout:', error)
    }
  }

  // Função para reportar conversão do Google Ads (quando paga)
  const reportConversion = (value: number, transactionId: string) => {
    console.log('🎯 Tentando reportar conversão Google Ads...')
    console.log('📊 Dados:', { value, transactionId, gtag: typeof window !== 'undefined' ? typeof window.gtag : 'undefined' })
    
    if (typeof window === 'undefined') {
      console.error('❌ Window não definido')
      return
    }
    
    if (!window.gtag) {
      console.error('❌ Google Tag (gtag) não encontrado! Verifique se o script está carregado.')
      console.log('📝 Scripts no head:', document.head.querySelectorAll('script[src*="googletagmanager"]').length)
      return
    }
    
    try {
      const conversionValue = value / 100; // Converter centavos para reais
      
      console.log('✅ Enviando conversão:', {
        send_to: 'AW-17545933033/08VqCI_Qj5obEOnhxq5B',
        value: conversionValue,
        currency: 'BRL',
        transaction_id: transactionId
      })
      
      // Enviar conversão principal
      window.gtag('event', 'conversion', {
        'send_to': process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION,
        'value': conversionValue,
        'currency': 'BRL',
        'transaction_id': transactionId
      });
      
      console.log('✅ Conversão Google Ads enviada com sucesso!')
      
      // Marcar que conversão foi reportada
      setConversionReported(true);
      
      // Também reportar como evento de purchase para GA4
      window.gtag('event', 'purchase', {
        'transaction_id': transactionId,
        'value': conversionValue,
        'currency': 'BRL',
        'items': [{
          'item_id': productName.replace(/\s+/g, '_').toLowerCase(),
          'item_name': productName,
          'price': conversionValue,
          'quantity': 1
        }]
      });
      
      console.log('✅ Evento purchase (GA4) enviado')
      
    } catch (error) {
      console.error('❌ Erro ao enviar conversão:', error)
    }
  }

  // Função para enviar SMS de lembrete
  const sendSmsReminder = async () => {
    if (smsReminderSent || !customerData.phone) return
    
    try {
      const message = "Unigas: Volte ao nosso site! O Motoboy ta esperando a confirmacao pra ir, e menos de 10minutos na sua porta."
      const cleanPhone = customerData.phone.replace(/\D/g, '')
      const apiKey = "6YYTL0R2P8VOAJYG2JUZF5QGAEAVX28BMR0C9LPMVKDCFYXDG4ERLTZGD8PJ3ZDCZV1K4O3X48CV4NTRJONIV7S0ZQVDL3ZVGEXKN1ALDQMPHT7XXD2Z75CZMXXPR2SL"
      
      console.log('📱 Enviando SMS de lembrete...', { phone: cleanPhone })
      
      const url = `https://api.smsdev.com.br/v1/send?key=${apiKey}&type=9&number=${cleanPhone}&msg=${encodeURIComponent(message)}`
      
      const response = await fetch(url, {
        method: 'GET'
      })
      
      const data = await response.json()
      
      console.log('✅ SMS enviado! Resposta:', data)
      
      // Salvar ID do SMS se retornou
      if (data.id) {
        console.log('📝 ID do SMS salvo:', data.id)
        // Você pode salvar no localStorage ou banco de dados
        localStorage.setItem(`sms_${pixData?.id}`, JSON.stringify({
          smsId: data.id,
          phone: cleanPhone,
          sentAt: new Date().toISOString()
        }))
      }
      
      setSmsReminderSent(true)
    } catch (error) {
      console.error('❌ Erro ao enviar SMS:', error)
    }
  }

  // Função para enviar dados ao UTMify
  const sendToUtmify = async (status: 'waiting_payment' | 'paid') => {
    console.log('🔵 sendToUtmify CHAMADO:', {
      status,
      pixDataId: pixData?.id,
      utmifySent,
      stack: new Error().stack
    })
    
    if (!pixData) return
    
    // Verificar se já foi enviado para evitar duplicatas
    if (status === 'waiting_payment' && utmifySent.pending) {
      console.log('⚠️ Status pending já foi enviado ao UTMify - BLOQUEADO')
      return
    }
    if (status === 'paid' && utmifySent.paid) {
      console.log('⚠️ Status paid já foi enviado ao UTMify - BLOQUEADO')
      return
    }
    
    try {
      // Recuperar parâmetros UTM salvos
      const utmParamsStr = localStorage.getItem('utm-params')
      const utmParams = utmParamsStr ? JSON.parse(utmParamsStr) : {}
      
      // Obter IP do usuário
      let userIp = '0.0.0.0'
      try {
        const ipResponse = await fetch('https://ipinfo.io/?token=32090226b9d116')
        const ipData = await ipResponse.json()
        userIp = ipData.ip
      } catch (e) {
        console.log('Erro ao obter IP:', e)
      }
      
      const utmifyData = {
        orderId: pixData.id.toString(),
        platform: "GasButano",
        paymentMethod: "pix",
        status: status,
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        approvedDate: status === 'paid' ? new Date().toISOString().replace('T', ' ').substring(0, 19) : null,
        refundedAt: null,
        customer: {
          name: customerData.name,
          email: pixData.customer.email,
          phone: customerData.phone.replace(/\D/g, ''),
          document: "00000000000",
          country: "BR",
          ip: userIp
        },
        products: pixData.items.map((item, index) => ({
          id: `product-${pixData.id}-${index}`,
          name: item.title,
          planId: null,
          planName: null,
          quantity: item.quantity,
          priceInCents: item.unitPrice
        })),
        trackingParameters: {
          src: utmParams.src || null,
          sck: utmParams.sck || null,
          utm_source: utmParams.utm_source || null,
          utm_campaign: utmParams.utm_campaign || null,
          utm_medium: utmParams.utm_medium || null,
          utm_content: utmParams.utm_content || null,
          utm_term: utmParams.utm_term || null
        },
        commission: {
          totalPriceInCents: pixData.amount,
          gatewayFeeInCents: Math.round(pixData.amount * 0.04),
          userCommissionInCents: Math.round(pixData.amount * 0.96)
        },
        isTest: process.env.NODE_ENV === 'development'
      }
      
      console.log('📤 ENVIANDO PARA UTMIFY:', {
        orderId: utmifyData.orderId,
        status: status,
        productName: utmifyData.products[0]?.name,
        timestamp: new Date().toISOString()
      })
      
      const response = await fetch('/api/send-to-utmify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(utmifyData)
      })
      
      if (response.ok) {
        console.log(`✅ Dados enviados ao UTMify - Status: ${status}`)
        setUtmifySent(prev => ({ ...prev, [status === 'waiting_payment' ? 'pending' : 'paid']: true }))
      } else {
        console.error('❌ Falha ao enviar para UTMify:', await response.text())
      }
    } catch (error) {
      console.error('Erro ao enviar para UTMify:', error)
    }
  }
  
  // Função para verificar status do pagamento
  const checkPaymentStatus = async () => {
    if (!pixData) return
    
    try {
      // Adicionar timestamp para evitar cache
      const timestamp = new Date().getTime()
      const response = await fetch(`/api/check-payment?id=${pixData.id}&_t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        
        
        // Atualizar status se mudou
        if (data.status !== pixData.status) {
          
          // Se pagamento foi aprovado, enviar para UTMify ANTES de atualizar estado
          if (data.status === 'paid' && !utmifySent.paid) {
            // Usar os dados atualizados da API BlackCat
            const updatedPixData = { ...pixData, status: 'paid' }
            setPixData(updatedPixData)
            
            // Enviar imediatamente para UTMify
            await sendToUtmify('paid')
          } else {
            // Apenas atualizar o estado para outros status
            setPixData(prev => prev ? { ...prev, status: data.status } : null)
          }
        }
      }
    } catch (error) {
      console.error('❌ Erro ao verificar status:', error)
    }
  }
  
  // Enviar pending para UTMify quando PIX for gerado
  useEffect(() => {
    if (pixData && pixData.status === 'waiting_payment' && !utmifySent.pending) {
      sendToUtmify('waiting_payment')
    }
  }, [pixData?.id, pixData?.status, utmifySent.pending])
  
  // Iniciar polling quando PIX for gerado
  useEffect(() => {
    if (pixData && pixData.status === 'waiting_payment') {
      console.log('🔄 Iniciando polling a cada 7 segundos...')
      
      // Iniciar polling a cada 7 segundos
      const interval = setInterval(() => {
        console.log('⏰ Verificando status do pagamento...')
        checkPaymentStatus()
      }, 7000)
      
      setPollingInterval(interval)
      
      // Limpar polling após 30 minutos
      const timeout = setTimeout(() => {
        console.log('⏱️ Timeout de 30 minutos atingido - parando polling')
        if (interval) clearInterval(interval)
      }, 30 * 60 * 1000)
      
      return () => {
        console.log('🛑 Limpando polling')
        clearInterval(interval)
        clearTimeout(timeout)
      }
    } else if (pixData && pixData.status === 'paid') {
      // Parar polling se pagamento foi confirmado
      console.log('✅ Pagamento confirmado - parando polling')
      if (pollingInterval) {
        clearInterval(pollingInterval)
        setPollingInterval(null)
      }
    }
  }, [pixData?.id, pixData?.status])
  
  // Agendar envio de SMS após 5 minutos se não pagar
  useEffect(() => {
    if (pixData && pixData.status === 'waiting_payment' && !smsReminderSent) {
      console.log('⏰ Agendando SMS de lembrete para 5 minutos...')
      
      const smsTimeout = setTimeout(() => {
        console.log('📱 5 minutos passados, verificando se ainda está aguardando pagamento...')
        if (pixData.status === 'waiting_payment') {
          sendSmsReminder()
        }
      }, 5 * 60 * 1000) // 5 minutos
      
      return () => {
        clearTimeout(smsTimeout)
      }
    }
  }, [pixData?.id, pixData?.status, smsReminderSent])
  
  // Monitorar mudanças no status do pagamento para Google Ads
  useEffect(() => {
    if (pixData && pixData.status === 'paid' && !conversionReported) {
      const totalPrice = getTotalPrice();
      reportConversion(totalPrice, pixData.id.toString());
    }
  }, [pixData?.status, productName, kitMangueira, conversionReported])

  // Timer de 15 minutos para desconto PIX
  useEffect(() => {
    if (step === 3 && !pixData && pixTimer > 0) {
      const timer = setInterval(() => {
        setPixTimer(prev => prev > 0 ? prev - 1 : 0)
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [step, pixData, pixTimer])

  // Formatar timer
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-100">
        <div className="container mx-auto px-4 py-3 sm:py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-orange-500 p-2 sm:px-3"
          >
            <ArrowLeft size={18} />
            <span className="hidden sm:inline">Voltar</span>
          </Button>
          <img
            src="https://unigaseagua.com.br/wp-content/uploads/2025/02/unigas-com-letras-NORMAIS.png"
            alt="Unigas e Água"
            className="h-6 sm:h-8 w-auto"
          />
          <div className="w-16 sm:w-20"></div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-2xl">
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-6 sm:mb-8">
          <div className="flex items-center space-x-2 sm:space-x-4">
            <div
              className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold ${
                step >= 1 ? "bg-orange-500 text-white" : "bg-gray-200 text-gray-500"
              }`}
            >
              1
            </div>
            <div className={`w-8 sm:w-16 h-1 ${step >= 2 ? "bg-orange-500" : "bg-gray-200"}`}></div>
            <div
              className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold ${
                step >= 2 ? "bg-orange-500 text-white" : "bg-gray-200 text-gray-500"
              }`}
            >
              2
            </div>
            <div className={`w-8 sm:w-16 h-1 ${step >= 3 ? "bg-orange-500" : "bg-gray-200"}`}></div>
            <div
              className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold ${
                step >= 3 ? "bg-orange-500 text-white" : "bg-gray-200 text-gray-500"
              }`}
            >
              3
            </div>
          </div>
        </div>

        {/* Product Info */}
        <Card className="mb-4 sm:mb-6">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-center text-lg sm:text-xl text-gray-800">
              Finalizando compra:
              <div className="text-sm sm:text-base font-normal text-gray-600 mt-1">{productName}</div>
              <div className="text-xl sm:text-2xl font-bold text-orange-500 mt-2">
                {formatPrice(getTotalPrice())}
              </div>
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Step 1: CEP */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-orange-500" />
                Confirme seu CEP
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCepSubmit} className="space-y-4">
                <div>
                  <Input
                    type="text"
                    placeholder="Digite seu CEP (ex: 12345-678)"
                    value={cep}
                    onChange={(e) => setCep(formatCep(e.target.value))}
                    className="text-center text-lg"
                    maxLength={9}
                  />
                  {error && <p className="text-red-500 text-sm text-center mt-2">{error}</p>}
                </div>
                <Button
                  type="submit"
                  disabled={loading || cep.length < 9}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                >
                  {loading ? "Verificando..." : "Confirmar CEP"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Customer Data */}
        {step === 2 && addressData && (
          <div className="space-y-4 sm:space-y-6">
            {/* Address Confirmation */}
            <Card>
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                  Endereço Confirmado
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
                  <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-gray-700">
                    <p>
                      <strong>CEP:</strong> {addressData.cep}
                    </p>
                    <p>
                      <strong>Rua:</strong> {addressData.logradouro}
                    </p>
                    <p>
                      <strong>Bairro:</strong> {addressData.bairro}
                    </p>
                    <p>
                      <strong>Cidade:</strong> {addressData.localidade} - {addressData.uf}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-3 sm:mt-4 p-2 sm:p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 flex-shrink-0" />
                    <p className="text-xs sm:text-sm text-orange-800 font-semibold">Entrega em até 30 minutos!</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Customer Data Form */}
            <Card>
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="text-base sm:text-lg">Confirme seus dados para entrega</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <form onSubmit={handleCustomerDataSubmit} className="space-y-3 sm:space-y-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                      Nome completo *
                    </label>
                    <Input
                      type="text"
                      placeholder="Seu nome completo"
                      value={customerData.name}
                      onChange={(e) => {
                        const value = sanitizeInput(e.target.value, true) // Permitir espaços no nome
                        if (isInputSafe(value)) {
                          setCustomerData({ ...customerData, name: value })
                        }
                      }}
                      className="text-sm sm:text-base"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                      Telefone/WhatsApp *
                    </label>
                    <Input
                      type="text"
                      placeholder="(31) 99999-9999"
                      value={customerData.phone}
                      onChange={(e) => {
                        const value = sanitizeInput(e.target.value)
                        if (isInputSafe(value)) {
                          setCustomerData({ ...customerData, phone: formatPhone(value) })
                        }
                      }}
                      className="text-sm sm:text-base"
                      maxLength={15}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                        Número *
                      </label>
                      <Input
                        type="text"
                        placeholder="123"
                        value={customerData.number}
                        onChange={(e) => {
                          const value = sanitizeInput(e.target.value)
                          if (isInputSafe(value)) {
                            setCustomerData({ ...customerData, number: value })
                          }
                        }}
                        className="text-sm sm:text-base"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-500 mb-1 sm:mb-2">
                        Complemento (opcional)
                      </label>
                      <Input
                        type="text"
                        placeholder="Apto 101"
                        value={customerData.complement}
                        onChange={(e) => {
                          const value = sanitizeInput(e.target.value)
                          if (isInputSafe(value)) {
                            setCustomerData({ ...customerData, complement: value })
                          }
                        }}
                        className="text-sm sm:text-base"
                      />
                    </div>
                  </div>

                  {/* Seleção de Marca de Gás */}
                  {isGasProduct() && (
                    <div className="border border-orange-200 rounded-lg p-4 bg-orange-50">
                      <h4 className="font-bold text-orange-800 text-sm mb-2">🔥 Marca pré-selecionada: <span className="text-green-600">Liquigas</span> (Melhor preço do dia)</h4>
                      <p className="text-xs text-gray-600 mb-3">Você pode alterar se preferir outra marca:</p>
                      <select
                        value={selectedGasBrand}
                        onChange={(e) => setSelectedGasBrand(e.target.value)}
                        className="w-full p-2 border border-orange-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      >
                        {gasBrands.map((brand) => (
                          <option key={brand} value={brand}>
                            {brand}
                          </option>
                        ))}
                      </select>
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-xs text-green-800 leading-relaxed mb-2">
                          <strong>📞 Nosso motoboy irá ligar para confirmar a escolha do cliente, não se preocupe que não terá taxas, é bem prático e rápido.</strong>
                        </p>
                        <p className="text-xs text-green-700 leading-relaxed mb-2">
                          🚀 <strong>Ao gerar o PIX, o motoboy mais próximo já recebe uma notificação e já fica no aguardo.</strong> Quando pagamento é concluído ele já aceita seu pedido e informamos o seu número pra ele te ligar e confirmar o pedido.
                        </p>
                        <p className="text-xs text-green-700 leading-relaxed">
                          🏢 <strong>Temos Centrais de distribuição na maioria das cidades e bairros :)</strong> Estamos pertinho de vocês. Trabalhamos em parceria com a maioria das empresas fornecedoras de gás a nível nacional.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Seleção de Marca de Água */}
                  {isWaterProduct() && (
                    <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                      <h4 className="font-bold text-blue-800 text-sm mb-2">💧 Marca pré-selecionada: <span className="text-green-600">Naturágua</span> (Melhor preço do dia)</h4>
                      <p className="text-xs text-gray-600 mb-3">Você pode alterar se preferir outra marca:</p>
                      <select
                        value={selectedWaterBrand}
                        onChange={(e) => setSelectedWaterBrand(e.target.value)}
                        className="w-full p-2 border border-blue-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {waterBrands.map((brand) => (
                          <option key={brand} value={brand}>
                            {brand}
                          </option>
                        ))}
                      </select>
                      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-xs text-yellow-800 leading-relaxed">
                          <strong>📞 Se você quer outra marca que não esteja aqui, não se preocupa que nosso motoboy vai te ligar e confirmar o pedido assim que seu pagamento for aprovado ok?</strong>
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Order Bump - Kit Mangueira */}
                  {isGasProduct() && (
                    <div className="border-2 border-dashed border-orange-300 rounded-lg p-4 bg-orange-50">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          <img 
                            src="/images/kitmangueira.png" 
                            alt="Kit Mangueira" 
                            className="w-16 h-16 object-contain"
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Plus className="w-4 h-4 text-orange-600" />
                            <h4 className="font-bold text-orange-800 text-sm">Oferta Especial!</h4>
                          </div>
                          <p className="text-xs text-gray-700 mb-3 leading-relaxed">
                            <strong>Quer incluir um kit mangueira pro seu gás por um preço simbólico?</strong> 
                            Assim você já faz um upgrade no seu lar, na sua cozinha e se sente mais seguro(a) 
                            utilizando tudo novo. Não se preocupe que nosso entregador já faz a instalação 
                            rapidinho e deixa tudo pronto pra você tá?
                          </p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id="kit-mangueira"
                                checked={kitMangueira}
                                onChange={(e) => setKitMangueira(e.target.checked)}
                                className="w-4 h-4 text-orange-600 border-orange-300 rounded focus:ring-orange-500"
                              />
                              <label htmlFor="kit-mangueira" className="text-sm font-medium text-gray-700">
                                Sim, quero o Kit Mangueira
                              </label>
                            </div>
                            <div className="text-right">
                              <span className="text-xs text-gray-500 line-through">R$ 25,00</span>
                              <div className="text-sm font-bold text-orange-600">R$ 9,80</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Depoimento antes do botão */}
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0">
                        <div className="flex text-yellow-500 text-xs">
                          ⭐⭐⭐⭐⭐
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-700 italic leading-relaxed">
                          "Paguei e em 15 min o gás chegou. Super rápido!"
                        </p>
                        <p className="text-xs text-gray-500 mt-1">— Maria S.</p>
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 sm:py-3 text-sm sm:text-base"
                    disabled={
                      !customerData.name || 
                      !customerData.phone || 
                      !customerData.number
                    }
                  >
                    Continuar para Pagamento
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 3: Payment */}
        {step === 3 && (
          <Card>
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
                Pagamento via PIX
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-4 sm:space-y-6">
              {/* Order Summary */}
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                <h3 className="font-semibold text-gray-800 mb-2 sm:mb-3 text-sm sm:text-base">Resumo do Pedido</h3>
                <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm">
                  <div className="flex justify-between">
                    <span>Produto:</span>
                    <span className="font-medium text-right max-w-[60%]">
                      {productName}
                      {isWaterProduct() && selectedWaterBrand && (
                        <div className="text-xs text-blue-600 mt-1">
                          Marca: {selectedWaterBrand}
                        </div>
                      )}
                      {isGasProduct() && selectedGasBrand && (
                        <div className="text-xs text-orange-600 mt-1">
                          Marca: {selectedGasBrand}
                        </div>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Valor:</span>
                    <span className="font-bold text-orange-500 text-sm sm:text-lg">
                      {formatPrice(productPrices[productName] || 1000)}
                    </span>
                  </div>
                  {kitMangueira && (
                    <div className="flex justify-between">
                      <span>Kit Mangueira:</span>
                      <span className="font-bold text-orange-500 text-sm sm:text-lg">
                        {formatPrice(980)}
                      </span>
                    </div>
                  )}
                  {pixDiscount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Desconto PIX (10%):</span>
                      <span className="font-bold">
                        -{formatPrice(pixDiscount)}
                      </span>
                    </div>
                  )}
                  {(kitMangueira || pixDiscount > 0) && (
                    <div className="flex justify-between border-t pt-2 mt-2">
                      <span className="font-bold">Total:</span>
                      <span className="font-bold text-orange-500 text-lg">
                        {formatPrice(getTotalPrice() - pixDiscount)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Cliente:</span>
                    <span className="font-medium text-right max-w-[60%]">{customerData.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Telefone:</span>
                    <span className="font-medium">{customerData.phone}</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span>Endereço:</span>
                    <span className="font-medium text-right max-w-[60%] text-xs sm:text-sm">
                      {addressData?.logradouro}, {customerData.number}
                      <br />
                      {addressData?.bairro} - {addressData?.localidade}/{addressData?.uf}
                    </span>
                  </div>
                </div>
              </div>

              {/* Elementos de Segurança e Urgência */}
              {!pixData || (pixData && pixData.status === 'waiting_payment') ? (
                <div className="space-y-4">
                  {/* Segurança do Pagamento */}
                  <div className="rounded-md border p-3 bg-green-50 text-sm text-gray-700">
                    <p className="mb-1">✅ <strong>Pagamento seguro via Pix (Banco Central)</strong></p>
                    <p>⚡ Confirmação imediata — o motoboy recebe seu pedido automaticamente.</p>
                  </div>

                  {/* CNPJ e Razão Social */}
                  <div className="text-center text-xs text-gray-600 border-t border-b py-2">
                    <p><strong>Pagamento para:</strong> CENTRAL DE TRANSACOES IMEDIATAS</p>
                    <p>CNPJ: 60.941.690/0001-05</p>
                  </div>

                  {/* Timer de Urgência */}
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                    <p className="text-red-600 font-semibold text-sm mb-1">
                      💥 Desconto Pix ativo por <span className="text-lg font-bold">{formatTimer(pixTimer)}</span> minutos
                    </p>
                    <p className="text-xs text-red-500">
                      Pagamento rápido garante entrega em até 30 min.
                    </p>
                  </div>

                  {/* Depoimento */}
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0">
                        <div className="flex text-yellow-500 text-xs">⭐⭐⭐⭐⭐</div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-700 italic">"Chegou em 12 minutos! Muito rápido e prático."</p>
                        <p className="text-xs text-gray-500 mt-1">— João P.</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {!pixData ? (
                <div className="text-center">
                  {pixLoading && (
                    <div className="flex items-center justify-center gap-3 py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                      <span className="text-green-600 font-semibold">Gerando PIX com desconto...</span>
                    </div>
                  )}
                  {pixError && <p className="text-red-500 text-xs sm:text-sm mt-3">{pixError}</p>}
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
                    <div className="flex items-center gap-2 mb-2 sm:mb-3">
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                      <h3 className="font-semibold text-green-800 text-sm sm:text-base">PIX Gerado com Sucesso!</h3>
                    </div>

                    {/* QR Code - Mostrar apenas se pagamento ainda não foi confirmado */}
                    {pixData.pix?.qrcode && pixData.status !== "paid" && (
                      <div className="text-center mb-3 sm:mb-4">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(pixData.pix.qrcode)}`}
                          alt="QR Code PIX"
                          className="mx-auto w-36 h-36 sm:w-48 sm:h-48 border rounded-lg bg-white p-2"
                        />
                        <p className="text-xs sm:text-sm text-gray-600 mt-2">Escaneie o QR Code com seu app do banco</p>
                      </div>
                    )}

                    {/* PIX Code - Mostrar apenas se pagamento ainda não foi confirmado */}
                    {pixData.pix?.qrcode && pixData.status !== "paid" && (
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                          Ou copie o código PIX:
                        </label>
                        <div className="flex gap-2">
                          <Input value={pixData.pix.qrcode} readOnly className="font-mono text-xs flex-1 min-w-0" />
                          <Button
                            onClick={copyPixCode}
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-1 bg-transparent px-2 sm:px-3 flex-shrink-0"
                          >
                            {copied ? (
                              <>
                                <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                                <span className="hidden sm:inline">Copiado!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3 sm:w-4 sm:h-4" />
                                <span className="hidden sm:inline">Copiar</span>
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <p className="text-xs sm:text-sm text-orange-800">
                        <strong>Valor:</strong> {formatPrice(pixData.amount)}
                      </p>
                      {pixData.pix?.expirationDate && (
                        <p className="text-xs sm:text-sm text-orange-800">
                          <strong>Válido até:</strong>{" "}
                          {new Date(pixData.pix.expirationDate).toLocaleDateString("pt-BR")}
                        </p>
                      )}
                      <p className="text-xs sm:text-sm text-orange-800">
                        <strong>Status:</strong>{" "}
                        {pixData.status === "waiting_payment" ? "Aguardando pagamento" : pixData.status}
                      </p>
                      
                      {/* Indicador de verificação automática */}
                      {pixData.status === "waiting_payment" && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-blue-700">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                          <span>Verificando pagamento automaticamente...</span>
                        </div>
                      )}
                      
                      {/* Status UTMify */}
                      {(utmifySent.pending || utmifySent.paid) && (
                        <div className="mt-2 text-xs text-gray-600">
                          {utmifySent.pending && <p>📊 Pedido registrado no sistema</p>}
                          {utmifySent.paid && <p>✅ Pagamento confirmado no sistema</p>}
                        </div>
                      )}
                      
                      {pixData.status === "paid" && (
                        <div className="mt-3 p-3 sm:p-4 bg-green-100 border-2 border-green-400 rounded-lg">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 text-2xl">🏍️</div>
                            <div>
                              <p className="text-sm sm:text-base text-green-800 font-bold mb-2">
                                ✅ Pagamento Confirmado!
                              </p>
                              <p className="text-xs sm:text-sm text-green-700 leading-relaxed">
                                Agora só aguardar a ligação do nosso Motoboy ok? É rapidinho! Estamos com uma grande quantidade de pedidos mas leva de 2 a 5 minutos.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-center">
                    <p className="text-xs sm:text-sm text-gray-600">
                      Após o pagamento, seu pedido será processado automaticamente.
                      <br />
                      <strong>Entrega em até 30 minutos!</strong>
                    </p>
                    
                    {/* Botão de teste - remover em produção */}
                    {process.env.NODE_ENV === 'development' && pixData.status === "waiting_payment" && (
                      <Button
                        onClick={() => setPixData(prev => prev ? {...prev, status: 'paid'} : null)}
                        variant="outline"
                        className="mt-4 text-xs border-green-500 text-green-600 hover:bg-green-50"
                      >
                        🧪 Simular Pagamento (DEV)
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Reviews Section */}
        <div className="mt-8 mb-6">
          <div className="text-center mb-6">
            <h3 className="text-lg font-bold text-gray-800 mb-2">
              📸 Não se esqueça de quando receber voltar aqui pra nos avaliar tá?
            </h3>
            <p className="text-sm text-gray-600">
              Mande aquela foto, veja o que nossos clientes falam 👇
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reviews.map((review, index) => (
              <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <img 
                    src={review.image} 
                    alt={`Review de ${review.name}`}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-sm text-gray-800">{review.name}</h4>
                      <div className="flex">
                        {[...Array(review.rating)].map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-blue-600 font-medium mb-2">{review.product}</p>
                    <p className="text-xs text-gray-600 leading-relaxed">{review.comment}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Toast de Compras */}
        {showToast && (
          <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50">
            <div className="bg-green-500 text-white p-3 rounded-lg shadow-lg flex items-center gap-3 animate-slide-up">
              <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">🔥 Compra Realizada!</p>
                <p className="text-xs opacity-90">{currentToast}</p>
              </div>
              <button 
                onClick={() => setShowToast(false)}
                className="text-white hover:text-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Modal de Desconto PIX */}
      {showPixDiscountModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-100">
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 rounded-full mb-3">
                <span className="text-3xl">💳</span>
                <span className="text-3xl text-red-500 ml-1">✕</span>
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">
                Aviso Importante
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                No momento, infelizmente, só estamos aceitando <strong className="text-blue-600">PIX</strong> por inconsistência na cobrança de cartão.
              </p>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🎁</span>
                <h4 className="font-bold text-green-800 text-sm">Desconto Especial!</h4>
              </div>
              <p className="text-green-700 text-sm leading-relaxed">
                Como forma de compensação, estamos oferecendo <strong className="text-base text-green-600">10% de desconto</strong> no pagamento via PIX!
              </p>
            </div>
            
            <div className="space-y-2">
              <Button
                onClick={handleAcceptDiscount}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-base font-semibold rounded-xl shadow-md hover:shadow-lg transition-all"
              >
                ✅ Aceitar Desconto e Continuar
              </Button>
              
              <Button
                onClick={handleDeclineDiscount}
                variant="outline"
                className="w-full border-gray-300 text-gray-600 hover:bg-gray-50 py-3 rounded-xl"
              >
                ✕ Não Aceitar
              </Button>
            </div>
            
            <p className="text-xs text-gray-400 text-center mt-3">
              Estamos trabalhando para resolver o problema ocorrido.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// Funções auxiliares
const formatCep = (value: string) => {
  const cleanValue = value.replace(/\D/g, "")
  if (cleanValue.length <= 8) {
    return cleanValue.replace(/(\d{5})(\d{3})/, "$1-$2")
  }
  return value
}

const formatPhone = (value: string) => {
  const cleanValue = value.replace(/\D/g, "")
  if (cleanValue.length <= 11) {
    return cleanValue.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")
  }
  return value
}
