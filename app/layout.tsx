import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter'
})

export const metadata: Metadata = {
  title: 'Configás - Gás e Água na sua Porta',
  description: 'Entrega rápida de gás e água mineral em até 30 minutos',
  generator: 'v0.app',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        {/* Google tag (gtag.js) - Dinâmico por domínio */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Detectar domínio e definir tag correta
              var host = window.location.hostname.toLowerCase();
              var googleAdsId = 'AW-TESTE'; // Fallback
              
              if (host.includes('entregasexpressnasuaporta.store')) {
                googleAdsId = 'AW-17554338622';
              } else if (host.includes('gasbutano.pro')) {
                googleAdsId = 'AW-17545933033';
              } else if (host.includes('localhost') || host === '127.0.0.1') {
                googleAdsId = 'AW-TESTE';
              }
              
              // Carregar script do Google Ads
              var script = document.createElement('script');
              script.async = true;
              script.src = 'https://www.googletagmanager.com/gtag/js?id=' + googleAdsId;
              document.head.appendChild(script);
              
              // Inicializar gtag
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', googleAdsId);
            `,
          }}
        />
        
        {/* UTMify Pixel - Apenas se configurado */}
        {process.env.NEXT_PUBLIC_UTMIFY_PIXEL_ID && (
          <>
            <script
              src="https://cdn.utmify.com.br/scripts/utms/latest.js"
              data-utmify-prevent-xcod-sck
              data-utmify-prevent-subids
              async
              defer
            ></script>
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  window.pixelId = "${process.env.NEXT_PUBLIC_UTMIFY_PIXEL_ID}";
                  var a = document.createElement("script");
                  a.setAttribute("async", "");
                  a.setAttribute("defer", "");
                  a.setAttribute("src", "https://cdn.utmify.com.br/scripts/pixel/pixel.js");
                  document.head.appendChild(a);
                `,
              }}
            />
          </>
        )}
      </head>
      <body className={`${inter.className} antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
