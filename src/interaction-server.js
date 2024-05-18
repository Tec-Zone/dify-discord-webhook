
const http = require('http');

const { INTERACTION_ENDPOINT, INTERACTION_SERVER_PORT, PUBLIC_KEY, MAIN_SERVER_URL, LOGIN_TOKEN } = process.env;
const InteractionTypes = {
  1: 'ping',
  2: 'applicationCommand',
  3: 'messageComponent',
  4: 'appCommandAutocomplete',
  5: 'modalSubmit',
};

class InteractionServer {
  constructor() {
    console.log('InteractionServer running')
  }

  verifyRequest(req, rawBody) {
    const signature = req.headers['x-signature-ed25519'];
    const timestamp = req.headers['x-signature-timestamp'];
    if (!signature || !timestamp) return false;
    const isVerified = nacl.verify(
      Buffer.from(timestamp + rawBody),
      Buffer.from(signature, 'hex'),
      Buffer.from(PUBLIC_KEY, 'hex')
    );
    return isVerified;
  };

  getRequestBody(req) {
    return new Promise((resolve) => {
      const data = [];
      req.on('data', (chunk) => data.push(chunk));
      req.on('end', () => resolve(Buffer.concat(data).toString()));
    });
  };

  send(res, statusCode, body, json = false) {
    const type = json ? 'application/json' : 'text/plain';
    res.writeHead(statusCode, { 'Content-Type': type });
    res.end(body);
  };

  async handleInteraction(req, res, handleDifyRequest) {
    const rawBody = await this.getRequestBody(req);
    console.log(rawBody)
    // const isVerified = this.verifyRequest(req, rawBody);
    // if (!isVerified) return this.send(res, 401, 'Unauthorized');
    
    let result = {};
    try {
      const body = JSON.parse(rawBody);
   
    const reportInteraction = body.type
    switch (reportInteraction) {
      case 'ping':
        result = {
          type: 'PONG',
        }
        break;

      case 'applicationCommand':
        result = await handleDifyRequest(req, res)
        break;
    }

    } catch(err) {
      
    }
    this.send(res, 200, JSON.stringify(result), true);
  }

}

module.exports = { InteractionServer }