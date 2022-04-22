const { Blockchain, Transaction } = require('./File_BlockChain');
const EC = require('elliptic').ec;
const ec = new EC('secp256k1');

const key = EC.keyFromPrivate('fac47fe316527784096af0e5a53212d4033842029f96a61b4e9d4c5de5c26002');
const _WalletAddress = key.getPublic('hex');

let File_BlockChain = new Blockchain();

const tx1 = new Transaction(_WalletAddress, 'public key : ', 10);
tx1.sign_Transaction(key);
File_BlockChain.add_Transaction(tx1);

console.log('\n Starting.');
File_BlockChain.minePending(_WalletAddress);

console.log('\n The Price = ', File_BlockChain.getPriceOfAddress(_WalletAddress));

console.log('Is Blockchain valid ?', File_BlockChain.isBChainValid());