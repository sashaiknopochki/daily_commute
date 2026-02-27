import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en" className="dark">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
// --- Polyfills for iOS 12 (Safari 12) ---
// globalThis (iOS < 12.1)
if(typeof globalThis==="undefined"){var globalThis=window;}
// queueMicrotask (iOS < 14)
if(typeof queueMicrotask==="undefined"){window.queueMicrotask=function(fn){Promise.resolve().then(fn);};}
// Promise.allSettled (iOS < 13)
if(typeof Promise!=="undefined"&&!Promise.allSettled){Promise.allSettled=function(ps){return Promise.all(ps.map(function(p){return Promise.resolve(p).then(function(v){return{status:"fulfilled",value:v};},function(r){return{status:"rejected",reason:r};});}));};}
// structuredClone (iOS < 15.4)
if(typeof structuredClone==="undefined"){window.structuredClone=function(obj){return JSON.parse(JSON.stringify(obj));};}
// Array/String.prototype.at (iOS < 15.4) — used by Next.js router
if(!Array.prototype.at){Array.prototype.at=function(i){var n=Math.trunc(i)||0;return n<0?this[this.length+n]:this[n];};}
if(!String.prototype.at){String.prototype.at=function(i){var n=Math.trunc(i)||0;return n<0?this[this.length+n]:this[n];};}
// --- Device ID cookie bootstrap ---
// If no device_id cookie yet, read from localStorage (migration) or generate
// a new one, set the cookie, then reload so the server sees it.
// Uses sessionStorage to prevent infinite reload loops.
(function(){
  if(/(?:^|;\s*)device_id=/.test(document.cookie))return;
  if(sessionStorage.getItem('__bs')){window.location.href='/setup';return;}
  sessionStorage.setItem('__bs','1');
  var id=localStorage.getItem('bvg_board_device_id');
  if(!id){
    var a=new Uint8Array(16);crypto.getRandomValues(a);
    a[6]=(a[6]&0x0f)|0x40;a[8]=(a[8]&0x3f)|0x80;
    var h=Array.from(a,function(b){return('0'+b.toString(16)).slice(-2);}).join('');
    id=h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20);
  }
  document.cookie='device_id='+id+';path=/;max-age=31536000';
  location.reload();
})();
            `.trim(),
          }}
        />
      </head>
      <body className="antialiased min-h-screen bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
