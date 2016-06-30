contract Forwarder {
	address public destinationAddress;

	function Forwarder() {
    destinationAddress = msg.sender;
	}

  // Gets called when no other function matches (coins are deposited)
  function() {
    destinationAddress.send(msg.value);
  }

  function flush() {
    destinationAddress.send(this.balance);
  }
}
