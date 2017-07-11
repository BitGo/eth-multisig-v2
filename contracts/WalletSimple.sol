pragma solidity ^0.4.11;
import "./Forwarder.sol";
import "./ERC20Interface.sol";
/**
 * Basic multi-signer wallet designed for use in a co-signing environment where 2 signatures are required to move funds.
 * Typically used in a 2-of-3 signing configuration. Uses ecrecover to allow for 2 signatures in a single transaction.
 */
contract WalletSimple {
  // Events
  event Deposited(address from, uint value, bytes data);
  event SafeModeActivated(address msgSender);
  event Transacted(
    address msgSender, // Address of the sender of the message initiating the transaction
    address otherSigner, // Address of the signer (second signature) used to initiate the transaction
    bytes32 operation, // Operation hash (sha3 of toAddress, value, data, expireTime, sequenceId)
    address toAddress, // The address the transaction was sent to
    uint value, // Amount of Wei sent to the address
    bytes data // Data sent when invoking the transaction
  );
  event TokenTransacted(
    address msgSender, // Address of the sender of the message initiating the transaction
    address otherSigner, // Address of the signer (second signature) used to initiate the transaction
    bytes32 operation, // Operation hash (sha3 of toAddress, value, tokenContractAddress, expireTime, sequenceId)
    address toAddress, // The address the transaction was sent to
    uint value, // Amount of Wei sent to the address
    address tokenContractAddress // Data sent when invoking the transaction
  );

  // Public fields
  address[] public signers; // The addresses that can co-sign transactions on the wallet
  bool public safeMode; // When active, wallet may only send to signer addresses

  // Internal fields
  uint constant SEQUENCE_ID_WINDOW_SIZE = 10;
  uint[10] recentSequenceIds;

  /**
   * Modifier that will execute internal code block only if the sender is an authorized signer on this wallet
   */
  modifier onlysigner {
    if (!isSigner(msg.sender)) {
      throw;
    }
    _;
  }

  /**
   * Set up a simple multi-sig wallet by specifying the signers allowed to be used on this wallet.
   * 2 signers will be required to send a transaction from this wallet.
   * Note: The sender is NOT automatically added to the list of signers.
   *
   * @param allowedSigners An array of signers on the wallet
   */
  function WalletSimple(address[] allowedSigners) {
    if (allowedSigners.length < 2) {
      // Not enough signers
      throw;
    }
    signers = allowedSigners;
    safeMode = false;
  }

  /**
   * Gets called when a transaction is received without calling a method
   */
  function() payable {
    if (msg.value > 0) {
      // Fire deposited event if we are receiving funds
      Deposited(msg.sender, msg.value, msg.data);
    }
  }

  /**
   * Create a new contract (and also address) that forwards funds to this contract
   */
  function createForwarder() onlysigner returns (address) {
    return new Forwarder();
  }

  /**
   * Execute a multi-signature transaction from this wallet using 2 signers: one from msg.sender and the other from ecrecover.
   * The signature is a signed form (using eth.sign) of tightly packed toAddress, value, data, expireTime and sequenceId
   * Sequence IDs are numbers starting from 1. They are used to prevent replay attacks and may not be repeated.
   *
   * @param toAddress the destination address to send an outgoing transaction
   * @param value the amount in Wei to be sent
   * @param data the data to send to the toAddress when invoking the transaction
   * @param expireTime the number of seconds since 1970 for which this transaction is valid
   * @param sequenceId the unique sequence id obtainable from getNextSequenceId
   * @param signature the result of eth.sign on the operationHash sha3(toAddress, value, data, expireTime, sequenceId)
   */
  function sendMultiSig(address toAddress, uint value, bytes data, uint expireTime, uint sequenceId, bytes signature) onlysigner {
    // Verify the other signer
    var operationHash = sha3(toAddress, value, data, expireTime, sequenceId);
    var otherSigner = recoverAddressFromSignature(operationHash, signature);
    
    verifyMultiSig(toAddress, otherSigner, expireTime, sequenceId);

    // Success, send the transaction
    if (!(toAddress.call.value(value)(data))) {
      // Failed executing transaction
      throw;
    }
    Transacted(msg.sender, otherSigner, operationHash, toAddress, value, data);
  }
  
  /**
   * Execute a multi-signature token transfer from this wallet using 2 signers: one from msg.sender and the other from ecrecover.
   * The signature is a signed form (using eth.sign) of tightly packed toAddress, value, tokenContractAddress, expireTime and sequenceId
   * Sequence IDs are numbers starting from 1. They are used to prevent replay attacks and may not be repeated.
   *
   * @param toAddress the destination address to send an outgoing transaction
   * @param value the amount in Wei to be sent
   * @param tokenContractAddress the address of the erc20 token contract
   * @param expireTime the number of seconds since 1970 for which this transaction is valid
   * @param sequenceId the unique sequence id obtainable from getNextSequenceId
   * @param signature the result of eth.sign on the operationHash sha3(toAddress, value, tokenContractAddress, expireTime, sequenceId)
   */
  function sendMultiSigToken(address toAddress, uint value, address tokenContractAddress, uint expireTime, uint sequenceId, bytes signature) onlysigner {
    // Verify the other signer
    var operationHash = sha3(toAddress, value, tokenContractAddress, expireTime, sequenceId);
    var otherSigner = recoverAddressFromSignature(operationHash, signature);
    
    verifyMultiSig(toAddress, otherSigner, expireTime, sequenceId);
    
    ERC20Interface instance = ERC20Interface(tokenContractAddress);
    if (!instance.transfer(toAddress, value)) {
        throw;
    }
    TokenTransacted(msg.sender, otherSigner, operationHash, toAddress, value, tokenContractAddress);
  }
  
  
  /**
   * Do common multisig verification for both eth sends and erc20token transfers
   *
   * @param toAddress the destination address to send an outgoing transaction
   * @param otherSigner the second signer for the transaction
   * @param expireTime the number of seconds since 1970 for which this transaction is valid
   * @param sequenceId the unique sequence id obtainable from getNextSequenceId
   */
  function verifyMultiSig(address toAddress, address otherSigner, uint expireTime, uint sequenceId) {
    // Verify if we are in safe mode. In safe mode, the wallet can only send to signers
    if (safeMode && !isSigner(toAddress)) {
      // We are in safe mode and the toAddress is not a signer. Disallow!
      throw;
    }
    // Verify that the transaction has not expired
    if (expireTime < block.timestamp) {
      // Transaction expired
      throw;
    }

    // Try to insert the sequence ID. Will throw if the sequence id was invalid
    tryInsertSequenceId(sequenceId);

    if (!isSigner(otherSigner)) {
      // Other signer not on this wallet or operation does not match arguments
      throw;
    }
    if (otherSigner == msg.sender) {
      // Cannot approve own transaction
      throw;
    }
  }

  /**
   * Irrevocably puts contract into safe mode. When in this mode, transactions may only be sent to signing addresses.
   */
  function activateSafeMode() onlysigner {
    safeMode = true;
    SafeModeActivated(msg.sender);
  }

  /**
   * Determine if an address is a signer on this wallet
   * @param signer address to check
   */
  function isSigner(address signer) returns (bool) {
    // Iterate through all signers on the wallet and
    for (uint i = 0; i < signers.length; i++) {
      if (signers[i] == signer) {
        return true;
      }
    }
    return false;
  }

  /**
   * Gets the second signer's address using ecrecover
   * @param operationHash the sha3 of the toAddress, value, data and expireTime
   * @param signature the tightly packed signature of r, s, and v as an array of 65 bytes (returned by eth.sign)
   */
  function recoverAddressFromSignature(bytes32 operationHash, bytes signature) returns (address) {
    if (signature.length != 65) {
      throw;
    }
    // We need to unpack the signature, which is given as an array of 65 bytes (from eth.sign)
    bytes32 r;
    bytes32 s;
    uint8 v;
    assembly {
      r := mload(add(signature, 32))
      s := mload(add(signature, 64))
      v := and(mload(add(signature, 65)), 255)
    }
    if (v < 27) {
      v += 27; // Ethereum versions are 27 or 28 as opposed to 0 or 1 which is submitted by some signing libs
    }
    return ecrecover(operationHash, v, r, s);
  }

  /**
   * Verify that the sequence id has not been used before and inserts it. Throws if the sequence ID was not accepted.
   * We collect a window of up to 10 recent sequence ids, and allow any sequence id that is not in the window and
   * greater than the minimum element in the window.
   */
  function tryInsertSequenceId(uint sequenceId) onlysigner private returns (uint) {
    // Keep a pointer to the lowest value element in the window
    uint lowestValueIndex = 0;
    for (uint i = 0; i < SEQUENCE_ID_WINDOW_SIZE; i++) {
      if (recentSequenceIds[i] == sequenceId) {
        // This sequence ID has been used before. Disallow!
        throw;
      }
      if (recentSequenceIds[i] < recentSequenceIds[lowestValueIndex]) {
        lowestValueIndex = i;
      }
    }
    if (sequenceId < recentSequenceIds[lowestValueIndex]) {
      // The sequence ID being used is lower than the lowest value in the window
      // so we cannot accept it as it may have been used before
      throw;
    }
    recentSequenceIds[lowestValueIndex] = sequenceId;
  }

  /**
   * Gets the next available sequence ID for signing when using executeAndConfirm
   */
  function getNextSequenceId() returns (uint) {
    uint highestSequenceId = 0;
    for (uint i = 0; i < SEQUENCE_ID_WINDOW_SIZE; i++) {
      if (recentSequenceIds[i] > highestSequenceId) {
        highestSequenceId = recentSequenceIds[i];
      }
    }
    return highestSequenceId + 1;
  }
}
