const path = require('path');
require('dotenv').config({
  path: path.join(__dirname, '..', '.env')
})

const Migrations = artifacts.require("Migrations");

module.exports = function (deployer, network, accounts) {
  const OWNER = ['fuji-fork', 'fuji'].includes(network)
    ? process.env.DEPLOYER_ADDRESS
    : accounts[0];

  deployer.deploy(Migrations, { from: OWNER });
};
