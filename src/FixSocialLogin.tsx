import { useAccountEffect, useAccount } from 'wagmi'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import { useSetActiveWallet } from '@privy-io/wagmi'
import { useEffect, useMemo, useRef } from 'react'


export default function FixSocialLogin() {
  const { ready, authenticated, logout } = usePrivy()
  const { address, isConnecting, isReconnecting } = useAccount()
  const { wallets } = useWallets()
  const { setActiveWallet } = useSetActiveWallet()

  const isProcessingLogoutRef = useRef<boolean>(false)

  useAccountEffect({
    onDisconnect: () => {
      isProcessingLogoutRef.current = true
      if (authenticated) {
        logout()
          .catch(() => {})
          .finally(() => {
            isProcessingLogoutRef.current = false
          })
      }
    },
  })

  useMemo(() => {
    if (!address && !isConnecting && !isReconnecting && ready && wallets?.[0] && !isProcessingLogoutRef.current) {
      setActiveWallet(wallets[0])
    }
  }, [ wallets?.[0], address, isConnecting, isReconnecting, ready ])

  return null
}
