// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Vesting is Ownable, ReentrancyGuard {
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

    struct LockVesting {
        uint256 totalAmount;
        uint256 releasedAmount;
    }

    mapping(address => LockVesting) public locks;
    address[] beneficiaries;

    modifier onlyOperator() {
        require(msg.sender == operator, "Caller is not the operator");
        _;
    }

    modifier onlyOracle() {
        require(msg.sender == oracle, "Caller is not the oracle");
        _;
    }

    modifier notInitialized() {
        require(!initialized, "contract instance has already been initialized");
        _;
    }

    modifier isInitialized() {
        require(initialized, "contract instance has not been initialized");
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

    function initialize() external onlyOperator notInitialized {
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
        require(_amount != 0, "_amount is required");
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

    function updateRank(uint8 _newCmcRank)
        external
        onlyOracle
        nonReentrant
        isInitialized
    {
        require(
            rankUdatedAt + scoringEpochSize < _currentTime(),
            "scoring epoch still not finished"
        );
        require(_newCmcRank <= 100, "invalid rank value");

        lastCmcRank = _newCmcRank;
        rankUdatedAt = _currentTime();

        for (uint256 i = 0; i < beneficiaries.length; i++) {
            uint256 unreleased = _releasableAmount(beneficiaries[i]);

            locks[beneficiaries[i]].releasedAmount = locks[beneficiaries[i]]
                .releasedAmount
                .add(unreleased);

            require(
                IERC20(token).transfer(beneficiaries[i], unreleased),
                "token transfer fail"
            );
        }
    }

    /// @notice This function it's executed by the locks to check the
    /// state of the vesting.
    /// @dev This function returns a tuple with the following values:
    ///  releasableAmount = amount of tokens available to withdraw at the time.
    ///  totalAmount = the total amount of the vesting.
    ///  releasedAmount = the amount of tokens that has already vested.
    function vestingDetails(address _beneficiary)
        external
        view
        returns (
            uint256 releasableAmount,
            uint256 totalAmount,
            uint256 releasedAmount
        )
    {
        releasableAmount = _releasableAmount(_beneficiary);
        totalAmount = locks[_beneficiary].totalAmount;
        releasedAmount = locks[_beneficiary].releasedAmount;
    }

    function _releasableAmount(address _beneficiary)
        internal
        view
        returns (uint256 releasableAmount)
    {
        uint256 vestedPercentage = locks[_beneficiary]
            .releasedAmount
            .mul(100)
            .div(locks[_beneficiary].totalAmount);

        if (vestedPercentage < lastCmcRank) {
            releasableAmount = lastCmcRank
                .mul(locks[_beneficiary].totalAmount)
                .div(100)
                .sub(locks[_beneficiary].releasedAmount);
        }
    }

    function _currentTime() internal view returns (uint256) {
        return block.timestamp;
    }
}
