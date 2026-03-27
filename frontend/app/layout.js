import "./globals.css";
import Navbar from "../components/Navbar";
import TickerTape from "../components/ui/TickerTape";

export const metadata = {
  title: "Hayai — Hyperliquid Markets Terminal",
  description:
    "Live Hyperliquid perps data. Prices, funding rates, whale trades, liquidations.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Navbar />
        <TickerTape />
        <main className="pt-[88px] min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}