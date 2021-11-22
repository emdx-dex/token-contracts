require('dotenv').config();
const HDWalletProvider = require('@truffle/hdwallet-provider');

module.exports = {

  networks: {

    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*",
    },

    coverage: {
      host: "127.0.0.1",
      network_id: "*",
      port: 8555,
      gas: 0xfffffffffff,
      gasPrice: 0x01,
    },

    ganache: {
      host: "127.0.0.1",
      port: 8545,
      network_id: '*'
    },

    fuji: {
      provider: () => {
        return new HDWalletProvider(
          process.env.DEPLOYER_MNENOMIC,
          process.env.RPC_URL
        )
      },
      network_id: 1,
      gasPrice: 25000000000
    }
  },

  plugins: ["solidity-coverage"],

  mocha: {
    timeout: 50000
  },

  compilers: {
    solc: {
      version: "0.8.9",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        }
      }
    }
  }
}
