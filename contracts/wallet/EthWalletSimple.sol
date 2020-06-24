pragma solidity ^0.4.18;
import "./WalletSimple.sol";

contract EthWalletSimple is WalletSimple {
  /**
   * Set up a simple multi-sig wallet by specifying the signers allowed to be used on this wallet.
   * 2 signers will be required to send a transaction from this wallet.
   * Note: The sender is NOT automatically added to the list of signers.
   * Signers CANNOT be changed once they are set
   *
   * @param allowedSigners An array of signers on the wallet
   */
  function EthWalletSimple(address[] allowedSigners) WalletSimple(allowedSigners, "ETHER", "ERC20") public {}
}
