pragma solidity 0.8.10;
import './TransferHelper.sol';
import './ERC20Interface.sol';
/**
 * Contract that will forward any incoming Ether to the creator of the contract
 */
contract RecoveryForwarder {
  // Address to which any funds sent to this contract will be forwarded
  address public parentAddress;
  /**
   * Initialize the parent
   */
  function init(address _parentAddress) external onlyUninitialized {
    parentAddress = _parentAddress;
  }

  /**
  * Modifier that will execute internal code block only if the sender is the parent address
  */
  modifier onlyParent {
    require( parentAddress == msg.sender, 'Non-parent in onlyParent method');
    _;
  }

  /**
   * Modifier that will execute internal code block only if the contract has not been initialized yet
   */
  modifier onlyUninitialized {
    require(parentAddress == address(0x0), 'Already initialized');
    _;
  }

  /**
  * Default function; Gets called when Ether is deposited
  */
  receive() external payable {
    flush();
  }

  /**
   * Default function; Gets called when data is sent but does not match any other function
   */
  fallback() external payable {
    flush();
  }

  /**
   * Execute a token transfer of the full balance from the forwarder token to the parent address
   * @param tokenContractAddress the address of the erc20 token contract
   */
  function flushTokens(address tokenContractAddress) external onlyParent {
    ERC20Interface instance = ERC20Interface(tokenContractAddress);
    address forwarderAddress = address(this);
    uint256 forwarderBalance = instance.balanceOf(forwarderAddress);
    TransferHelper.safeTransfer(
      tokenContractAddress,
      parentAddress,
      forwarderBalance
    );
  }

  /**
   * A fallback function which can used to transfer funds controlled by parent.
   */
  function callFromParent(
  address target,
  uint256 value,
  bytes calldata data
  ) external onlyParent {
    (bool success, ) = target.call{ value: value }(
      data
    );
    require(success, 'Parent call execution failed');
  }

  /**
   * Flush the entire balance of the contract to the parent address.
   */
  function flush() public {
    uint256 value = address(this).balance;
    (bool success, ) = parentAddress.call{ value: value }('');
    require(success, 'Flush failed');
  }
}
