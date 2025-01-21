import { useAccount, useAccountEffect } from 'wagmi'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import { useSetActiveWallet } from '@privy-io/wagmi'
import { useEffect, useLayoutEffect, useState } from 'react'


export default function FixSocialLogin() {
  const { authenticated, logout, user } = usePrivy()
  const { ready, wallets } = useWallets()
  const { setActiveWallet } = useSetActiveWallet()
  const { address, isConnecting, isReconnecting } = useAccount()

  const [ isProcessing, setProcessing ] = useState<boolean>(false)

  useAccountEffect({
    onDisconnect: () => {
      if (authenticated) {
        setProcessing(true)

        logout()
          .finally(() => {
            setProcessing(false)
          })
          .catch(() => {})
      }
    },
  })

  useLayoutEffect(() => {
    const wallet = wallets?.[0]

    if (
      wallet
      && ready
      && (!address || wallet.address.toLowerCase() !== address?.toLowerCase())
      && !isProcessing
      && !isConnecting
      && !isReconnecting
    ) {
      setProcessing(true)
      setActiveWallet(wallet)
        .finally(() => setProcessing(false))
    }
  }, [ wallets, address, isProcessing, isConnecting, isReconnecting, ready ])

  return null
}
