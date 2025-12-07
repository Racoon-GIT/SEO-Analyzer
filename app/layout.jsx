import './globals.css';

export const metadata = {
  title: 'SEO Multi-Agent System | Racoon Lab',
  description: 'Sistema Multi-Agente AI per Ottimizzazione SEO E-commerce',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body className="bg-dark-400 text-gray-200 font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
