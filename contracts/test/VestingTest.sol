// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "../Vesting.sol";

contract VestingTest is Vesting {
    constructor(
        address _token,
        address _operator,
        address _oracle,
        uint256 _scoringEpochSize
    ) Vesting(_token, _operator, _oracle) {
        scoringEpochSize = _scoringEpochSize;
    }
}
