/*
   Multi-Sig Wallet v2, daily-limited wallet requiring multiple owners to approve transactions above a limit.
   Includes support for asynchronous (2 transaction) approvals or single-transaction with multiple signatures.

   Derived from / maintains compatibility with all methods on original wallet.sol by Gavin Wood.

   Usage:
      Create a multisig wallet with multiple owners including the account contract is deployed from:
          Wallet.new(address[] _owners, uint _required, uint _daylimit)

      Execute a transaction - it may return an operation hash (bytes32) if a confirmation is required:
          wallet.execute(address _to, uint _value, bytes _data)

      Confirm a transaction with a hash:
          wallet.confirm(bytes32 _h)

      In a single transaction, execute AND confirm (using ecrecover) - see examples in test for usage:
          wallet.executeAndConfirm(address _to, uint _value, bytes _data, uint _expireTime, uint _sequenceId, bytes _signature)

   @authors:
      Gavin Wood <g@ethdev.com>
      Ben Chan <benchan@bitgo.com>
 */

/*
   Inheritable contract for use in multi-user (owner) scenarios.
   Exposes modifiers enabling methods to require one or multiple owners to execute.

   Each owner is designated by an account (address). Owners are initialized in the constructor and modifiable.

   Usage:
      Use modifiers onlyowner (just own owner required) or onlymanyowners(hash) where a unique hash must be confirmed
      by the required number of owners (specified in constructor) before interior is executed.
 */
contract multiowned {
    // FIELDS
    // Number of owners that must confirm the same operation before it is run.
    uint public m_required;

    // Pointer used to find a free slot in m_owners
    uint public m_numOwners;

    // List of owners
    uint[256] m_owners;
    uint constant c_maxOwners = 250;

    // Index on the list of owners to allow reverse lookup
    mapping(uint => uint) m_ownerIndex;

    // Pending operations
    mapping(bytes32 => PendingState) m_pending;
    bytes32[] m_pendingIndex;

    // When we use ecrecover to verify signatures (in addition to msg.sender), an array window of sequence ids is used.
    // This prevents from replay attacks by the first signer.
    //
    // Sequence IDs may not be repeated and should start from 1 onwards. Stores the last 10 largest sequence ids in a window
    // New sequence ids being added must replace the smallest of those numbers and must be larger than the smallest value stored.
    // This allows some degree of flexibility for submission of multiple transactions in a block.
    uint constant c_maxSequenceIdWindowSize = 10;
    uint[10] m_sequenceIdsUsed;

    // TYPES
    // Struct for the status of a pending operation.
    struct PendingState {
        // Number of confirmations still needed
        uint yetNeeded;
        // Bit-indexed store of owners that have been confirmed
        uint ownersConfirmed;
        uint index;
    }

    // EVENTS
    // Emitted when an owner agrees to continue the operation (more owners may still be required)
    event Confirmation(address owner, bytes32 operation);

    // Emitted when an owner's confirmation is revoked
    event Revoke(address owner, bytes32 operation);

    // Emitted when an owner is replaced with another
    event OwnerChanged(address oldOwner, address newOwner);

    // Emitted when an owner is added to the contract
    event OwnerAdded(address newOwner);

    // Emitted when an owner is removed the contract
    event OwnerRemoved(address oldOwner);

    // Emitted when the number of required owners (to perform onlymanyowners operations) changes
    event RequirementChanged(uint newRequirement);

    // MODIFIERS
    // Ensures that msg.sender is an owner (as specified in the constructor)
    modifier onlyowner {
        if (isOwner(msg.sender))
            _
    }

    // Ensures that the set number (specified in constructor) of owners have confirmed the operation before execution.
    // The operation is uniquely identified as a 32-byte hash provided to the modifier
    modifier onlymanyowners(bytes32 _operation) {
        if (confirmAndCheck(_operation))
            _
    }

    // METHODS
    // Constructor for contract.
    // Expects an array of owners and an integer of number of required owners to perform "onlymanyowners" transactions.
    // The creator of the contract automatically becomes an owner, so don't add them into the list.
    function multiowned(address[] _owners, uint _required) {
        m_numOwners = _owners.length + 1;
        m_owners[1] = uint(msg.sender);
        m_ownerIndex[uint(msg.sender)] = 1;

        for (uint i = 0; i < _owners.length; ++i)
        {
            m_owners[2 + i] = uint(_owners[i]);
            m_ownerIndex[uint(_owners[i])] = 2 + i;
        }

        m_required = _required;
    }

    // Gets an owner at a certain index position. The caller will be expecting a 0-indexed number.
    function getOwner(uint ownerIndex) external returns (address) {
        return address(m_owners[ownerIndex + 1]);
    }

    // Revokes a prior confirmation of a given operation
    function revoke(bytes32 _operation) external {
        // We could use isOwner, but we want the ownerIndex, so perform the owner check here
        uint ownerIndex = m_ownerIndex[uint(msg.sender)];
        // Make sure they're an owner
        if (ownerIndex == 0) return;

        uint ownerIndexBit = 2**ownerIndex;
        var pending = m_pending[_operation];
        if (pending.ownersConfirmed & ownerIndexBit > 0) {
            pending.yetNeeded++;
            pending.ownersConfirmed -= ownerIndexBit;
            Revoke(msg.sender, _operation);
        }
    }

    // Replaces an owner `_from` with another `_to`. Resets all pending confirmation requests.
    function changeOwner(address _from, address _to) onlymanyowners(sha3(msg.data)) external {
        if (isOwner(_to)) return;

        uint ownerIndex = m_ownerIndex[uint(_from)];
        if (ownerIndex == 0) return;

        clearPending();

        m_owners[ownerIndex] = uint(_to);
        m_ownerIndex[uint(_from)] = 0;
        m_ownerIndex[uint(_to)] = ownerIndex;
        OwnerChanged(_from, _to);
    }

    // Adds an owner to the contract. Resets all pending confirmation requests.
    function addOwner(address _owner) onlymanyowners(sha3(msg.data)) external {
        if (isOwner(_owner)) return;

        clearPending();

        if (m_numOwners >= c_maxOwners) reorganizeOwners();
        if (m_numOwners >= c_maxOwners) return;

        m_numOwners++;
        m_owners[m_numOwners] = uint(_owner);
        m_ownerIndex[uint(_owner)] = m_numOwners;
        OwnerAdded(_owner);
    }

    // Removes an owner from the contract
    function removeOwner(address _owner) onlymanyowners(sha3(msg.data)) external {
        uint ownerIndex = m_ownerIndex[uint(_owner)];
        if (ownerIndex == 0) return;

        if (m_required > m_numOwners - 1) return;

        m_owners[ownerIndex] = 0;
        m_ownerIndex[uint(_owner)] = 0;

        clearPending();

        reorganizeOwners();
        OwnerRemoved(_owner);
    }

    // Change the required number of owners to perform onlymanyowners operations. Resets all pending confirmation requests.
    function changeRequirement(uint _newRequired) onlymanyowners(sha3(msg.data)) external {
        if (_newRequired > m_numOwners) return;

        m_required = _newRequired;
        clearPending();

        RequirementChanged(_newRequired);
    }

    // Checks if the address is an owner on this contract
    function isOwner(address _addr) returns (bool) {
      return m_ownerIndex[uint(_addr)] > 0;
    }

    // Checks if an operation has been confirmed by a specified owner.
    function hasConfirmed(bytes32 _operation, address _owner) constant returns (bool) {
      var pending = m_pending[_operation];
      uint ownerIndex = m_ownerIndex[uint(_owner)];

      // First check if they're an owner
      if (ownerIndex == 0) return false;

      // Then check if that owner has confirmed the operation yet.
      // Determine the bit index for the owner in the ownersConfirmed stored state.
      uint ownerIndexBit = 2**ownerIndex;
      return !(pending.ownersConfirmed & ownerIndexBit == 0);
    }

    // Gets the next available sequence ID for signing when using confirmAndCheckUsingECRecover
    function getNextSequenceId() returns (uint) {
      uint highestSequenceId = 0;
      for (var i = 0; i < c_maxSequenceIdWindowSize; i++) {
        if (m_sequenceIdsUsed[i] > highestSequenceId) {
          highestSequenceId = m_sequenceIdsUsed[i];
        }
      }
      return highestSequenceId + 1;
    }

    // Given an operation hash, get the number of confirmations needed
    function getPendingConfirmationsNeeded(bytes32 _operation) returns (uint) {
        return m_pending[_operation].yetNeeded;
    }

    // INTERNAL METHODS
    // Called within the onlymanyowners modifier.
    // Records a confirmation by msg.sender and returns true if the operation has the required number of confirmations
    function confirmAndCheck(bytes32 _operation) internal returns (bool) {
        return confirmAndCheckOperationForOwner(_operation, msg.sender);
    }

    // Gets an owner using ecrecover, records their confirmation and
    // returns true if the operation has the required number of confirmations
    function confirmAndCheckUsingECRecover(bytes32 _operation, uint _sequenceId, bytes _signature) internal returns (bool) {
        // Verify that the sequence id has not been used before
        // Create mapping of the sequence ids being used
        uint lowestValueIndex = 0;
        for (var i = 0; i < c_maxSequenceIdWindowSize; i++) {
          if (m_sequenceIdsUsed[i] == _sequenceId) {
            // This sequence ID has been used before. Disallow!
            throw;
          }
          if (m_sequenceIdsUsed[i] < m_sequenceIdsUsed[lowestValueIndex]) {
            lowestValueIndex = i;
          }
        }
        if (_sequenceId < m_sequenceIdsUsed[lowestValueIndex]) {
          // The sequence ID being used is lower than the lowest value in the window
          // so we cannot accept it as it may have been used before
          throw;
        }
        m_sequenceIdsUsed[lowestValueIndex] = _sequenceId;

        // We need to unpack the signature, which is given as an array of 65 bytes (from eth.sign)
        bytes32 r;
        bytes32 s;
        uint8 v;

        if (_signature.length != 65)
            throw;

        assembly {
            r := mload(add(_signature, 32))
            s := mload(add(_signature, 64))
            v := and(mload(add(_signature, 65)), 255)
        }

        var ownerAddress = ecrecover(_operation, v, r, s);
        return confirmAndCheckOperationForOwner(_operation, ownerAddress);
    }

    // Records confirmations for an operation by the given owner and
    // returns true if the operation has the required number of confirmations
    function confirmAndCheckOperationForOwner(bytes32 _operation, address _owner) private returns (bool) {
        // Determine what index the present sender is
        uint ownerIndex = m_ownerIndex[uint(_owner)];
        // Make sure they're an owner
        if (ownerIndex == 0) return;

        var pending = m_pending[_operation];
        // If we're not yet working on this operation, add it
        if (pending.yetNeeded == 0) {
            // Reset count of confirmations needed.
            pending.yetNeeded = m_required;
            // Reset which owners have confirmed (none) - set our bitmap to 0.
            pending.ownersConfirmed = 0;
            pending.index = m_pendingIndex.length++;
            m_pendingIndex[pending.index] = _operation;
        }

        // Determine the bit to set for this owner on the pending state for the operation
        uint ownerIndexBit = 2**ownerIndex;
        // Make sure the owner haven't confirmed this operation previously.
        if (pending.ownersConfirmed & ownerIndexBit == 0) {
            Confirmation(_owner, _operation);
            // Check if this confirmation puts us at the required number of needed confirmations.
            if (pending.yetNeeded <= 1) {
                // Enough confirmations: mark operation as passed and return true to continue execution
                delete m_pendingIndex[m_pending[_operation].index];
                delete m_pending[_operation];
                return true;
            }
            else
            {
                // not enough: record that this owner in particular confirmed.
                pending.yetNeeded--;
                pending.ownersConfirmed |= ownerIndexBit;
            }
        }

        return false;
    }

    // This operation will look for 2 confirmations
    // The first confirmation will be verified using ecrecover
    // The second confirmation will be verified using msg.sender
    function confirmWithSenderAndECRecover(bytes32 _operation, uint _sequenceId, bytes _signature) internal returns (bool) {
        return confirmAndCheckUsingECRecover(_operation, _sequenceId, _signature) || confirmAndCheck(_operation);
    }

    // When adding and removing too many owners, we may reach the end of our indexed array
    // Make sure m_numOwner is equal to the number of owners and always points to the optimal free slot
    function reorganizeOwners() private returns (bool) {
        uint free = 1;
        while (free < m_numOwners)
        {
            while (free < m_numOwners && m_owners[free] != 0) free++;
            while (m_numOwners > 1 && m_owners[m_numOwners] == 0) m_numOwners--;
            if (free < m_numOwners && m_owners[m_numOwners] != 0 && m_owners[free] == 0)
            {
                m_owners[free] = m_owners[m_numOwners];
                m_ownerIndex[m_owners[free]] = free;
                m_owners[m_numOwners] = 0;
            }
        }
    }

    // Gets the hash of a pending operation at the specified index
    function getPendingOperation(uint _index) internal returns (bytes32) {
        return m_pendingIndex[_index];
    }

    // Clear all pending operations
    function clearPending() internal {
        uint length = m_pendingIndex.length;
        for (uint i = 0; i < length; ++i)
        if (m_pendingIndex[i] != 0) {
            delete m_pending[m_pendingIndex[i]];
        }
        delete m_pendingIndex;
    }
}

/*
 Inheritable contract for imposing a limit per calendar day on a multiowned contract.
 The limit is a uint specified in the modifier, typically used for amount spent.

 Usage:
 Use the limitedDaily modifier to ensure that the spent amount is under the limit
 Call the underLimit internal method within other methods to ensure total amount for the day is under the limit
 */
contract daylimit is multiowned {
    // FIELDS Sequence IDs may not be repeated
    uint public m_dailyLimit;
    uint public m_spentToday;
    uint public m_lastDay;

    // MODIFIERS
    // Simple modifier for daily limit.
    modifier limitedDaily(uint _value) {
        if (underLimit(_value))
            _
    }

    // METHODS
    // Constructor - stores initial daily limit and records the present day's index.
    function daylimit(uint _limit) {
        m_dailyLimit = _limit;
        m_lastDay = today();
    }

    // Sets the daily limit. needs many of the owners to confirm. Doesn't alter the amount already spent today.
    function setDailyLimit(uint _newLimit) onlymanyowners(sha3(msg.data)) external {
        m_dailyLimit = _newLimit;
    }

    // (Re)sets the daily limit. needs many of the owners to confirm. Doesn't alter the amount already spent today.
    function resetSpentToday() onlymanyowners(sha3(msg.data)) external {
        m_spentToday = 0;
    }

    // INTERNAL METHODS
    // Checks to see if there is at least `_value` left from the daily limit today. If there is, subtracts it and
    // returns true. otherwise just returns false.
    function underLimit(uint _value) internal onlyowner returns (bool) {
        // Reset the spend limit if we're on a different day to last time.
        if (today() > m_lastDay) {
            m_spentToday = 0;
            m_lastDay = today();
        }

        // Check to see if there's enough left - if so, subtract and return true.
        if (m_spentToday + _value >= m_spentToday && m_spentToday + _value <= m_dailyLimit) {
            m_spentToday += _value;
            return true;
        }

        return false;
    }

    // Determines today's day index
    function today() private constant returns (uint) { return now / 1 days; }
}

/*
 Contract interface for a multisig wallet.
 */
contract multisig {
    // EVENTS
    // Emitted when funds are deposited into the wallet
    event Deposit(address _from, uint value);

    // Emitted when a single owner sent a transaction (without confirmation from others) from the wallet
    event SingleTransact(address owner, uint value, address to, bytes data);

    // Emitted when a Multi-sig transaction was confirmed by multiple owners and sent from the wallet
    event MultiTransact(address owner, bytes32 operation, uint value, address to, bytes data);

    // Emitted when a transaction requires confirmation
    event ConfirmationNeeded(bytes32 operation, address initiator, uint value, address to, bytes data);

    // FUNCTIONS
    // Replace an owner on the wallet
    function changeOwner(address _from, address _to) external;

    // Execute (call) a transaction
    function execute(address _to, uint _value, bytes _data) external returns (bytes32);

    // Confirm a pending operation (prior transaction execution)
    function confirm(bytes32 _h) returns (bool);
}

/*
 Implementation of a multi-sig, multi-owned contract wallet with an optional day limit
 Usage (single signature per transaction):
    bytes32 h = Wallet(w).from(oneOwner).execute(to, value, data);
    Wallet(w).from(anotherOwner).confirm(h);
 Usage (2 confirms in a single transaction):
    uint expireTime = 1863771845; // 10 years in the future
    uint sequenceId = 1; // or the next sequence Id obtained using getNextSequenceId();
    bytes32 sha3 = sha3(to, value, data, expireTime, sequenceId); // see tests for examples how to build this
    bytes signature = eth.sign(owner1, sha3); // sign the sha3 using owner1

    // send the transaction (includes signature) using owner2
    Wallet(w).from(owner2).executeAndConfirm(to, value, data, expireTime, sequenceId, signature);
 */
contract Wallet is multisig, multiowned, daylimit {
    uint constant public version = 2;

    // FIELDS
    // Pending transactions we have at present.
    mapping (bytes32 => Transaction) m_txs;

    // TYPES
    // Transaction structure to remember details of transaction lest it need be saved for a later call.
    struct Transaction {
        address to;
        uint value;
        bytes data;
    }

    // METHODS
    // Constructor - Pass on the owner array to the multiowned and the limit to daylimit modifiers
    function Wallet(address[] _owners, uint _required, uint _daylimit)
        multiowned(_owners, _required) daylimit(_daylimit) {
    }

    // Kills the contract sending everything to `_to` (must be confirmed by all owners)
    function kill(address _to) onlymanyowners(sha3(msg.data)) external {
        suicide(_to);
    }

    // Gets called when no other function matches (coins are deposited)
    function() {
        // just being sent some cash?
        if (msg.value > 0) {
            Deposit(msg.sender, msg.value);
        }
    }

    // Executes transaction immediately if below daily spend limit.
    // If not, goes into multisig process where a confirmation is needed by another user.
    // We return an operation hash additional confirmations (also exposed on ConfirmationNeeded event)
    function execute(address _to, uint _value, bytes _data) external onlyowner returns (bytes32 _r) {
        // Check that we're under the daily limit - if so, execute the call
        // We also must check that there is no data (not a contract invocation),
        // since we are unable to determine the value outcome of it.
        if (underLimit(_value) && _data.length == 0) {
            // Yes - execute the call
            if (!(_to.call.value(_value)(_data))) {
              // Following guidelines, throw if the call did not succeed
              throw;
            }
            SingleTransact(msg.sender, _value, _to, _data);
            return 0;
        }
        // Determine a unique hash for this operation
        _r = sha3(msg.data, block.number);
        if (!confirm(_r) && m_txs[_r].to == 0) {
            m_txs[_r].to = _to;
            m_txs[_r].value = _value;
            m_txs[_r].data = _data;
            ConfirmationNeeded(_r, msg.sender, _value, _to, _data);
        }
    }

    // Confirm a prior transaction via the hash.
    function confirm(bytes32 _h) onlymanyowners(_h) returns (bool) {
        if (m_txs[_h].to != 0) {
            if (!(m_txs[_h].to.call.value(m_txs[_h].value)(m_txs[_h].data))) {
              throw;
            }
            MultiTransact(msg.sender, _h, m_txs[_h].value, m_txs[_h].to, m_txs[_h].data);
            delete m_txs[_h];
            return true;
        }
    }

    // Execute and confirm a transaction with 2 signatures - one using the msg.sender and another using ecrecover
    // The signature is a signed form (using eth.sign) of tightly packed to, value, data, expiretime and sequenceId
    // Sequence IDs are numbers starting from 1. They used to prevent replay attacks and may not be repeated.
    function executeAndConfirm(address _to, uint _value, bytes _data, uint _expireTime, uint _sequenceId, bytes _signature)
        external onlyowner
        returns (bytes32 _r)
    {
        // Determine the hash for this operation
        if (_expireTime < block.timestamp) {
          throw;
        }

        // The unique hash is the combination of all arguments except the signature
        _r = sha3(_to, _value, _data, _expireTime, _sequenceId);

        // Confirm the operation
        if (confirmWithSenderAndECRecover(_r, _sequenceId, _signature)) {
          if (!(_to.call.value(_value)(_data))) {
            throw;
          }
          MultiTransact(msg.sender, _r, _value, _to, _data);
          return 0;
        }

        m_txs[_r].to = _to;
        m_txs[_r].value = _value;
        m_txs[_r].data = _data;
        ConfirmationNeeded(_r, msg.sender, _value, _to, _data);
    }

    // Gets the number of pending transactions
    function numPendingTransactions() returns (uint) {
        var pendingTransactionsCount = 0;
        // Use m_pendingIndex.length to get all hashes, then count how many of the
        // operations are transactions, because we don't want to store hashes twice
        // and this is a local call anyway
        for (uint i = 0; i < m_pendingIndex.length; i++) {
            if (isPendingTransaction(i)) {
                pendingTransactionsCount++;
            }
        }

        return pendingTransactionsCount;
    }

    // Gets the hash of a pending operation at the specified index
    function getPendingTransaction(uint _index) returns (bytes32) {
        var pendingTransactionsCount = 0;
        // Seek through all of m_pendingIndex (used in the multiowned contract)
        // But only count transactions
        for (uint i = 0; i < m_pendingIndex.length; i++) {
            if (isPendingTransaction(i)) {
                if (_index == pendingTransactionsCount) {
                    return m_pendingIndex[i];
                }
                pendingTransactionsCount++;
            }
        }
    }

    // Gets the destination address of a pending transaction by the operation hash
    function getPendingTransactionToAddress(bytes32 _operation) returns (address) {
        return address(m_txs[_operation].to);
    }

    // Gets the value in wei of a pending transaction by the operation hash
    function getPendingTransactionValue(bytes32 _operation) returns (uint) {
        return m_txs[_operation].value;
    }

    // Gets the proposed data of a pending transaction by the operation hash
    function getPendingTransactionData(bytes32 _operation) returns (bytes) {
        return m_txs[_operation].data;
    }

    // INTERNAL METHODS
    // Clear all pending transaction operations that have not been confirmed by enough owners
    function clearPending() internal {
        uint length = m_pendingIndex.length;
        for (uint i = 0; i < length; ++i) {
            delete m_txs[m_pendingIndex[i]];
        }
        super.clearPending();
    }

    // Determine if a pending operation index is a pending transaction
    function isPendingTransaction(uint _index) internal returns (bool) {
        if (m_txs[m_pendingIndex[_index]].to != 0 || m_txs[m_pendingIndex[_index]].data.length != 0) {
            return true;
        }
        return false;
    }
}