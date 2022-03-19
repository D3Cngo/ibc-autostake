import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import Network from '../src/utils/Network.mjs'
import Operator from '../src/utils/Operator.mjs'
import {mapSync, executeSync, overrideNetworks} from '../src/utils/Helpers.mjs'

import {
  coin
} from '@cosmjs/stargate'

import { MsgWithdrawDelegatorReward } from "cosmjs-types/cosmos/distribution/v1beta1/tx.js";
import { MsgDelegate } from "cosmjs-types/cosmos/staking/v1beta1/tx.js";
import { MsgExec } from "cosmjs-types/cosmos/authz/v1beta1/tx.js";
import fs from 'fs'
import _ from 'lodash'

const colors = {
  Reset: "\x1b[0m",
  Red: "\x1b[31m",
  Green: "\x1b[32m",
  Yellow: "\x1b[33m"
}
const infoLog = console.info;
const logLog = console.log;
const warnLog = console.warn;
const errorLog = console.error;

function formatDate() {
  const date = new Date();
  return String(date.getHours()).padStart(2, '0')
         + ':' + String(date.getMinutes()).padStart(2, '0')
         + ':' + String(date.getSeconds()).padStart(2, '0');
}

function formatMessage(arg, type, emoji, title) {
  const copyArgs = Array.prototype.slice.call(arg);
  copyArgs.unshift(`🕐  ${formatDate()} ${type}${emoji} [${title}]${colors.Reset}`);
  return copyArgs;
}
console.log = function () { logLog.apply(null, formatMessage(arguments, colors.Reset, ' ➖  ', 'LOG')); };
console.info = function () { infoLog.apply(null, formatMessage(arguments, colors.Green, ' 🟢  ', 'INFO')); };
console.warn = function () { warnLog.apply(null, formatMessage(arguments, colors.Yellow, ' 🟠  ', 'WARN')); };
console.error = function () { errorLog.apply(null, formatMessage(arguments, colors.Red, ' 🔴  ', 'ERROR')); };

class Autostake {
  constructor(){
    this.mnemonic = process.env.MNEMONIC
    if(!this.mnemonic){
      console.log('Please provide a MNEMONIC environment variable')
      process.exit()
    }
  }

  async run(networkName){
    const calls = this.getNetworksData().map(data => {
      return async () => {
        if(networkName && data.name !== networkName) return

        let client
        try {
          client = await this.getClient(data)
        } catch (error) {
          return console.error('Failed to connect: ', error)
        }

        if(!client.operator) return console.warn('Compound bot not found on this network.')
        if(!client.network.authzSupport) return console.warn('No Authz support on this network yet.')
        if(!client.network.connected) return console.error('Could not connect to REST API')
        if(!client.signingClient.connected) return console.error('Could not connect to RPC API')

        console.info('Using REST URL: ', client.network.restUrl)
        console.info('Using RPC URL: ', client.signingClient.rpcUrl)
        console.log('------------------------------------------------------------------------')

        await this.checkBalance(client)

        console.log('------------------------------------------------------------------------')
        console.info('Finding delegators...')
        let delegations
        const addresses = await this.getDelegations(client).then(delegations => {
          return delegations.map(delegation => {
            if(delegation.balance.amount === 0) return

            return delegation.delegation.delegator_address
          })
        })

        console.log('------------------------------------------------------------------------')
        console.info("Checking", addresses.length, "delegators for grants...")
        let grantCalls = addresses.map(item => {
          return async () => {
            try {
              const validators = await this.getGrantValidators(client, item)
              return validators ? item : undefined
            } catch (error) {
              console.error(item, 'Failed to get address')
            }
          }
        })
        let grantedAddresses = await mapSync(grantCalls, 50, (batch, index) => {
          console.log('...batch', index + 1)
        })
        grantedAddresses = _.compact(grantedAddresses.flat())

        console.log('------------------------------------------------------------------------')
        console.info("Found", grantedAddresses.length, "delegators with valid grants...")
        let calls = _.compact(grantedAddresses).map(item => {
          return async () => {
            try {
              await this.autostake(client, item, [client.operator.address])
            } catch (error) {
              console.error(item, 'ERROR: Skipping this run -', error.message)
            }
          }
        })
        await executeSync(calls, 1)
      }
    })
    await executeSync(calls, 1)
  }

  async getClient(data){
    const network = await Network(data)

    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(this.mnemonic, {
      prefix: network.prefix
    });

    const accounts = await wallet.getAccounts()
    const botAddress = accounts[0].address

    console.log('------------------------------------------------------------------------')
    console.info(data.prettyName, ' | 🤖 - ', botAddress)
    console.log('------------------------------------------------------------------------')

    const client = await network.signingClient(wallet)
    if(client.connected){
      client.registry.register("/cosmos.authz.v1beta1.MsgExec", MsgExec)
    }

    let validators = {}
    if(data.operators.find(el => el.botAddress === botAddress)){
      validators = await network.getValidators()
    }
    const operators = network.getOperators(validators)
    const operator = operators.find(el => el.botAddress === botAddress)

    return{
      network: network,
      operator: operator,
      signingClient: client,
      restClient: network.restClient
    }
  }

  checkBalance(client) {
    return client.restClient.getBalance(client.operator.botAddress, client.network.denom)
      .then(
        (balance) => {
          console.warn("Bot balance is", balance.amount, balance.denom)
          if(balance.amount < 1_000){
            console.warn('Bot balance is too low. Need more vespene gas.')
            process.exit()
          }
        },
        (error) => {
          console.error("ERROR:", error.message || error)
          process.exit()
        }
      )
  }

  getDelegations(client) {
    return client.restClient.getAllValidatorDelegations(client.operator.address, 50, (pages) => {
      console.log("...batch", pages.length)
    }).catch(error => {
      console.error("ERROR:", error.message || error)
      process.exit()
    })
  }

  getGrantValidators(client, delegatorAddress) {
    return client.restClient.getGrants(client.operator.botAddress, delegatorAddress)
      .then(
        (result) => {
          if(result.claimGrant && result.stakeGrant){
            const grantValidators = result.stakeGrant.authorization.allow_list.address
            if(!grantValidators.includes(client.operator.address)){
              console.warn(delegatorAddress, " | Skipping validator.")
              return
            }

            return grantValidators
          }
        },
        (error) => {
          console.error(delegatorAddress, "ERROR skipping this run:", error.message || error)
        }
      )
  }

  async autostake(client, address, validators){
    const totalRewards = await this.totalRewards(client, address, validators)

    const perValidatorReward = parseInt(totalRewards / validators.length)

    if(perValidatorReward < client.operator.data.minimumReward){
      console.warn(address, perValidatorReward, client.network.denom, 'claim reward below threshold, skipping...')
      return
    }

    console.info(address, "Autostaking", perValidatorReward, client.network.denom, validators.length > 1 ? "per validator" : '')

    let messages = validators.map(el => {
      return this.buildRestakeMessage(address, el, perValidatorReward, client.network.denom)
    }).flat()

    let execMsg = this.buildExecMessage(client.operator.botAddress, messages)

    const memo = 'Compounded by ' + client.operator.moniker
    return client.signingClient.signAndBroadcast(client.operator.botAddress, [execMsg], undefined, memo).then((result) => {
      console.info(address, "Successfully broadcasted");
    }, (error) => {
      console.error(address, 'Failed to broadcast:', error.message)
      // Skip on failure
      // process.exit()
    })
  }

  buildExecMessage(botAddress, messages){
    return {
      typeUrl: "/cosmos.authz.v1beta1.MsgExec",
      value: {
        grantee: botAddress,
        msgs: messages
      }
    }
  }

  buildRestakeMessage(address, validatorAddress, amount, denom){
    return [{
      typeUrl: "/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward",
      value: MsgWithdrawDelegatorReward.encode(MsgWithdrawDelegatorReward.fromPartial({
        delegatorAddress: address,
        validatorAddress: validatorAddress
      })).finish()
    }, {
      typeUrl: "/cosmos.staking.v1beta1.MsgDelegate",
      value: MsgDelegate.encode(MsgDelegate.fromPartial({
        delegatorAddress: address,
        validatorAddress: validatorAddress,
        amount: coin(amount, denom)
      })).finish()
    }]
  }

  totalRewards(client, address, validators){
    return client.restClient.getRewards(address)
      .then(
        (rewards) => {
          const total = Object.values(rewards).reduce((sum, item) => {
            const reward = item.reward.find(el => el.denom === client.network.denom)
            if(reward && validators.includes(item.validator_address)){
              return sum + parseInt(reward.amount)
            }
            return sum
          }, 0)
          return total
        },
        (error) => {
          console.error(address, "ERROR skipping this run:", error.message || error)
          return 0
        }
      )
  }

  getNetworksData(){
    const networksData = fs.readFileSync('src/networks.json');
    const networks = JSON.parse(networksData);
    try {
      const overridesData = fs.readFileSync('src/networks.local.json');
      const overrides = overridesData && JSON.parse(overridesData)
      return overrideNetworks(networks, overrides)
    } catch {
      return networks
    }
  }
}

const autostake = new Autostake();
const networkName = process.argv[2]
autostake.run(networkName)
