'use client'

import React, { useContext, createContext } from 'react'
import { useSmartWallets } from '@privy-io/react-auth/smart-wallets'

export type AAWalletClientProviderContextValue = ReturnType<typeof useSmartWallets>['client']
export const AAWalletClientProviderContext = createContext<any>(undefined)

export const useAAWalletClient = () => {
  return useContext(AAWalletClientProviderContext) as AAWalletClientProviderContextValue
}

export const AAWalletClientProvider = ({ children }: { children: React.ReactNode }) => {
  const { client } = useSmartWallets()

  return (
    <AAWalletClientProviderContext.Provider value={client as AAWalletClientProviderContextValue}>
      {children}
    </AAWalletClientProviderContext.Provider>
  )
}
