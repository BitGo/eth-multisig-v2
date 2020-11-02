// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.5 <0.8.0;


import "./Forwarder.sol";

// This is a test target for a Forwarder.
// It contains a public function with a side-effect.
contract ForwarderTarget {
  uint public data;

  constructor() public {
  }

  function setDataWithValue(uint d, bool b) payable public returns (bool) {
    data = d;
    return b;
  }

  function setData(uint d, bool b) public returns (bool) {
    data = d;
    return b;
  }

  function createForwarder() public {
    new Forwarder();
  }

  function() external payable {
    // accept unspendable balance
  }
}
