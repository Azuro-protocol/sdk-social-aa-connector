import { useEffect, useRef, useState } from 'react'
import { useAccount, useAccountEffect } from 'wagmi'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import { useSetActiveWallet } from '@privy-io/wagmi'


export default function FixSocialLogin() {
  const { authenticated, logout } = usePrivy()
  const { address, status } = useAccount()
  const { wallets, ready } = useWallets()
  const { setActiveWallet } = useSetActiveWallet()
  const [ isProcessing, setIsProcessing ] = useState(false)
  const wallet = wallets?.[0]
  const timerRef = useRef<NodeJS.Timeout>()
  const stateRef = useRef({
    authenticated,
    wallet,
    ready,
    status,
  })

  stateRef.current = {
    authenticated,
    wallet,
    ready,
    status,
  }

  useAccountEffect({
    onDisconnect: () => {
      // Privy doesn't sync "disconnect" from wagmi and their logout, so there is a workaround to keep them synced
      if (authenticated) {
        setIsProcessing(true)
        clearTimeout(timerRef.current)

        logout()
          .catch(() => {})
          .finally(() => {
            setIsProcessing(false)
          })
      }
    },
  })

  // Privy (at least v2.6.4) has a bug with re-login, it doesn't set re-connected wallet to wagmi state
  useEffect(() => {
    if (!ready || isProcessing || (address && address.toLowerCase() === wallet?.address?.toLowerCase()) || !authenticated) {
      clearTimeout(timerRef.current)

      return
    }

    if (
      authenticated && ready && (
        status === 'disconnected'
        || (status === 'connected' && address?.toLowerCase() !== wallet?.address?.toLowerCase())
      )
    ) {
      timerRef.current = setTimeout(() => {
        if (stateRef.current.authenticated && stateRef.current.wallet) {
          setIsProcessing(true)
          setActiveWallet(stateRef.current.wallet)
            .finally(() => {
              setIsProcessing(false)
            })
        }
        // add delay to give a chance for possible sync of states between libs
      }, 500)
    }
  }, [ authenticated, wallet?.address, status, address, isProcessing ])

  return null
}
