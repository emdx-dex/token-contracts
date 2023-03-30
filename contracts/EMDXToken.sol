// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

contract EMDXToken is ERC20, ERC20Burnable {
    string public constant NAME = "EMDX Token";
    string public constant SYMBOL = "EMDX";
    uint256 public constant INITIAL_SUPPLY = 750000000 * 10**18;

    constructor() ERC20(NAME, SYMBOL) {
        _mint(msg.sender, INITIAL_SUPPLY);
    }
}
