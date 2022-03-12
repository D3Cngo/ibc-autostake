import {
  Modal
} from 'react-bootstrap'

function About(props) {
  return (
    <>
      <Modal show={props.show} onHide={() => props.onHide()}>
        <Modal.Header closeButton>
          <Modal.Title>More Validators Coming Soon</Modal.Title>
        </Modal.Header>
        <Modal.Body className="small">
          <h5>SCP-63 - Addition of Umee, Terra, and Juno</h5>
          <p>SCP-63 was passed by the governance process to add to the list of our growing validator list. Stay tuned for the addition of Terra and Juno!</p>
          <hr />
          <h5>Changelog</h5>
          <ol>
            <li>3/13/22 | Routing improved, addition of Umee</li>
            <li>3/12/22 | Minor front-end changes</li>
            <li>3/11/22 | First public beta launched</li>
          </ol>
          
        </Modal.Body>
      </Modal>
    </>
  );
}

export default About
