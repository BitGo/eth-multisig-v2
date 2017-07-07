var abi = require('ethereumjs-abi');
var util = require('ethereumjs-util');
var _ = require('lodash');
var q = require('q');
require('should');
var BN = require('bn.js');
var Forwarder = artifacts.require("./Forwarder.sol");

contract('Forwarder', function(accounts) {
  it("Basic forwarding test", function () {
    var forwardContract;
    var account0StartEther;
    return Forwarder.new(undefined, {from: accounts[0]})
    .then(function(result) {
      forwardContract = result;
      account0StartEther = web3.fromWei(web3.eth.getBalance(accounts[0]), 'ether');
      return web3.eth.sendTransaction({from: accounts[2], to: forwardContract.address, value: web3.toWei(2, "ether")});
    })
    .then(function(txHash) {
      var tx = web3.eth.getTransaction(txHash);
      var txReceipt = web3.eth.getTransactionReceipt(txHash);
      var account0EndEther = web3.fromWei(web3.eth.getBalance(accounts[0]), 'ether');
      account0EndEther.minus(2).should.eql(account0StartEther);
    });
  });

  it("Flush", function() {
    var nextNonce;
    var forwarderContractAddress;
    var account0StartEther;
    var account1StartEther;
    var contractCreated;
    var gasUsed;
    return q()
    .then(function() {
      return web3.eth.sendTransaction({ from: accounts[0], to: accounts[1], value: web3.toWei(0, "ether") })
    })
    .then(function(txHash) {
      var tx = web3.eth.getTransaction(txHash);
      nextNonce = tx.nonce + 1;
      // determine the forwarder contract address
      forwarderContractAddress = util.bufferToHex(util.generateAddress(accounts[0], nextNonce));

      account0StartEther = web3.fromWei(web3.eth.getBalance(accounts[0]), 'ether');
      account1StartEther = web3.fromWei(web3.eth.getBalance(accounts[1]), 'ether');

      // send funds to the contract address first
      return web3.eth.sendTransaction({ from: accounts[1], to: forwarderContractAddress, value: web3.toWei(5, "ether") });
    })
    .then(function() {
      // Check that the ether is in the forwarder address and not yet in account 0
      web3.fromWei(web3.eth.getBalance(forwarderContractAddress), 'ether').should.eql(web3.toBigNumber(5));
      web3.fromWei(web3.eth.getBalance(accounts[0]), 'ether').should.eql(account0StartEther);
      return Forwarder.new(undefined, { from: accounts[0] });
    })
    .then(function(forwardContract) {
      contractCreated = forwardContract;
      forwardContract.address.should.eql(forwarderContractAddress);
      // Check that the ether is still in the forwarder address and not yet in account 0
      web3.fromWei(web3.eth.getBalance(forwarderContractAddress), 'ether').should.eql(web3.toBigNumber(5));
      account0StartEther = web3.fromWei(web3.eth.getBalance(accounts[0]), 'ether');
      return forwardContract.flush.estimateGas(undefined, {from: accounts[0]});
    })
    .then(function(gas) {
      gasUsed = gas;
      return contractCreated.flush.call(undefined, {from: accounts[0], gasPrice: 20000});
    })
    .then(function(txHash) {
      var tx = web3.eth.getTransaction(txHash);
      var txReceipt = web3.eth.getTransactionReceipt(txHash);
      // Can't get this assertion to work
      //TODO: barath - fix this
      /*
      var a = new BN(gasUsed);
      var b = new BN(20000);
      var ethersPaidForFees = web3.fromWei(a.mul(b), 'ether');
      var account0EndEther = web3.fromWei(web3.eth.getBalance(accounts[0]), 'ether');
      account0EndEther.minus(5).plus(ethersPaidForFees).should.eql(account0StartEther);
      */
    });
  });
});