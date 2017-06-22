pragma solidity ^0.4.11;
/**
 * Contract that exposes the needed erc20 token functions
 */

contract ERC20Interface {
  // Send _value amount of tokens to address _to
  function transfer(address _to, uint256 _value) returns (bool success);
}