require('chai').should();
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

const ten = ether('10');

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
    })
  });

  // xit('foo', async () => {

  //   await this.staking.stake(ten, { from: holder1 });
  // });
});
