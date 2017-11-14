/* jshint undef: false, unused: true */

require('assert');
require('should');
const Promise = require('bluebird');
const co = Promise.coroutine;
const _ = require('lodash');

const helpers = require('./helpers');

// Used to build the solidity tightly packed buffer to sha3
const util = require('ethereumjs-util');
const crypto = require('crypto');
const WalletSimple = artifacts.require('./WalletSimple.sol');
const FixedSupplyToken = artifacts.require('./FixedSupplyToken.sol');

contract('WalletSimple', function(accounts) {
  let wallet;
  let walletEvents;
  let watcher;

  // Set up and tear down events logging on all tests. the wallet will be set up in the before() of each test block.
  beforeEach(function() {
    if (wallet) {
      walletEvents = [];
      // Set up event watcher
      watcher = wallet.allEvents({}, function (error, event) {
        walletEvents.push(event);
      });
    }
  });
  afterEach(function() {
    if (watcher) {
      watcher.stopWatching();
    }
  });

  // Taken from http://solidity.readthedocs.io/en/latest/frequently-asked-questions.html -
  // The automatic accessor function for a public state variable of array type only returns individual elements.
  // If you want to return the complete array, you have to manually write a function to do that.
  const getSigners = co(function *getSigners(wallet) {
    const signers = [];
    let i = 0;
    while (true) {
      try {
        const signer = yield wallet.signers.call(i++);
        signers.push(signer);
      } catch (e) {
        break;
      }
    }
    return signers;
  });

  describe('Wallet creation', function() {
    it('2 of 3 multisig wallet', co(function *() {
      const wallet = yield WalletSimple.new([accounts[0], accounts[1], accounts[2]]);

      const signers = yield getSigners(wallet);
      signers.should.eql([accounts[0], accounts[1], accounts[2]]);

      const isSafeMode = yield wallet.safeMode.call();
      isSafeMode.should.eql(false);

      const isSignerArray = yield Promise.all([
        wallet.isSigner.call(accounts[0]),
        wallet.isSigner.call(accounts[1]),
        wallet.isSigner.call(accounts[2]),
        wallet.isSigner.call(accounts[3])
      ]);

      isSignerArray.length.should.eql(4);
      isSignerArray[0].should.eql(true);
      isSignerArray[1].should.eql(true);
      isSignerArray[2].should.eql(true);
      isSignerArray[3].should.eql(false);
    }));

    it('Not enough signer addresses', co(function *() {
      try {
        yield WalletSimple.new([accounts[0]]);
        throw new Error('should not be here');
      } catch(e) {
        e.message.should.not.containEql('should not be here');
      }
    }));
  });

  describe('Deposits', function() {
    before(co(function *() {
      wallet = yield WalletSimple.new([accounts[0], accounts[1], accounts[2]]);
    }));

    it('Should emit event on deposit', co(function *() {
      web3.eth.sendTransaction({ from: accounts[0], to: wallet.address, value: web3.toWei(20, 'ether') });
      yield helpers.waitForEvents(walletEvents, 1); // wait for events to come in
      const depositEvent = _.find(walletEvents, function(event) {
        return event.event === 'Deposited';
      });
      depositEvent.args.from.should.eql(accounts[0]);
      depositEvent.args.value.should.eql(web3.toBigNumber(web3.toWei(20, 'ether')));
    }));

    it('Should emit event with data on deposit', co(function *() {
      web3.eth.sendTransaction({ from: accounts[0], to: wallet.address, value: web3.toWei(30, 'ether'), data: '0xabcd' });
      yield helpers.waitForEvents(walletEvents, 1); // wait for events to come in
      const depositEvent = _.find(walletEvents, function(event) {
        return event.event === 'Deposited';
      });
      depositEvent.args.from.should.eql(accounts[0]);
      depositEvent.args.value.should.eql(web3.toBigNumber(web3.toWei(30, 'ether')));
      depositEvent.args.data.should.eql('0xabcd');
    }));
  });

  /*
  Commented out because tryInsertSequenceId and recoverAddressFromSignature is private. Uncomment the private and tests to test this.
  Functionality is also tested in the sendMultiSig tests.
  */

  describe("Recover address from signature", function() {
    before(co(function *() {
      wallet = yield WalletSimple.new([accounts[0], accounts[1], accounts[2]]);
    }));

    it("Check for matching implementation with web3.eth.sign (50 iterations)", co(function *() {
      for (let i=0; i<50; i++) {
        // Get a random operation hash to sign
        const signerAddress = accounts[Math.floor(Math.random() * 10)];
        const sequenceId = Math.floor(Math.random() * 1000);
        const operationHash = helpers.getSha3ForConfirmationTx(accounts[9], 10, "", Math.floor((new Date().getTime()) / 1000), sequenceId);
        const signature = web3.eth.sign(signerAddress, operationHash);
        if (signature.length !== 132) {
          // TestRPC is signing incorrectly (returning unpadded sigs)
          continue;
        }
        console.log((i+1) + ": Operation hash: " + operationHash + ", Signer: " + signerAddress + ", Sig: " + signature);
        const recoveredAddress = yield wallet.recoverAddressFromSignature.call(util.addHexPrefix(operationHash), signature);
        recoveredAddress.should.eql(signerAddress);
      }
    }));
  });

  describe("Sequence ID anti-replay protection", function() {
    before(co(function *() {
      wallet = yield WalletSimple.new([accounts[0], accounts[1], accounts[2]]);
    }));

    const getSequenceId = co(function *() {
      const sequenceIdString = yield wallet.getNextSequenceId.call();
      return parseInt(sequenceIdString);
    });

    it("Authorized signer can request and insert an id", co(function *() {
      let sequenceId = yield getSequenceId();
      sequenceId.should.eql(1);
      yield wallet.tryInsertSequenceId(sequenceId, { from: accounts[0] });
      sequenceId = yield getSequenceId();
      sequenceId.should.eql(2);
    }));

    it("Non-signer cannot insert an id", co(function *() {
      const sequenceId = yield getSequenceId();

      try {
        yield wallet.tryInsertSequenceId(sequenceId, { from: accounts[8] });
        throw new Error("should not have inserted successfully");
      } catch(err) {
        err.message.toString().should.startWith("Error: VM Exception");
      }

      // should be unchanged
      const newSequenceId = yield getSequenceId();
      sequenceId.should.eql(newSequenceId);
    }));

    // FIXME BG-2417
    xit("Can request large sequence ids", co(function *() {
      for (let i=0; i<30; i++) {
        let sequenceId = yield getSequenceId();
        // Increase by 1000 each time to test for big numbers (there will be holes, this is ok)
        sequenceId += 1000;
        yield wallet.tryInsertSequenceId(sequenceId, { from: accounts[0] });
        const newSequenceId = yield getSequenceId();
        newSequenceId.should.eql(sequenceId + 1);
      }
    }));

    // FIXME BG-2417
    xit("Can request lower but unused recent sequence id within the window", co(function *() {
      const windowSize = 10;
      let sequenceId = yield getSequenceId();
      let originalNextSequenceId = sequenceId;
      // Try for 9 times (windowsize - 1) because the last window was used already
      for (let i=0; i < (windowSize - 1); i++) {
        sequenceId -= 50; // since we were incrementing 1000 per time, this should be unused
        yield wallet.tryInsertSequenceId(sequenceId, { from: accounts[0] });
      }
      let newSequenceId = yield getSequenceId();
      // we should still get the same next sequence id since we were using old ids
      newSequenceId.should.eql(originalNextSequenceId);
    }));

    it("Cannot request lower but used recent sequence id within the window", co(function *() {
      let sequenceId = yield getSequenceId();
      sequenceId -= 50; // we used this in the previous test
      try {
        yield wallet.tryInsertSequenceId(sequenceId, { from: accounts[8] });
        throw new Error("should not have inserted successfully");
      } catch(err) {
        err.message.toString().should.startWith("Error: VM Exception");
      }
    }));

    it("Cannot request lower used sequence id outside the window", co(function *() {
      try {
        yield wallet.tryInsertSequenceId(1, { from: accounts[8] });
        throw new Error("should not have inserted successfully");
      } catch(err) {
        err.message.toString().should.startWith("Error: VM Exception");
      }
    }));
  });

  // Helper to get the operation hash, sign it, and then send it using sendMultiSig
  const sendMultiSigTestHelper = co(function *(params) {
    assert(params.msgSenderAddress);
    assert(params.otherSignerAddress);
    assert(params.wallet);

    assert(params.toAddress);
    assert(params.amount);
    assert(params.data === '' || params.data);
    assert(params.expireTime);
    assert(params.sequenceId);

    // For testing, allow arguments to override the parameters above,
    // as if the other signer or message sender were changing them
    const otherSignerArgs = _.extend({}, params, params.otherSignerArgs);
    const msgSenderArgs = _.extend({}, params, params.msgSenderArgs);

    // Get the operation hash to be signed
    const operationHash = helpers.getSha3ForConfirmationTx(
      otherSignerArgs.toAddress,
      otherSignerArgs.amount,
      otherSignerArgs.data,
      otherSignerArgs.expireTime,
      otherSignerArgs.sequenceId
    );
    const signature = web3.eth.sign(params.otherSignerAddress, operationHash);

    yield params.wallet.sendMultiSig(
      msgSenderArgs.toAddress,
      web3.toWei(msgSenderArgs.amount, 'ether'),
      msgSenderArgs.data,
      msgSenderArgs.expireTime,
      msgSenderArgs.sequenceId,
      signature,
      { from: params.msgSenderAddress }
    );
  });

  // Helper to expect successful execute and confirm
  const expectSuccessfulSendMultiSig = co(function *(params) {
    const destinationAccountStartEther = web3.fromWei(web3.eth.getBalance(params.toAddress), 'ether');
    const msigWalletStartEther = web3.fromWei(web3.eth.getBalance(params.wallet.address), 'ether');

    const result = yield sendMultiSigTestHelper(params);

    // Check the post-transaction balances
    const destinationAccountEndEther = web3.fromWei(web3.eth.getBalance(params.toAddress), 'ether');
    destinationAccountStartEther.plus(params.amount).should.eql(destinationAccountEndEther);
    const msigWalletEndEther = web3.fromWei(web3.eth.getBalance(params.wallet.address), 'ether');
    msigWalletStartEther.minus(params.amount).should.eql(msigWalletEndEther);

    return result;
  });

  // Helper to expect failed execute and confirm
  const expectFailSendMultiSig = co(function *(params) {
    const destinationAccountStartEther = web3.fromWei(web3.eth.getBalance(params.toAddress), 'ether');
    const msigWalletStartEther = web3.fromWei(web3.eth.getBalance(params.wallet.address), 'ether');

    try {
      yield sendMultiSigTestHelper(params);
      throw new Error('should not have sent successfully');
    } catch(err) {
      err.message.toString().should.startWith('Error: VM Exception');
    }

    // Check the balances after the transaction
    const destinationAccountEndEther = web3.fromWei(web3.eth.getBalance(params.toAddress), 'ether');
    destinationAccountStartEther.plus(0).should.eql(destinationAccountEndEther);
    const msigWalletEndEther = web3.fromWei(web3.eth.getBalance(params.wallet.address), 'ether');
    msigWalletStartEther.minus(0).should.eql(msigWalletEndEther);
  });

  describe('Transaction sending using sendMultiSig', function() {
    before(co(function *() {
      // Create and fund the wallet
      wallet = yield WalletSimple.new([accounts[0], accounts[1], accounts[2]]);
      web3.eth.sendTransaction({ from: accounts[0], to: wallet.address, value: web3.toWei(200000, 'ether') });
      web3.fromWei(web3.eth.getBalance(wallet.address), 'ether').should.eql(web3.toBigNumber(200000));
    }));
    let sequenceId;
    beforeEach(co(function *() {
      // Run before each test. Sets the sequence ID up to be used in the tests
      const sequenceIdString = yield wallet.getNextSequenceId.call();
      sequenceId = parseInt(sequenceIdString);
    }));

    it('Send out 50 ether with sendMultiSig', co(function *() {
      // We are not using the helper here because we want to check the operation hash in events
      const destinationAccount = accounts[5];
      const amount = 50;
      const expireTime = Math.floor((new Date().getTime()) / 1000) + 60; // 60 seconds
      const data = 'abcde35f123';

      const destinationAccountStartEther = web3.fromWei(web3.eth.getBalance(destinationAccount), 'ether');
      const msigWalletStartEther = web3.fromWei(web3.eth.getBalance(wallet.address), 'ether');

      let operationHash = helpers.getSha3ForConfirmationTx(destinationAccount, amount, data, expireTime, sequenceId);
      const sig = web3.eth.sign(accounts[1], operationHash);
      operationHash = '0x' + operationHash;

      yield wallet.sendMultiSig(destinationAccount, web3.toWei(amount, 'ether'), data, expireTime, sequenceId, sig, { from: accounts[0] });
      const destinationAccountEndEther = web3.fromWei(web3.eth.getBalance(destinationAccount), 'ether');
      destinationAccountStartEther.plus(amount).should.eql(destinationAccountEndEther);

      // Check wallet balance
      const msigWalletEndEther = web3.fromWei(web3.eth.getBalance(wallet.address), 'ether');
      msigWalletStartEther.minus(amount).should.eql(msigWalletEndEther);

      yield helpers.waitForEvents(walletEvents, 2); // wait for events to come in

      // Check wallet events for Transacted event
      const transactedEvent = _.find(walletEvents, function(event) {
        return event.event === 'Transacted';
      });
      transactedEvent.args.msgSender.should.eql(accounts[0]);
      transactedEvent.args.otherSigner.should.eql(accounts[1]);
      transactedEvent.args.operation.should.eql(util.addHexPrefix(operationHash));
      transactedEvent.args.value.should.eql(web3.toBigNumber(web3.toWei(amount, 'ether')));
      transactedEvent.args.toAddress.should.eql(destinationAccount);
      transactedEvent.args.data.should.eql(util.addHexPrefix(new Buffer(data).toString('hex')));
    }));

    it('Stress test: 20 rounds of sendMultiSig', co(function *() {
      for (let round=0; round < 20; round++) {
        const destinationAccount = accounts[2];
        const amount = _.random(1,9);
        const expireTime = Math.floor((new Date().getTime()) / 1000) + 60; // 60 seconds
        const data = crypto.randomBytes(20).toString('hex');

        const operationHash = helpers.getSha3ForConfirmationTx(destinationAccount, amount, data, expireTime, sequenceId);
        const sig = web3.eth.sign(accounts[0], operationHash);
        if (sig.length !== 132) {
          // TestRPC is signing incorrectly (returning unpadded sigs)
          continue;
        }

        console.log('ExpectSuccess ' + round + ': ' + amount + 'ETH, seqId: ' + sequenceId + ', operationHash: ' + operationHash + ', sig: ' + sig);

        const destinationAccountStartEther = web3.fromWei(web3.eth.getBalance(destinationAccount), 'ether');
        const msigWalletStartEther = web3.fromWei(web3.eth.getBalance(wallet.address), 'ether');
        yield wallet.sendMultiSig(destinationAccount, web3.toWei(amount, 'ether'), data, expireTime, sequenceId, sig, { from: accounts[1] });

        // Check other account balance
        const destinationAccountEndEther = web3.fromWei(web3.eth.getBalance(destinationAccount), 'ether');
        destinationAccountStartEther.plus(amount).should.eql(destinationAccountEndEther);

        // Check wallet balance
        const msigWalletEndEther = web3.fromWei(web3.eth.getBalance(wallet.address), 'ether');
        msigWalletStartEther.minus(amount).should.eql(msigWalletEndEther);

        // Increment sequence id
        sequenceId++;
      }
    }));

    it('Stress test: 10 rounds of attempting to reuse sequence ids - should fail', co(function *() {
      sequenceId -= 10; // these sequence ids already used
      for (let round=0; round < 10; round++) {
        const destinationAccount = accounts[2];
        const amount = _.random(1,9);
        const expireTime = Math.floor((new Date().getTime()) / 1000) + 60; // 60 seconds
        const data = crypto.randomBytes(20).toString('hex');

        const operationHash = helpers.getSha3ForConfirmationTx(destinationAccount, amount, data, expireTime, sequenceId);
        const sig = web3.eth.sign(accounts[0], operationHash);
        if (sig.length !== 132) {
          // TestRPC is signing incorrectly (returning unpadded sigs)
          continue;
        }

        console.log('ExpectFail ' + round + ': ' + amount + 'ETH, seqId: ' + sequenceId + ', operationHash: ' + operationHash + ', sig: ' + sig);
        const destinationAccountStartEther = web3.fromWei(web3.eth.getBalance(destinationAccount), 'ether');
        const msigWalletStartEther = web3.fromWei(web3.eth.getBalance(wallet.address), 'ether');
        try {
          yield wallet.sendMultiSig(destinationAccount, web3.toWei(amount, 'ether'), data, expireTime, sequenceId, sig, { from: accounts[1] });
          throw new Error('should not be here');
        } catch(err) {
          err.message.toString().should.startWith('Error: VM Exception');
        }

        // Check other account balance
        const destinationAccountEndEther = web3.fromWei(web3.eth.getBalance(destinationAccount), 'ether');
        destinationAccountStartEther.plus(0).should.eql(destinationAccountEndEther);

        // Check wallet balance
        const msigWalletEndEther = web3.fromWei(web3.eth.getBalance(wallet.address), 'ether');
        msigWalletStartEther.minus(0).should.eql(msigWalletEndEther);

        // Increment sequence id
        sequenceId++;
      }
    }));

    it('Stress test: 20 rounds of confirming in a single tx from an incorrect sender - should fail', co(function *() {
      const sequenceIdString = yield wallet.getNextSequenceId.call();
      sequenceId = parseInt(sequenceIdString);

      for (let round=0; round < 20; round++) {
        const destinationAccount = accounts[2];
        const amount = _.random(1,9);
        const expireTime = Math.floor((new Date().getTime()) / 1000) + 60; // 60 seconds
        const data = crypto.randomBytes(20).toString('hex');

        const operationHash = helpers.getSha3ForConfirmationTx(destinationAccount, amount, data, expireTime, sequenceId);
        const sig = web3.eth.sign(accounts[5+round%5], operationHash);
        if (sig.length !== 132) {
          // TestRPC is signing incorrectly (returning unpadded sigs)
          continue;
        }

        console.log('ExpectFail ' + round + ': ' + amount + 'ETH, seqId: ' + sequenceId + ', operationHash: ' + operationHash + ', sig: ' + sig);
        const destinationAccountStartEther = web3.fromWei(web3.eth.getBalance(destinationAccount), 'ether');
        const msigWalletStartEther = web3.fromWei(web3.eth.getBalance(wallet.address), 'ether');
        try {
          yield wallet.sendMultiSig(destinationAccount, web3.toWei(amount, 'ether'), data, expireTime, sequenceId, sig, { from: accounts[1] });
          throw new Error('should not be here');
        } catch(err) {
          err.message.toString().should.startWith('Error: VM Exception');
        }

        // Check other account balance
        const destinationAccountEndEther = web3.fromWei(web3.eth.getBalance(destinationAccount), 'ether');
        destinationAccountStartEther.plus(0).should.eql(destinationAccountEndEther);

        // Check wallet balance
        const msigWalletEndEther = web3.fromWei(web3.eth.getBalance(wallet.address), 'ether');
        msigWalletStartEther.minus(0).should.eql(msigWalletEndEther);

        // Increment sequence id
        sequenceId++;
      }
    }));

    it('Msg sender changing the amount should fail', co(function *() {
      const params = {
        msgSenderAddress: accounts[0],
        otherSignerAddress: accounts[1],
        wallet: wallet,
        toAddress: accounts[8],
        amount: 15,
        data: '',
        expireTime: Math.floor((new Date().getTime()) / 1000) + 60,
        sequenceId: sequenceId
      };

      // override with different amount
      params.msgSenderArgs = {
        amount: 20
      };

      yield expectFailSendMultiSig(params);
    }));

    it('Msg sender changing the destination account should fail', co(function *() {
      const params = {
        msgSenderAddress: accounts[1],
        otherSignerAddress: accounts[0],
        wallet: wallet,
        toAddress: accounts[5],
        amount: 25,
        data: '001122ee',
        expireTime: Math.floor((new Date().getTime()) / 1000) + 60,
        sequenceId: sequenceId
      };

      // override with different amount
      params.msgSenderArgs = {
        toAddress: accounts[6]
      };

      yield expectFailSendMultiSig(params);
    }));

    it('Msg sender changing the data should fail', co(function *() {
      const params = {
        msgSenderAddress: accounts[1],
        otherSignerAddress: accounts[2],
        wallet: wallet,
        toAddress: accounts[0],
        amount: 30,
        data: 'abcdef',
        expireTime: Math.floor((new Date().getTime()) / 1000) + 60,
        sequenceId: sequenceId
      };

      // override with different amount
      params.msgSenderArgs = {
        data: '12bcde'
      };

      yield expectFailSendMultiSig(params);
    }));

    it('Msg sender changing the expire time should fail', co(function *() {
      const params = {
        msgSenderAddress: accounts[0],
        otherSignerAddress: accounts[1],
        wallet: wallet,
        toAddress: accounts[2],
        amount: 50,
        data: 'abcdef',
        expireTime: Math.floor((new Date().getTime()) / 1000) + 60,
        sequenceId: sequenceId
      };

      // override with different amount
      params.msgSenderArgs = {
        expireTime: Math.floor((new Date().getTime()) / 1000) + 1000
      };

      yield expectFailSendMultiSig(params);
    }));

    it('Same owner signing twice should fail', co(function *() {
      const params = {
        msgSenderAddress: accounts[2],
        otherSignerAddress: accounts[2],
        wallet: wallet,
        toAddress: accounts[9],
        amount: 51,
        data: 'abcdef',
        expireTime: Math.floor((new Date().getTime()) / 1000) + 60,
        sequenceId: sequenceId
      };

      yield expectFailSendMultiSig(params);
    }));

    it('Sending from an unauthorized signer (but valid other signature) should fail', co(function *() {
      const params = {
        msgSenderAddress: accounts[7],
        otherSignerAddress: accounts[2],
        wallet: wallet,
        toAddress: accounts[1],
        amount: 52,
        data: '',
        expireTime: Math.floor((new Date().getTime()) / 1000) + 60,
        sequenceId: sequenceId
      };

      yield expectFailSendMultiSig(params);
    }));

    it('Sending from an authorized signer (but unauthorized other signer) should fail', co(function *() {
      const params = {
        msgSenderAddress: accounts[0],
        otherSignerAddress: accounts[6],
        wallet: wallet,
        toAddress: accounts[6],
        amount: 53,
        data: 'ab1234',
        expireTime: Math.floor((new Date().getTime()) / 1000) + 60,
        sequenceId: sequenceId
      };

      yield expectFailSendMultiSig(params);
    }));

    let usedSequenceId;
    it('Sending with expireTime very far out should work', co(function *() {
      const params = {
        msgSenderAddress: accounts[0],
        otherSignerAddress: accounts[1],
        wallet: wallet,
        toAddress: accounts[5],
        amount: 60,
        data: '',
        expireTime: Math.floor((new Date().getTime()) / 1000) + 60,
        sequenceId: sequenceId
      };

      yield expectSuccessfulSendMultiSig(params);
      usedSequenceId = sequenceId;
    }));

    it('Sending with expireTime in the past should fail', co(function *() {
      const params = {
        msgSenderAddress: accounts[0],
        otherSignerAddress: accounts[2],
        wallet: wallet,
        toAddress: accounts[2],
        amount: 55,
        data: 'aa',
        expireTime: Math.floor((new Date().getTime()) / 1000) - 100,
        sequenceId: sequenceId
      };

      yield expectFailSendMultiSig(params);
    }));

    it('Can send with a sequence ID that is not sequential but higher than previous', co(function *() {
      sequenceId = 1000;
      const params = {
        msgSenderAddress: accounts[1],
        otherSignerAddress: accounts[2],
        wallet: wallet,
        toAddress: accounts[5],
        amount: 60,
        data: 'abcde35f123',
        expireTime: Math.floor((new Date().getTime()) / 1000) + 60,
        sequenceId: sequenceId
      };

      yield expectSuccessfulSendMultiSig(params);
    }));

    it('Can send with a sequence ID that is unused but lower than the previous (not strictly monotonic increase)', co(function *() {
      sequenceId = 200;
      const params = {
        msgSenderAddress: accounts[0],
        otherSignerAddress: accounts[1],
        wallet: wallet,
        toAddress: accounts[5],
        amount: 61,
        data: '100135f123',
        expireTime: Math.floor((new Date().getTime()) / 1000) + 60,
        sequenceId: sequenceId
      };

      yield expectSuccessfulSendMultiSig(params);
    }));

    it('Send with a sequence ID that has been previously used should fail', co(function *() {
      sequenceId = usedSequenceId || (sequenceId - 1);
      const params = {
        msgSenderAddress: accounts[2],
        otherSignerAddress: accounts[1],
        wallet: wallet,
        toAddress: accounts[5],
        amount: 62,
        data: '',
        expireTime: Math.floor((new Date().getTime()) / 1000) + 60,
        sequenceId: sequenceId
      };

      yield expectFailSendMultiSig(params);
    }));

    it('Send with a sequence ID that is used many transactions ago (lower than previous 10) should fail', co(function *() {
      sequenceId = 1;
      const params = {
        msgSenderAddress: accounts[0],
        otherSignerAddress: accounts[1],
        wallet: wallet,
        toAddress: accounts[5],
        amount: 63,
        data: '5566abfe',
        expireTime: Math.floor((new Date().getTime()) / 1000) + 60,
        sequenceId: sequenceId
      };

      yield expectFailSendMultiSig(params);
    }));
  });

  describe('Safe mode', function() {
    before(co(function *() {
      // Create and fund the wallet
      wallet = yield WalletSimple.new([accounts[0], accounts[1], accounts[2]]);
      web3.eth.sendTransaction({ from: accounts[0], to: wallet.address, value: web3.toWei(50000, 'ether') });
    }));

    it('Cannot be activated by unauthorized user', co(function *() {
      try {
        yield wallet.activateSafeMode({ from: accounts[5] });
        throw new Error('should not be here');
      } catch(err) {
        err.message.toString().should.startWith('Error: VM Exception');
      }
      const isSafeMode = yield wallet.safeMode.call();
      isSafeMode.should.eql(false);
    }));

    it('Can be activated by any authorized signer', co(function *() {
      for (let i=0; i<3; i++) {
        const wallet = yield WalletSimple.new([accounts[0], accounts[1], accounts[2]]);
        yield wallet.activateSafeMode({ from: accounts[i] });
        const isSafeMode = yield wallet.safeMode.call();
        isSafeMode.should.eql(true);
      }
    }));

    it('Cannot send transactions to external addresses in safe mode', co(function *() {
      let isSafeMode = yield wallet.safeMode.call();
      isSafeMode.should.eql(false);
      yield wallet.activateSafeMode({ from: accounts[1] });
      isSafeMode = yield wallet.safeMode.call();
      isSafeMode.should.eql(true);
      yield helpers.waitForEvents(walletEvents, 1);
      const safeModeEvent = _.find(walletEvents, function(event) {
        return event.event === 'SafeModeActivated';
      });
      safeModeEvent.args.msgSender.should.eql(accounts[1]);

      const params = {
        msgSenderAddress: accounts[0],
        otherSignerAddress: accounts[1],
        wallet: wallet,
        toAddress: accounts[8],
        amount: 22,
        data: '100135f123',
        expireTime: Math.floor((new Date().getTime()) / 1000) + 60,
        sequenceId: 10001
      };

      yield expectFailSendMultiSig(params);
    }));

    it('Can send transactions to signer addresses in safe mode', co(function *() {
      const params = {
        msgSenderAddress: accounts[2],
        otherSignerAddress: accounts[1],
        wallet: wallet,
        toAddress: accounts[0],
        amount: 28,
        data: '100135f123',
        expireTime: Math.floor((new Date().getTime()) / 1000) + 60,
        sequenceId: 9000
      };

      yield expectSuccessfulSendMultiSig(params);
    }));
  });

  describe('Forwarder addresses', function() {
    const forwardAbi = [{ constant: false,inputs: [],name: 'flush',outputs: [],type: 'function' },{ constant: true,inputs: [],name: 'destinationAddress',outputs: [{ name: '',type: 'address' }],type: 'function' },{ inputs: [],type: 'constructor' }];
    const forwardContract = web3.eth.contract(forwardAbi);

    it('Create and forward', co(function *() {
      const wallet = yield WalletSimple.new([accounts[0], accounts[1], accounts[2]]);
      const forwarderContractAddress = util.bufferToHex(util.generateAddress(wallet.address, 0));
      yield wallet.createForwarder({ from: accounts[0] });
      web3.fromWei(web3.eth.getBalance(forwarderContractAddress), 'ether').should.eql(web3.toBigNumber(0));

      web3.eth.sendTransaction({ from: accounts[1], to: forwarderContractAddress, value: web3.toWei(200, 'ether') });

      // Verify funds forwarded
      web3.fromWei(web3.eth.getBalance(forwarderContractAddress), 'ether').should.eql(web3.toBigNumber(0));
      web3.fromWei(web3.eth.getBalance(wallet.address), 'ether').should.eql(web3.toBigNumber(200));
    }));

    it('Multiple forward contracts', co(function *() {
      const numForwardAddresses = 10;
      const etherEachSend = 4;
      const wallet = yield WalletSimple.new([accounts[2], accounts[3], accounts[4]]);

      // Create forwarders and send 4 ether to each of the addresses
      for (let i=0; i < numForwardAddresses; i++) {
        yield wallet.createForwarder({ from: accounts[2] });

        // Derive out the forwarder address and send funds to it
        const forwardAddress = util.bufferToHex(util.generateAddress(wallet.address, i));
        web3.eth.sendTransaction({ from: accounts[1], to: forwardAddress, value: web3.toWei(etherEachSend, 'ether') });
      }

      // Verify all the forwarding is complete
      web3.fromWei(web3.eth.getBalance(wallet.address), 'ether').should.eql(web3.toBigNumber(etherEachSend * numForwardAddresses));
    }));

    it('Send before create, then flush', co(function *() {
      const wallet = yield WalletSimple.new([accounts[3], accounts[4], accounts[5]]);
      const forwarderContractAddress = util.bufferToHex(util.generateAddress(wallet.address, 0));
      web3.eth.sendTransaction({ from: accounts[1], to: forwarderContractAddress, value: web3.toWei(300, 'ether') });
      web3.fromWei(web3.eth.getBalance(forwarderContractAddress), 'ether').should.eql(web3.toBigNumber(300));
      web3.fromWei(web3.eth.getBalance(wallet.address), 'ether').should.eql(web3.toBigNumber(0));

      yield wallet.createForwarder({ from: accounts[3] });

      // Verify that funds are still stuck in forwarder contract address
      web3.fromWei(web3.eth.getBalance(forwarderContractAddress), 'ether').should.eql(web3.toBigNumber(300));
      web3.fromWei(web3.eth.getBalance(wallet.address), 'ether').should.eql(web3.toBigNumber(0));

      // Flush and verify
      forwardContract.at(forwarderContractAddress).flush({ from: accounts[0] });
      web3.fromWei(web3.eth.getBalance(forwarderContractAddress), 'ether').should.eql(web3.toBigNumber(0));
      web3.fromWei(web3.eth.getBalance(wallet.address), 'ether').should.eql(web3.toBigNumber(300));
    }));

    it('Flush sent from external account', co(function *() {
      const wallet = yield WalletSimple.new([accounts[4], accounts[5], accounts[6]]);
      const forwarderContractAddress = util.bufferToHex(util.generateAddress(wallet.address, 0));
      web3.eth.sendTransaction({ from: accounts[1], to: forwarderContractAddress, value: web3.toWei(300, 'ether') });
      web3.fromWei(web3.eth.getBalance(forwarderContractAddress), 'ether').should.eql(web3.toBigNumber(300));
      web3.fromWei(web3.eth.getBalance(wallet.address), 'ether').should.eql(web3.toBigNumber(0));

      yield wallet.createForwarder({ from: accounts[5] });

      // Verify that funds are still stuck in forwarder contract address
      web3.fromWei(web3.eth.getBalance(forwarderContractAddress), 'ether').should.eql(web3.toBigNumber(300));
      web3.fromWei(web3.eth.getBalance(wallet.address), 'ether').should.eql(web3.toBigNumber(0));

      // Flush and verify
      forwardContract.at(forwarderContractAddress).flush({ from: accounts[0] });
      web3.fromWei(web3.eth.getBalance(forwarderContractAddress), 'ether').should.eql(web3.toBigNumber(0));
      web3.fromWei(web3.eth.getBalance(wallet.address), 'ether').should.eql(web3.toBigNumber(300));
    }));
  });

  describe('ERC20 token transfers', function() {
    let fixedSupplyTokenContract;
    before(co(function *() {
      // Create and fund the wallet
      wallet = yield WalletSimple.new([accounts[4], accounts[5], accounts[6]]);
      fixedSupplyTokenContract = yield FixedSupplyToken.new(undefined, { from: accounts[0] });
      const balance = yield fixedSupplyTokenContract.balanceOf.call(accounts[0]);
      balance.should.eql(web3.toBigNumber(1000000));
    }));

    it('Receive and Send tokens from main wallet contract', co(function *() {
      
      yield fixedSupplyTokenContract.transfer(wallet.address, 100, { from: accounts[0] });
      const balance = yield fixedSupplyTokenContract.balanceOf.call(accounts[0]);
      balance.should.eql(web3.toBigNumber(1000000 - 100));
      const msigWalletStartTokens = yield fixedSupplyTokenContract.balanceOf.call(wallet.address);
      msigWalletStartTokens.should.eql(web3.toBigNumber(100));
      
      const sequenceIdString = yield wallet.getNextSequenceId.call();
      const sequenceId = parseInt(sequenceIdString);

      const destinationAccount = accounts[5];
      const amount = 50;
      const expireTime = Math.floor((new Date().getTime()) / 1000) + 60; // 60 seconds

      const destinationAccountStartTokens = yield fixedSupplyTokenContract.balanceOf.call(accounts[5]);
      destinationAccountStartTokens.should.eql(web3.toBigNumber(0));

      let operationHash = helpers.getSha3ForConfirmationTokenTx(destinationAccount, amount, fixedSupplyTokenContract.address, expireTime, sequenceId);
      const sig = web3.eth.sign(accounts[4], operationHash);
      operationHash = '0x' + operationHash;
  
      yield wallet.sendMultiSigToken(destinationAccount, amount, fixedSupplyTokenContract.address, expireTime, sequenceId, sig, { from: accounts[5] });
      const destinationAccountEndTokens = yield fixedSupplyTokenContract.balanceOf.call(destinationAccount);
      destinationAccountStartTokens.plus(amount).should.eql(destinationAccountEndTokens);

      // Check wallet balance
      const msigWalletEndTokens = yield fixedSupplyTokenContract.balanceOf.call(wallet.address);
      msigWalletStartTokens.minus(amount).should.eql(msigWalletEndTokens);
      /* TODO Barath - Get event testing to work
      yield helpers.waitForEvents(walletEvents, 3); // wait for events to come in
      
      // Check wallet events for Token Transacted event
      var tokenTransactedEvent = _.find(walletEvents, function(event) {
        return event.event === 'TokenTransacted';
      });
      tokenTransactedEvent.args.msgSender.should.eql(accounts[4]);
      tokenTransactedEvent.args.otherSigner.should.eql(accounts[5]);
      tokenTransactedEvent.args.operation.should.eql(util.addHexPrefix(operationHash));
      tokenTransactedEvent.args.value.should.eql(web3.toBigNumber(amount));
      tokenTransactedEvent.args.toAddress.should.eql(destinationAccount);
      tokenTransactedEvent.args.tokenContractAddress.should.eql(fixedSupplyTokenContract.address);
      */
    }));

    it('Flush from Forwarder contract', co(function *() {
      const forwarderContractAddress = util.bufferToHex(util.generateAddress(wallet.address, 0));
      wallet.createForwarder({ from: accounts[4] });
      yield fixedSupplyTokenContract.transfer(forwarderContractAddress, 100, { from: accounts[0] });
      const balance = yield fixedSupplyTokenContract.balanceOf.call(accounts[0]);
      balance.should.eql(web3.toBigNumber(1000000 - 100 - 100));
      
      const forwarderContractStartTokens = yield fixedSupplyTokenContract.balanceOf.call(forwarderContractAddress);
      forwarderContractStartTokens.should.eql(web3.toBigNumber(100));
      const walletContractStartTokens = yield fixedSupplyTokenContract.balanceOf.call(wallet.address);

      yield wallet.flushForwarderTokens(forwarderContractAddress, fixedSupplyTokenContract.address, { from: accounts[5] });
      const forwarderAccountEndTokens = yield fixedSupplyTokenContract.balanceOf.call(forwarderContractAddress);
      forwarderAccountEndTokens.should.eql(web3.toBigNumber(0));

      // Check wallet balance
      const walletContractEndTokens = yield fixedSupplyTokenContract.balanceOf.call(wallet.address);
      walletContractStartTokens.plus(100).should.eql(walletContractEndTokens);
      /* TODO Barath - Get event testing for forwarder contract token send to work
      */
    }));

  });

});

