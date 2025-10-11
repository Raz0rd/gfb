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
        {/* Google tag (gtag.js) */}
        <script async src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_ID}`}></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_ID}');
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
