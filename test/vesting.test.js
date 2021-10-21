require('chai').should();
const { expect } = require('chai');
const { accounts, contract } = require('@openzeppelin/test-environment');
const {
  BN,
  expectEvent,
  expectRevert,
  constants,
} = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS } = constants;

const EMDXToken = contract.fromArtifact('EMDXToken');
const Vesting = contract.fromArtifact("Vesting");

describe('Vesting', async () => {
  const [owner, operator, oracle, beneficiary] = accounts;
  const start = new BN(Date.now());
  // Beneficiary amount (300 ether)
  const amount = new BN("300000000000000000000");

  describe('#constructor', async () => {
    before(async () => {
      this.token = await EMDXToken.new({ from: owner });
    })

    it('check constructor parameters', async () => {
      this.vesting = await Vesting.new(
        this.token.address, operator, oracle, { from: owner }
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
      await expectRevert(Vesting.new(ZERO_ADDRESS, operator, oracle), "token address is required");
      await expectRevert(Vesting.new(this.token.address, ZERO_ADDRESS, oracle), "operator address is required");
      await expectRevert(Vesting.new(this.token.address, operator, ZERO_ADDRESS), "oracle address is required");
    });
  });

  describe('#grantVesing', async () => {
    before(async () => {
      this.token = await EMDXToken.new({ from: owner });
      this.vesting = await Vesting.new(
        this.token.address, operator, oracle, { from: owner }
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
        this.token.address, operator, oracle, { from: owner }
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
        this.token.address, operator, oracle, { from: owner }
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
        "contract instance has already been initialized"
      );
      const details = await this.vesting.vestingDetails(beneficiary);
      expect(details.totalAmount.toString()).to.equal('1');
      expect(details.releasableAmount.toString()).to.equal('0');
      expect(details.releasedAmount.toString()).to.equal('0');
    });
  });

  describe('#updateRank', async () => {

  });

});
