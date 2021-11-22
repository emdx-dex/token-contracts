const path = require('path');
require('dotenv').config({
  path: path.join(__dirname, '..', '.env')
})
require('@openzeppelin/test-helpers/configure')({
  provider: web3.currentProvider,
  environment: 'truffle'
});

const EMDXToken = artifacts.require('EMDXToken');
const Vesting = artifacts.require('Vesting');

module.exports = async function (deployer, network, accounts) {
  let owner, operator, oracle;
  if (network == 'fuji-fork') {
    owner = process.env.DEPLOYER_ADDRESS;
    operator = process.env.OPERATOR_ADDRESS;
    oracle = process.env.ORACLE_ADDRESS;
  } else {
    owner = accounts[0];
    operator = accounts[1];
    oracle = accounts[2];
  }

  deployer.deploy(EMDXToken, { from: owner })
    .then(() => {
      return deployer.deploy(
        Vesting,
        EMDXToken.address,
        operator,
        oracle,
        { from: owner }
      );
    });
};
