import React from 'react';

const MainMenu = (props) => {
    return (
        <div>
            <button type="button" onClick={() => {props.onComplete("TARGET_MENU", "Attack")}}>Attack</button>
            <button type="button" onClick={() => {props.onComplete("MAGIC_MENU", "Magic")}}>Magic</button>
            <button type="button" onClick={() => {props.onComplete("ITEM_MENU", "Item")}}>Item</button>
            <button type="button" onClick={() => {props.onComplete("CONFIRMATION", "Explore")}}>Explore</button>
            <button type="button" onClick={() => {props.onComplete("INTERACTION_MENU", "Interact")}}>Interact</button>
        </div>
    )
};

export default MainMenu;