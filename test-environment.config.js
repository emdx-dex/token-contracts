module.exports = {
  accounts: {
    amount: 100,
    ether: 100,
  },

  contracts: {
    type: 'truffle',
    artifactsDir: 'build/contracts',
  },

  node: {
    gasLimit: 8e6,
    gasPrice: 20e9
  },
};
