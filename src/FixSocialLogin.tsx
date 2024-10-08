import { useConnect, useDisconnect } from 'wagmi'
import { useConnect as useParticleConnect, type AuthCoreModalOptions } from '@particle-network/authkit'
import { useEffect } from 'react'
import { isSocialAuthType, getLatestAuthType, type SocialAuthType, particleAuth, AuthCoreEvent } from '@particle-network/auth-core'

import { particleWagmiWallet } from './connectors'
// import type { GasMode } from './config'


type FixSocialLoginProps = {
  options: Pick<AuthCoreModalOptions, 'projectId' | 'clientKey' | 'appId'>
  // & { gasMode: GasMode }
}
export default function FixSocialLogin({ options }: FixSocialLoginProps) {
  // start: fix social auth login
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
  // end: fix social auth login

  return null
}
