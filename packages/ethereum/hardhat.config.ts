// load env variables
require('dotenv').config()
// load hardhat plugins
import '@nomiclabs/hardhat-ethers'
import '@nomiclabs/hardhat-solhint'
import '@nomiclabs/hardhat-waffle'
import 'hardhat-deploy'
import 'hardhat-gas-reporter'
import 'solidity-coverage'
import '@typechain/hardhat'
// rest
import { HardhatUserConfig, task, types } from 'hardhat/config'
import { ethers } from 'ethers'
import { networks } from './chain/networks'

const { PRIVATE_KEY, INFURA_KEY, MATIC_VIGIL_KEY, ETHERSCAN_KEY, QUIKNODE_KEY } = process.env
const GAS_MULTIPLIER = 1.1

// set 'ETHERSCAN_API_KEY' so 'hardhat-deploy' can read it
process.env.ETHERSCAN_API_KEY = ETHERSCAN_KEY

const hardhatConfig: HardhatUserConfig = {
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: {
      live: false,
      tags: ['local', 'test'],
      saveDeployments: false
    },
    localhost: {
      live: false,
      tags: ['local'],
      url: 'http://localhost:8545',
      saveDeployments: false
    },
    mainnet: {
      ...networks.mainnet,
      gasMultiplier: GAS_MULTIPLIER,
      url: `https://mainnet.infura.io/v3/${INFURA_KEY}`,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : []
    },
    kovan: {
      ...networks.kovan,
      gasMultiplier: GAS_MULTIPLIER,
      url: `https://kovan.infura.io/v3/${INFURA_KEY}`,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : []
    },
    xdai: {
      ...networks.xdai,
      gasMultiplier: GAS_MULTIPLIER,
      url: `https://still-patient-forest.xdai.quiknode.pro/${QUIKNODE_KEY}/`,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : []
    },
    matic: {
      ...networks.matic,
      gasMultiplier: GAS_MULTIPLIER,
      url: `https://rpc-mainnet.maticvigil.com/v1/${MATIC_VIGIL_KEY}`,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : []
    },
    binance: {
      ...networks.binance,
      gasMultiplier: GAS_MULTIPLIER,
      url: 'https://bsc-dataseed.binance.org',
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : []
    }
  },
  namedAccounts: {
    deployer: 0
  },
  solidity: {
    compilers: [
      {
        version: '0.8.3'
      },
      {
        version: '0.6.6'
      },
      {
        version: '0.4.24'
      }
    ],
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './hardhat/cache',
    artifacts: './hardhat/artifacts',
    deployments: './deployments'
  },
  typechain: {
    outDir: './types',
    target: 'ethers-v5'
  },
  gasReporter: {
    currency: 'USD',
    excludeContracts: ['mocks', 'Migrations.sol', 'utils/console.sol']
  }
}

task('faucet', 'Faucets a local development HOPR node account with ETH and HOPR tokens', async (...args: any[]) => {
  return (await import('./tasks/faucet')).default(args[0], args[1], args[2])
})
  .addParam<string>('address', 'HoprToken address', undefined, types.string)
  .addOptionalParam<string>('amount', 'Amount of HOPR to fund', ethers.utils.parseEther('1').toString(), types.string)
  .addOptionalParam<boolean>(
    'ishopraddress',
    'Whether the address passed is a HOPR address or not',
    false,
    types.boolean
  )

task('postCompile', 'Use export task and then update abis folder', async (...args: any[]) => {
  return (await import('./tasks/postCompile')).default(args[0], args[1], args[2])
})

task('accounts', 'View unlocked accounts', async (...args: any[]) => {
  return (await import('./tasks/getAccounts')).default(args[0], args[1], args[2])
})

export default hardhatConfig
