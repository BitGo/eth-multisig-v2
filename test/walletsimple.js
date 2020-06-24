require('assert');
const should = require('should');
const Promise = require('bluebird');
const _ = require('lodash');

const helpers = require('./helpers');
const { privateKeyForAccount } = require('../testrpc/accounts');

// Used to build the solidity tightly packed buffer to sha3, ecsign
const util = require('ethereumjs-util');
const crypto = require('crypto');

const EthWalletSimple = artifacts.require('./WalletSimple.sol');
const RskWalletSimple = artifacts.require('./RskWalletSimple.sol');
const EtcWalletSimple = artifacts.require('./EtcWalletSimple.sol');
const CeloWalletSimple = artifacts.require('./CeloWalletSimple.sol');
const Forwarder = artifacts.require('./Forwarder.sol');
const FixedSupplyToken = artifacts.require('./FixedSupplyToken.sol');

const assertVMException = (err) => {
  err.message.toString().should.startWith('VM Exception');
};

const createForwarderFromWallet = async (wallet) => {
  const forwarderAddress = helpers.getNextContractAddress(wallet.address);
  await wallet.createForwarder();
  return Forwarder.at(forwarderAddress);
};

const coins = [
  {
    name: 'Eth',
    nativePrefix: 'ETHER',
    tokenPrefix: 'ERC20',
    WalletSimple: EthWalletSimple,
  },
  {
    name: 'Rsk',
    nativePrefix: 'RSK',
    tokenPrefix: 'RSK-ERC20',
    WalletSimple: RskWalletSimple,
  },
  {
    name: 'Etc',
    nativePrefix: 'ETC',
    tokenPrefix: 'ETC-ERC20',
    WalletSimple: EtcWalletSimple,
  },
  {
    name: 'Celo',
    nativePrefix: 'CELO',
    tokenPrefix: 'CELO-ERC20',
    WalletSimple: CeloWalletSimple,
  },
];

coins.forEach(({ name: coinName, nativePrefix, tokenPrefix, WalletSimple }) => {
  contract(`${coinName}WalletSimple`, function(accounts) {
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
    const getSigners = async function getSigners(wallet) {
      const signers = [];
      let i = 0;
      while (true) {
        try {
          const signer = await wallet.signers.call(i++);
          signers.push(signer);
        } catch (e) {
          break;
        }
      }
      return signers;
    };

    describe('Wallet creation', function() {
      it('2 of 3 multisig wallet', async function() {
        const wallet = await WalletSimple.new([accounts[0], accounts[1], accounts[2]]);

        const signers = await getSigners(wallet);
        signers.should.eql([accounts[0], accounts[1], accounts[2]]);

        const isSafeMode = await wallet.safeMode.call();
        isSafeMode.should.eql(false);

        const isSignerArray = await Promise.all([
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
      });

      it('Not enough signer addresses', async function() {
        try {
          await WalletSimple.new([accounts[0]]);
          throw new Error('should not be here');
        } catch(e) {
          e.message.should.not.containEql('should not be here');
        }
      });
    });

    describe('Deposits', function() {
      before(async function() {
        wallet = await WalletSimple.new([accounts[0], accounts[1], accounts[2]]);
      });

      it('Should emit event on deposit', async function() {
        web3.eth.sendTransaction({ from: accounts[0], to: wallet.address, value: web3.toWei(20, 'ether') });
        await helpers.waitForEvents(walletEvents, 1); // wait for events to come in
        const depositEvent = _.find(walletEvents, function(event) {
          return event.event === 'Deposited';
        });
        depositEvent.args.from.should.eql(accounts[0]);
        depositEvent.args.value.should.eql(web3.toBigNumber(web3.toWei(20, 'ether')));
      });

      it('Should emit event with data on deposit', async function() {
        web3.eth.sendTransaction({ from: accounts[0], to: wallet.address, value: web3.toWei(30, 'ether'), data: '0xabcd' });
        await helpers.waitForEvents(walletEvents, 1); // wait for events to come in
        const depositEvent = _.find(walletEvents, function(event) {
          return event.event === 'Deposited';
        });
        depositEvent.args.from.should.eql(accounts[0]);
        depositEvent.args.value.should.eql(web3.toBigNumber(web3.toWei(30, 'ether')));
        depositEvent.args.data.should.eql('0xabcd');
      });
    });

    /*
  Commented out because tryInsertSequenceId and recoverAddressFromSignature is private. Uncomment the private and tests to test this.
  Functionality is also tested in the sendMultiSig tests.

  describe('Recover address from signature', function() {
    before(async function() {
      wallet = await WalletSimple.new([accounts[0], accounts[1], accounts[2]]);
    });

    it('Check for matching implementation with util.ecsign (50 iterations)', async function() {
      for (let i=0; i<50; i++) {
        // Get a random operation hash to sign
        const signerAddress = accounts[Math.floor(Math.random() * 10)];
        const sequenceId = Math.floor(Math.random() * 1000);
        const operationHash = helpers.getSha3ForConfirmationTx(
          accounts[9], 10, '', Math.floor((new Date().getTime()) / 1000), sequenceId
        );
        const sig = util.ecsign(operationHash, privateKeyForAccount(signerAddress));
        console.log(
          (i+1) + ': Operation hash: ' + operationHash.toString('hex') +
          ', Signer: ' + signerAddress + ', Sig: ' + helpers.serializeSignature(sig)
        );
        const recoveredAddress = await wallet.recoverAddressFromSignature.call(
          util.addHexPrefix(operationHash.toString('hex')), helpers.serializeSignature(sig)
        );
        recoveredAddress.should.eql(signerAddress);
      }
    });
  });

  describe('Sequence ID anti-replay protection', function() {
    before(async function() {
      wallet = await WalletSimple.new([accounts[0], accounts[1], accounts[2]]);
    });

    const getSequenceId = async function() {
      const sequenceIdString = await wallet.getNextSequenceId.call();
      return parseInt(sequenceIdString);
    };

    it('Authorized signer can request and insert an id', async function() {
      let sequenceId = await getSequenceId();
      sequenceId.should.eql(1);
      await wallet.tryInsertSequenceId(sequenceId, { from: accounts[0] });
      sequenceId = await getSequenceId();
      sequenceId.should.eql(2);
    });

    it('Non-signer cannot insert an id', async function() {
      const sequenceId = await getSequenceId();

      try {
        await wallet.tryInsertSequenceId(sequenceId, { from: accounts[8] });
        throw new Error('should not have inserted successfully');
      } catch(err) {
        assertVMException(err);
      }

        // should be unchanged
      const newSequenceId = await getSequenceId();
      sequenceId.should.eql(newSequenceId);
    });

    it('Can request large sequence ids', async function() {
      for (let i=0; i<30; i++) {
        let sequenceId = await getSequenceId();
        // Increase by 100 each time to test for big numbers (there will be holes, this is ok)
        sequenceId += 100;
        await wallet.tryInsertSequenceId(sequenceId, { from: accounts[0] });
        const newSequenceId = await getSequenceId();
        newSequenceId.should.eql(sequenceId + 1);
      }
    });

    it('Can request lower but unused recent sequence id within the window', async function() {
      const windowSize = 10;
      let sequenceId = await getSequenceId();
      const originalNextSequenceId = sequenceId;
        // Try for 9 times (windowsize - 1) because the last window was used already
      for (let i=0; i < (windowSize - 1); i++) {
        sequenceId -= 5; // since we were incrementing 100 per time, this should be unused
        await wallet.tryInsertSequenceId(sequenceId, { from: accounts[0] });
      }
      const newSequenceId = await getSequenceId();
        // we should still get the same next sequence id since we were using old ids
      newSequenceId.should.eql(originalNextSequenceId);
    });

    it('Cannot request lower but used recent sequence id within the window', async function() {
      let sequenceId = await getSequenceId();
      sequenceId -= 50; // we used this in the previous test
      try {
        await wallet.tryInsertSequenceId(sequenceId, { from: accounts[8] });
        throw new Error('should not have inserted successfully');
      } catch(err) {
        assertVMException(err);
      }
    });

    it('Cannot request lower used sequence id outside the window', async function() {
      try {
        await wallet.tryInsertSequenceId(1, { from: accounts[8] });
        throw new Error('should not have inserted successfully');
      } catch(err) {
        assertVMException(err);
      }
    });
  });
  */

    // Helper to get the operation hash, sign it, and then send it using sendMultiSig
    const sendMultiSigTestHelper = async function(params) {
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
        params.prefix || nativePrefix,
        otherSignerArgs.toAddress,
        otherSignerArgs.amount,
        otherSignerArgs.data,
        otherSignerArgs.expireTime,
        otherSignerArgs.sequenceId
      );
      const sig = util.ecsign(operationHash, privateKeyForAccount(params.otherSignerAddress));

      await params.wallet.sendMultiSig(
        msgSenderArgs.toAddress,
        web3.toWei(msgSenderArgs.amount, 'ether'),
        msgSenderArgs.data,
        msgSenderArgs.expireTime,
        msgSenderArgs.sequenceId,
        helpers.serializeSignature(sig),
        { from: params.msgSenderAddress }
      );
    };

    // Helper to expect successful execute and confirm
    const expectSuccessfulSendMultiSig = async function(params) {
      const destinationAccountStartEther = web3.fromWei(web3.eth.getBalance(params.toAddress), 'ether');
      const msigWalletStartEther = web3.fromWei(web3.eth.getBalance(params.wallet.address), 'ether');

      const result = await sendMultiSigTestHelper(params);

      // Check the post-transaction balances
      const destinationAccountEndEther = web3.fromWei(web3.eth.getBalance(params.toAddress), 'ether');
      destinationAccountStartEther.plus(params.amount).should.eql(destinationAccountEndEther);
      const msigWalletEndEther = web3.fromWei(web3.eth.getBalance(params.wallet.address), 'ether');
      msigWalletStartEther.minus(params.amount).should.eql(msigWalletEndEther);

      return result;
    };

    // Helper to expect failed execute and confirm
    const expectFailSendMultiSig = async function(params) {
      const destinationAccountStartEther = web3.fromWei(web3.eth.getBalance(params.toAddress), 'ether');
      const msigWalletStartEther = web3.fromWei(web3.eth.getBalance(params.wallet.address), 'ether');

      try {
        await sendMultiSigTestHelper(params);
        throw new Error('should not have sent successfully');
      } catch(err) {
        assertVMException(err);
      }

      // Check the balances after the transaction
      const destinationAccountEndEther = web3.fromWei(web3.eth.getBalance(params.toAddress), 'ether');
      destinationAccountStartEther.plus(0).should.eql(destinationAccountEndEther);
      const msigWalletEndEther = web3.fromWei(web3.eth.getBalance(params.wallet.address), 'ether');
      msigWalletStartEther.minus(0).should.eql(msigWalletEndEther);
    };

    describe('Transaction sending using sendMultiSig', function() {
      before(async function() {
        // Create and fund the wallet
        wallet = await WalletSimple.new([accounts[0], accounts[1], accounts[2]]);
        web3.eth.sendTransaction({ from: accounts[0], to: wallet.address, value: web3.toWei(200000, 'ether') });
        web3.fromWei(web3.eth.getBalance(wallet.address), 'ether').should.eql(web3.toBigNumber(200000));
      });
      let sequenceId;
      beforeEach(async function() {
        // Run before each test. Sets the sequence ID up to be used in the tests
        const sequenceIdString = await wallet.getNextSequenceId.call();
        sequenceId = parseInt(sequenceIdString);
      });

      it('Send out 50 ether with sendMultiSig', async function() {
        // We are not using the helper here because we want to check the operation hash in events
        const destinationAccount = accounts[5];
        const amount = 50;
        const expireTime = Math.floor((new Date().getTime()) / 1000) + 60; // 60 seconds
        const data = 'abcde35f123';

        const destinationAccountStartEther = web3.fromWei(web3.eth.getBalance(destinationAccount), 'ether');
        const msigWalletStartEther = web3.fromWei(web3.eth.getBalance(wallet.address), 'ether');

        const operationHash = helpers.getSha3ForConfirmationTx(nativePrefix, destinationAccount, amount, data, expireTime, sequenceId);
        const sig = util.ecsign(operationHash, privateKeyForAccount(accounts[1]));

        await wallet.sendMultiSig(
          destinationAccount, web3.toWei(amount, 'ether'), data, expireTime, sequenceId, helpers.serializeSignature(sig),
          { from: accounts[0] }
        );
        const destinationAccountEndEther = web3.fromWei(web3.eth.getBalance(destinationAccount), 'ether');
        destinationAccountStartEther.plus(amount).should.eql(destinationAccountEndEther);

        // Check wallet balance
        const msigWalletEndEther = web3.fromWei(web3.eth.getBalance(wallet.address), 'ether');
        msigWalletStartEther.minus(amount).should.eql(msigWalletEndEther);

        await helpers.waitForEvents(walletEvents, 2); // wait for events to come in

        // Check wallet events for Transacted event
        const transactedEvent = _.find(walletEvents, function(event) {
          return event.event === 'Transacted';
        });
        transactedEvent.args.msgSender.should.eql(accounts[0]);
        transactedEvent.args.otherSigner.should.eql(accounts[1]);
        transactedEvent.args.operation.should.eql(util.addHexPrefix(operationHash.toString('hex')));
        transactedEvent.args.value.should.eql(web3.toBigNumber(web3.toWei(amount, 'ether')));
        transactedEvent.args.toAddress.should.eql(destinationAccount);
        transactedEvent.args.data.should.eql(util.addHexPrefix(new Buffer(data).toString('hex')));
      });

      it('Stress test: 20 rounds of sendMultiSig', async function() {
        for (let round=0; round < 20; round++) {
          const destinationAccount = accounts[2];
          const amount = _.random(1,9);
          const expireTime = Math.floor((new Date().getTime()) / 1000) + 60; // 60 seconds
          const data = crypto.randomBytes(20).toString('hex');

          const operationHash = helpers.getSha3ForConfirmationTx(nativePrefix, destinationAccount, amount, data, expireTime, sequenceId);
          const sig = util.ecsign(operationHash, privateKeyForAccount(accounts[0]));

          console.log(
            'ExpectSuccess ' + round + ': ' + amount + 'ETH, seqId: ' + sequenceId +
                        ', operationHash: ' + operationHash.toString('hex') + ', sig: ' + helpers.serializeSignature(sig)
          );

          const destinationAccountStartEther = web3.fromWei(web3.eth.getBalance(destinationAccount), 'ether');
          const msigWalletStartEther = web3.fromWei(web3.eth.getBalance(wallet.address), 'ether');
          await wallet.sendMultiSig(
            destinationAccount, web3.toWei(amount, 'ether'), data, expireTime, sequenceId, helpers.serializeSignature(sig),
            { from: accounts[1] }
          );

          // Check other account balance
          const destinationAccountEndEther = web3.fromWei(web3.eth.getBalance(destinationAccount), 'ether');
          destinationAccountStartEther.plus(amount).should.eql(destinationAccountEndEther);

          // Check wallet balance
          const msigWalletEndEther = web3.fromWei(web3.eth.getBalance(wallet.address), 'ether');
          msigWalletStartEther.minus(amount).should.eql(msigWalletEndEther);

          // Increment sequence id
          sequenceId++;
        }
      });

      it('Stress test: 10 rounds of attempting to reuse sequence ids - should fail', async function() {
        sequenceId -= 10; // these sequence ids already used
        for (let round=0; round < 10; round++) {
          const destinationAccount = accounts[2];
          const amount = _.random(1,9);
          const expireTime = Math.floor((new Date().getTime()) / 1000) + 60; // 60 seconds
          const data = crypto.randomBytes(20).toString('hex');

          const operationHash = helpers.getSha3ForConfirmationTx(nativePrefix, destinationAccount, amount, data, expireTime, sequenceId);
          const sig = util.ecsign(operationHash, privateKeyForAccount(accounts[0]));

          console.log(
            'ExpectFail ' + round + ': ' + amount + 'ETH, seqId: ' + sequenceId +
                        ', operationHash: ' + operationHash.toString('hex') + ', sig: ' + helpers.serializeSignature(sig)
          );
          const destinationAccountStartEther = web3.fromWei(web3.eth.getBalance(destinationAccount), 'ether');
          const msigWalletStartEther = web3.fromWei(web3.eth.getBalance(wallet.address), 'ether');
          try {
            await wallet.sendMultiSig(
              destinationAccount, web3.toWei(amount, 'ether'), data, expireTime, sequenceId, helpers.serializeSignature(sig),
              { from: accounts[1] }
            );
            throw new Error('should not be here');
          } catch(err) {
            assertVMException(err);
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
      });

      it('Stress test: 20 rounds of confirming in a single tx from an incorrect sender - should fail', async function() {
        const sequenceIdString = await wallet.getNextSequenceId.call();
        sequenceId = parseInt(sequenceIdString);

        for (let round=0; round < 20; round++) {
          const destinationAccount = accounts[2];
          const amount = _.random(1,9);
          const expireTime = Math.floor((new Date().getTime()) / 1000) + 60; // 60 seconds
          const data = crypto.randomBytes(20).toString('hex');

          const operationHash = helpers.getSha3ForConfirmationTx(nativePrefix, destinationAccount, amount, data, expireTime, sequenceId);
          const sig = util.ecsign(operationHash, privateKeyForAccount(accounts[5+round%5]));

          console.log(
            'ExpectFail ' + round + ': ' + amount + 'ETH, seqId: ' + sequenceId +
                        ', operationHash: ' + operationHash.toString('hex') + ', sig: ' + helpers.serializeSignature(sig));
          const destinationAccountStartEther = web3.fromWei(web3.eth.getBalance(destinationAccount), 'ether');
          const msigWalletStartEther = web3.fromWei(web3.eth.getBalance(wallet.address), 'ether');
          try {
            await wallet.sendMultiSig(
              destinationAccount, web3.toWei(amount, 'ether'), data, expireTime, sequenceId, helpers.serializeSignature(sig),
              { from: accounts[1] }
            );
            throw new Error('should not be here');
          } catch(err) {
            assertVMException(err);
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
      });

      it('Msg sender changing the amount should fail', async function() {
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

        await expectFailSendMultiSig(params);
      });

      it('Msg sender changing the destination account should fail', async function() {
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

        await expectFailSendMultiSig(params);
      });

      it('Msg sender changing the data should fail', async function() {
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

        await expectFailSendMultiSig(params);
      });

      it('Msg sender changing the expire time should fail', async function() {
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

        await expectFailSendMultiSig(params);
      });

      it('Same owner signing twice should fail', async function() {
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

        await expectFailSendMultiSig(params);
      });

      it('Sending from an unauthorized signer (but valid other signature) should fail', async function() {
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

        await expectFailSendMultiSig(params);
      });

      it('Sending from an authorized signer (but unauthorized other signer) should fail', async function() {
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

        await expectFailSendMultiSig(params);
      });

      let usedSequenceId;
      it('Sending with expireTime very far out should work', async function() {
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

        await expectSuccessfulSendMultiSig(params);
        usedSequenceId = sequenceId;
      });

      it('Sending with expireTime in the past should fail', async function() {
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

        await expectFailSendMultiSig(params);
      });

      it('Can send with a sequence ID that is not sequential but higher than previous', async function() {
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

        await expectSuccessfulSendMultiSig(params);
      });

      it('Can send with a sequence ID that is unused but lower than the previous (not strictly monotonic increase)', async function() {
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

        await expectSuccessfulSendMultiSig(params);
      });

      it('Send with a sequence ID that has been previously used should fail', async function() {
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

        await expectFailSendMultiSig(params);
      });

      it('Send with a sequence ID that is used many transactions ago (lower than previous 10) should fail', async function() {
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

        await expectFailSendMultiSig(params);
      });

      it('Sign with incorrect operation hash prefix should fail', async function() {
        sequenceId = 1001;
        const params = {
          msgSenderAddress: accounts[0],
          otherSignerAddress: accounts[1],
          wallet: wallet,
          toAddress: accounts[5],
          amount: 63,
          data: '5566abfe',
          expireTime: Math.floor((new Date().getTime()) / 1000) + 60,
          sequenceId: sequenceId,
          prefix: 'Invalid'
        };

        await expectFailSendMultiSig(params);
      });
    });

    describe('Safe mode', function() {
      before(async function() {
        // Create and fund the wallet
        wallet = await WalletSimple.new([accounts[0], accounts[1], accounts[2]]);
        web3.eth.sendTransaction({ from: accounts[0], to: wallet.address, value: web3.toWei(50000, 'ether') });
      });

      it('Cannot be activated by unauthorized user', async function() {
        try {
          await wallet.activateSafeMode({ from: accounts[5] });
          throw new Error('should not be here');
        } catch(err) {
          assertVMException(err);
        }
        const isSafeMode = await wallet.safeMode.call();
        isSafeMode.should.eql(false);
      });

      it('Can be activated by any authorized signer', async function() {
        for (let i=0; i<3; i++) {
          const wallet = await WalletSimple.new([accounts[0], accounts[1], accounts[2]]);
          await wallet.activateSafeMode({ from: accounts[i] });
          const isSafeMode = await wallet.safeMode.call();
          isSafeMode.should.eql(true);
        }
      });

      it('Cannot send transactions to external addresses in safe mode', async function() {
        let isSafeMode = await wallet.safeMode.call();
        isSafeMode.should.eql(false);
        await wallet.activateSafeMode({ from: accounts[1] });
        isSafeMode = await wallet.safeMode.call();
        isSafeMode.should.eql(true);
        await helpers.waitForEvents(walletEvents, 1);
        const safeModeEvent = _.find(walletEvents, function(event) {
          return event.event === 'SafeModeActivated';
        });
        should.exist(safeModeEvent);
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

        await expectFailSendMultiSig(params);
      });

      it('Can send transactions to signer addresses in safe mode', async function() {
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

        await expectSuccessfulSendMultiSig(params);
      });
    });

    describe('Forwarder addresses', function() {
      const forwardAbi = [{ constant: false,inputs: [],name: 'flush',outputs: [],type: 'function' },{ constant: true,inputs: [],name: 'destinationAddress',outputs: [{ name: '',type: 'address' }],type: 'function' },{ inputs: [],type: 'constructor' }];
      const forwardContract = web3.eth.contract(forwardAbi);

      it('Create and forward', async function() {
        const wallet = await WalletSimple.new([accounts[0], accounts[1], accounts[2]]);
        const forwarder = await createForwarderFromWallet(wallet);
        web3.fromWei(web3.eth.getBalance(forwarder.address), 'ether').should.eql(web3.toBigNumber(0));

        web3.eth.sendTransaction({ from: accounts[1], to: forwarder.address, value: web3.toWei(200, 'ether') });

        // Verify funds forwarded
        web3.fromWei(web3.eth.getBalance(forwarder.address), 'ether').should.eql(web3.toBigNumber(0));
        web3.fromWei(web3.eth.getBalance(wallet.address), 'ether').should.eql(web3.toBigNumber(200));
      });

      it('Forwards value, not call data', async function () {
        // When calling a nonexistent method on forwarder, transfer call value to target address and emit event on success.
        // Don't call a method on target contract.
        //
        // While the WalletSimple contract has no side-effect methods that can be called from arbitrary msg.sender,
        // this could change in the future.
        // Simulate this with a ForwarderContract that has a side effect.

        const ForwarderTarget = artifacts.require('./ForwarderTarget.sol');

        const forwarderTarget = await ForwarderTarget.new();
        // can be passed for wallet since it has the same interface
        const forwarder = await createForwarderFromWallet(forwarderTarget);
        const events = [];
        forwarder.allEvents({}, (err, event) => {
          if (err) { throw err; }
          events.push(event);
        });
        const forwarderAsTarget = ForwarderTarget.at(forwarder.address);

        const newData = 0xc0fefe;

        for (const setDataReturn of [true, false]) {
          // clear events
          events.length = 0;

          // calls without value emit deposited event but don't get forwarded
          await forwarderAsTarget.setData(newData, setDataReturn);
          (await forwarderTarget.data.call()).should.eql(web3.toBigNumber(0));

          await helpers.waitForEvents(events, 1);
          events.length.should.eql(1);
          events.pop().event.should.eql('ForwarderDeposited');

          // Same for setDataWithValue()
          const oldBalance = web3.eth.getBalance(forwarderTarget.address);
          await forwarderAsTarget.setDataWithValue(newData + 1, setDataReturn, { value: 100 });
          (await forwarderTarget.data.call()).should.eql(web3.toBigNumber(0));
          web3.eth.getBalance(forwarderTarget.address).should.eql(oldBalance.plus(100));

          await helpers.waitForEvents(events, 1);
          events.length.should.eql(1);
          events.pop().event.should.eql('ForwarderDeposited');
        }
      });

      it('Multiple forward contracts', async function() {
        const numForwardAddresses = 10;
        const etherEachSend = 4;
        const wallet = await WalletSimple.new([accounts[2], accounts[3], accounts[4]]);

        // Create forwarders and send 4 ether to each of the addresses
        for (let i=0; i < numForwardAddresses; i++) {
          const forwarder = await createForwarderFromWallet(wallet);
          web3.eth.sendTransaction({ from: accounts[1], to: forwarder.address, value: web3.toWei(etherEachSend, 'ether') });
        }

        // Verify all the forwarding is complete
        web3.fromWei(web3.eth.getBalance(wallet.address), 'ether').should.eql(web3.toBigNumber(etherEachSend * numForwardAddresses));
      });

      it('Send before create, then flush', async function() {
        const wallet = await WalletSimple.new([accounts[3], accounts[4], accounts[5]]);
        const forwarderContractAddress = helpers.getNextContractAddress(wallet.address);
        web3.eth.sendTransaction({ from: accounts[1], to: forwarderContractAddress, value: web3.toWei(300, 'ether') });
        web3.fromWei(web3.eth.getBalance(forwarderContractAddress), 'ether').should.eql(web3.toBigNumber(300));
        web3.fromWei(web3.eth.getBalance(wallet.address), 'ether').should.eql(web3.toBigNumber(0));

        const forwarder = await createForwarderFromWallet(wallet);
        forwarder.address.should.eql(forwarderContractAddress);

        // Verify that funds are still stuck in forwarder contract address
        web3.fromWei(web3.eth.getBalance(forwarderContractAddress), 'ether').should.eql(web3.toBigNumber(300));
        web3.fromWei(web3.eth.getBalance(wallet.address), 'ether').should.eql(web3.toBigNumber(0));

        // Flush and verify
        forwardContract.at(forwarderContractAddress).flush({ from: accounts[0] });
        web3.fromWei(web3.eth.getBalance(forwarderContractAddress), 'ether').should.eql(web3.toBigNumber(0));
        web3.fromWei(web3.eth.getBalance(wallet.address), 'ether').should.eql(web3.toBigNumber(300));
      });

      it('Flush sent from external account', async function() {
        const wallet = await WalletSimple.new([accounts[4], accounts[5], accounts[6]]);
        const forwarderContractAddress = helpers.getNextContractAddress(wallet.address);
        web3.eth.sendTransaction({ from: accounts[1], to: forwarderContractAddress, value: web3.toWei(300, 'ether') });
        web3.fromWei(web3.eth.getBalance(forwarderContractAddress), 'ether').should.eql(web3.toBigNumber(300));
        web3.fromWei(web3.eth.getBalance(wallet.address), 'ether').should.eql(web3.toBigNumber(0));

        const forwarder = await createForwarderFromWallet(wallet);
        forwarder.address.should.eql(forwarderContractAddress);

        // Verify that funds are still stuck in forwarder contract address
        web3.fromWei(web3.eth.getBalance(forwarder.address), 'ether').should.eql(web3.toBigNumber(300));
        web3.fromWei(web3.eth.getBalance(wallet.address), 'ether').should.eql(web3.toBigNumber(0));

        // Flush and verify
        forwardContract.at(forwarder.address).flush({ from: accounts[0] });
        web3.fromWei(web3.eth.getBalance(forwarder.address), 'ether').should.eql(web3.toBigNumber(0));
        web3.fromWei(web3.eth.getBalance(wallet.address), 'ether').should.eql(web3.toBigNumber(300));
      });
    });

    describe('ERC20 token transfers', function() {
      let fixedSupplyTokenContract;
      before(async function() {
        // Create and fund the wallet
        wallet = await WalletSimple.new([accounts[4], accounts[5], accounts[6]]);
        fixedSupplyTokenContract = await FixedSupplyToken.new(undefined, { from: accounts[0] });
        const balance = await fixedSupplyTokenContract.balanceOf.call(accounts[0]);
        balance.should.eql(web3.toBigNumber(1000000));
      });

      it('Receive and Send tokens from main wallet contract', async function() {

        await fixedSupplyTokenContract.transfer(wallet.address, 100, { from: accounts[0] });
        const balance = await fixedSupplyTokenContract.balanceOf.call(accounts[0]);
        balance.should.eql(web3.toBigNumber(1000000 - 100));
        const msigWalletStartTokens = await fixedSupplyTokenContract.balanceOf.call(wallet.address);
        msigWalletStartTokens.should.eql(web3.toBigNumber(100));

        const sequenceIdString = await wallet.getNextSequenceId.call();
        const sequenceId = parseInt(sequenceIdString);

        const destinationAccount = accounts[5];
        const amount = 50;
        const expireTime = Math.floor((new Date().getTime()) / 1000) + 60; // 60 seconds

        const destinationAccountStartTokens = await fixedSupplyTokenContract.balanceOf.call(accounts[5]);
        destinationAccountStartTokens.should.eql(web3.toBigNumber(0));

        const operationHash = helpers.getSha3ForConfirmationTokenTx(
          tokenPrefix, destinationAccount, amount, fixedSupplyTokenContract.address, expireTime, sequenceId
        );
        const sig = util.ecsign(operationHash, privateKeyForAccount(accounts[4]));

        await wallet.sendMultiSigToken(
          destinationAccount, amount, fixedSupplyTokenContract.address, expireTime, sequenceId, helpers.serializeSignature(sig),
          { from: accounts[5] }
        );
        const destinationAccountEndTokens = await fixedSupplyTokenContract.balanceOf.call(destinationAccount);
        destinationAccountStartTokens.plus(amount).should.eql(destinationAccountEndTokens);

        // Check wallet balance
        const msigWalletEndTokens = await fixedSupplyTokenContract.balanceOf.call(wallet.address);
        msigWalletStartTokens.minus(amount).should.eql(msigWalletEndTokens);
      });

      it('Flush from Forwarder contract', async function() {
        const forwarder = await createForwarderFromWallet(wallet);
        await fixedSupplyTokenContract.transfer(forwarder.address, 100, { from: accounts[0] });
        const balance = await fixedSupplyTokenContract.balanceOf.call(accounts[0]);
        balance.should.eql(web3.toBigNumber(1000000 - 100 - 100));

        const forwarderContractStartTokens = await fixedSupplyTokenContract.balanceOf.call(forwarder.address);
        forwarderContractStartTokens.should.eql(web3.toBigNumber(100));
        const walletContractStartTokens = await fixedSupplyTokenContract.balanceOf.call(wallet.address);

        await wallet.flushForwarderTokens(forwarder.address, fixedSupplyTokenContract.address, { from: accounts[5] });
        const forwarderAccountEndTokens = await fixedSupplyTokenContract.balanceOf.call(forwarder.address);
        forwarderAccountEndTokens.should.eql(web3.toBigNumber(0));

        // Check wallet balance
        const walletContractEndTokens = await fixedSupplyTokenContract.balanceOf.call(wallet.address);
        walletContractStartTokens.plus(100).should.eql(walletContractEndTokens);
        /* TODO Barath - Get event testing for forwarder contract token send to work
                */
      });

    });

  });



});
