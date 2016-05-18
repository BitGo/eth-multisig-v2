/*
var abi = require('ethereumjs-abi');
var BN = require('bn.js');
var _ = require('lodash');

contract('Playground', function(accounts) {
  xit("should put 10000 MetaCoin in the first account", function(done) {
    var playground = Playground.deployed();

    playground.getBalance.call(accounts[0]).then(function(balance) {
      assert.equal(balance.valueOf(), 10000, "10000 wasn't in the first account");
    }).then(done).catch(done);
  });

  xit("sha3", function() {
    var playground = Playground.deployed();
    var buf = new Buffer("helloworld");
    var input = web3.sha3(buf.toString());

    var addr1 = 0x43989fb883ba8111221e89123897538475893837;
    var val = 10000;

    var soliditySha3 = abi.soliditySHA3(
      [ "address", "uint", "bytes" ],
      [ new BN("43989fb883ba8111221e89123897538475893837", 16), val, buf ]
    ).toString('hex');

    return playground.getSha3.call("helloworld")
    .then(function(res) {
      assert(res, soliditySha3);
    });
  });

  it("ecrecovery", function() {
    var playground = Playground.deployed();
    var operationHash = "592c4a70d814b25f96e124dda30c792a287efb8f569e47dabf1498591f02bfda";
    var sig;
    for (i=0; i<1000; i++) {
      sig = web3.eth.sign(accounts[0], _.shuffle(operationHash).join(""));
      console.log("Sig: " + sig, " Operation: " + operationHash + i);
    }
    console.log("Sig: " + sig);
    operationHash = "592c4a70d814b25f96e124dda30c792a287efb8f569e47dabf1498591f02bfda5";
    sig = "0x83f31b9aa49871dde59a10b70b52be8817f43f754d2c5b4bab4620ecd9fb951665e7863238755b215eb023edf8b7f8477c473fdb298e05d0514f5f45b6f1bf1b";
    //sig = "0x00d21a4eb3be442917fdf78deba8c524ac81e6a9bfcef344b6a7620c3456dba9650ef8ee6dc25221aa4399d441e7ca14ae7745b298bd89573e6e0a4a6166a7fb1b";
    console.log("Sig: " + sig);
    return playground.verifySignature.call(operationHash, sig)
    .then(function(res) {
      console.dir(res);
    });
  });
});
*/