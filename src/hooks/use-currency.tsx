import { createContext, useContext, useState, ReactNode } from "react";

export type Currency = "NTD" | "USD" | "CAD";

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  convert: (amountInNTD: number) => number;
  format: (amountInNTD: number) => string;
  symbol: string;
}

// Approximate exchange rates (NTD as base)
const EXCHANGE_RATES: Record<Currency, number> = {
  NTD: 1,
  USD: 0.031, // 1 NTD ≈ 0.031 USD
  CAD: 0.043, // 1 NTD ≈ 0.043 CAD
};

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  NTD: "NT$",
  USD: "$",
  CAD: "CA$",
};

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const [currency, setCurrency] = useState<Currency>("NTD");

  const convert = (amountInNTD: number): number => {
    return amountInNTD * EXCHANGE_RATES[currency];
  };

  const format = (amountInNTD: number): string => {
    const converted = convert(amountInNTD);
    const symbol = CURRENCY_SYMBOLS[currency];
    
    if (currency === "NTD") {
      return `${symbol}${converted.toFixed(0)}`;
    }
    return `${symbol}${converted.toFixed(2)}`;
  };

  const symbol = CURRENCY_SYMBOLS[currency];

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, convert, format, symbol }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = (): CurrencyContextType => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
};
