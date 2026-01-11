import { createContext, useContext, useState, ReactNode } from "react";

export type Currency = "NTD" | "USD" | "CAD";

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  convert: (amountInNTD: number) => number;
  convertToNTD: (amount: number, fromCurrency: Currency) => number;
  convertFromNTD: (amountInNTD: number, toCurrency: Currency) => number;
  format: (amountInNTD: number) => string;
  symbol: string;
}

// Exchange rates (NTD as base)
const EXCHANGE_RATES: Record<Currency, number> = {
  NTD: 1,
  USD: 0.031, // 1 NTD ≈ 0.031 USD
  CAD: 0.043, // 1 NTD ≈ 0.043 CAD
};

// Inverse rates for converting TO NTD
const TO_NTD_RATES: Record<Currency, number> = {
  NTD: 1,
  USD: 32.26, // 1 USD ≈ 32.26 NTD
  CAD: 23.26, // 1 CAD ≈ 23.26 NTD
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

  const convertToNTD = (amount: number, fromCurrency: Currency): number => {
    return amount * TO_NTD_RATES[fromCurrency];
  };

  const convertFromNTD = (amountInNTD: number, toCurrency: Currency): number => {
    return amountInNTD * EXCHANGE_RATES[toCurrency];
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
    <CurrencyContext.Provider value={{ currency, setCurrency, convert, convertToNTD, convertFromNTD, format, symbol }}>
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
