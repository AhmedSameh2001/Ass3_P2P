const crypto = require("crypto"); SHA256 = message => crypto.createHash("sha256").update(message).digest("hex");
const EC = require("elliptic").ec, ec = new EC("secp256k1");
const { Block, Blockchain, Transaction, File_BlockChain } = require("./File_BlockChain");

const MINT_PRIVATE_ADDRESS = "0700a1ad28a20e5b2a517c00242d3e25a88d84bf54dce9e1733e6096e6d6495e";
const MINT_KEY_PAIR = ec.keyFromPrivate(MINT_PRIVATE_ADDRESS, "hex");
const MINT_PUBLIC_ADDRESS = MINT_KEY_PAIR.getPublic("hex");
const privateKey = "62d101759086c306848a0c1020922a78e8402e1330981afe9404d0ecc0a4be3d";
const keyPair = ec.keyFromPrivate(privateKey, "hex");
const publicKey = keyPair.getPublic("hex");
const WS = require("ws");

const PORT = 3000;
const PEERS = [];
const MY_ADDRESS = "ws://localhost:3000";
const server = new WS.Server({ port: PORT });
let opened = [], connected = [];
let check = [];
let checked = [];
let checking = false;
let tempChain = new Blockchain();

console.log("Listening on PORT", PORT);

server.on("connection", async (socket, req) => {
    socket.on("message", message => {
        const _message = JSON.parse(message);
        console.log(_message);
        switch(_message.type) {
            case "TYPE_REPLACE_CHAIN":
                const [ newBlock, newDiff ] = _message.data;

                const ourTx = [...File_BlockChain.transactions.map(tx => JSON.stringify(tx))];
                const theirTx = [...newBlock.data.filter(tx => tx.from !== MINT_PUBLIC_ADDRESS).map(tx => JSON.stringify(tx))];
                const n = theirTx.length;

                if (newBlock.prevHash !== File_BlockChain.getLastBlock().prevHash) {
                    for (let i = 0; i < n; i++) {
                        const index = ourTx.indexOf(theirTx[0]);

                        if (index === -1) break;
                        
                        ourTx.splice(index, 1);
                        theirTx.splice(0, 1);
                    }

                    if (
                        theirTx.length === 0 &&
                        SHA256(File_BlockChain.getLastBlock().hash + newBlock.timestamp + JSON.stringify(newBlock.data) + newBlock.nonce) === newBlock.hash &&
                        newBlock.hash.startsWith("000" + Array(Math.round(Math.log(File_BlockChain.difficulty) / Math.log(16) + 1)).join("0")) &&
                        Block.hasValidTransactions(newBlock, File_BlockChain) &&
                        (parseInt(newBlock.timestamp) > parseInt(File_BlockChain.getLastBlock().timestamp) || File_BlockChain.getLastBlock().timestamp === "") &&
                        parseInt(newBlock.timestamp) < Date.now() &&
                        File_BlockChain.getLastBlock().hash === newBlock.prevHash &&
                        (newDiff + 1 === File_BlockChain.difficulty || newDiff - 1 === File_BlockChain.difficulty)
                    ) {
                        File_BlockChain.chain.push(newBlock);
                        File_BlockChain.difficulty = newDiff;
                        File_BlockChain.transactions = [...ourTx.map(tx => JSON.parse(tx))];
                    }
                } else if (!checked.includes(JSON.stringify([newBlock.prevHash, File_BlockChain.chain[File_BlockChain.chain.length-2].timestamp || ""]))) {
                    checked.push(JSON.stringify([File_BlockChain.getLastBlock().prevHash, File_BlockChain.chain[File_BlockChain.chain.length-2].timestamp || ""]));

                    const position = File_BlockChain.chain.length - 1;

                    checking = true;

                    sendMessage(produceMessage("TYPE_REQUEST_CHECK", MY_ADDRESS));

                    setTimeout(() => {
                        checking = false;

                        let mostAppeared = check[0];

                        check.forEach(group => {
                            if (check.filter(_group => _group === group).length > check.filter(_group => _group === mostAppeared).length) {
                                mostAppeared = group;
                            }
                        })

                        const group = JSON.parse(mostAppeared)

                        File_BlockChain.chain[position] = group[0];
                        File_BlockChain.transactions = [...group[1]];
                        File_BlockChain.difficulty = group[2];

                        check.splice(0, check.length);
                    }, 5000);
                }
            break;

            case "TYPE_REQUEST_CHECK":
                opened.filter(node => node.address === _message.data)[0].socket.send(
                    JSON.stringify(produceMessage(
                        "TYPE_SEND_CHECK",
                        JSON.stringify([File_BlockChain.getLastBlock(), File_BlockChain.transactions, File_BlockChain.difficulty])
                    ))
                );
                break;

            case "TYPE_SEND_CHECK":
                if (checking) check.push(_message.data);
                break;

            case "TYPE_CREATE_TRANSACTION":
                const transaction = _message.data;
                File_BlockChain.addTransaction(transaction);
                break;

            case "TYPE_SEND_CHAIN":
                const { block, finished } = _message.data;
                if (!finished) {
                    tempChain.chain.push(block);
                } else {
                    tempChain.chain.push(block);
                    if (Blockchain.isValid(tempChain)) {
                        File_BlockChain.chain = tempChain.chain;
                    }
                    tempChain = new Blockchain();
                }
                break;

            case "TYPE_REQUEST_CHAIN":
                const socket = opened.filter(node => node.address === _message.data)[0].socket;
                for (let i = 1; i < File_BlockChain.chain.length; i++) {
                    socket.send(JSON.stringify(produceMessage("TYPE_SEND_CHAIN",{
                            block: File_BlockChain.chain[i],
                            finished: i === File_BlockChain.chain.length - 1
                        }
                    )));
                }
                break;

            case "TYPE_REQUEST_INFO":opened.filter(node => node.address === _message.data)[0].socket.send(JSON.stringify(produceMessage("TYPE_SEND_INFO",[File_BlockChain.difficulty, File_BlockChain.transactions])));
                break;

            case "TYPE_SEND_INFO":[ File_BlockChain.difficulty, File_BlockChain.transactions ] = _message.data;
                break;

            case "TYPE_HANDSHAKE":
            const nodes = _message.data;
                nodes.forEach(node => connect(node))
        }
    });
})

async function connect(address) {
	if (!connected.find(peerAddress => peerAddress === address) && address !== MY_ADDRESS) {
		const socket = new WS(address);

		socket.on("open", () => {
			socket.send(JSON.stringify(produceMessage("TYPE_HANDSHAKE", [MY_ADDRESS, ...connected])));
			opened.forEach(node => node.socket.send(JSON.stringify(produceMessage("TYPE_HANDSHAKE", [address]))));

			if (!opened.find(peer => peer.address === address) && address !== MY_ADDRESS) {
				opened.push({ socket, address });
			}
			if (!connected.find(peerAddress => peerAddress === address) && address !== MY_ADDRESS) {
				connected.push(address);
			}
		});

		socket.on("close", () => {
			opened.splice(connected.indexOf(address), 1);
			connected.splice(connected.indexOf(address), 1);
		});
	}
}

function produceMessage(type, data) {
	return { type, data };
}

function sendMessage(message) {
	opened.forEach(node => {
		node.socket.send(JSON.stringify(message));
	})
}

process.on("uncaughtException", err => console.log(err));

PEERS.forEach(peer => connect(peer));

setTimeout(() => {
	const transaction = new Transaction(publicKey, "046856ec283a5ecbd040cd71383a5e6f6ed90ed2d7e8e599dbb5891c13dff26f2941229d9b7301edf19c5aec052177fac4231bb2515cb59b1b34aea5c06acdef43", 200, 10);
	transaction.sign(keyPair);
	sendMessage(produceMessage("TYPE_CREATE_TRANSACTION", transaction));
	File_BlockChain.addTransaction(transaction);

}, 5000);

setTimeout(() => {
	console.log(opened);
	console.log(File_BlockChain);
}, 10000);