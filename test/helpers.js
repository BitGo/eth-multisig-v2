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