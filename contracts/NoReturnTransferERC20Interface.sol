pragma solidity ^0.4.11;
/**
 * Contract that exposes the needed erc20 token functions
 */

contract NoReturnTransferERC20Interface {
  // Send _value amount of tokens to address _to
  function transfer(address _to, uint256 _value) public;
  // Get the account balance of another account with address _owner
  function balanceOf(address _owner) public constant returns (uint256 balance);
}

