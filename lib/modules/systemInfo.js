'use strict';

/*!
 * Pomelo -- consoleModule systemInfo
 * Copyright(c) 2012 fantasyni <fantasyni@163.com>
 * MIT Licensed
 */
const monitor = require('@sex-pomelo/sex-pomelo-monitor');
const logger = require('@sex-pomelo/sex-pomelo-logger').getLogger('pomelo-admin', __filename);

const DEFAULT_INTERVAL = 5 * 60;		// in second
const DEFAULT_DELAY = 10;						// in second

const gModuleId = 'systemInfo';

class SystemInfo{
	constructor(opts) {
		opts = opts || {};
		this.type = opts.type || 'pull';
		this.interval = opts.interval || DEFAULT_INTERVAL;
		this.delay = opts.delay || DEFAULT_DELAY;
	}

	
	monitorHandler(agent, msg, cb) {
		//collect data
		monitor.sysmonitor.getSysInfo(function (err, data) {
			if( err === null) {
				agent.notify(gModuleId, {serverId: agent.id,host:agent.info.host, body: data});
			} else {
				agent.notify(gModuleId, {serverId: agent.id,host:agent.info.host, body: {}});
			}
			
		});
	}

	masterHandler(agent, msg) {
		if(!msg) {
			agent.notifyAll(gModuleId);
			return;
		}

		let body = msg.body;
		let oneData = {
			Time:body.iostat.date,
			hostname:body.hostname,
			host: msg.host,
			serverId:msg.serverId,
			cpu_user:body.iostat.cpu.cpu_user,
			cpu_nice:body.iostat.cpu.cpu_nice,cpu_system:body.iostat.cpu.cpu_system,cpu_iowait:body.iostat.cpu.cpu_iowait,
			cpu_steal:body.iostat.cpu.cpu_steal,cpu_idle:body.iostat.cpu.cpu_idle,tps:body.iostat.disk.tps,
			kb_read:body.iostat.disk.kb_read,kb_wrtn:body.iostat.disk.kb_wrtn,kb_read_per:body.iostat.disk.kb_read_per,
			kb_wrtn_per:body.iostat.disk.kb_wrtn_per,totalmem:body.totalmem,freemem:body.freemem,'free/total':(body.freemem/body.totalmem),
			m_1:body.loadavg[0],m_5:body.loadavg[1],m_15:body.loadavg[2]
		};

		let data = agent.get(gModuleId);
		if(!data) {
			data = {};
			agent.set(gModuleId, data);
		}

		data[msg.serverId] = oneData;
	}

	clientHandler(agent, msg, cb) {
		cb(null, agent.get(gModuleId) || {});
	}
}

module.exports = function(opts) {
	return new SystemInfo(opts);
};

module.exports.moduleId = gModuleId;


