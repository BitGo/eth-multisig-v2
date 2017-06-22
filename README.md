# Ethereum MultiSig Wallet Contract

## About

Multi-sig contract suitable for use in wallets. 

This project improves upon the original "wallet.sol" created by Gavin Wood. It also adds a few new features, notably support for synchronous (single transaction) approvals containing multiple signatures through the use of ecrecover. A test suite is included through the use of the truffle framework, providing coverage for both old and new methods of the wallet. 

Compatibility with methods on the original wallet.sol is maintained, making it interoperable with Mist.

## Installation

NodeJS 5.0+ is recommended. 

```shell
npm install
```

This installs truffle and an Ethereum test RPC client.

## Wallet Solidity Contract

Find it at [contracts/WalletSimple.sol](contracts/WalletSimple.sol)

## Running tests

The truffle framework will depend on the Web3 interface to a local Web3 Ethereum JSON-RPC. If you've followed the above steps, run the following to start testrpc. 

```shell
npm run testrpc
```

You should verify that you are not already running geth, as this will cause the tests to run against that interface. 

In a **separate terminal window**, run the following command to initiate the test suite, which will run against the RPC:

```shell
npm test
```