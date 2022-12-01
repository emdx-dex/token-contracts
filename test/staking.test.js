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
const five = ether('5');
const ten = ether('10');
const twenty = ether('20');

const oneDay = 60 * 60 * 24;
const twelveDays = oneDay * 12;
const sixMonths = oneDay * 174; // ~ 6 months

const increaseToFreezeTime = async () => {
  await time.increase(twelveDays);
}

const increaseToWithdrawTime = async () => {
  await time.increase(sixMonths);
}

describe('Staking', () => {
  const [owner, holder1] = accounts;

  beforeEach(async () => {
    this.token = await EMDXToken.new({ from: owner });
    this.staking = await Staking.new(this.token.address, { from: owner });
    
    await this.token.transfer(holder1, ten, { from: owner });
    await this.token.increaseAllowance(this.staking.address, ten, { from:  holder1 });
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
        '_amount should be grater than 0.'
      );
    });

    it('should be able to stake', async () => {
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
      await increaseToWithdrawTime();
      
      const result = await this.staking.isWithdrawalEnabled();

      assert.equal(result, true);
    });
  });

  describe('requestWithdrawal', () => {
    it('should fail if withdraw is not allowed', async () => {
      await expectRevert(
        this.staking.requestWithdrawal({ from: holder1 }),
        'Withdraw is not allowed.'
      );
    });

    it('should set the request to withdraw to current timestamp', async () => {
      await this.staking.initializeStaking({ from: owner });
      await increaseToWithdrawTime();

      const tx = await this.staking.requestWithdrawal({ from: holder1 });
      const result = await this.staking.withdrawalRequest(holder1);
      const lastBlockTimestamp = await time.latest();

      assert(result, lastBlockTimestamp);
      expectEvent(tx, 'WithdrawRequest', { 
        _from: holder1
      });
    });
  })

  describe('withdraw', () => {
    it('should fail if withdraw is not enabled', async () => {
      await expectRevert(
        this.staking.withdraw(zero, { from: holder1 }),
        'Withdraw is not allowed.'
      );
    });

    it('should fail if freezetime is pending', async () => {
      await this.staking.initializeStaking({ from: owner });
      await this.staking.stake(ten, { from: holder1 });
      await increaseToWithdrawTime();
      await this.staking.requestWithdrawal({ from: holder1 });

      await expectRevert(
        this.staking.withdraw(zero, { from: holder1 }),
        'Cooldown time pending.'
      );
    });

    it('should fail if amount is 0', async () => {
      await this.staking.initializeStaking({ from: owner });
      await this.staking.stake(ten, { from: holder1 });
      await increaseToWithdrawTime();
      await this.staking.requestWithdrawal({ from: holder1 });
      await increaseToFreezeTime();

      await expectRevert(
        this.staking.withdraw(zero, { from: holder1 }),
        '_amount should be greater than 0.'
      );
    });

    it('should fail if balance of the user is lower than amount', async () => {
      await this.staking.initializeStaking({ from: owner });
      await this.staking.stake(ten, { from: holder1 });
      await increaseToWithdrawTime();
      await this.staking.requestWithdrawal({ from: holder1 });
      await increaseToFreezeTime();

      await expectRevert(
        this.staking.withdraw(twenty, { from: holder1 }),
        '_amount is greater than balance.'
      );
    });   

    it('should allow the user to withdraw partially', async () => {
      await this.staking.initializeStaking({ from: owner });
      await this.staking.stake(ten, { from: holder1 });
      await increaseToWithdrawTime();
      await this.staking.requestWithdrawal({ from: holder1 });
      await increaseToFreezeTime();

      const tx = await this.staking.withdraw(five, { from: holder1 });
      const balance = await this.staking.balanceOf(holder1);
      const totalSupply = await this.staking.totalSupply();
      const stakingBalanceInToken = await this.token.balanceOf(this.staking.address);

      expectEvent(tx, 'Withdraw', { 
        _from: holder1,
        _amount: five.toString()
      });
      assert(balance, five);
      assert(totalSupply, five);
      assert(stakingBalanceInToken, five);
    });

    it('should allow the user to withdraw totally', async () => {
      await this.staking.initializeStaking({ from: owner });
      await this.staking.stake(ten, { from: holder1 });
      await increaseToWithdrawTime();
      await this.staking.requestWithdrawal({ from: holder1 });
      await increaseToFreezeTime();

      const tx = await this.staking.withdraw(ten, { from: holder1 });
      const balance = await this.staking.balanceOf(holder1);
      const totalSupply = await this.staking.totalSupply();
      const stakingBalanceInToken = await this.token.balanceOf(this.staking.address);

      expectEvent(tx, 'Withdraw', { 
        _from: holder1,
        _amount: ten.toString()
      });
      assert(balance, zero);
      assert(totalSupply, zero);
      assert(stakingBalanceInToken, zero);
    });
  })
});
