'use client'

import React, { useContext, createContext, useMemo } from 'react'
import { useAccount as useAccountBase } from 'wagmi'
import type { Address } from 'viem'
import { usePrivy } from '@privy-io/react-auth'

export type ExtendedAccountContextValue = ReturnType<typeof useAccountBase> & { isAAWallet: boolean }

const ExtendedAccountContext = createContext<ExtendedAccountContextValue | null>(null)

export const useAccount = () => {
  return useContext(ExtendedAccountContext) as ExtendedAccountContextValue
}

export const ExtendedAccountProvider = ({ children }: { children: React.ReactNode }) => {
  const account = useAccountBase()
  const privy = usePrivy()

  const additionalContext = useMemo(() => {
    if (!account.address || privy?.user?.smartWallet?.smartWalletType !== 'safe') {
      return { ...account, isAAWallet: false }
    }

    return {
      ...account,
      address: privy.user.smartWallet.address as Address,
      isAAWallet: true,
    }
  }, [ account.address, privy?.user?.smartWallet?.address ])

  return (
    <ExtendedAccountContext.Provider value={additionalContext}>
      {children}
    </ExtendedAccountContext.Provider>
  )
}
