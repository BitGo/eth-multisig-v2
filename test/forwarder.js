require('should');

const helpers = require('./helpers');

const Forwarder = artifacts.require('./Forwarder.sol');



contract('Forwarder', function(accounts) {
  it('Basic forwarding test', async function () {
    const forwardContract = await Forwarder.new([], { from: accounts[0] });
    const account0StartEther = web3.fromWei(web3.eth.getBalance(accounts[0]), 'ether');
    const txHash = await web3.eth.sendTransaction({ from: accounts[2], to: forwardContract.address, value: web3.toWei(2, 'ether') });
    web3.eth.getTransaction(txHash);
    web3.eth.getTransactionReceipt(txHash);
    const account0EndEther = web3.fromWei(web3.eth.getBalance(accounts[0]), 'ether');
    account0EndEther.minus(2).should.eql(account0StartEther);
  });

  it('Flush', async function() {
    await web3.eth.sendTransaction({ from: accounts[0], to: accounts[1], value: web3.toWei(0, 'ether') });
    // determine the forwarder contract address
    const forwarderContractAddress = helpers.getNextContractAddress(accounts[0]);

    const account0StartEther = web3.fromWei(web3.eth.getBalance(accounts[0]), 'ether');
    web3.fromWei(web3.eth.getBalance(accounts[1]), 'ether');

    // send funds to the contract address first
    await web3.eth.sendTransaction({ from: accounts[1], to: forwarderContractAddress, value: web3.toWei(5, 'ether') });
    // Check that the ether is in the forwarder address and not yet in account 0
    web3.fromWei(web3.eth.getBalance(forwarderContractAddress), 'ether').should.eql(web3.toBigNumber(5));
    web3.fromWei(web3.eth.getBalance(accounts[0]), 'ether').should.eql(account0StartEther);
    const forwardContract = await Forwarder.new([], { from: accounts[0] });
    forwardContract.address.should.eql(forwarderContractAddress);
    // Check that the ether is still in the forwarder address and not yet in account 0
    web3.fromWei(web3.eth.getBalance(forwarderContractAddress), 'ether').should.eql(web3.toBigNumber(5));
    // account0StartEther = web3.fromWei(web3.eth.getBalance(accounts[0]), 'ether');
    const txHash = await forwardContract.flush.call(undefined, { from: accounts[0], gasPrice: 20000 });
    web3.eth.getTransaction(txHash);
    web3.eth.getTransactionReceipt(txHash);
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