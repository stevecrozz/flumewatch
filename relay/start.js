const fs = require('fs');
const bridgeServer = require('aedes')();
const listener = require('net').createServer(bridgeServer.handle);
const mqtt = require('mqtt');

const CONNECT_TO_FLUME = true;
const port = 1883;
const QUEUES = {
  toBridge: [],
  toFlume: [],
};

function log(message) {
  console.log(`${new Date().toISOString()} ${message}`);
}

/**
 * Assuming you're answering this DNS query you may have to use an IP address
 * here instead of:
 *
 * mqtt.prod.flumetech.com
 *
 * If you've made it this far, I'm sure you can get the password. It is sent by
 * the bridge in plain text, but won't put it here.
 */
const flumeClient = mqtt.connect('mqtt://device:************@mqtt.prod.flumetech.com');

/**
 * Very simple timer to drain the message queues
 */
setInterval(() => {
  const toBridge = QUEUES.toBridge.shift();

  if (toBridge) {
    bridgeServer.publish(toBridge);
  }

  const toFlume = QUEUES.toFlume.shift();

  if (toFlume) {
    flumeClient && flumeClient.publish(toFlume.topic, toFlume.payload);
  }
}, 100);

flumeClient && flumeClient.on('connect', () => {
  log('Connected to Flume');
});

flumeClient && flumeClient.on('message', (topic, message) => {
  const buffer = Buffer.from(message);
  log(`Message from Flume, relaying to bridge: ${topic}: ${buffer.length}B ${buffer.toString('hex')}`);
  QUEUES.toBridge.push({ topic, payload: message });
});

listener.listen(port, () => {
  log('Waiting for bridge to connect on port', port);
});

bridgeServer.on('client', (client) => {
  log(`Bridge Connected: ${client.id}`);
});

bridgeServer.on('clientDisconnect', (client) => {
  log(`Bridge Disconnected: ${client.id}`);
});

bridgeServer.on('subscribe', (subscriptions, client) => {
  subscriptions.forEach((subscription) => {
    log(`Bridge subscribing, subscribing to Flume: ${subscription.topic} ${client.id}`);
    flumeClient && flumeClient.subscribe(subscription.topic, { qos: 1 }, () => {
      log('Flume acknowledged bridge subscription');
    });
  });
})

bridgeServer.on('unsubscribe', (subscriptions, client) => {
  subscriptions.forEach((topic) => {
    log(`Bridge unsubscribing. Unsubscribing from Flume: ${topic} ${client.id}`);
    flumeClient && flumeClient.unsubscribe(topic);
  });
})

bridgeServer.on('publish', async (packet, client) => {
  if (!client) return;

  log(`Bridge publishing message, relaying to Flume: ${packet.topic} ${packet.payload.length}B ${packet.payload.toString('hex')}`);
  QUEUES.toFlume.push(packet);
})
