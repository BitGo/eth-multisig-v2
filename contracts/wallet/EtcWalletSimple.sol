pragma solidity ^0.4.18;
import "./WalletSimple.sol";

contract EtcWalletSimple is WalletSimple {
  /**
   * Set up a simple multi-sig wallet by specifying the signers allowed to be used on this wallet.
   * 2 signers will be required to send a transaction from this wallet.
   * Note: The sender is NOT automatically added to the list of signers.
   * Signers CANNOT be changed once they are set
   *
   * @param allowedSigners An array of signers on the wallet
   */
  function EtcWalletSimple(address[] allowedSigners) WalletSimple(allowedSigners, "ETC", "ETC-ERC20") public {}
}
