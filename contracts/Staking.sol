// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Staking is Ownable {
    uint256 public initializedAt;
    bool public initialized;
    uint256 public cooldown = 12 days;

    IERC20 public token;

    // ~ Six months
    uint256 public freezeTime = 174 days;

    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => uint256) public withdrawalRequest;

    event InitializeStaking(uint256 _initializedAt);
    event SetCooldown(uint256 _cooldown);
    event Stake(address _from, uint256 _amount);
    event Withdraw(address _from, uint256 _amount);
    event WithdrawRequest(address _from);

    modifier isInitialized() {
        require(initialized, "Staking has not been initialized.");
        _;
    }

    modifier isWithdrawAllowed() {
        require(initializedAt > freezeTime, "Withdraw is not allowed.");
        _;
    }

    modifier checkWithdrawalRequest() {
        require(block.timestamp >= (withdrawalRequest[msg.sender] + cooldown), "Cooldown time pending.");
        _;
    }

    constructor(address _token) {
        require(_token != address(0), "_token is required.");

        token = IERC20(_token);
    }

    function initializeStaking() public onlyOwner {
        initializedAt = block.timestamp;
        initialized = true;

        emit InitializeStaking(initializedAt);
    }

    function stake(uint256 _amount) public {
        require(_amount > 0, "_amount should be grater than 0.");

        token.transferFrom(msg.sender, address(this), _amount);
        balanceOf[msg.sender] += _amount;
        totalSupply += _amount;

        emit Stake(msg.sender, _amount);
    }

    function requestWithdrawal() public isWithdrawAllowed {
        withdrawalRequest[msg.sender] = block.timestamp;

        emit WithdrawRequest(msg.sender);
    }

    function withdraw(uint256 _amount) public isWithdrawAllowed checkWithdrawalRequest {
        require(_amount > 0, "_amount should be greater than 0.");
        require(_amount <= balanceOf[msg.sender], "_amount is greater than balance.");
        
        withdrawalRequest[msg.sender] = 0;
        balanceOf[msg.sender] -= _amount;
        totalSupply -= _amount;
        token.transfer(msg.sender, _amount);

        emit Withdraw(msg.sender, _amount);
    }

    function claim() public {
        // This function is to claim rewards.
    }

    // Setters
    function setCooldown(uint256 _cooldown) public onlyOwner {
        require(_cooldown > 0, "_cooldown should be greater than 0.");

        cooldown = _cooldown;

        emit SetCooldown(_cooldown);
    }

    // View
    function isWithdrawalEnabled() public view returns (bool) {
        return initialized && block.timestamp >= (initializedAt + freezeTime);
    }
}
