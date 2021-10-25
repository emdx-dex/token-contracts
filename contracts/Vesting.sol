// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Vesting is Ownable {
    using SafeMath for uint8;
    using SafeMath for uint256;

    address public token;
    address public operator;
    address public oracle;
    uint8 public lastCmcRank;
    uint256 public rankUdatedAt;
    uint256 public totalVestingAmount;
    uint256 public scoringEpochSize = 60 days;
    bool public initialized;
    bool public finalized;

    struct LockVesting {
        uint256 totalAmount;
        uint256 releasedAmount;
    }

    mapping(address => LockVesting) public locks;
    address[] beneficiaries;

    event RankingUpdated(uint8 cmcRankValue);

    modifier onlyOperator() {
        require(msg.sender == operator, "caller is not the operator");
        _;
    }

    modifier onlyOracle() {
        require(msg.sender == oracle, "caller is not the oracle");
        _;
    }

    modifier notInitialized() {
        require(!initialized, "vesting has already been initialized");
        _;
    }

    modifier isInitialized() {
        require(initialized, "vesting has not been initialized");
        _;
    }

    modifier notFinalized() {
        require(!finalized, "vesting it's finalized");
        _;
    }

    constructor(
        address _token,
        address _operator,
        address _oracle
    ) {
        require(_token != address(0), "token address is required");
        require(_operator != address(0), "operator address is required");
        require(_oracle != address(0), "oracle address is required");
        token = _token;
        operator = _operator;
        oracle = _oracle;
    }

    /// @notice This function it's executed by the operator and begins the first
    /// epoch of vesting.
    /// @dev All locks should be created before init.
    function initialize() external onlyOperator notInitialized {
        require(totalVestingAmount != 0, "locks were not created");
        require(
            totalVestingAmount == IERC20(token).balanceOf(address(this)),
            "vesting amount and token balance are different"
        );
        initialized = true;
        rankUdatedAt = _currentTime();
    }

    /// @notice This function it's executed by the operator and grants
    /// the vesting for the beneficiary.
    /// @param _beneficiary is the beneficiary address.
    /// @param _amount the amount of tokens that will be locked in the vesting
    function grantVesting(address _beneficiary, uint256 _amount)
        external
        onlyOperator
        notInitialized
    {
        require(_amount != 0, "amount is required");
        require(_beneficiary != address(0), "beneficiary address is required");
        require(
            locks[_beneficiary].totalAmount == 0,
            "beneficiary already has a vesting"
        );

        locks[_beneficiary].totalAmount = _amount;
        beneficiaries.push(_beneficiary);
        totalVestingAmount = totalVestingAmount + _amount;
    }

    function setOperator(address _operator) external onlyOwner {
        require(_operator != address(0), "oracle address is required");
        operator = _operator;
    }

    function setOracle(address _oracle) external onlyOwner {
        require(_oracle != address(0), "oracle address is required");
        oracle = _oracle;
    }

    /// @notice This function it's executed by the oracle account to update the
    /// CMC ranking value and release the funds if it is possible.
    /// @dev This function returns a tuple with the following values:
    /// @param _newCmcRank new CMS rank value.
    function updateRank(uint8 _newCmcRank)
        external
        onlyOracle
        isInitialized
        notFinalized
    {
        require(
            rankUdatedAt + scoringEpochSize < _currentTime(),
            "scoring epoch still not finished"
        );
        require(_newCmcRank <= 100, "invalid rank value");

        lastCmcRank = _newCmcRank;
        rankUdatedAt = _currentTime();

        for (uint256 i = 0; i < beneficiaries.length; i++) {
            // calculate already vested percentage
            uint256 vestedPercentage = locks[beneficiaries[i]]
                .releasedAmount
                .mul(100)
                .div(locks[beneficiaries[i]].totalAmount);

            if (vestedPercentage < lastCmcRank) {
                // calculate unreleased funds
                uint256 unreleased = lastCmcRank
                    .mul(locks[beneficiaries[i]].totalAmount)
                    .div(100)
                    .sub(locks[beneficiaries[i]].releasedAmount);
                // update released amount
                locks[beneficiaries[i]].releasedAmount = locks[beneficiaries[i]]
                    .releasedAmount
                    .add(unreleased);
                // transfer tokens
                require(
                    IERC20(token).transfer(beneficiaries[i], unreleased),
                    "token transfer fail"
                );
            }
        }

        if (_newCmcRank == 100) finalized = true;

        emit RankingUpdated(_newCmcRank);
    }

    function _currentTime() internal view returns (uint256) {
        return block.timestamp;
    }
}
