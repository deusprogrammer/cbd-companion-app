import React from 'react';

const AttackMenu = (props) => {
    return (
        <div>
            <h3>Enemies</h3>
            {props.enemies.map((target, index) => {
                return (
                    <button key={`enemy-${index}`} type="button" onClick={() => {props.onComplete("CONFIRMATION", target)}}>
                        {target.name}
                    </button>
                )
            })}
            <h3>Allies</h3>
            {props.allies.map((target, index) => {
                return (
                    <button key={`ally-${index}`} type="button" onClick={() => {props.onComplete("CONFIRMATION", target)}}>
                        {target.name}
                    </button>
                )
            })}
            <hr/>
            <button type="button" onClick={() => {props.onCancel()}}>Go Back</button>
        </div>
    )
};

export default AttackMenu;