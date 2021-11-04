// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// The vesting schedule is subject to the token’s volume-ratio formula score.
/// The volume-ratio formula measures the volume percentile scored by the Token
/// within a group of tokens that conformed the top 100 CMC Rank during the
/// prior 60-day period (the “Scoring Epoch”). This means that if the Percentile
/// Score is equals 43, 43% of the tokens in each group will be distributed.
/// The Percentile Score will be shown on the platform during the first day
/// after each Scoring Epoch ends (day 61). Distribution of the correspondent
/// percentage will be executed through an automated distribution system.

contract Vesting is Ownable {
    using SafeMath for uint8;
    using SafeMath for uint256;

    address public token;
    address public operator;
    address public oracle;
    uint8 public lastScore;
    uint256 public scoreUdatedAt;
    uint256 public totalVestingAmount;
    uint256 public scoringEpochSize = 60 days;
    uint256 public epochNumber;
    bool public initialized;
    bool public finalized;

    struct LockVesting {
        uint256 totalAmount;
        uint256 releasedAmount;
    }

    mapping(address => LockVesting) public locks;
    address[] beneficiaries;

    event ScoreUpdated(uint8 score, uint256 indexed epochNumber);

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
        scoreUdatedAt = _currentTime();
        epochNumber = 1;
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
    /// Percentil Score value and release the funds if it is possible.
    /// @dev This function returns a tuple with the following values:
    /// @param _newScore new percentile score value.
    function updateScore(uint8 _newScore)
        external
        onlyOracle
        isInitialized
        notFinalized
    {
        require(
            scoreUdatedAt + scoringEpochSize < _currentTime(),
            "scoring epoch still not finished"
        );
        require(_newScore <= 100, "invalid score value");

        lastScore = _newScore;
        scoreUdatedAt = _currentTime();
        epochNumber = epochNumber + 1;

        if (_newScore != 0) {
            for (uint256 i = 0; i < beneficiaries.length; i++) {
                // current beneficiary
                LockVesting memory lock = locks[beneficiaries[i]];
                // calculate already vested percentage
                uint256 remainingAmount = lock.totalAmount.sub(
                    lock.releasedAmount
                );
                // calculate amount to be vested
                uint256 releasableAmount = _newScore
                    .mul(remainingAmount)
                    .div(100);
                // update released amount
                locks[beneficiaries[i]].releasedAmount = lock
                    .releasedAmount
                    .add(releasableAmount);
                // transfer tokens
                require(
                    IERC20(token).transfer(beneficiaries[i], releasableAmount),
                    "token transfer fail"
                );
            }

            if (locks[beneficiaries[0]].releasedAmount == locks[beneficiaries[0]].totalAmount)
                finalized = true;
        }

        emit ScoreUpdated(_newScore, epochNumber - 1);
    }

    function _currentTime() internal view returns (uint256) {
        return block.timestamp;
    }
}
