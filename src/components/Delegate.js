import DelegateForm from './DelegateForm'
import Validators from './Validators'
import ValidatorImage from './ValidatorImage'
import ValidatorLink from './ValidatorLink'

import React, { useState, useRef } from 'react';

import {
  Dropdown,
  Button,
  Modal,
  OverlayTrigger,
  Tooltip
} from 'react-bootstrap'

function Delegate(props) {
  const [show, setShow] = useState(false);
  const [selectedValidator, setSelectedValidator] = useState(!props.redelegate && props.validator);
  const target = useRef(null);

  const handleOpen = () => {
    setShow(true)
    if(!props.validator || props.redelegate){
      setSelectedValidator(null)
    }
  }

  const onDelegate = () => {
    props.onDelegate()
    setShow(false)
  }

  const excludeValidators = () => {
    if(props.redelegate){
      return [props.validator.operator_address]
    }else if(props.delegations){
      return Object.keys(props.delegations)
    }
  }

  const actionText = () => {
    if(props.redelegate) return 'Redelegate'
    if(props.undelegate) return 'Undelegate'
    if(props.validator){
      return 'Delegate'
    }else{
      return 'Add Validator'
    }
  }

  const button = () => {
    if(props.children){
      return (
        <span role="button" onClick={handleOpen}>
          {props.children}
        </span>
      )
    }else{
      if(props.button){
        const button = (
          <Button variant={props.variant || 'secondary'} size={props.size} onClick={handleOpen}>
            {actionText()}
          </Button>
        )
        return (
          <>
            {props.tooltip && props.validator ? (
              <OverlayTrigger
                key={props.validator.operator_address}
                placement="top"
                overlay={
                  <Tooltip id={`tooltip-${props.validator.operator_address}`}>
                    {props.tooltip}
                  </Tooltip>
                }
              >{button}</OverlayTrigger>
            ) : button}
          </>
        )
      }else{
        return (
          <Dropdown.Item onClick={handleOpen}>
            {actionText()}
          </Dropdown.Item>
        )
      }
    }
  }

  return (
    <>
      {button()}
    
    </>
  );
}

export default Delegate
