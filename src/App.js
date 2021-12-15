import { useState, useEffect } from 'react';
import axios from 'axios';
import { w3cwebsocket as W3CWebSocket } from "websocket";
import './App.css';

import MainMenu from './components/MainMenu';
import TargetMenu from './components/TargetMenu';
import MagicMenu from './components/MagicMenu';

let urlParams = new URLSearchParams(window.location.search);

const config = {
    BASE_URL: "https://deusprogrammer.com/api/twitch",
    WS_URL: "wss://deusprogrammer.com/api/ws/twitch"
}

const removeLast = (array) => {
    let copy = [...array];
    copy.pop();
    return copy;
}

const indexArrayToMap = (array) => {
    let table = {};
    array.forEach((element) => {
        table[element.id] = element;
    });

    return table;
}

const expandUser = (userData, context) => {
    userData.totalAC = 0;
    userData.abilities = [];
    userData.currentJob = context.jobTable[userData.currentJob.id];
    userData.str = userData.currentJob.str;
    userData.dex = userData.currentJob.dex;
    userData.int = userData.currentJob.int;
    userData.hit = userData.currentJob.hit;
    userData.maxHp = userData.currentJob.hp;
    Object.keys(userData.equipment).forEach((slot) => {
        let item = userData.equipment[slot];
        let itemData = context.itemTable[item.id];
        if (itemData.type === "armor") {
            userData.totalAC += itemData.ac;
        }
        userData.totalAC += itemData.mods.ac;
        userData.maxHp += itemData.mods.hp;
        userData.str += itemData.mods.str;
        userData.dex += itemData.mods.dex;
        userData.int += itemData.mods.int;
        userData.hit += itemData.mods.hit;
        itemData.abilities.forEach((ability) => {
            if (userData.abilities.find((element) => {
                return ability === element.id
            })) {
                return;
            }
            userData.abilities.push(context.abilityTable[ability]);
        });
        userData.equipment[slot] = itemData;
    });
    let newInventoryList = [];
    let condensedItemMap = {};
    userData.inventory.forEach((item) => {
        newInventoryList.push(context.itemTable[item]);
        if (!condensedItemMap[item]) {
            condensedItemMap[item] = {
                item: context.itemTable[item],
                count: 1
            }

            return;
        }
        condensedItemMap[item].count++;
    });

    if (userData.maxHp < 0) {
        userData.maxHp = 1;
    }

    if (userData.hp > userData.maxHp) {
        userData.hp = userData.maxHp;
    }

    userData.inventory = newInventoryList;
    userData.condensedInventory = condensedItemMap;
    userData.actionCooldown = Math.min(11, 6 - Math.min(5, userData.dex));

    return userData;
}

const getItems = async (channel) => {
    let url = `${config.BASE_URL}/items`;
    if (channel) {
        url += `?owningChannel=${channel}`;
    }

    let items = await axios.get(url, {
        headers: {
            "X-Access-Token": localStorage.getItem("accessToken")
        }
    });

    return items.data;
}

const getItemTable = async () => {
    let items = await getItems();

    return indexArrayToMap(items);
}

const getJobs = async (channel) => {
    let url = `${config.BASE_URL}/jobs`;
    if (channel) {
        url += `?owningChannel=${channel}`;
    }

    let jobs = await axios.get(url, {
        headers: {
            "X-Access-Token": localStorage.getItem("accessToken")
        }
    });

    return jobs.data;
}

const getJobTable = async () => {
    let jobs = await getJobs();

    return indexArrayToMap(jobs);
}

const getAbilities = async (channel) => {
    let url = `${config.BASE_URL}/abilities`;
    if (channel) {
        url += `?owningChannel=${channel}`;
    }

    let abilities = await axios.get(url,
        {
            headers: {
                "X-Access-Token": localStorage.getItem("accessToken")
            }
        });

    return abilities.data;
}

const getAbilityTable = async () => {
    let abilities = await getAbilities();

    return indexArrayToMap(abilities);
}

const getUser = async (username) => {
    let user = await axios.get(`${config.BASE_URL}/users/${username}`,
        {
            headers: {
                "X-Access-Token": localStorage.getItem("accessToken")
            }
        });

    return user.data;
}

const App = (props) => {
    const [windowStack, setWindowStack] = useState(["MAIN_MENU"]);
    const [action, setAction] = useState(null);
    const [ability, setAbility] = useState(null);
    const [target, setTarget] = useState(null);
    const [player, setPlayer] = useState({});
    const [jwt, setJwt] = useState(null);
    const [pingInterval, setPingInterval] = useState(null);
    const [gameContext, setGameContext] = useState(
        {
            encounters: [], 
            allies: [
                // {
                //     key: "@therealswindle1984",
                //     name: "therealswindle1984",
                //     avatar: "https://dummyimage.com/100X100/000/FFF",
                //     hp: 100,
                //     maxHp: 1000
                // }
            ]
        });

    const windowLabels = {
        MAIN_MENU: "Start",
        TARGET_MENU: "Choose Target",
        MAGIC_MENU: "Magic",
        CONFIRMATION: "Confirm"
    }

    let ws;
    let channelId = urlParams.get("channelId");

    const connect = (jwt) => {
        ws = new W3CWebSocket(config.WS_URL);

        console.log("JWT (CONNECT): " + jwt);
        
        //Register battle panel
        ws.onopen = () => {
            console.log("WEB SOCKET OPENED");

            // this.setState({connecting: false, wsError: null});
            ws.send(JSON.stringify({
                type: "REGISTER",
                jwt
            }));

            // Get current context.
            ws.send(JSON.stringify({
                type: "CONTEXT",
                jwt,
                to: `BOT-${channelId}`
            }));

            // Every 5 minutes, check to see if the bot is still up.
            let pingInterval = setInterval(() => {
                ws.send(JSON.stringify({
                    type: "PING",
                    jwt,
                    to: `BOT-${channelId}`
                }));
            }, 20 * 1000);

            setPingInterval(pingInterval);
        }

        ws.onmessage = (message) => {
            console.log("MESSAGE: " + message.data);
            let event = JSON.parse(message.data);

            // Refresh data based on event
            if (event.type === "CONTEXT") {
                if (event.data.shouldRefresh) {
                    refreshUser();
                }

                let encounters = Object.keys(event.data.monsters).map((key) => {
                    const {name, hp, maxHp} = event.data.monsters[key];
                    return {
                        key: `~${key}`,
                        name,
                        hp,
                        maxHp
                    }
                });

                setGameContext({...gameContext, encounters});

                // Store date
            } else if (event.type === "SHUTDOWN") {
                //this.setState({botIsLive: false, connecting: false});
            } else if (event.type === "STARTUP") {
                //this.setState({botIsLive: true, ready: false, connecting: false});
            } else if (event.type === "SEND_FAILURE") {
                // setTimeout(() => {
                //     this.setState({botIsLive: false, connecting: false, ready: false, wsError: "Bot is unreachable.  Try again later."});
                // }, 2 * 1000)
            }
        };

        ws.onclose = (e) => {
            console.log('Socket is closed. Reconnect will be attempted in 5 second.', e.reason);
            //this.setState({ botIsLive: false });
            if (pingInterval) {
                clearInterval(pingInterval);
            }
            setTimeout(() => {
                connect(jwt);
            }, 5000);
        };

        ws.onerror = (err) => {
            console.error('Socket encountered error: ', err.message, 'Closing socket');
            //this.setState({ botIsLive: false, connecting: false, wsError: "Connection failed.  Bot is likely turned off right now." });
            ws.close();
        };
    }

    const refreshUser = async (name) => {
        let user = await getUser(name);
        let itemTable = await getItemTable();
        let abilityTable = await getAbilityTable();
        let jobTable = await getJobTable();
        user = expandUser(user, {itemTable, jobTable, abilityTable});
        setPlayer(user);
    }

    useEffect(() => {
        (async () => {
            let {data: {username: name}} = await axios.get(`https://deusprogrammer.com/api/profile-svc/users/~self`, {
                headers: {
                    "X-Access-Token": localStorage.getItem("accessToken")
                }
            });
            let {data: {jwt}} = await axios.post(`https://deusprogrammer.com/api/streamcrabs/auth/ws`, {
                channel: channelId
            }, {
                headers: {
                    "X-Access-Token": localStorage.getItem("accessToken")
                }
            });
            setJwt(jwt);

            console.log("JWT: " + jwt);

            refreshUser(name);
            if (channelId) {
                connect(jwt);
            }
        })();
    }, []);

    const renderCurrentWindows = () => {
        switch (windowStack.at(-1)) {
            case "MAIN_MENU":
                return (
                    <MainMenu
                        onComplete={(nextWindow, choice) => {setWindowStack([...windowStack, nextWindow]); setAction(choice);}}
                        onCancel={() => {setWindowStack(removeLast(windowStack))}} />
                );
            case "TARGET_MENU":
                return (
                    <TargetMenu 
                        enemies={gameContext.encounters}
                        allies={gameContext.allies}
                        onComplete={(nextWindow, choice) => {setWindowStack([...windowStack, nextWindow]); setTarget(choice)}}
                        onCancel={() => {setWindowStack(removeLast(windowStack))}} />
                )
            case "MAGIC_MENU":
                return (
                    <MagicMenu 
                        character={player}
                        onComplete={(nextWindow, choice) => {setWindowStack([...windowStack, nextWindow]); setAbility(choice)}}
                        onCancel={() => {setWindowStack(removeLast(windowStack))}} />
                );
            case "CONFIRMATION":
                return (
                    <div>
                        <p>You really wanna do this shit?</p>
                        <button onClick={() => {setWindowStack(["MAIN_MENU"]); setAbility(null); setTarget(null); setAction(null);}}>Hell Yeah</button>
                        <button onClick={() => {setWindowStack(removeLast(windowStack))}}>Fuck No</button>
                    </div>
                );
            default:
                return (
                    <div>Not implemented</div>
                )
        }
    };

    return (
        <div>
            <h2>{player.name}</h2>
            <table>
                <tbody>
                    <tr>
                        <td>HP:</td>
                        <td>{player.hp}/{player.maxHp}</td>
                    </tr>
                    <tr>
                        <td>AP:</td>
                        <td>{player.ap}</td>
                    </tr>
                    <tr>
                        <td>Time:</td>
                        <td></td>
                    </tr>
                </tbody>
            </table>
            <div style={{height: "20px"}}>
                {windowStack.map(window => windowLabels[window]).join(" => ")}
            </div>
            <div style={{height: "20px"}}>
                {action || ability || target ? `${action ? action : '?'}${ability ? "[" + ability.name + "]" : ''} => ${target ? target.name : '?'}` : ''}
            </div>
            <hr />
            {renderCurrentWindows()}
        </div>
    )
}

export default App;
