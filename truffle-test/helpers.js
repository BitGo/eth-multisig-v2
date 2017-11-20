const abi = require('ethereumjs-abi');
const util = require('ethereumjs-util');
const BN = require('bn.js');
const Promise = require('bluebird');

exports.showBalances = function() {
  const accounts = web3.eth.accounts;
  for (let i=0; i<accounts.length; i++) {
    console.log(accounts[i] + ': ' + web3.fromWei(web3.eth.getBalance(accounts[i]), 'ether'), 'ether' );
  }
};

// Polls an array for changes
exports.waitForEvents = function(eventsArray, numEvents) {
  if (numEvents === 0) {
    return Promise.delay(1000); // Wait a reasonable amount so the caller can know no events fired
  }
  numEvents = numEvents || 1;
  const oldLength = eventsArray.length;
  let numTries = 0;
  const pollForEvents = function() {
    numTries++;
    if (eventsArray.length >= (oldLength + numEvents)) {
      return;
    }
    if (numTries >= 100) {
      if (eventsArray.length == 0) {
        console.log('Timed out waiting for events!');
      }
      return;
    }
    return Promise.delay(50)
    .then(pollForEvents);
  };
  return pollForEvents();
};

// Helper to get sha3 for solidity tightly-packed arguments
exports.getSha3ForConfirmationTx = function(toAddress, amount, data, expireTime, sequenceId) {
  return abi.soliditySHA3(
    ['string', 'address', 'uint', 'string', 'uint', 'uint'],
    ['ETHER', new BN(toAddress.replace('0x', ''), 16), web3.toWei(amount, 'ether'), data, expireTime, sequenceId]
  );
};

// Helper to get token transactions sha3 for solidity tightly-packed arguments
exports.getSha3ForConfirmationTokenTx = function(toAddress, value, tokenContractAddress, expireTime, sequenceId) {
  return abi.soliditySHA3(
    ['string', 'address', 'uint', 'address', 'uint', 'uint'],
    ['ERC20', new BN(toAddress.replace('0x', ''), 16), value, new BN(tokenContractAddress.replace('0x', ''), 16), expireTime, sequenceId]
  );
};

// Serialize signature into format understood by our recoverAddress function
exports.serializeSignature = ({ r, s, v }) =>
  '0x' + Buffer.concat([r, s, Buffer.from([v])]).toString('hex');

/**
 * Returns the address a contract will have when created from the provided address
 * @param address
 * @return address
 */
exports.getNextContractAddress = (address) => {
  const nonce = web3.eth.getTransactionCount(address);
  return util.bufferToHex(util.generateAddress(address, nonce));
};
