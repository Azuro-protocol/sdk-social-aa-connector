import React, { useContext, createContext, useMemo, useState, useEffect } from 'react'
import type { Address } from 'viem'
import { useAccount as useAccountBase } from 'wagmi'
import { usePrivy } from '@privy-io/react-auth'

export type ExtendedAccountContextValue = ReturnType<typeof useAccountBase> & { isAAWallet: boolean, isReady: boolean }

const ExtendedAccountContext = createContext<ExtendedAccountContextValue | null>(null)

export const useAccount = () => {
  return useContext(ExtendedAccountContext) as ExtendedAccountContextValue
}

export const ExtendedAccountProvider = ({ children }: { children: React.ReactNode }) => {
  const account = useAccountBase()
  const privy = usePrivy()
  const [hasReconnectionFired, setHasReconnectionFired] = useState(false)

  const additionalContext = useMemo(() => {
    const isSafe = privy.user?.smartWallet?.smartWalletType === 'safe'
    const isAAWallet = privy.user?.wallet?.walletClientType === 'privy'

    if (!account.address || !isAAWallet) {
      // workaround for broken initial state from privy-io/wagmi
      if (!hasReconnectionFired && account.status === 'disconnected') {
        return {
          ...account,
          status: 'reconnecting',
          isDisconnected: false,
          isReconnecting: true,
          isAAWallet,
          isReady: false,
        } as const
      }

      return {
        ...account,
        isAAWallet,
        isReady: Boolean(account.address && !isAAWallet) || privy.ready,
      }
    }

    const address = privy.user!.smartWallet?.address as Address

    if (!isSafe || !address) {
      console.error(
        `Azuro AA SDK: Privy authorization without "Safe" smartWallet, only "Safe" is allowed. 
        smartWalletType: ${privy.user?.smartWallet?.smartWalletType}`
      )

      return {
        ...account,
        status: 'connecting',
        address: undefined,
        addresses: [] as const,
        isDisconnected: false,
        isReconnecting: false,
        isConnecting: true,
        isConnected: false,
        isAAWallet: true,
        isReady: false,
      } as const
    }


    return {
      ...account,
      address,
      addresses: [ address ] as const,
      isAAWallet: true,
      isReady: privy.ready
    }
  }, [
    account,
    account.address,
    account.status,
    privy.ready,
    privy.user?.wallet?.address,
    privy.user?.smartWallet?.address
  ])

  // workaround for broken initial state from privy-io/wagmi
  useEffect(() => {
    if (hasReconnectionFired) {
      return
    }

    if (account.status !== 'disconnected') {
      setHasReconnectionFired(true)
      return
    }

    const timer = setTimeout(() => {
      setHasReconnectionFired(true)
    }, 5000)

    return () => {
      clearTimeout(timer)
    }
  }, [account.status])

  return (
    <ExtendedAccountContext.Provider value={additionalContext}>
      {children}
    </ExtendedAccountContext.Provider>
  )
}
