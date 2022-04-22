const e = require('elliptic').ec;
const ec = new e('secp256k1');

const keys = ec.genKeyPair();
const _publicKey = keys.getPublic('hex');
const _privateKey = keys.getPrivate('hex');
console.log();
console.log('The Private key:', _privateKey);
console.log();
console.log('The Public key:', _publicKey);