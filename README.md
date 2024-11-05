# Social Connector for SDK

This package adds a Particle Auth Kit with special setup to work with `@azuro-org/sdk`. 

## Installation

```
npm install @azuro-org/sdk @azuro-org/sdk-social-aa-connector
```
it is assumed that you have already set up a project with base azuro sdk.

1. Replace wagmiConfig creation by `createConfig` from `@privy-io/wagmi`:

```ts
import { http, createConfig, cookieStorage, createStorage } from 'wagmi'
import { injected, walletConnect } from 'wagmi/connectors'
import type {PrivyClientConfig} from '@privy-io/react-auth'
import { createConfig } from '@privy-io/wagmi'

const wagmiConfig = createConfig({
  chains: appChains,
  transports: {
    [polygonAmoy.id]: http(constants.rpcByChains[polygonAmoy.id]),
  },
  connectors: [
    injectedConnector,
    walletConnectConnector,
  ],
  ssr: true,
  syncConnectedChain: true,
  multiInjectedProviderDiscovery: true,
  storage: createStorage({
    storage: cookieStorage,
  }),
})
```

2. Register at https://dashboard.privy.io/account:
   - Create a project, go to "Embedded wallets" page, "Smart Wallets" tab, enable it, choose "Safe" (we support only this), configure paymasters for your app chains (https://dashboard.pimlico.io/apikeys).
   - Go to "Settings" and copy `App ID`.

4. Replace `WagmiProvider` from `wagmi` by `PrivyProvider` from `@azuro-org/sdk-social-aa-connector`:

```tsx
import type {PrivyClientConfig} from '@privy-io/react-auth'
import { PrivyProvider } from '@azuro-org/sdk-social-aa-connector'
import { wagmiConfig } from './config'

const Providers = ({ children, initialState }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <PrivyProvider
        appId="your-App-ID-from-privy-dashboard"
        // (optional) you can customize privyConfig, see PrivyClientConfig interface
        // privyConfig={privyConfig}
        wagmiConfig={wagmiConfig}
        initialWagmiState={initialState}
      >
        {children}
      </PrivyProvider>
    </QueryClientProvider>
  )
}
```
4. Replace connect handlers from `wagmi` to `privy`:

```tsx
import { usePrivy } from '@privy-io/react-auth'
import { useAccount } from '@azuro-org/sdk-social-aa-connector'

const ConnectButton = () => {
  const { address } = useAccount()
  const { connectOrCreateWallet, ready } = usePrivy()
  
  if (!address) {
    return (
      <button type="button" onClick={() => connectOrCreateWallet()}>Connect Wallet</button>
    )
  }

  return <>Your connected state view</>
}
```

5. Replace all `useAccount` hook imports from `wagmi` to `@azuro-org/sdk-social-aa-connector`:

It returns the same data, but extends with `isAAWallet` flag and, in case of login via email/social networks, replaces `address` with smart account address for current user.

```tsx
import { useAccount } from '@azuro-org/sdk-social-aa-connector'

const Component = () => {
  /*
   * If user logged in via email/social netkwork:
   *   isAAWallet = true
   *   address = Safe AA address controlled by user
   * Else, default web3 connection:
   *   isAAWallet = false
   *   address = connected wallet address
   * */
  const { address, isAAWallet } = useAccount()
}
```

6. Azuro SDK will handle logic required for Azuro. You need to implement logic for on-ramp/off-ramp/withdrawal. To act with user's smart account, use privy walletClient. Read [Privy "Using smart wallets" docs](https://docs.privy.io/guide/react/wallets/smart-wallets/usage#signatures-and-transactions)

```tsx
import { useSmartWallets } from '@privy-io/react-auth/smart-wallets'

const Funding = () => {
   const { client } = useSmartWallets()
   
   /*
           
   await client.switchChain({ id: appChainId })

   const signature = await client.signMessage({
      account: client.account,
      message: 'Hello world',
   })

   const signature = await client.signTypedData({
      account: client.account,
      // https://viem.sh/docs/actions/wallet/signTypedData#signtypeddata
      ...insertYourTypedDataParams,
   })

    const txHash = await client.sendTransaction({
      account: client.account,
      chain: appChain,
      to: 'insert-recipient-address',
      value: 0.1,
    });
           
    */
}
```
