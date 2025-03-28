import React from 'react'
import { PrivyProvider, type PrivyClientConfig } from '@privy-io/react-auth'
import { createConfig, WagmiProvider } from '@privy-io/wagmi'
import { SmartWalletsProvider, SmartWalletsProviderProps } from '@privy-io/react-auth/smart-wallets'
import type { State } from 'wagmi'
import FixSocialLogin from './FixSocialLogin'
import { ExtendedAccountProvider } from 'src/ExtendedAccountProvider'
import { AAWalletClientProvider } from 'src/AAWalletClientProvider'

export type PrivyConfig = PrivyClientConfig

type ProviderProps = {
  children: React.ReactNode
  appId: string
  privyConfig: PrivyConfig
  wagmiConfig: ReturnType<typeof createConfig>
  initialWagmiState?: State
  paymasterContext?: NonNullable<SmartWalletsProviderProps['config']>['paymasterContext']
}

const loginMethods: PrivyConfig['loginMethods'] = [ 'wallet', 'email', 'google', 'twitter', 'farcaster', 'discord', 'instagram' ]

const Provider: React.FC<ProviderProps> = (props) => {
  const { children, appId, privyConfig, wagmiConfig, initialWagmiState, paymasterContext } = props
  const { embeddedWallets, ...restConfig } = privyConfig

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods,
        ...restConfig,
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
          requireUserPasswordOnCreate: false,
          // waitForTransactionConfirmation: false,
          showWalletUIs: false,
          ...embeddedWallets || {},
        },
      }}
    >
      <SmartWalletsProvider config={{ paymasterContext }}>
        <WagmiProvider
          config={wagmiConfig}
          initialState={initialWagmiState}
          reconnectOnMount={false}
        >
          <FixSocialLogin />
          <ExtendedAccountProvider>
            <AAWalletClientProvider>
              {children}
            </AAWalletClientProvider>
          </ExtendedAccountProvider>
        </WagmiProvider>
      </SmartWalletsProvider>
    </PrivyProvider>
  )
}

export default Provider
