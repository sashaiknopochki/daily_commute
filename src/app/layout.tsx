import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BVG Board",
  description: "Personal transit disruption dashboard",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black",
    title: "BVG Board",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
// globalThis polyfill (iOS < 12.1)
if(typeof globalThis==="undefined"){var globalThis=window;}
// queueMicrotask polyfill (iOS < 14)
if(typeof queueMicrotask==="undefined"){window.queueMicrotask=function(fn){Promise.resolve().then(fn);};}
// Promise.allSettled polyfill (iOS < 13)
if(typeof Promise!=="undefined"&&!Promise.allSettled){Promise.allSettled=function(ps){return Promise.all(ps.map(function(p){return Promise.resolve(p).then(function(v){return{status:"fulfilled",value:v};},function(r){return{status:"rejected",reason:r};});}));};}
// structuredClone polyfill (iOS < 15.4)
if(typeof structuredClone==="undefined"){window.structuredClone=function(obj){return JSON.parse(JSON.stringify(obj));};}
            `.trim(),
          }}
        />
      </head>
      <body className={`${inter.className} antialiased min-h-screen bg-white text-black`}>
        {children}
      </body>
    </html>
  );
}
