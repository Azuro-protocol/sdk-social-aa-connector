import React from 'react'
import { AuthCoreContextProvider, type AuthCoreModalOptions } from '@particle-network/authkit'

import FixSocialLogin from './FixSocialLogin'
import config from './config'
import { WalletConfigParams } from './connectors/particleWagmiWallet'


type ProviderProps = {
  className?: string
  options: Omit<AuthCoreModalOptions, 'erc4337' | 'supportEIP6963'> & WalletConfigParams['options']
  children?: React.ReactNode
}

const Provider: React.FC<ProviderProps> = (props) => {
  const { children, options } = props
  const { customStyle } = options

  return (
    <AuthCoreContextProvider
      options={{
        ...options,
        ...config,
        customStyle: {
          // must greater than 2147483646
          zIndex: 2147483650,
          ...(customStyle || {}),
        },
        // it's important to use connector from this package for correct work of @azuro-org/sdk
        supportEIP6963: false,
      }}
    >
      <FixSocialLogin options={options} />
      {children}
    </AuthCoreContextProvider>
  )
}

export default Provider
