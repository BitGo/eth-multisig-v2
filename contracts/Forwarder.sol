pragma solidity ^0.4.18;
import "./ERC20Interface.sol";
/**
 * Contract that will forward any incoming Ether to a given address
 */
contract Forwarder {
  // Address to which any funds sent to this contract will be forwarded
  address public targetAddress;
  event ForwarderDeposited(address from, uint value, bytes data);

  /**
   * Create the contract, and set the destination address to `target`
   */
  function Forwarder(address target) {
    targetAddress = target;
  }

  /**
   * Default function; Gets called when Ether is deposited, and forwards it to the target address
   */
  function() payable {
    if (!targetAddress.call.value(msg.value)(msg.data))
      throw;
    // Fire off the deposited event if we can forward it  
    ForwarderDeposited(msg.sender, msg.value, msg.data);
  }

  /**
   * Execute a token transfer of the full balance from the forwarder token to the target address
   * @param tokenContractAddress the address of the erc20 token contract
   */
  function flushTokens(address tokenContractAddress) {
    ERC20Interface instance = ERC20Interface(tokenContractAddress);
    var forwarderAddress = address(this);
    var forwarderBalance = instance.balanceOf(forwarderAddress);
    if (forwarderBalance == 0) {
      return;
    }
    if (!instance.transfer(targetAddress, forwarderBalance)) {
      throw;
    }
  }

  /**
   * It is possible that funds were sent to this address before the contract was deployed.
   * We can flush those funds to the target address.
   */
  function flush() {
    if (!targetAddress.call.value(this.balance)())
      throw;
  }
}
