'use strict';

/* !
 * Pomelo -- commandLine Client
 * Copyright(c) 2015 fantasyni <fantasyni@163.com>
 * MIT Licensed
 */

const MqttClient = require('../protocol/mqtt/mqttClient');
const protocol = require('../util/protocol');
// let io = require('socket.io-client');
const utils = require('../util/utils');

class Client {
  constructor(opt) {
    this.id = '';
    this.reqId = 1;
    this.callbacks = {};
    this.listeners = {};
    this.state = Client.ST_INITED;
    this.socket = null;
    opt = opt || {};
    this.username = opt.username || '';
    this.password = opt.password || '';
    this.md5 = opt.md5 || false;

  }

  connect(id, host, port, cb, connFailExitProcess = true) {
    this.id = id;
    const self = this;

    this.socket = new MqttClient({
      id,
      connFailExitProcess,
    });

    this.socket.connect(host, port);

    // this.socket = io.connect('http://' + host + ':' + port, {
    // 	'force new connection': true,
    // 	'reconnect': false
    // });

    this.socket.on('connect', function() {
      self.state = Client.ST_CONNECTED;
      if (self.md5) {
        self.password = utils.md5(self.password);
      }
      self.doSend('register', {
        type: 'client',
        id,
        username: self.username,
        password: self.password,
        md5: self.md5,
      });
    });

    this.socket.on('reconnect', function() {
      self.state = Client.ST_CONNECTED;
      self.doSend('register', {
        type: 'client',
        id,
        username: self.username,
        password: self.password,
        md5: self.md5,
      });
    });

    this.socket.on('register', function(res) {
      if (res.code !== protocol.PRO_OK) {
        cb(res.msg);
        return;
      }

      self.state = Client.ST_REGISTERED;
      cb();
    });

    this.socket.on('client', function(msg) {
      msg = protocol.parse(msg);
      if (msg.respId) {
        // response for request
        const cb = self.callbacks[msg.respId];
        delete self.callbacks[msg.respId];
        if (cb && typeof cb === 'function') {
          cb(msg.error, msg.body);
        }
      } else if (msg.moduleId) {
        // notify
        self.emit(msg.moduleId, msg);
      }
    });

    this.socket.on('error', function(err) {
      if (self.state < Client.ST_CONNECTED) {
        cb(err);
      }

      self.emit('error', err);
    });

    this.socket.on('disconnect', function(reason) {
      self.state = Client.ST_CLOSED;
      self.emit('close');
    });

    this.socket.on('close', function() {
      self.state = Client.ST_CLOSED;
    });

  }

  request(moduleId, msg, cb) {
    const id = this.reqId++;
    // something dirty: attach current client id into msg
    msg = msg || {};
    msg.clientId = this.id;
    msg.username = this.username;
    const req = protocol.composeRequest(id, moduleId, msg);
    this.callbacks[id] = cb;
    this.doSend('client', req);
    // this.socket.emit('client', req);
  }

  notify(moduleId, msg) {
    // something dirty: attach current client id into msg
    msg = msg || {};
    msg.clientId = this.id;
    msg.username = this.username;
    const req = protocol.composeRequest(null, moduleId, msg);
    this.doSend('client', req);
    // this.socket.emit('client', req);
  }

  command(command, moduleId, msg, cb) {
    const id = this.reqId++;
    msg = msg || {};
    msg.clientId = this.id;
    msg.username = this.username;
    const commandReq = protocol.composeCommand(id, command, moduleId, msg);
    this.callbacks[id] = cb;
    this.doSend('client', commandReq);
    // this.socket.emit('client', commandReq);
  }

  doSend(topic, msg) {
    this.socket.send(topic, msg);
  }

  on(event, listener) {
    this.listeners[event] = this.listeners[event] || [];
    this.listeners[event].push(listener);
  }

  emit(event) {
    const listeners = this.listeners[event];
    if (!listeners || !listeners.length) {
      return;
    }

    const args = Array.prototype.slice.call(arguments, 1);
    let listener;
    for (let i = 0, l = listeners.length; i < l; i++) {
      listener = listeners[i];
      if (typeof listener === 'function') {
        listener.apply(null, args);
      }
    }
  }

  /** has connected to master */
  isConnected() {
    return (this.state === Client.ST_REGISTERED);
  }
}


Client.ST_INITED = 1;
Client.ST_CONNECTED = 2;
Client.ST_REGISTERED = 3;
Client.ST_CLOSED = 4;

module.exports = Client;
