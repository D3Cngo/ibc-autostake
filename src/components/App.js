import 'bootstrap/dist/css/bootstrap.min.css';

import './App.css';
import React from 'react'
import _ from 'lodash'
import SigningClient from '../utils/SigningClient.mjs'
import AlertMessage from './AlertMessage'
import NetworkSelect from './NetworkSelect'
import NetworkFinder from './NetworkFinder'

import Wallet from './Wallet'
import Coins from './Coins'
import ValidatorLink from './ValidatorLink'
import About from './About'
import { MsgGrant, MsgRevoke } from "cosmjs-types/cosmos/authz/v1beta1/tx.js";
import {
  Container,
  Button,
  Badge,
  Row,
  Col,
  Nav,
  Card,
} from 'react-bootstrap';
import { Link } from "react-router-dom";

import {CopyToClipboard} from 'react-copy-to-clipboard';
import GitHubButton from 'react-github-btn'
import Logo from '../assets/logo.png'
import Logo2x from '../assets/logo@2x.png'

import ShapeShiftDAO from '../assets/shapeshiftdao.png'
import ATOM from '../assets/chains/ATOM.svg'
import OSMO from '../assets/chains/OSMO.svg'
import JUNO from '../assets/chains/JUNO.svg'
import UMEE from '../assets/chains/UMEE.png'
import EVMOS from '../assets/chains/EVMOS.png'
import TERRA from '../assets/chains/TERRA.svg'
import FROWN from '../assets/frown.svg'

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {validatorImages: {}}
    this.connect = this.connect.bind(this);
    this.showNetworkSelect = this.showNetworkSelect.bind(this);
    this.getValidatorImage = this.getValidatorImage.bind(this);
    this.loadValidatorImages = this.loadValidatorImages.bind(this);
  }

  async componentDidMount() {
    await this.setNetwork()
    window.onload = async () => {
      if (!window.keplr) {
        this.setState({keplr: false})
      } else {
        this.setState({keplr: true})
        this.connect()
      }
    }
    window.addEventListener("keplr_keystorechange", this.connect)
    if(this.props.operators){
      this.loadValidatorImages(this.props.network, _.compact(this.props.operators.map(el => el.validatorData)))
    }
    this.loadValidatorImages(this.props.network, this.props.validators)
  }

  async componentDidUpdate(prevProps){
    if(!this.state.keplr && window.keplr){
      this.setState({keplr: true})
      this.connect()
    }
    if(this.props.network !== prevProps.network){
      if(this.state.address){
        this.connect()
      }
      await this.setNetwork()
    }
  }

  componentWillUnmount() {
    window.removeEventListener("keplr_keystorechange", this.connect)
  }

  setNetwork(){
    const network = this.props.network
    if(!network) return

    return this.setState({
      error: false,
      chainId: network.chainId,
      denom: network.denom,
      restClient: network.restClient
    })
  }

  showNetworkSelect(){
    this.setState({showNetworkSelect: true})
  }

  async connect() {
    if(!this.props.network.connected){
      return this.setState({
        error: 'Could not connect to any available API servers'
      })
    }
    await window.keplr.enable(this.state.chainId);
    if (window.getOfflineSigner){
      const offlineSigner = await window.getOfflineSignerAuto(this.state.chainId)
      const key = await window.keplr.getKey(this.state.chainId);
      const stargateClient = await this.props.network.signingClient(offlineSigner, key)
      if(!stargateClient.connected){
        this.setState({
          error: 'Could not connect to any available RPC servers'
        })
        return
      }

      const address = await stargateClient.getAddress()

      stargateClient.registry.register("/cosmos.authz.v1beta1.MsgGrant", MsgGrant)
      stargateClient.registry.register("/cosmos.authz.v1beta1.MsgRevoke", MsgRevoke)
      this.setState({
        address: address,
        stargateClient: stargateClient,
        error: false
      })
      this.getBalance()
    }
  }

  async disconnect(){
    this.setState({
      address: null,
      stargateClient: null
    })
  }

  getValidatorImage(network, validatorAddress, expireCache){
    const images = this.state.validatorImages[network.name] || {}
    if(images[validatorAddress]){
      return images[validatorAddress]
    }
    return this.getValidatorImageCache(validatorAddress, expireCache)
  }

  getValidatorImageCache(validatorAddress, expireCache){
    const cache = localStorage.getItem(validatorAddress)
    if(!cache) return

    let cacheData = {}
    try {
      cacheData = JSON.parse(cache)
    } catch {
      cacheData.url = cache
    }
    if(!cacheData.url) return
    if(!expireCache) return cacheData.url

    const cacheTime = cacheData.time && new Date(cacheData.time)
    if(!cacheData.time) return

    const expiry = new Date() - 1000 * 60 * 60 * 24 * 3
    if(cacheTime >= expiry) return cacheData.url
  }

  async loadValidatorImages(network, validators) {
    this.setState((state, props) => ({
      validatorImages: _.set(state.validatorImages, network.name, state.validatorImages[network.name] || {})
    }));
    const calls = Object.values(validators).map(validator => {
      return () => {
        if(validator.description.identity && !this.getValidatorImage(network, validator.operator_address, true)){
          return fetch("https://keybase.io/_/api/1.0/user/lookup.json?fields=pictures&key_suffix=" + validator.description.identity)
            .then((response) => {
              return response.json();
            }).then((data) => {
              if(data.them && data.them[0] && data.them[0].pictures){
                const imageUrl = data.them[0].pictures.primary.url
                this.setState((state, props) => ({
                  validatorImages: _.set(state.validatorImages, [network.name, validator.operator_address], imageUrl)
                }));
                localStorage.setItem(validator.operator_address, JSON.stringify({url: imageUrl, time: +new Date()}))
              }
            }, error => { })
        }else{
          return null
        }
      }
    })
    const batchCalls = _.chunk(calls, 1);

    for (const batchCall of batchCalls) {
      await Promise.all(batchCall.map(call => call()))
    }
  }

  async getBalance() {
    this.state.restClient.getBalance(this.state.address, this.props.network.denom)
      .then(
        (balance) => {
          this.setState({
            balance: balance
          })
        }
      )
  }

  setCopied(){
    this.setState({copied: true})
    setTimeout(() => {
      this.setState({copied: false})
    }, 2000)
  }

  render() {
    return (
      <Container fluid> 
              <header className="main-head d-flex flex-wrap justify-content-between py-3 mb-4 px-4 border-bottom">
          <div className="logo d-flex align-items-center mb-3 mb-md-0 text-dark text-decoration-none">
        
          </div>
          {this.state.address &&
          <ul className="nav nav-pills justify-content-end">
            <li className="nav-item d-none d-xl-block">
              <CopyToClipboard text={this.state.address}
                onCopy={() => this.setCopied()}>
                <span role="button"><span className={'nav-link disabled clipboard' + (this.state.copied ? ' copied' : '')}>{this.state.address}</span></span>
              </CopyToClipboard>
            </li>
            <li className="nav-item d-none d-md-block">
              <span className="nav-link ps-4">
                <Badge>
                  <Coins
                    coins={this.state.balance}
                    decimals={this.props.network.data.decimals}
                  />
                </Badge>
              </span>
            </li>
            {false && (
              <li className="nav-item ps-4">
                <Button onClick={() => this.disconnect()} className="nav-link btn-link" aria-current="page">Disconnect</Button>
              </li>
            )}
          </ul>
          }
          <div className="d-flex align-items-center mb-3 mb-md-0 text-dark text-decoration-none pr-4 mr-4 ps-4">
            <NetworkSelect show={this.state.showNetworkSelect} onHide={() => {this.setState({showNetworkSelect: false})}} networks={this.props.networks}
              network={this.props.network}
              validators={this.props.validators} getValidatorImage={this.getValidatorImage}
              changeNetwork={this.props.changeNetwork} loadValidatorImages={this.loadValidatorImages} />
          </div>
        </header>
          <Row>
          <Col xs={3} md={3} xl={2}>
          <div className="sidebar-wrapper">
           
            <ul className="sidebar-nav">
            <div className="sidebar-brand">
            <img src={Logo} srcSet={`${Logo2x} 2x,`} alt="FOXFrens IBC Autos-Compounder" className="p-4"/>
            </div>
            
                <li>
                <Link to="/cosmoshub" onClick={this.showNetworkSelect} role="button"><img src={ATOM} className="chain-logo p-2"/> Cosmos <Badge bg="success">ACTIVE</Badge></Link>
                </li>
                <li>
                    <Link to="/osmosis" onClick={this.showNetworkSelect} role="button"><img src={OSMO} className="chain-logo p-1"/> Osmosis <Badge bg="success">ACTIVE</Badge></Link> 
                </li>
                <li>
                    <Link to="/umee" onClick={this.showNetworkSelect} role="button"><img src={UMEE} className="chain-logo p-2"/>Umee <Badge bg="info">PRE-DELEGATION</Badge></Link>
                </li>
                <li>
                    <a href="#"><img src={JUNO} className="chain-logo p-2"/>Juno <Badge bg="secondary">COMING SOON</Badge></a>
                </li>
             
                <li>
                    <a href="#"><img src={TERRA} className="chain-logo p-2"/>TERRA <Badge bg="secondary">COMING SOON</Badge></a>
                </li>
                <li>
                    <a href="#"><img src={EVMOS} className="chain-logo p-2"/>EVMOS <Badge bg="danger">INACTIVE</Badge></a>
                </li>
                <li>
                    <a href="mailto:lpx@shapeshift.one"><img src={FROWN} className="chain-logo frown p-2"/> Report Bugs</a>
                </li>
               
            </ul>
        </div>
          </Col>
          <Col xs={12} md={9} xl={7}>
          <div className="mb-5 px-4">
          <p className="lead fs-3 text-center mt-2 mb-3">FOXFrens IBC allows <strong>auto-compounding</strong> your <strong onClick={this.showNetworkSelect} className="text-decoration-underline" role="button">{this.props.network.prettyName}</strong> staking rewards.</p>
          <AlertMessage message={this.state.error} variant="danger" dismissible={false} />
          {!this.state.address && (
            !this.state.keplr
              ? (
                <AlertMessage variant="warning" dismissible={false}>
                  Please install the <a href="https://chrome.google.com/webstore/detail/keplr/dmkamcknogkgcdfhhbddcghachkejeap?hl=en" target="_blank" rel="noreferrer">Keplr browser extension</a> using desktop Google Chrome.<br />WalletConnect and mobile support is coming soon.
                </AlertMessage>
              ) : (
                <div className="mb-5 text-center">
                  <Button onClick={this.connect}>
                    Connect Keplr
                  </Button>
                </div>
              )
          )}
          {this.state.address &&
          <>
            <Wallet
              network={this.props.network}
              address={this.state.address}
              operators={this.props.operators}
              validators={this.props.validators}
              balance={this.state.balance}
              getValidatorImage={this.getValidatorImage}
              restClient={this.state.restClient}
              stargateClient={this.state.stargateClient} />
          </>
          }
          <hr />
         
          <p className="mb-4">
            <strong>At the moment the claim and re-stake transaction fees are paid for by the compound bot operator (LPX) with a donation by Operations. This will be a testing ground for the auto-compound feature until the DAO potentially takes ownership of this project and integrate it into the ShapeShift Platform, which is slated to support the Cosmos network in roughly one month.</strong>
          </p>         
           <p className="mb-4">
            <strong>Every 24 hours (roughly 18:00 UTC) all delegated wallets will auto-compound to ShapeShift's validators. The compound bots' addresses and balances can be checked below:</strong>
            <ul className="mt-4">
              <li>Osmosis: osmo19pqrxrl6n0g0mky4y79hlfzchprmsp5jmu2t6g</li>
              <li>Cosmos: cosmos19pqrxrl6n0g0mky4y79hlfzchprmsp5jn8emv6</li>
            </ul>
          </p>
          <hr />
          <p><b>BETA SOFTWARE: </b> Use at your own risk. The compound bot has no access to wallet funds and is only authorized to claim and re-stake rewards. However, as with all new software, it is recommended to proceed with caution. </p>
          <p>FOX Tips Always Welcome 😉 <Badge bg="secondary">0x7d35CC8b38a380b1Cd6ecA2E7cEe3da5B3bD4D3C</Badge></p>
        </div>
      
          </Col>
          <Col xs={3} md={3} xl={3}>
          <Card className="mb-3">
            
            <Card.Body> 
            <Card.Title className="text-uppercase">How it works</Card.Title>
            <hr />
            <Card.Text className="small">

              <p>The auto-compounder makes use of a new feature in Cosmos blockchains called <a href="https://docs.cosmos.network/master/modules/authz/">Authz</a>. This allows a validator (or any other wallet) to send certain <b>pre-authorized</b> transactions on your behalf.</p>
          <p>When you authorize the compound bot, you allow the bot to create transactions with <span class="badge bg-secondary">WithdrawDelegatorReward</span>&nbsp; 
and <span class="badge bg-secondary">Delegate</span> only to the validator that have been approved by you - personal <b>funds are never exposed, and the compounding bot cannot delegate to an unapproved validator</b>. The authorisation has been set to automatically expire after four months, and you can revoke the permissions at any time.</p>
<p>Most importantly, the source code is completely open source and available for viewing.</p>
          </Card.Text>

          </Card.Body>
          </Card>
          <Card>
            
            <Card.Body> 
            <Card.Title className="text-uppercase">How to use FOXFrens IBC</Card.Title>
            <hr />
            <Card.Text className="small">
            <ol>
            <li>Choose a network that ShapeShift DAO is currently validating.</li>
            <li>Delegate to the ShapeShift Validator.</li>
            <li>Enable auto-compounding on the validator.</li>
            <li>Get a cold beer and allow the bot to compound your staking rewards daily.</li>
          </ol>
          </Card.Text>

          </Card.Body>
          </Card>
       
            </Col>
        </Row>
        <footer className="d-flex flex-wrap justify-content-between align-items-center py-3 my-4 border-top px-4">
          <a href="https://ibc.foxfrens.com" target="_blank" rel="noreferrer" className="col-md-4 mb-0 text-muted">
            <img src={ShapeShiftDAO} alt="Powered by FOXFrens" width={200} />
          </a>

      

          <p className="col-md-6 mb-0 text-muted text-end justify-content-end d-none d-lg-flex">
          <span className="d-none d-sm-inline me-1">Built with ❤&nbsp;</span> by LPX | Forked from and Inspired by ECO Stake 🌱
          </p>
        </footer>
       
        <About show={this.state.showAbout} onHide={() => this.setState({showAbout: false})} />
      </Container>
    )
  }
}

export default App;
