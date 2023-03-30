require('chai').should();
const { expect } = require('chai');
const { accounts, contract } = require('@openzeppelin/test-environment');
const { expectEvent, constants, ether } = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS } = constants;

const EMDXToken = contract.fromArtifact('EMDXToken');

describe('EMDXToken', () => {
  const [owner] = accounts;
  const cap = ether('750000000');

  beforeEach(async () => {
    this.token = await EMDXToken.new({ from: owner });
  });

  it('has a name', async () => {
    (await this.token.name()).should.equal('EMDX Token');
  });

  it('has a symbol', async () => {
    (await this.token.symbol()).should.equal('EMDX');
  });

  it('has 18 decimals', async () => {
    (await this.token.decimals()).should.be.bignumber.equal("18");
  });

  it('has 750M cap', async () => {
    expect(await this.token.balanceOf(owner)).to.be.bignumber.equal(cap);
  });

  it('assigns the total supply to the owner', async () => {
    const totalSupply = await this.token.totalSupply();
    const ownerBalance = await this.token.balanceOf(owner);

    ownerBalance.should.be.bignumber.equal(totalSupply);

    await expectEvent.inConstruction(this.token, 'Transfer', {
      from: ZERO_ADDRESS,
      to: owner,
      value: totalSupply,
    });
  });
});
