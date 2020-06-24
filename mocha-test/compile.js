const fs = require('fs');
const { promisify } = require('util');

const _ = require('lodash');
const should = require('should');

const solc = require('solc');

// Useful when async func goes wrong
process.on('unhandledRejection', (r) => {
  console.log('UnhandledRejection');
  console.error(r);
});

describe('Contracts', async () => {
  const contracts = [
    'ERC20Interface.sol',
    'FixedSupplyToken.sol',
    'Forwarder.sol',
    'WalletSimple.sol',
    'WalletSimple.sol',
    'coins/EtcWalletSimple.sol',
    'coins/RskWalletSimple.sol',
    'coins/CeloWalletSimple.sol',
  ];

  let result;

  before(async function () {
    // solc takes a while
    this.timeout(10000);
    const contents = await Promise.all(contracts.map(async (filename) =>
      (await promisify(fs.readFile)('./contracts/' + filename)).toString()
    ));
    const sources = _.zipObject(contracts, contents);
    result = solc.compile({ sources }, 1);
  });

  it('compile without warnings and errors', () => {
    should.equal(
      (result.errors || []).length, 0,
      (result.errors || []).join('\n')
    );
  });
});
