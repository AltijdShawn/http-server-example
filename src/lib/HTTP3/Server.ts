// const { HTTPParser } = require('_http_common');
// const dgram = require('dgram');

// const PORT = 8101;
// const CRLF = '\r\n';
// const { kOnBody, kOnMessageComplete } = HTTPParser;

// const store = {
//   requestBody: '',
//   responseBody: '',
// };

// const server = dgram.createSocket('udp4');
// const client = dgram.createSocket('udp4');

// function serverListen() {
//   const parser = new HTTPParser();
//   parser.initialize(HTTPParser.REQUEST, {});
//   parser[kOnBody] = body => store.requestBody = body.toString();

//   let sender;
//   parser[kOnMessageComplete] = () => {
//     const content = `Hi, ${store.requestBody}`;
//     server.send([
//       'HTTP/3 200 OK',
//       'Content-Type: text/plain',
//       `Content-Length: ${content.length}`,
//       '',
//       content,
//     ].join(CRLF), ...sender);
//   };

//   server.on('message', (chunk, info) => {
//     sender ??= [info.port, info.address];
//     parser.execute(chunk, 0, chunk.length);
//   });

//   server.bind(PORT, () => {
//     console.log(`UDP server listening on ${PORT}`);

//     clientConnect();
//   });
// }

// function clientConnect() {
//   client.connect(PORT, () => {
//     console.log(`UDP client connected to ${PORT}`);

//     httpRequest();
//   });
// }

// function httpRequest() {
//   const parser = new HTTPParser();
//   parser.initialize(HTTPParser.RESPONSE, {});
//   parser[kOnBody] = body => store.responseBody = body.toString();
//   parser[kOnMessageComplete] = finalize;

//   client.on('message', (chunk) => {
//     parser.execute(chunk, 0, chunk.length);
//   });

//   const content = 'Eytan';
//   client.send([
//     'POST /say-hi HTTP/1.1',
//     `Content-Type: text/plain`,
//     `Content-Length: ${content.length}`,
//     '',
//     content,
//   ].join(CRLF));
// }

// function finalize() {
//   server.close();
//   client.close();

//   console.log();
//   console.log('[Request body]');
//   console.log(store.requestBody); // Eytan

//   console.log();
//   console.log('[Response body]');
//   console.log(store.responseBody); // Hi, Eytan
// }

// serverListen();