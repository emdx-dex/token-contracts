// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";

contract EMDXToken is ERC20Capped {
    string public constant NAME = "EMDX Token";
    string public constant SYMBOL = "EMDX";
    uint256 public constant INITIAL_SUPPLY = 1000000000 * 10**18;

    constructor() ERC20(NAME, SYMBOL) ERC20Capped(INITIAL_SUPPLY) {
        _mint(msg.sender, INITIAL_SUPPLY);
    }
}
