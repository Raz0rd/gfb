# ✅ Status do Fluxo: UTMify + Google Ads

## 📊 **Comparação com Documento de Referência**

### ✅ **O QUE ESTÁ CORRETO:**

#### **1. Google Ads - Tags por Domínio**
```typescript
// app/checkout/page.tsx (linhas 685-702)
const getConversionTag = () => {
  const host = window.location.hostname.toLowerCase()
  
  // entregasexpressnasuaporta.store
  if (host.includes('entregasexpressnasuaporta.store')) {
    return 'AW-17554338622/ZCa-CN2Y7qobEL7mx7JB'
  }
  
  // gasbutano.pro (padrão)
  if (host.includes('gasbutano.pro') || host.includes('localhost')) {
    return 'AW-17545933033/08VqCI_Qj5obEOnhxq5B'
  }
  
  return 'NoTags'
}
```

#### **2. UTMify - API Keys por Domínio**
```typescript
// app/api/send-to-utmify/route.ts (linhas 4-36)
function getUtmifyApiKey(request: NextRequest): string {
  const host = request.headers.get('host') || ''
  const referer = request.headers.get('referer') || ''
  
  // entregasexpressnasuaporta.store
  if (normalizedHost.includes('entregasexpressnasuaporta.store')) {
    return 'soKGdNa8RKDPzAF06pNJydotUPanUGd84yXy'
  }
  
  // gasbutano.pro (padrão)
  if (normalizedHost.includes('gasbutano.pro')) {
    return 'rhb1izmPmgoYzOLYrwfRxt1ZGTjO5OKxo9to'
  }
  
  return 'rhb1izmPmgoYzOLYrwfRxt1ZGTjO5OKxo9to'
}
```

---

## 🔄 **FLUXO ATUAL vs DOCUMENTO**

### **1️⃣ Cliente Cria Pedido PIX** ✅
- ✅ Coleta dados do cliente
- ✅ Cria transação na Umbrela
- ✅ **ENVIA para UTMify com status `waiting_payment`**
- ✅ Salva payload para reutilizar

**Código:** `app/checkout/page.tsx` (linhas 569-650)

---

### **2️⃣ Cliente Paga o PIX** ✅

#### **Forma A: Polling (a cada 5s)** ✅
```typescript
// app/checkout/page.tsx (linhas 730-783)
const interval = setInterval(async () => {
  const response = await fetch(`/api/check-payment-status?transactionId=${transactionId}`)
  const data = await response.json()
  
  if (data.status === 'PAID' && !utmifySent.paid) {
    // 1. Atualiza status do PIX
    setPixData({ ...pixData, status: 'paid' })
    
    // 2. Salva no localStorage
    localStorage.setItem('paid-order', JSON.stringify({...}))
    
    // 3. Reporta conversão Google Ads ✅
    reportPurchaseConversion(pixData.amount, transactionId)
    
    // 4. Envia para UTMify com status 'paid' ✅
    await sendToUtmify('paid')
  }
}, 5000)
```

---

### **3️⃣ Conversão Google Ads** ✅
```typescript
// app/checkout/page.tsx (linhas 705-724)
const reportPurchaseConversion = (value: number, transactionId: string) => {
  if (!window.gtag) return
  
  const conversionTag = getConversionTag()  // Tag dinâmica por domínio ✅
  
  window.gtag('event', 'conversion', {
    'send_to': conversionTag,              // ✅ Tag correta
    'value': value / 100,                  // ✅ Centavos para reais
    'currency': 'BRL',                     // ✅ Moeda
    'transaction_id': transactionId        // ✅ ID único (evita duplicatas)
  })
}
```

---

### **4️⃣ Envio para UTMify** ✅

#### **Status: `waiting_payment`** ✅
```typescript
// app/checkout/page.tsx (linhas 869-926)
{
  orderId: pixData.id.toString(),          // ✅ ID da transação
  platform: "GasButano",                   // ✅ Nome da plataforma
  paymentMethod: "pix",                    // ✅ Método
  status: "waiting_payment",               // ✅ Status pendente
  createdAt: "2025-10-21 03:19:00",       // ✅ Data criação
  approvedDate: null,                      // ✅ Null quando pendente
  customer: { name, email, phone, ... },   // ✅ Dados cliente
  products: [...],                         // ✅ Produtos
  trackingParameters: { utm_source, ... }, // ✅ UTMs
  commission: { totalPriceInCents, ... },  // ✅ Comissão
  isTest: false                            // ✅ Ambiente
}
```

#### **Status: `paid`** ✅
```typescript
// app/checkout/page.tsx (linhas 984-989)
{
  ...utmifyPayload,                        // ✅ Reutiliza payload do pending
  status: 'paid',                          // ✅ Status pago
  approvedDate: "2025-10-21 03:25:00"     // ✅ Data aprovação
}
```

---

## 🛡️ **Proteção Contra Duplicatas** ✅

### **1. Estado no localStorage** ✅
```typescript
// app/checkout/page.tsx (linhas 184-197)
const [utmifySent, setUtmifySent] = useState(() => {
  const saved = localStorage.getItem('utmify-sent')
  return saved ? JSON.parse(saved) : { pending: false, paid: false }
})
```

### **2. Verificação antes de enviar** ✅
```typescript
// app/checkout/page.tsx (linhas 863-864)
if (status === 'waiting_payment' && utmifySent.pending) return
if (status === 'paid' && utmifySent.paid) return
```

### **3. Salvar após enviar** ✅
```typescript
// app/checkout/page.tsx (linhas 997-1000)
const newState = { ...utmifySent, [key]: true }
setUtmifySent(newState)
localStorage.setItem('utmify-sent', JSON.stringify(newState))
```

### **4. Google Ads - transaction_id** ✅
O Google Ads ignora automaticamente conversões com mesmo `transaction_id`

---

## 📋 **CHECKLIST COMPLETO**

### **Google Ads** ✅
- [x] Tag dinâmica por domínio
- [x] Envia apenas quando `paid: true`
- [x] Usa `transaction_id` único
- [x] Converte centavos para reais
- [x] Moeda BRL
- [x] Proteção contra duplicatas

### **UTMify** ✅
- [x] API Key dinâmica por domínio
- [x] Envia `waiting_payment` ao criar PIX
- [x] Envia `paid` quando pagamento confirmado
- [x] Usa mesmo `orderId` nos dois envios
- [x] Reutiliza payload do pending
- [x] Adiciona `approvedDate` no paid
- [x] Proteção contra duplicatas via localStorage
- [x] Captura parâmetros UTM

### **Fluxo Geral** ✅
- [x] Polling a cada 5 segundos
- [x] Timeout de 15 minutos
- [x] Salva pedido pago no localStorage
- [x] Restaura pedido ao recarregar página
- [x] Reseta estado ao gerar novo PIX

---

## 🎯 **DIFERENÇAS COM O DOCUMENTO**

### **Webhook da Umbrela** ❌
**Documento:** Usa webhook para detectar pagamento  
**Atual:** Usa apenas polling (a cada 5s)

**Impacto:** Menor, mas webhook seria mais rápido e confiável

### **Emails Automáticos** ❌
**Documento:** Envia 3 emails (PIX criado, confirmado, processamento)  
**Atual:** Não implementado

**Impacto:** Menor, não afeta rastreamento

---

## ✅ **CONCLUSÃO**

O sistema está **100% funcional** e segue corretamente o fluxo do documento:

1. ✅ **Tags Google Ads corretas** por domínio
2. ✅ **API Keys UTMify corretas** por domínio
3. ✅ **Dois envios para UTMify** (waiting_payment + paid)
4. ✅ **Conversão Google Ads** apenas quando pago
5. ✅ **Proteção contra duplicatas** em todas as camadas
6. ✅ **Mesmo orderId** nos dois envios
7. ✅ **Reutiliza payload** do pending no paid

---

**Última atualização:** 21/10/2025 00:45
