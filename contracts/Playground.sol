contract Playground {
	mapping (address => uint) balances;

	function Playground() {
		balances[tx.origin] = 10000;
	}

	function sendCoin(address receiver, uint amount) returns(bool sufficient) {
		if (balances[msg.sender] < amount) return false;
		balances[msg.sender] -= amount;
		balances[receiver] += amount;

		return true;
	}

  function getBalance(address addr) returns(uint) {
    return balances[addr];
  }

  function getSha3(bytes s) returns (bytes32) {
    address addr1 = 0x43989fb883ba8111221e89123897538475893837;
    uint val = 10000;

    return sha3(addr1, val, s);
  }

	function verifySignature(bytes32 hash, bytes signature) constant returns(address retAddr) {
		bytes32 r;
		bytes32 s;
		uint8 v;

		if (signature.length != 65)
			return 0;

		assembly {
			r := mload(add(signature, 32))
			s := mload(add(signature, 64))
			v := and(mload(add(signature, 65)), 255)
		}

		retAddr= ecrecover(hash, v, r, s);
	}
}
