pragma solidity 0.8.10;
import "./RecoveryForwarder.sol";
import "./CloneFactory.sol";
/**
 *
 * RecoveryWallet
 * ============
 *
 * Basic singleSig wallet designed to recover funds.
 *
 */
contract RecoveryWallet is CloneFactory {

  // Public fields
  address public immutable signer;
  address public immutable forwarderImplementationAddress;

  constructor (address _signer, address _forwarderImplementationAddress) {
    signer = _signer;
    forwarderImplementationAddress = _forwarderImplementationAddress;
  }
  /**
   * Modifier that will execute internal code block only if the sender is an authorized signer on this wallet
   */
  modifier onlySigner {
    require( signer == msg.sender, 'Non-signer in onlySigner method');
    _;
  }

  /**
   * Gets called when a transaction is received with ether and no data
   */
  receive() external payable {
  }
  /**
   * Default function; Gets called when data is sent but does not match any other function
   */
  fallback() external payable {
  }

  /**
   * Creates new forwarder contract controlled by signer in batches
   */
function createRecoveryForwarder(uint8 value) external {
    require(value > 0 && value < 150 , 'value must be greater than 0 and less than 150');
    for ( uint8 i = 0; i < value; ++i) {
    address payable clone = createClone(forwarderImplementationAddress);
    RecoveryForwarder(clone).init(signer);
    }
  } 

  /**
   * Execute a transaction from this wallet using the signer.
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
