"use client";

import { createContext, useContext } from "react";
import { BASE_CURRENCY, type DisplayCurrency } from "@/lib/currency";

const CurrencyContext = createContext<DisplayCurrency>(BASE_CURRENCY);

/** The chosen currency is plain data, so a server layout can hand it to every
 *  client component below without another round trip. */
export function CurrencyProvider({
  currency,
  children,
}: {
  currency: DisplayCurrency;
  children: React.ReactNode;
}) {
  return (
    <CurrencyContext.Provider value={currency}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): DisplayCurrency {
  return useContext(CurrencyContext);
}
