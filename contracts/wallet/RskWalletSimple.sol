pragma solidity ^0.4.18;
import "./WalletSimple.sol";

contract RskWalletSimple is WalletSimple {
  /**
   * Set up a simple multi-sig wallet by specifying the signers allowed to be used on this wallet.
   * 2 signers will be required to send a transaction from this wallet.
   * Note: The sender is NOT automatically added to the list of signers.
   * Signers CANNOT be changed once they are set
   *
   * @param allowedSigners An array of signers on the wallet
   */
  function RskWalletSimple(address[] allowedSigners) WalletSimple(allowedSigners, "RSK", "RSK-ERC20") public {}
}
