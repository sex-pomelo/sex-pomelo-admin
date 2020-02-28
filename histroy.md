1.0.8
=================
 * fix mqttclient connect timeout,process exit(0) when **connFailExitProcess** is false.
 * update readme

1.0.7
=================
  * fix **show handler** Bug;
  * fix **show connections** Bug, if server not exist, pomelo-admin will supend.

1.0.6
=================
  * systemInfo add host field.


1.0.5
=================
update client.js
  * add isConnected() function;
  * connect() function add connFailExitProcess param. In Past if first connect master fail, the process will terminate
     - **false**, client always reconnect.
     - **true**, (**default**),first connect master fail, the process terminate.


1.0.4
=================
  * use @sex-pomelo/sex-pomelo-monitor replace pomelo-monitor.

1.0.3
=================
  *  use @sex-pomelo/sex-pomelo-scheduler replace pomelo-scheduler.


1.0.2 / 2019-01-10
=================
  * Implement client reconnect.(实现客户端断线重连) 

1.0.1 / 2019-01-08
=================
  * use @sex-pomelo/sex-pomelo-logger replace pomelo-logger 


1.0.0 / 2017-01-19
=================
  * [NEW] use pure javascript implemented mqtt protocol
  * [NEW] more reliable master/monitor admin message quality with ack support
