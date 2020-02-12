'use strict';

const logger = require('@sex-pomelo/sex-pomelo-logger').getLogger('pomelo-admin', 'MqttClient');
const EventEmitter = require('events').EventEmitter;
const constants = require('../../util/constants');
const MqttCon = require('mqtt-connection');
const net = require('net');

class MqttClient extends EventEmitter {
  constructor(opts) {
    super();
    this.clientId = 'MQTT_ADMIN_' + Date.now();
    this.id = opts.id;
    this.requests = {};
    this.connectedTimes = 1;
    this.host = null;
    this.port = null;
    this.socket = null;
    this.lastPing = -1;
    this.lastPong = -1;
    this.closed = false;
    this.timeoutId = null;
    this.connected = false;
    this.reconnectId = null;
    this.timeoutFlag = false;
    this.keepaliveTimer = null;
    this.reconnectDelay = 0;
    this.reconnectDelayMax = opts.reconnectDelayMax || constants.DEFAULT_PARAM.RECONNECT_DELAY_MAX;
    this.timeout = opts.timeout || constants.DEFAULT_PARAM.TIMEOUT;
    this.keepalive = opts.keepalive || constants.DEFAULT_PARAM.KEEPALIVE;
    this.connFailExitProcess = true;
    if (typeof (opts.connFailExitProcess) === 'boolean') {
      this.connFailExitProcess = opts.connFailExitProcess;
    }

  }

  connect(host, port, cb) {
    cb = cb || function() {};
    if (this.connected) {
      return cb(new Error('MqttClient has already connected.'));
    }

    if (host) {
      this.host = host;
    } else {
      host = this.host;
    }

    if (port) {
      this.port = port;
    } else {
      port = this.port;
    }

    const self = this;
    this.closed = false;

    const stream = net.createConnection(this.port, this.host);
    this.socket = MqttCon(stream);

    // logger.info('try to connect %s %s', this.host, this.port);
    this.socket.connect({
      clientId: this.clientId,
    });

    this.addTimeout();

    this.socket.on('connack', function() {
      if (self.connected) {
        return;
      }

      self.connected = true;
      self.reconnectDelay = 0;

      self.setupKeepAlive();

      if (self.connectedTimes++ === 1) {
        self.emit('connect');
        cb();
      } else {
        self.emit('reconnect');
      }
    });

    this.socket.on('publish', function(pkg) {
      const topic = pkg.topic;
      let msg = pkg.payload.toString();
      msg = JSON.parse(msg);

      // logger.debug('[MqttClient] publish %s %j', topic, msg);
      self.emit(topic, msg);
    });

    this.socket.on('close', function() {
      logger.error('mqtt socket is close, remote server host: %s, port: %s', host, port);
      self.emit('close', self.id);
      self.onSocketClose();
    });

    this.socket.on('error', function(err) {
      logger.error('mqtt socket is error, remote server host: %s, port: %s', host, port);
      // self.emit('error', new Error('[MqttClient] socket is error, remote server ' + host + ':' + port));
      self.onSocketClose();
    });

    this.socket.on('pingresp', function() {
      self.lastPong = Date.now();
    });

    this.socket.on('disconnect', function() {
      logger.error('mqtt socket is disconnect, remote server host: %s, port: %s', host, port);
      self.emit('disconnect', self.id);
      self.onSocketClose();
    });

    this.socket.on('timeout', function(reconnectFlag) {
      if (reconnectFlag) {
        self.reconnect();
      } else {
        self.exit();
      }
    });
  }

  send(topic, msg) {
    // console.log('MqttClient send %s %j ~~~', topic, msg);
    this.socket.publish({
      topic,
      payload: JSON.stringify(msg),
    });
  }

  onSocketClose() {
    // console.log('onSocketClose ' + this.closed);
    if (this.closed) {
      return;
    }

    clearInterval(this.keepaliveTimer);
    clearTimeout(this.timeoutId);
    this.keepaliveTimer = null;
    this.lastPing = -1;
    this.lastPong = -1;
    this.connected = false;
    this.closed = true;
    delete this.socket;
    this.socket = null;

    if (this.connectedTimes > 1) {
      this.reconnect();
    } else {
      if (this.connFailExitProcess) {
        this.exit();
      } else {
        this.reconnect();
      }
    }
  }

  addTimeout(reconnectFlag) {
    const self = this;
    if (this.timeoutFlag) {
      return;
    }

    this.timeoutFlag = true;

    this.timeoutId = setTimeout(function() {
      self.timeoutFlag = false;
      logger.error('mqtt client connect %s:%d timeout %d s', self.host, self.port, self.timeout / 1000);
      self.socket.emit('timeout', reconnectFlag);
    }, self.timeout);
  }

  reconnect() {
    let delay = this.reconnectDelay * 2 || constants.DEFAULT_PARAM.RECONNECT_DELAY;
    if (delay > this.reconnectDelayMax) {
      delay = this.reconnectDelayMax;
    }

    this.reconnectDelay = delay;

    const self = this;

    // logger.debug('[MqttClient] reconnect %d ...', delay);
    this.reconnectId = setTimeout(function() {
      logger.info('reconnect delay %d s', delay / 1000);
      self.addTimeout(true);
      self.connect();
    }, delay);
  }

  setupKeepAlive() {
    clearTimeout(this.reconnectId);
    clearTimeout(this.timeoutId);

    const self = this;
    this.keepaliveTimer = setInterval(function() {
      self.checkKeepAlive();
    }, this.keepalive);
  }

  checkKeepAlive() {
    if (this.closed) {
      return;
    }

    const now = Date.now();
    const KEEP_ALIVE_TIMEOUT = this.keepalive * 2;
    if (this.lastPing > 0) {
      if (this.lastPong < this.lastPing) {
        if (now - this.lastPing > KEEP_ALIVE_TIMEOUT) {
          logger.error('mqtt rpc client checkKeepAlive error timeout for %d', KEEP_ALIVE_TIMEOUT);
          this.close();
        }
      } else {
        this.socket.pingreq();
        this.lastPing = Date.now();
      }
    } else {
      this.socket.pingreq();
      this.lastPing = Date.now();
    }
  }

  disconnect() {
    this.close();
  }

  close() {
    this.connected = false;
    this.closed = true;
    this.socket.disconnect();
  }

  exit() {
    logger.info('exit ...');
    process.exit(0);
  }
} // end class


module.exports = MqttClient;
