import { useAccountEffect, useAccount } from 'wagmi'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import { useSetActiveWallet } from '@privy-io/wagmi'
import { useEffect } from 'react'


export default function FixSocialLogin() {
  const { ready, logout } = usePrivy()
  const { address, isConnecting, isReconnecting } = useAccount()
  const { wallets } = useWallets()
  const { setActiveWallet } = useSetActiveWallet()

  useAccountEffect({
    onDisconnect: () => {
      logout().catch(() => {})
    },
  })

  useEffect(() => {
    if (!address && !isConnecting && !isReconnecting && ready && wallets?.[0]) {
      setActiveWallet(wallets[0])
    }
  }, [ wallets, address, isConnecting, isReconnecting, ready ])

  return null
}
