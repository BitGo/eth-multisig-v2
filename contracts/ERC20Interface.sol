// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.5 <0.8.0;
/**
 * Contract that exposes the needed erc20 token functions
 */

contract ERC20Interface {
  // Send _value amount of tokens to address _to
  function transfer(address _to, uint256 _value) public returns (bool success);
  // Get the account balance of another account with address _owner
  function balanceOf(address _owner) public view returns (uint256 balance);
}