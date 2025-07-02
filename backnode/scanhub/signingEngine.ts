import { Transaction, Keypair } from "@solana/web3.js"

export class SigningEngine {
  private keypair: Keypair

  constructor(secretKey: Uint8Array) {
    this.keypair = Keypair.fromSecretKey(secretKey)
  }

  signTransaction(transaction: Transaction): Transaction {
    transaction.sign(this.keypair)
    return transaction
  }
}