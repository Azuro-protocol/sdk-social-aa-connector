import { AAWrapProvider, SendTransactionMode, SmartAccount, type FeeQuotesResponse, SendTransactionEvent } from '@particle-network/aa'
import { type ConnectParam, type EIP1193Provider } from '@particle-network/auth-core'
import type { EVMProvider } from '@particle-network/authkit'
import { ChainNotConfiguredError, createConnector } from '@wagmi/core'
import { type Address, getAddress, numberToHex, type ProviderRpcError, SwitchChainError, UserRejectedRequestError } from 'viem'

// import pkgConfig, { type GasMode } from '../config'
import pkgConfig from '../config'


type Provider = EIP1193Provider
type Properties = {
  _smartAccount: SmartAccount | undefined
  _aaWrapProvider: AAWrapProvider | undefined
  _getSmartAccount: (provider: EVMProvider) => SmartAccount
  getProvider(type?: 'clear'): Promise<EVMProvider>
}

type WalletConfigParams = {
  options: {
    projectId: string
    clientKey: string
    appId: string
    // gasMode: GasMode
  }
  connectParam?: ConnectParam
}

particleWagmiWallet.type = 'particleWallet' as const

export default function particleWagmiWallet(params: WalletConfigParams) {
  return createConnector<Provider, Properties>((config) => (
    {
      id: params.connectParam && 'socialType' in params.connectParam ? `particleWalletSDK_${params.connectParam.socialType}` : 'particleWalletSDK',
      name: 'Email/Social login',
      type: particleWagmiWallet.type,
      _smartAccount: undefined,
      _aaWrapProvider: undefined,
      _getSmartAccount(provider: EVMProvider) {
        if (!this._smartAccount) {
          this._smartAccount = new SmartAccount(provider, {
            ...params.options,
            aaOptions: {
              accountContracts: {
                [`${pkgConfig.erc4337.name}`]: [
                  {
                    version: pkgConfig.erc4337.version,
                  },
                ],
              },
            },
          })

          this._smartAccount.setSmartAccountContract(pkgConfig.erc4337)
        }

        return this._smartAccount
      },
      async connect({ chainId }: { chainId: number }) {
        try {
          let provider = await this.getProvider('clear')
          await provider.connect(params.connectParam)

          const smartAccount = this._getSmartAccount(provider)
          const address = await smartAccount?.getAddress() as Address

          provider.on('accountsChanged', this.onAccountsChanged)
          provider.on('chainChanged', this.onChainChanged)
          provider.on('disconnect', this.onDisconnect.bind(this))

          // Switch to chain if provided
          let currentChainId = await this.getChainId()

          if (chainId && currentChainId !== chainId) {
            const chain = await this.switchChain!({ chainId }).catch((error: any) => {
              if (error.code === UserRejectedRequestError.code) {
                throw error
              }

              return { id: currentChainId }
            })
            currentChainId = chain?.id ?? currentChainId
          }

          return { accounts: [ address ], chainId: currentChainId }
        }
        catch (error: any) {
          if (error.code == 4001 || error.code == 4011) {
            throw new UserRejectedRequestError(error as Error)
          }
          throw error
        }
      },
      async disconnect() {
        const provider = await this.getProvider('clear')

        provider.removeListener('accountsChanged', this.onAccountsChanged)
        provider.removeListener('chainChanged', this.onChainChanged)
        provider.removeListener('disconnect', this.onDisconnect.bind(this))

        await provider?.disconnect?.()
        this._aaWrapProvider = undefined
        this._smartAccount = undefined
      },
      async getAccounts() {
        const provider = await this.getProvider()

        return (
          await provider.request({
            method: 'eth_accounts',
          })
        ).map((x: string) => getAddress(x))
      },
      async getChainId() {
        const provider = await this.getProvider()
        const chainId = await provider.request({ method: 'eth_chainId' })

        return Number(chainId)
      },
      async getProvider(type?: 'clear') {
        if (typeof window === 'undefined') {
          return
        }

        while (!(
          window as any
        ).particle?.ethereum) {
          await new Promise((resolve) => setTimeout(() => resolve(true), 100))
        }

        const baseProvider = (
          window as any
        ).particle?.ethereum

        if (type === 'clear' || !baseProvider.isConnected()) {
          return baseProvider
        }

        if (!this._aaWrapProvider) {
          const smartAccount = this._getSmartAccount(baseProvider)

          // const isGasless = params.options.gasMode === 'gasless'
          const isGasless = true
          this._aaWrapProvider = new AAWrapProvider(smartAccount, isGasless ? SendTransactionMode.Gasless : SendTransactionMode.UserSelect)

          if (!isGasless) {
            this._aaWrapProvider.on(SendTransactionEvent.Request, (feeQuotesResult: FeeQuotesResponse) => {
              console.log('=== feeQuotesResult', feeQuotesResult)
              // let the user select the pay gas ERC-20 token
              this._aaWrapProvider!.resolveSendTransaction({
                feeQuote: feeQuotesResult?.tokenPaymaster?.feeQuotes?.[0],
                tokenPaymasterAddress: feeQuotesResult?.tokenPaymaster?.tokenPaymasterAddress,
              })
            })
          }
        }


        return this._aaWrapProvider
      },
      async isAuthorized() {
        try {
          const provider = await this.getProvider('clear')

          return provider.isConnected()
        }
        catch {
          return false
        }
      },
      async switchChain({ chainId }: { chainId: number }) {
        const chain = config.chains.find((chain) => chain.id === chainId)

        if (!chain) {
          throw new SwitchChainError(new ChainNotConfiguredError())
        }

        const provider = await this.getProvider()
        const chainId_ = numberToHex(chain.id)

        try {
          await provider.request({
            method: 'wallet_switchEthereumChain',
            params: [ { chainId: chainId_ } ],
          })

          return chain
        }
        catch (error) {
          // Indicates chain is not added to provider
          if ((
            error as ProviderRpcError
          ).code === 4902) {
            try {
              await provider.request({
                method: 'wallet_addEthereumChain',
                params: [
                  {
                    chainId: chainId_,
                    chainName: chain.name,
                    nativeCurrency: chain.nativeCurrency,
                    rpcUrls: [ chain.rpcUrls.default?.http[0] ?? '' ],
                    blockExplorerUrls: [ chain.blockExplorers?.default.url ],
                  },
                ],
              })

              return chain
            }
            catch (error) {
              throw new UserRejectedRequestError(error as Error)
            }
          }

          throw new SwitchChainError(error as Error)
        }
      },
      onAccountsChanged(accounts: string[]) {
        if (accounts.length === 0) {
          config.emitter.emit('disconnect')
        }
        else {
          config.emitter.emit('change', {
            accounts: accounts.map((x) => getAddress(x)),
          })
        }
      },
      onChainChanged(chain: string) {
        const chainId = Number(chain)
        config.emitter.emit('change', { chainId })
      },
      async onDisconnect(_error: any) {
        config.emitter.emit('disconnect')

        const provider = await this.getProvider('clear')
        provider.removeListener('accountsChanged', this.onAccountsChanged)
        provider.removeListener('chainChanged', this.onChainChanged)
        provider.removeListener('disconnect', this.onDisconnect.bind(this))
        this._aaWrapProvider = undefined
        this._smartAccount = undefined
      },
    }
  ))
}
