import {
  Modal
} from 'react-bootstrap'

function About(props) {
  return (
    <>
      <Modal show={props.show} onHide={() => props.onHide()}>
        <Modal.Header closeButton>
          <Modal.Title>More ShapeShift Validators Coming Soon</Modal.Title>
        </Modal.Header>
        <Modal.Body className="small">
          <h5>SCP-63 - Addition of Umee, Terra, and Juno</h5>
          <p>SCP-63 was passed by the governance process to add to the list of our growing validator list. Stay tuned for the addition of Terra and Juno!</p>
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
