pragma solidity 0.8.10;

/**
 * Basic singleSig contract designed to send funds controlled by signer.
 */
contract RecoveryForwarder {
  // Address which can move funds from this contract
  address public signer;
  /**
   * Initialize the signer
   */
  function init(address _signer) external onlyUninitialized {
    signer = _signer;
  }

   /**
   * Modifier that will execute internal code block only if the sender is an authorized signer on this wallet
   */
  modifier onlySigner {
    require( signer == msg.sender, 'Non-signer in onlySigner method');
    _;
  }

  /**
   * Modifier that will execute internal code block only if the contract has not been initialized yet
   */
  modifier onlyUninitialized {
    require(signer == address(0x0), 'Already initialized');
    _;
  }

   /**
   * Default function; Gets called when Ether is deposited
   */
   receive() external payable {
  }

  /**
   * Default function; Gets called when data is sent but does not match any other function
   */
  fallback() external payable {
  }

  /**
   * Execute a transaction from this contract using the signer.
   *
   * @param toAddress the destination address to send an outgoing transaction
   * @param value the amount in Wei to be sent
   * @param data the data to send to the toAddress when invoking the transaction
   */
  function sendFunds(
      address toAddress,
      uint256 value,
      bytes calldata data
  ) external onlySigner {
    // Success, send the transaction
   (bool success, ) = toAddress.call{ value: value }(data);
    require(success, 'Call execution failed');
  }
}
