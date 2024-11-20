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
    if (!account.address || privy?.user?.smartWallet?.smartWalletType !== 'safe') {
      // workaround for broken initial state from privy-io/wagmi
      if (!hasReconnectionFired && account.status === 'disconnected') {
        return {
          ...account,
          status: 'reconnecting',
          isDisconnected: false,
          isReconnecting: true,
          isAAWallet: false,
          isReady: false,
        } as const
      }

      return {
        ...account,
        isAAWallet: false,
        isReady: privy.ready
      }
    }

    return {
      ...account,
      address: privy.user.smartWallet.address as Address,
      isAAWallet: true,
      isReady: privy.ready
    }
  }, [ account, account.address, privy?.user?.smartWallet?.address, privy.ready ])

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
    }, 7000)

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
