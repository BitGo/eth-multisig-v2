# Ethereum MultiSig Wallet Contract

## About

Multi-sig contract suitable for use in wallets. 

Some of the features of the contract (WalletSimple.sol)

1. Functions as a 2-of-3 multisig wallet for sending transactions.
2. Support for synchronous (single transaction) approvals containing multiple signatures through the use of ecrecover.
3. Can deploy Forwarder contracts so that a single wallet can have multiple receive addresses. 
4. Forwarder address contracts have the ability to flush funds that were sent to the address before the contract was created.
5. ERC20 tokens can be flushed from the forwarder wallet to the main wallet with a single signature from any signer.
6. ERC20 tokens and ether can be sent out from the main wallet through a multisig process.
7. ‘Safe Mode’ can be set on a wallet contract that prevents ETH and ERC20 tokens from being sent anywhere other than to wallet signers


A test suite is included through the use of the truffle framework, providing coverage for methods in the wallet.

## Installation

NodeJS 8.14.0 is recommended.

```shell
npm install
```

This installs truffle and an Ethereum test RPC client.

## Wallet Solidity Contract

Find it at [contracts/WalletSimple.sol](contracts/WalletSimple.sol)

## Running tests

The truffle framework will depend on the Web3 interface to a local Web3 Ethereum JSON-RPC. If you've followed the above steps, run the following to start testrpc. 

```shell
npm run truffle-testrpc
```

You should verify that you are not already running geth, as this will cause the tests to run against that interface. 

In a **separate terminal window**, run the following command to initiate the test suite, which will run against the RPC:

```shell
npm run truffle-test
```
