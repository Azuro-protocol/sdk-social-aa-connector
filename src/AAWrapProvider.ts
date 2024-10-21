import EventEmitter from 'events';
import { 
  type SessionKey,
  SmartAccount, 
  UserOp, 
  type IEthereumProvider, 
  type JsonRpcRequest, 
  type ResolveTransactionParams,
  Transaction
} from '@particle-network/aa'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import { createPublicClient, hashMessage, Hex, http, maxUint256, parseUnits, type PrivateKeyAccount, toBytes } from 'viem'
import { waitForTransactionReceipt } from 'viem/actions';
import { polygonAmoy } from 'viem/chains';

export enum SendTransactionMode {
    UserSelect = 0,
    Gasless = 1,
    UserPaidNative = 2,
}

export enum SendTransactionEvent {
    Request = 'RequestSendTransaction',
    Resolve = 'ResolveSendTransaction',
    Reject = 'RejectSendTransaction',
}

// ^2.0.2
export class AAWrapProvider implements IEthereumProvider {
    private events = new EventEmitter();
    private sessionWallet: PrivateKeyAccount | undefined;
    private sessions: SessionKey[] = JSON.parse(localStorage.getItem('sessions') || '[]')

    constructor(
        private smartAccount: SmartAccount,
        private sendTxMode: SendTransactionMode = SendTransactionMode.UserPaidNative,
        private enableSession?: boolean
    ) {
        this.events.setMaxListeners(100);
        
        if (enableSession) {
          let privateKey = localStorage.getItem('pk')

          if (!privateKey) {
            privateKey = generatePrivateKey()
            localStorage.setItem('pk', privateKey)
          }

          this.sessionWallet = privateKeyToAccount(privateKey as Hex)
        }

        if (!Object.values(SendTransactionMode).includes(sendTxMode)) {
            throw new Error(`sendTxMode value error, must in ${Object.values(SendTransactionMode)}`);
        }
    }

    /**
     * when receive SendTransactionEvent.Request event, call this method to continue sending the transaction.
     *
     * @see SendTransactionEvent
     * @param params
     */
    resolveSendTransaction(params: ResolveTransactionParams) {
        this.events.emit(SendTransactionEvent.Resolve, params);
    }

    /**
     * when receive SendTransactionEvent.Request event, call this method to reject the transaction.
     *
     * @param error reject error message
     */
    rejectSendTransaction(error: Error) {
        this.events.emit(SendTransactionEvent.Reject, error);
    }

    on(event: string, listener: any): this {
        if (SendTransactionEvent.Request === event) {
            this.events.on(event, listener);
        } else {
            this.smartAccount.provider.on(event, listener);
        }
        return this;
    }

    once(event: string, listener: any): this {
        if (SendTransactionEvent.Request === event) {
            this.events.once(event, listener);
        } else {
            if (this.smartAccount.provider.once) {
                this.smartAccount.provider.once(event, listener);
            } else {
                this.smartAccount.provider.on(event, listener);
            }
        }
        return this;
    }

    off(event: string, listener: any): this {
        if (SendTransactionEvent.Request === event) {
            this.events.off(event, listener);
        } else {
            if (this.smartAccount.provider.off) {
                this.smartAccount.provider.off(event, listener);
            } else {
                this.smartAccount.provider.removeListener?.(event, listener);
            }
        }
        return this;
    }

    removeListener(event: string, listener: any): this {
        if (SendTransactionEvent.Request === event) {
            this.events.removeListener(event, listener);
        } else {
            if (this.smartAccount.provider.removeListener) {
                this.smartAccount.provider.removeListener(event, listener);
            } else {
                this.smartAccount.provider.off?.(event, listener);
            }
        }
        return this;
    }

    enable(): Promise<string[]> {
        return this.request({
            method: 'eth_requestAccounts',
        });
    }

    async request(payload: Partial<JsonRpcRequest>): Promise<any> {
        if (payload.method === 'eth_requestAccounts' || payload.method === 'eth_accounts') {
            await this.smartAccount.provider.request(payload);
            const address = await this.smartAccount.getAddress();
            return [address];
        } 
				else if (payload.method === 'eth_sendTransaction') {
					if (!payload.params) {
							return Promise.reject(new Error('send transaction param error'));
					}

					const txData = payload.params[0];
					const feeQuotesResult = await this.smartAccount.getFeeQuotes(txData);

					if (this.sendTxMode === SendTransactionMode.UserSelect) {
						return new Promise((resolve, reject) => {
								this.events.removeAllListeners(SendTransactionEvent.Reject);
								this.events.removeAllListeners(SendTransactionEvent.Resolve);
								this.events.once(SendTransactionEvent.Resolve, async (params: ResolveTransactionParams) => {
										try {
												const sendParams = { ...params, tx: txData };
												const txHash = await this.smartAccount.sendTransaction(sendParams);
												resolve(txHash);
										} catch (error) {
												reject(error);
										}
								});
								this.events.once(SendTransactionEvent.Reject, reject);
								if (!feeQuotesResult.transactions) {
										feeQuotesResult.transactions = [txData];
								}
								this.events.emit(SendTransactionEvent.Request, feeQuotesResult);
						});
					}

					const paymaster = this.sendTxMode === SendTransactionMode.Gasless ? (
						feeQuotesResult.verifyingPaymasterGasless || feeQuotesResult.verifyingPaymasterNative
					) : (
						feeQuotesResult.verifyingPaymasterNative
					)

					const { userOp, userOpHash } = paymaster

					if (this.enableSession) {
						if (!this.sessions?.length) {
							const address = await this.smartAccount.getAddress()

							const sessionKey = await this.smartAccount.createSessions([{
								validUntil: 0,
								validAfter: 0,
                                // TODO: it's for amoy, need object for every other chain
								sessionValidationModule: "0x000006bC2eCdAe38113929293d241Cf252D91861",
								sessionKeyDataInAbi: [
									['address', 'address', 'uint256'],
									[
										this.sessionWallet!.address,
										address,
										parseUnits('1', 6).toString(),
									],
								],
							}])

							const sessionPaymaster = this.sendTxMode === SendTransactionMode.Gasless ? (
								sessionKey.verifyingPaymasterGasless || sessionKey.verifyingPaymasterNative
							) : (
								sessionKey.verifyingPaymasterNative
							)
	
							const hash = await this.smartAccount.sendTransaction({
								tx: sessionKey.transactions as Transaction[],
								userOp: sessionPaymaster.userOp,
								userOpHash: sessionPaymaster.userOpHash,
							}) as Hex

							console.log(hash, 'hash');
							
                            // TODO: I suppose we need object <chainId, viem chain>
							await waitForTransactionReceipt(createPublicClient({
								chain: polygonAmoy,
								transport: http()
							}), {
								hash,
							})

							localStorage.setItem('sessions', JSON.stringify(sessionKey.sessions))
							this.sessions = sessionKey.sessions!
						}

						this.smartAccount.validateSession(this.sessions![0]!, this.sessions!)

						const signature = await this.sessionWallet!.signMessage({
							message: userOpHash
						});

						return this.smartAccount.sendSignedUserOperation(
							{ ...userOp, signature },
							{
								targetSession: this.sessions![0]!,
								sessions: this.sessions!,
							}
						)
					}

					return this.smartAccount.sendUserOperation({ userOp, userOpHash });
        }

        return this.smartAccount.provider.request(payload);
    }
}
