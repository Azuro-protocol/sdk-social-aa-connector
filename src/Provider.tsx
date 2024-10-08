import React from 'react'
import { AuthCoreContextProvider, type AuthCoreModalOptions } from '@particle-network/authkit'

import FixSocialLogin from './FixSocialLogin'
// import config, { type GasMode } from './config'
import config from './config'


type ProviderProps = {
  className?: string
  options: Omit<AuthCoreModalOptions, 'erc4337'> /*& { gasMode: GasMode}*/
  children?: React.ReactNode
}

const Provider: React.FC<ProviderProps> = (props) => {
  const { children, options } = props
  const { appId, clientKey, projectId } = options

  return (
    <AuthCoreContextProvider
      options={{
        ...options,
        ...config,
        customStyle: {
          // must greater than 2147483646
          zIndex: 2147483650,
          ...options.customStyle,
        },
        // it's important to use connector from this package for correct work of @azuro-org/sdk
        supportEIP6963: false,
      }}
    >
      <FixSocialLogin options={{ appId, clientKey, projectId }} />
      {children}
    </AuthCoreContextProvider>
  )
}

export default Provider
