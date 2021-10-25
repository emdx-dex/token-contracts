require('chai').should();
const assert = require('chai').assert;
const { expect } = require('chai');
const { accounts, contract } = require('@openzeppelin/test-environment');
const {
  BN,
  expectEvent,
  expectRevert,
  constants,
  time
} = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS } = constants;

const EMDXToken = contract.fromArtifact('EMDXToken');
const Vesting = contract.fromArtifact("VestingTest");

describe('Vesting', async () => {
  const owner = accounts[60];
  const operator = accounts[61]
  const oracle = accounts[62];
  const beneficiary = accounts[63];
  const scoringEpochSize = 50;

  describe('#constructor', async () => {
    before(async () => {
      this.token = await EMDXToken.new({ from: owner });
    })

    it('check constructor parameters', async () => {
      this.vesting = await Vesting.new(
        this.token.address, operator, oracle, scoringEpochSize, { from: owner }
      );

      const op = await this.vesting.operator();
      assert.equal(operator, op);

      const tok = await this.vesting.token();
      assert.equal(this.token.address, tok);

      const or = await this.vesting.oracle();
      assert.equal(oracle, or);

      const init = await this.vesting.initialized();
      assert.equal(init, false);
    });

    it('validate constructor parameters', async () => {
      await expectRevert(
        Vesting.new(ZERO_ADDRESS, operator, oracle, scoringEpochSize),
        "token address is required"
      );
      await expectRevert(
        Vesting.new(this.token.address, ZERO_ADDRESS, oracle, scoringEpochSize),
        "operator address is required"
      );
      await expectRevert(
        Vesting.new(
          this.token.address,
          operator,
          ZERO_ADDRESS,
          scoringEpochSize
        ),
        "oracle address is required"
      );
    });
  });

  describe('#grantVesing', async () => {
    before(async () => {
      this.token = await EMDXToken.new({ from: owner });
      this.vesting = await Vesting.new(
        this.token.address, operator, oracle, scoringEpochSize, { from: owner }
      );
    })

    it('only operator can execute grantVesing function', async () => {
      await expectRevert(
        this.vesting.grantVesting(beneficiary, 1, { from: beneficiary }),
        "caller is not the operator"
      );
    });

    it('vesting amount is required', async () => {
      await expectRevert(
        this.vesting.grantVesting(beneficiary, 0, { from: operator }),
        "amount is required"
      );
    });

    it('vesting beneficiary is required', async () => {
      await expectRevert(
        this.vesting.grantVesting(ZERO_ADDRESS, 1, { from: operator }),
        "beneficiary address is required"
      );
    });

    it('only one vesting for beneficiary', async () => {
      await this.vesting.grantVesting(beneficiary, 1, { from: operator });
      await expectRevert(
        this.vesting.grantVesting(beneficiary, 1, { from: operator }),
        "beneficiary already has a vesting"
      );
    })
  });

  describe('#initialize', async () => {
    before(async () => {
      this.token = await EMDXToken.new({ from: owner });
      this.vesting = await Vesting.new(
        this.token.address, operator, oracle, scoringEpochSize, { from: owner }
      );
    });

    it('only operator can execute the function', async () => {
      await expectRevert(
        this.vesting.initialize({ from: owner }),
        "caller is not the operator"
      );
    });

    it('can not be initialized without locks', async () => {
      await expectRevert(
        this.vesting.initialize({ from: operator }),
        "locks were not created"
      );
    });

    it('can not be initialized without having been fund', async () => {
      await this.vesting.grantVesting(beneficiary, 2, { from: operator });
      // totalVestingAmount == 2
      // contract balance == 0
      await expectRevert(
        this.vesting.initialize({ from: operator }),
        "vesting amount and token balance are different"
      );
      await this.token.transfer(this.vesting.address, 1, { from: owner });
      // totalVestingAmount == 2
      // contract balance == 1
      await expectRevert(
        this.vesting.initialize({ from: operator }),
        "vesting amount and token balance are different"
      );
      await this.token.transfer(this.vesting.address, 2, { from: owner });
      // totalVestingAmount == 2
      // contract balance == 3
      await expectRevert(
        this.vesting.initialize({ from: operator }),
        "vesting amount and token balance are different"
      );
      await this.vesting.grantVesting(accounts[4], 1, { from: operator });
      // totalVestingAmount == 3
      // contract balance == 3
      await this.vesting.initialize({ from: operator });
      assert.equal(await this.vesting.initialized(), true);
      should.not.equal(await this.vesting.rankUdatedAt(), 0);
    });
  });

  describe('#grantVesting', async () => {
    beforeEach(async () => {
      this.token = await EMDXToken.new({ from: owner });
      this.vesting = await Vesting.new(
        this.token.address, operator, oracle, scoringEpochSize, { from: owner }
      );
    });

    it('no null parameters', async () => {
      await expectRevert(
        this.vesting.grantVesting(ZERO_ADDRESS, 1, { from: operator }),
        "beneficiary address is required"
      );
      await expectRevert(
        this.vesting.grantVesting(beneficiary, 0, { from: operator }),
        "amount is required"
      );
    });

    it('only operator can grant vesting', async () => {
      await expectRevert(
        this.vesting.grantVesting(beneficiary, 1, { from: beneficiary }),
        "caller is not the operator"
      );
      await expectRevert(
        this.vesting.grantVesting(beneficiary, 1, { from: owner }),
        "caller is not the operator"
      );
      this.vesting.grantVesting(beneficiary, 1, { from: operator });
    });

    it('beneficiaries can only have one lock', async () => {
      this.vesting.grantVesting(beneficiary, 1, { from: operator });
      await expectRevert(
        this.vesting.grantVesting(beneficiary, 1, { from: operator }),
        "beneficiary already has a vesting"
      );
    });

    it('can not grant vesting after initialization', async () => {
      await this.vesting.grantVesting(beneficiary, 1, { from: operator });
      await this.token.transfer(this.vesting.address, 1, { from: owner });
      await this.vesting.initialize({ from: operator });
      await expectRevert(
        this.vesting.grantVesting(beneficiary, 1, { from: operator }),
        "vesting has already been initialized"
      );
      const details = await this.vesting.locks(beneficiary);
      expect(details.totalAmount.toString()).to.equal('1');
      expect(details.releasedAmount.toString()).to.equal('0');
    });
  });

  describe('#updateRank', async () => {
    beforeEach(async () => {
      this.token = await EMDXToken.new({ from: owner });
      this.vesting = await Vesting.new(
        this.token.address, operator, oracle, scoringEpochSize, { from: owner }
      );
    });

    it('only oracle can update rank', async () => {
      await expectRevert(
        this.vesting.updateRank(1, { from: operator }),
        "caller is not the oracle"
      );
      await expectRevert(
        this.vesting.updateRank(1, { from: owner }),
        "caller is not the oracle"
      );
    });

    it('can not update rank if it is not initialized', async () => {
      await expectRevert(
        this.vesting.updateRank(1, { from: oracle }),
        "vesting has not been initialized"
      );
    });

    it('can not update rank if it is not initialized', async () => {
      await expectRevert(
        this.vesting.updateRank(1, { from: oracle }),
        "vesting has not been initialized"
      );
    });

    it('can not update before 1st epoch ends', async () => {
      await this.token.transfer(this.vesting.address, 1, { from: owner });
      await this.vesting.grantVesting(beneficiary, 1, { from: operator });
      await this.vesting.initialize({ from: operator });

      // Try to update rank before 1h
      await expectRevert(
        this.vesting.updateRank(1, { from: oracle }),
        "scoring epoch still not finished"
      );
    });

    it('rank value range', async () => {
      await this.token.transfer(this.vesting.address, 1, { from: owner });
      await this.vesting.grantVesting(beneficiary, 1, { from: operator });
      await this.vesting.initialize({ from: operator });

      await time.increase(scoringEpochSize + 1);
      // values below 0 are not tested since _newCmcRank parameter of updateRank
      // function is uint8 (unsigned integer)
      await expectRevert(
        this.vesting.updateRank(101, { from: oracle }),
        "invalid rank value"
      );

      const receipt = await this.vesting.updateRank(100, { from: oracle });
      assert.equal(await this.token.balanceOf(beneficiary), 1);
      assert.equal((await this.vesting.lastCmcRank()).toString(), "100");
      assert.equal(await this.vesting.finalized(), true);
      expectEvent(receipt, 'RankingUpdated', { cmcRankValue: "100" });

      await time.increase(scoringEpochSize + 1);
      // reverts because all fund are distributed
      await expectRevert(
        this.vesting.updateRank(0, { from: oracle }),
        "vesting it's finalized"
      );
    });
  });

  describe('vesting simulation', async () => {
    before(async () => {
      this.token = await EMDXToken.new({ from: owner });
      this.vesting = await Vesting.new(
        this.token.address, operator, oracle, scoringEpochSize, { from: owner }
      );
    });

    it('demo', async () => {
      const numberOfBeneficiaries = 50;
      const scores = [0, 16, 12, 56, 23, 12, 0, 90, 74, 90, 100];
      let highScore = 0;
      // Grant all vestings
      for (let i = 0; i < numberOfBeneficiaries; i++) {
        await this.vesting.grantVesting(accounts[i], 100, { from: operator });
      }
      // Transfer funds to contract
      await this.token.transfer(
        this.vesting.address, numberOfBeneficiaries * 100, { from: owner }
      );
      // Initialize contract
      await this.vesting.initialize({ from: operator });
      // Ranking update should fail
      await expectRevert(
        this.vesting.updateRank(1, { from: oracle }),
        "scoring epoch still not finished"
      );
      // Vesting demo
      for (let i = 0; i < scores.length; i++) {
        let currentScore = scores[i];
        await time.increase(scoringEpochSize + 1);
        await this.vesting.updateRank(currentScore, { from: oracle });
        if (highScore < currentScore) {
          highScore = currentScore;
        }
        for (let i = 0; i < numberOfBeneficiaries; i++) {
          let vDetails = await this.vesting.locks(accounts[i]);
          let percentageReleased = vDetails
            .releasedAmount
            .mul(new BN(100))
            .div(vDetails.totalAmount);
          assert.equal(percentageReleased.toString(), highScore.toString());
        }
      }
    });
  });
});
