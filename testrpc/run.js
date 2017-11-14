#!/bin/env node

const TestRPC = require('ethereumjs-testrpc');

const accounts = require('./accounts');

const defaultBalance = '200000000000000000000000000';

const defaultPort = '8545';
const defaultHostname = undefined;

const options = {
  accounts: accounts.accounts.map(
    ({ privkey }) => ({
      secretKey: '0x' + privkey.toString('hex'),
      balance: defaultBalance
    })
  )
};
const server = TestRPC.server(options);

if (require.main === module) {
  server.listen(defaultPort, defaultHostname, (err, blockchain) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    console.log(`TestRPC started on port ${defaultPort}`);
  });
}
