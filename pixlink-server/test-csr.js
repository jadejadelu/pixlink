const forge = require('node-forge');

const keys = forge.pki.rsa.generateKeyPair(2048);
const csr = forge.pki.createCertificationRequest();
csr.publicKey = keys.publicKey;
csr.setSubject([
  {
    name: 'commonName',
    value: 'testuser1'
  },
  {
    name: 'organizationName',
    value: 'PixLink'
  }
]);
csr.sign(keys.privateKey, forge.md.sha256.create());
const csrPem = forge.pki.certificationRequestToPem(csr);
console.log(csrPem);