const express = require('express');
const crypto = require('crypto');
const axios = require('axios')

const {InteractionServer} = require('./interaction-server')

const app = express();
app.use(express.json());

const secret_key = process.env.SECRET_KEY || crypto.randomBytes(32);
const secret_iv = process.env.IV || crypto.randomBytes(16);
const ecnryption_method = process.env.ENCRYPTION_METHOD || "aes-256-cbc"

const server = new InteractionServer()

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

// Generate secret hash with crypto to use for encryption
const key = crypto
  .createHash('sha512')
  .update(secret_key)
  .digest('hex')
  .substring(0, 32)
const encryptionIV = crypto
  .createHash('sha512')
  .update(secret_iv)
  .digest('hex')
  .substring(0, 16)

// Encrypt data
 function encrypt(data) {
  const cipher = crypto.createCipheriv(ecnryption_method, key, encryptionIV)
  return Buffer.from(
    cipher.update(data, 'utf8', 'hex') + cipher.final('hex')
  ).toString('base64') // Encrypts data and converts to hex and base64
}

// Decrypt data
 function decrypt(encryptedData) {
  const buff = Buffer.from(encryptedData, 'base64')
  const decipher = crypto.createDecipheriv(ecnryption_method, key, encryptionIV)
  return (
    decipher.update(buff.toString('utf8'), 'hex', 'utf8') +
    decipher.final('utf8')
  ) // Decrypts data and converts to utf8
}
app.post('/generate-token', (req, res) => {
  console.log('Generate token request received');
  const { token } = req.body;
  const encryptedToken = encrypt(JSON.stringify({ token }));
  console.log("generated", { token: encryptedToken })
  res.json({ token: encryptedToken });
});


const handleDifyRequest = async (req, res) => {
    console.log('Webhook event received');
    const { token } = req.query;
    console.log("received",{ token })
    const decryptedToken = decrypt(token);
    const { token: apiKey } = JSON.parse(decryptedToken);
  
    if (!apiKey) {
      console.log('Invalid token');
      res.status(401).json({ error: 'Invalid token' });
    } else {
      try {
        const response = await axios.post('https://api.dify.ai/v1/chat-messages', {
          inputs: {},
          query: 'GO',
          response_mode: 'blocking',
          conversation_id: '',
          user: 'proxy',
          files: []
        }, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        });
        res.json(response.data);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error processing webhook event' });
      }
    }
  };

app.post('/webhook', (req, res) => server.handleInteraction(req, res, handleDifyRequest));

app.listen(3000, () => {
  console.log('Server listening on port 3000');
});
