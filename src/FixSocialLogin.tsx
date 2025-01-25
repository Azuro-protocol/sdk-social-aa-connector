import { useAccountEffect } from 'wagmi'
import { usePrivy } from '@privy-io/react-auth'


export default function FixSocialLogin() {
  const { authenticated, logout, user } = usePrivy()

  useAccountEffect({
    onDisconnect: () => {
      if (authenticated) {
        logout()
          .catch(() => {})
      }
    },
  })

  return null
}
