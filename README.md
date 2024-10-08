# Social Connector for SDK

This package adds a Particle Auth Kit with special setup to work with `@azuro-org/sdk`. 

## Installation

```
npm install @azuro-org/sdk @azuro-org/sdk-social-aa-connector
```

1. Register at https://dashboard.particle.network, create a project, copy `Project ID`, `Client Key`, `App ID` to your app.

2. Add `particleWagmiConnector` to your wagmi Config:

```ts
import { http, createConfig, cookieStorage, createStorage } from 'wagmi'
import { injected, walletConnect } from 'wagmi/connectors'
import { particleWagmiWallet } from '@azuro-org/sdk-social-aa-connector'

const wagmiConfig = {
  ...yourBaseConfig,
  connectors: [
    particleWagmiWallet({
      options: {
        projectId: 'your-particle-project-id',
        clientKey: 'your-particle-client-key',
        appId: 'your-particle-app-id',
      },
    }),
    injectedConnector,
    walletConnectConnector,
  ],
}
```

3. Add `ParticleAuthContextProvider` under `WagmiProvider`:

```tsx
import { ParticleAuthContextProvider } from '@azuro-org/sdk-social-aa-connector'
import { WagmiProvider } from 'wagmi'


const Providers = ({ children }) => {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ParticleAuthContextProvider
          options={{
            chains: wagmiConfig.chains,
            projectId: 'your-particle-project-id',
            clientKey: 'your-particle-client-key',
            appId: 'your-particle-app-id',
            wallet: {
              visible: true,
            },
            themeType: 'dark',
            customStyle: {
              logo: logoImage.src,
              projectName: 'Social Login',
              // must greater than 2147483646
              zIndex: 2147483650, 
            },
          }}
        >
          {children}
        </ParticleAuthContextProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
```


## Extract buttons for social networks

If you want to extract social buttons to have one-click connection, duplicate connector with specific param:

```ts

const options = {
  projectId: 'your-particle-project-id',
  clientKey: 'your-particle-client-key',
  appId: 'your-particle-app-id',
}

// from '@particle-network/auth-core'
type SocialAuthType = 'facebook' | 'google' | 'apple' | 'twitter' | 'discord' | 'github' | 'twitch' | 'microsoft' | 'linkedin'

const wagmiConfig = {
  ...yourBaseConfig,
  connectors: [
    particleWagmiWallet({
      options,
      connectParam: {
        socialType: 'google',
      },
    }),
    // ...etc,
    injectedConnector,
    walletConnectConnector,
  ],
}
```

