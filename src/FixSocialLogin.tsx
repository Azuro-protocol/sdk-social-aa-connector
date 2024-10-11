import { useConnect, useDisconnect } from 'wagmi'
import { useConnect as useParticleConnect, type AuthCoreModalOptions } from '@particle-network/authkit'
import { useEffect } from 'react'
import { isSocialAuthType, getLatestAuthType, type SocialAuthType, particleAuth, AuthCoreEvent } from '@particle-network/auth-core'

import { particleWagmiWallet } from './connectors'
import { WalletConfigParams } from './connectors/particleWagmiWallet'


type FixSocialLoginProps = {
  options: WalletConfigParams['options']
}
export default function FixSocialLogin({ options }: FixSocialLoginProps) {
  const { connect } = useConnect()
  const { connectionStatus } = useParticleConnect()
  const { disconnect } = useDisconnect()

  useEffect(() => {
    if (connectionStatus === 'connected' && isSocialAuthType(getLatestAuthType())) {
      connect({
        connector: particleWagmiWallet({ options, connectParam: { socialType: getLatestAuthType() as SocialAuthType } }),
      })
    }
    const onDisconnect = () => {
      disconnect()
    }
    particleAuth.on(AuthCoreEvent.ParticleAuthDisconnect, onDisconnect)

    return () => {
      particleAuth.off(AuthCoreEvent.ParticleAuthDisconnect, onDisconnect)
    }
  }, [ connect, connectionStatus, disconnect ])

  return null
}
