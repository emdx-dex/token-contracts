const path = require('path');
require('dotenv').config({
  path: path.join(__dirname, '..', '.env')
})
require('@openzeppelin/test-helpers/configure')({
  provider: web3.currentProvider,
  environment: 'truffle'
});

const EMDXToken = artifacts.require('EMDXToken');

module.exports = async function (deployer, network, accounts) {
  const OWNER = network == 'kovan'
    ? process.env.DEPLOYER_ADDRESS
    : accounts[0];

  await deployer.deploy(EMDXToken, { from: OWNER });
};
