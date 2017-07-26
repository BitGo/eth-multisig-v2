var abi = require('ethereumjs-abi');
var BN = require('bn.js');
var Promise = require('bluebird');
exports.showBalances = function() {
  var accounts = web3.eth.accounts;
  for (var i=0; i<accounts.length; i++) {
    console.log(accounts[i] + ": " + web3.fromWei(web3.eth.getBalance(accounts[i]), 'ether'), 'ether' );
  }
};

// Polls an array for changes
exports.waitForEvents = function(eventsArray, numEvents) {
  if (numEvents === 0) {
    return Promise.delay(1000); // Wait a reasonable amount so the caller can know no events fired
  }
  var numEvents = numEvents || 1;
  var oldLength = eventsArray.length;
  var numTries = 0;
  var pollForEvents = function() {
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
    [ "address", "uint", "string", "uint", "uint" ],
    [ new BN(toAddress.replace("0x", ""), 16), web3.toWei(amount, "ether"), data, expireTime, sequenceId ]
  ).toString('hex');
};

// Helper to get token transactions sha3 for solidity tightly-packed arguments
exports.getSha3ForConfirmationTokenTx = function(toAddress, value, tokenContractAddress, expireTime, sequenceId) {
  return abi.soliditySHA3(
    [ "address", "uint", "address", "uint", "uint" ],
    [ new BN(toAddress.replace("0x", ""), 16), value, new BN(tokenContractAddress.replace("0x", ""), 16), expireTime, sequenceId ]
  ).toString('hex');
};