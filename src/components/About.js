import {
  Modal
} from 'react-bootstrap'

function About(props) {
  return (
    <>
      <Modal show={props.show} onHide={() => props.onHide()}>
        <Modal.Header closeButton>
          <Modal.Title>About FOXFrens Auto-Compounder</Modal.Title>
        </Modal.Header>
        <Modal.Body className="small">
          <h5>How it works</h5>
          <p>The auto-compounder makes use of a new feature in Cosmos blockchains called Authz. This allows a validator (or any other wallet) to send certain pre-authorised transactions on your behalf.</p>
          <p>When you authorise the compound bot by signing the Authz tx, the compound bot is authorized to send WithdrawDelegatorReward for any address, and Delegate for their own validator address. The validator cannot delegate to any other validators, and the authorisation expires automatically after four months and you can revoke at any time.</p>
          <h5>How to use FOXFrens IBC</h5>
          <ol>
            <li>Choose a network that ShapeShift DAO is currently validating.</li>
            <li>Delegate to the ShapeShift Validator.</li>
            <li>Enable auto-compounding on the validator.</li>
            <li>Get a cold beer and allow the bot to compound your staking rewards daily.</li>
          </ol>
          
        </Modal.Body>
      </Modal>
    </>
  );
}

export default About
