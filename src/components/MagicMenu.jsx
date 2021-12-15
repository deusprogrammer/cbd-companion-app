import React from 'react';

const MagicMenu = (props) => {
    return (
        <div>
            {props.character.abilities.map((ability, index) => {
                return (
                    <button key={`ability-${index}`} type="button" onClick={() => {props.onComplete("TARGET_MENU", ability)}}>
                        {ability.name}
                    </button>
                )
            })}
            <hr/>
            <button type="button" onClick={() => {props.onCancel()}}>Go Back</button>
        </div>
    )
};

export default MagicMenu;