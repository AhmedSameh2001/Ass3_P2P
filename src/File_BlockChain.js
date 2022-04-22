const SHA256 = require('crypto-js/sha256');
const e = require('elliptic').ec;
const ec = new e('secp256k1');

class Transaction {
    constructor(from_Address, to_Address, Quantity) {
        this.from_Address = from_Address;
        this.to_Address = to_Address;
        this.Quantity = Quantity;
        this.curuntTime = Date.now();
    }
    calcHash() {
        return SHA256(this.from_Address + this.to_Address + this.Quantity + this.curuntTime).toString();
    }
    sign_Transaction(AgreeKey) {
        if (AgreeKey.getPublic('hex') !== this.from_Address) {
            throw new Error('You cannot send transactions to any other wallet.');
        }
        const hashTx = this.calcHash();
        const agree = AgreeKey.sign(hashTx, 'base64');

        this.difference = agree.toDER('hex');
    }
    isValid() {
        if (this.from_Address === null)
            return true;

        if (!this.difference || this.difference.length === 0) {
            throw new Error('Transactions for this transaction are not completed.');
        }
        const _publicKey = ec.keyFromPublic(this.from_Address, 'hex');
        var x = _publicKey.verify(this.calcHash(), this.difference);
        return x;
    }
}

class Block {
    constructor(curuntTime, trans, _previousHash = '') {
        this._previousHash = _previousHash;
        this.curuntTime = curuntTime;
        this.trans = trans;
        this.hash = this.calcHash();
        this.nonce = 0;
    }
    calcHash() {
        var result = SHA256(this._previousHash + this.curuntTime + JSON.stringify(this.trans) + this.nonce).toString();
        return result;
    }
    mineBlock(difficulty) {
        while (this.hash.substring(0, difficulty) !== Array(difficulty + 1).join("0")) {
            this.nonce++;
            this.hash = this.calcHash();
        }
        console.log("Block : " + this.hash);
    }
    hasValid() {
        for (const tx of this.trans) {
            if (!tx.isValid()) {
                return false;
            }
        }
        return true;
    }
}

class Blockchain {
    constructor() {
        this.B_chain = [this.createBlock()];
        this.difficulty = 2;
        this.pending_Transactions = [];
        this.mining = 100;
    }
    createBlock() {
        var _date = new Block(Date.parse("2018-03-03"), [], "0");
        return _date;
    }
    LatestBlock() {
        var info = this.B_chain[this.B_chain.length - 1];
        return info;
    }
    minePending(mining_Reward_Address) {
        const r = new Transaction(null, mining_Reward_Address, this.mining);
        this.pendingTransactions.push(r);

        let blockTime = new Block(Date.now(), this.pending_Transactions, this.getLatestBlock().hash);
        blockTime.mineBlock(this.difficulty);

        console.log('Block successfully .');
        this.B_chain.push(blockTime);

        this.pending_Transactions = [];
    }
    add_Transaction(trans) {
        if (!trans.fromAddress || !trans.toAddress) {
            throw new Error('It must include the transaction from the wallet address to the other wallet address.');
        }
        if (!transaction.isValid()) {
            throw new Error('The transaction is invalid, try again.');
        }
        this.pending_Transactions.push(trans);
    }
    getPriceOfAddress(Address) {
        let price = 0;

        for (const block of this.B_chain) {
            for (const trans of block.trans) {
                if (trans.fromAddress === Address) {
                    price -= trans.Quantity;
                }
                if (trans.to_Address == Address) {
                    price += trans.Quantity;
                }
            }
        }
        return price;
    }
    isBChainValid() {
        for (let index = 1; index < this.B_chain.length; index++) {
            const current_Block = this.B_chain[index];
            const previous_Block = this.B_chain[index - 1];

            if (!current_Block.hasValid()) {
                return false;
            }
            if (current_Block.hash !== current_Block.calcHash()) {
                return false;
            }
            if (current_Block.previousHash !== previous_Block.calcHash()) {
                return false;
            }
        }
        return true;
    }
}

//Writing
function saveJSON(filename = "") {
    return file.writeFileSync(filename, JSON.stringify(blockChainCoin, null, 2));
}

//Load
const dataSaved = loadJSON("./src/dataSaved.json");

//Add Block 2
console.log("Mining block 2...");
blockChainCoin.addBlock(new Block(4, "2/04/2022", { amount: 10 }));
//Add Block 3
console.log("Mining block 3...");
blockChainCoin.addBlock(new Block(5, "3/04/2022", { amount: 20 }));
//Add Block 4
console.log("Mining block 4...");
blockChainCoin.addBlock(new Block(6, "4/04/2022", { amount: 30 }));
//Add Block 5
console.log("Mining block 5...");
blockChainCoin.addBlock(new Block(7, "5/04/2022", { amount: 40 }));
//Add Block 6
console.log("Mining block 6...");
blockChainCoin.addBlock(new Block(8, "6/04/2022", { amount: 50 }));
//Add Block 7
console.log("Mining block 7...");
blockChainCoin.addBlock(new Block(9, "7/04/2022", { amount: 60 }));

//dataSaved.json  // save
console.log("Mining block 8...");
blockChainCoin.addBlock(new Block(10, "8/04/2022", { amount: 70 }));

//Save
saveJSON("./src/dataSaved.json", data);

//print
console.log(loadJSON('./src/dataSaved.json'));


module.exports.Blockchain = Blockchain;
module.exports.Transaction = Transaction;