pragma solidity ^0.4.18;


import "./Forwarder.sol";

// This is a test target for a Forwarder.
// It contains a public function with a side-effect.
contract ForwarderTarget {
  uint public data;

  function ForwarderTarget() public {
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
