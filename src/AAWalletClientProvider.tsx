import React, { useContext, createContext } from 'react'
import { useSmartWallets } from '@privy-io/react-auth/smart-wallets'

export type AAWalletClients = ReturnType<typeof useSmartWallets>
export type AAWalletClientProviderContextValue = ReturnType<typeof useSmartWallets>['client']
export const AAWalletClientProviderContext = createContext<any>(undefined)

/** @deprecated use `useAAWalletClients` instead */
export const useAAWalletClient = () => {
  return useContext(AAWalletClientProviderContext) as AAWalletClientProviderContextValue
}

export const useAAWalletClients = useSmartWallets as () => AAWalletClients

export const AAWalletClientProvider = ({ children }: { children: React.ReactNode }) => {
  const { client } = useSmartWallets()

  return (
    <AAWalletClientProviderContext.Provider value={client}>
      {children}
    </AAWalletClientProviderContext.Provider>
  )
}
