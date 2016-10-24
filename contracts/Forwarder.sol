pragma solidity ^0.4.2;
/**
 * Contract that will forward any incoming Ether to its creator
 */
contract Forwarder {
  // Address to which any funds sent to this contract will be forwarded
  address public destinationAddress;

  /**
   * Create the contract, and set the destination address to that of the creator
   */
  function Forwarder() {
    destinationAddress = msg.sender;
  }

  /**
   * Default function; Gets called when Ether is deposited, and forwards it to the destination address
   */
  function() payable {
        if (!destinationAddress.send(msg.value))
            throw;
  }

  /**
   * It is possible that funds were sent to this address before the contract was deployed.
   * We can flush those funds to the destination address.
   */
  function flush() {
    if (!destinationAddress.send(this.balance))
          throw;
  }
}
