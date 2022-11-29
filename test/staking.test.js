require('chai').should();
const assert = require('chai').assert;
const { expect } = require('chai');
const { accounts, contract } = require('@openzeppelin/test-environment');
const {
  BN,
  constants,
  ether,
  expectEvent,
  expectRevert,
  time
} = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS } = constants;

const Staking = contract.fromArtifact('Staking');
const EMDXToken = contract.fromArtifact('EMDXToken');

const zero = ether('0');
const ten = ether('10');

describe('Staking', () => {
  const [owner, holder1] = accounts;

  beforeEach(async () => {
    this.token = await EMDXToken.new({ from: owner });
    this.staking = await Staking.new(this.token.address, { from: owner });
  });

  describe('initializeStaking', () => {
    it('should set initialized', async () => {
      const tx = await this.staking.initializeStaking({ from: owner });
      const initialized = await this.staking.initialized();
      const lastBlockTimestamp = await time.latest();

      expect(initialized).to.be.true;
      expectEvent(tx, 'InitializeStaking', { 
        _initializedAt: lastBlockTimestamp
      });
    });
  });

  describe('stake', () => {
    it('should fail if quantity is zero', async () => {
      await expectRevert(
        this.staking.stake(zero, { from: holder1 }),
        "_amount should be grater than 0."
      );
    });

    it('should be able to stake', async () => {
      await this.token.transfer(holder1, ten, { from: owner });
      await this.token.increaseAllowance(this.staking.address, ten, { from:  holder1 });
      
      const tx = await this.staking.stake(ten, { from: holder1 });
      const balance = await this.staking.balanceOf(holder1);
      const totalSupply = await this.staking.totalSupply();
      const stakingBalanceInToken = await this.token.balanceOf(this.staking.address);

      expectEvent(tx, 'Stake', { 
        _from: holder1,
        _amount: ten
      });
      assert(balance, ten);
      assert(totalSupply, ten);
      assert(stakingBalanceInToken, ten);
    });
  });

  describe('isWithdrawalEnabled', () => {
    const oneDay = 60 * 60 * 24;
    const sixMonths = oneDay * 174; // ~ 6 months

    it('should return false if is not initialized', async () => {
      const result = await this.staking.isWithdrawalEnabled();

      assert.equal(result, false);
    });

    it('should return false if timestamp < 60 days', async () => {
      await this.staking.initializeStaking({ from: owner });

      const result = await this.staking.isWithdrawalEnabled();

      assert.equal(result, false);
    });

    it('should return true if timestamp > 60 days', async () => {
      await this.staking.initializeStaking({ from: owner });
      await time.increase(sixMonths);
      
      const result = await this.staking.isWithdrawalEnabled();

      assert.equal(result, true);
    });
  });
});
