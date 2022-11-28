// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Staking is Ownable {
    // Variables
    uint256 public initializedAt;
    bool public initialized;
    uint256 public cooldown = 12 days;

    IERC20 public token;

    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;

    event InitializeStaking(uint256 _initializedAt);
    event Stake(address _from, uint256 _amount);

    modifier isInitialized() {
        require(initialized, "Staking has not been initialized");
        _;
    }

    modifier isWithdrawalAllowed() {
        require(initializedAt >= 24 weeks);
        _;
    }

    constructor(address _token) {
        require(_token != address(0), "token address is required");

        token = IERC20(_token);
    }

    function initializeStaking() public onlyOwner {
        initializedAt = block.timestamp;
        initialized = true;

        emit InitializeStaking(initializedAt);
    }

    function setCooldown(uint256 _cooldown) public onlyOwner {
        cooldown = _cooldown;
    }

    function stake(uint256 _amount) public isInitialized {
        require(_amount > 0, "amount = 0");

        token.transferFrom(msg.sender, address(this), _amount);
        balanceOf[msg.sender] += _amount;
        totalSupply += _amount;

        emit Stake(msg.sender, _amount);
    }

    function withdraw() public {
        // This function is to withdraw tokens.
    }

    function claim() public {
        // This function is to claim rewards.
    }
}
