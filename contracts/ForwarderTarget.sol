pragma solidity ^0.4.24;


import "./Forwarder.sol";

// This is a test target for a Forwarder.
// It contains a public function with a side-effect.
contract ForwarderTarget {
  uint256 public data;

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

  function() public payable {
    // accept unspendable balance
  }
}
