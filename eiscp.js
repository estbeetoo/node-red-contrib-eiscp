/**
 * Created by aborovsky on 27.08.2015.
 */

var util = require('util'),
    eiscp = require('eiscp');

module.exports = function (RED) {

    /**
     * ====== Globalcache-controller ================
     * Holds configuration for eiscpjs host+port,
     * initializes new eiscpjs connections
     * =======================================
     */
    function EISCPControllerNode(config) {
        RED.nodes.createNode(this, config);
        this.name = config.name;
        this.host = config.host;
        this.port = config.port;
        this.model = config.model;
        this.eiscpjsconn = null;
        var node = this;
        //node.log("new EISCPControllerNode, config: %j", config);

        /**
         * Initialize an eiscpjs socket, calling the handler function
         * when successfully connected, passing it the eiscpjs connection
         */
        this.initializeEISCPConnection = function (handler) {
            try {
                if (node.eiscpjsconn) {
                    node.log('already configured to EISCP device at ' + config.host + ':' + config.port + ' model[' + config.model + ']');
                    if (handler && (typeof handler === 'function'))
                        handler(node.eiscpjsconn);
                    return node.eiscpjsconn;
                }
                node.log('configuring to EISCP device at ' + config.host + ':' + config.port + ' model[' + config.model + ']');
                node.eiscpjsconn = eiscp;
                node.eiscpjsconn.on('error', function (err) {
                    node.error('Error: ' + err.toString());
                });
                node.eiscpjsconn.connect({
                    host: config.host,
                    model: config.model,
                    port: config.port,
                    verify_commands: false
                });
                node.log('EISCP: successfully connected to ' + config.host + ':' + config.port + ' model[' + config.model + ']');
                if (handler && (typeof handler === 'function'))
                    handler(node.eiscpjsconn);
                return node.eiscpjsconn;
            } catch (err) {
                node.error('Error while connecting, cause: ' + err.toString());
            }
        };
        this.on("close", function () {
            node.log('disconnecting from eiscpjs server at ' + config.host + ':' + config.port + ' model[' + config.model + ']');
            node.eiscpjsconn && node.eiscpjsconn.disconnect && node.eiscpjsconn.disconnect();
        });
    }

    RED.nodes.registerType("eiscp-controller", EISCPControllerNode);

    /**
     * ====== Globalcache-out =======================
     * Sends outgoing EISCP device from
     * messages received via node-red flows
     * =======================================
     */
    function EISCPOut(config) {
        RED.nodes.createNode(this, config);
        this.name = config.name;
        this.ctrl = RED.nodes.getNode(config.controller);
        var node = this;
        this.on("input", function (msg) {
            node.log('eiscpout.onInput msg[' + util.inspect(msg) + ']');
            if (!(msg && (msg.hasOwnProperty('payload') || msg.hasOwnProperty('raw')))) return;
            var payload = msg.payload;
            var sendRaw = false;
            if (msg.hasOwnProperty('raw') && msg.raw) {
                sendRaw = true;
                payload = msg.raw;
            }

            if (typeof(msg.payload) === "object") {
                payload = msg.payload;
            } else if (typeof(msg.payload) === "string") {
                try {
                    payload = JSON.parse(msg.payload);
                } catch (e) {
                    payload = msg.payload.toString();
                }
            }
            if (payload == null) {
                node.log('eiscpout.onInput: illegal msg.payload!');
                return;
            }

            node.send(payload, sendRaw, function (err) {
                if (err) {
                    node.error('send error: ' + err);
                }
                if (typeof(msg.cb) === 'function')
                    msg.cb(err);
            });

        });
        this.on("close", function () {
            node.log('eiscpOut.close');
        });

        node.status({fill: "yellow", shape: "dot", text: "inactive"});

        function nodeStatusConnected() {
            node.status({fill: "green", shape: "dot", text: "connected"});
        }

        function nodeStatusDisconnected() {
            node.status({fill: "red", shape: "dot", text: "disconnected"});
        }

        function nodeStatusConnecting() {
            node.status({fill: "green", shape: "ring", text: "connecting"});
        }

        this.send = function (data, sendRaw, callback) {
            node.log('send data[' + data + ']');
            // init a new one-off connection from the effectively singleton EISCPController
            // there seems to be no way to reuse the outgoing conn in adreek/node-eiscpjs
            this.ctrl.initializeEISCPConnection(function (connection) {
                function onConnect() {
                    if (sendRaw) {
                        connection.raw(data.toString(), function (err) {
                            callback && callback(err);
                        });
                    } else {
                        connection.command(data.toString(), function (err) {
                            callback && callback(err);
                        });
                    }
                }

                if (connection.is_connected)
                    nodeStatusConnected();
                else
                    nodeStatusDisconnected();
                connection.removeListener('connecting', nodeStatusConnecting);
                connection.on('connecting', nodeStatusConnecting);
                connection.removeListener('connect', nodeStatusConnected);
                connection.on('connect', nodeStatusConnected);
                connection.removeListener('close', nodeStatusDisconnected);
                connection.on('close', nodeStatusDisconnected);

                try {
                    node.log("send:  " + JSON.stringify(data));
                    if (connection.is_connected)
                        if (sendRaw) {
                            connection.raw(data.toString(), function (err) {
                                callback && callback(err);
                            });
                        } else {
                            connection.command(data.toString(), function (err) {
                                callback && callback(err);
                            });
                        }
                    else {
                        connection.removeListener('connect', onConnect);
                        connection.once('connect', onConnect);
                    }
                }
                catch (err) {
                    node.error('error calling send: ' + err);
                    callback(err);
                }
            });
        }
    }

//
    RED.nodes.registerType("eiscp-out", EISCPOut);

    /**
     * ====== EISCP-IN ========================
     * Handles incoming EISCP, injecting
     * json into node-red flows
     * =======================================
     */
    function EISCPIn(config) {
        RED.nodes.createNode(this, config);
        this.name = config.name;
        this.connection = null;
        var node = this;
        //node.log('new EISCPIn, config: %j', config);
        var eiscpjsController = RED.nodes.getNode(config.controller);
        /* ===== Node-Red events ===== */
        this.on("input", function (msg) {
            if (msg != null) {

            }
        });
        this.on("close", function () {
            if (node.receiveEvent && node.connection)
                node.connection.removeListener('event', node.receiveEvent);
            if (node.receiveStatus && node.connection)
                node.connection.removeListener('status', node.receiveStatus);
        });

        function nodeStatusConnecting() {
            node.status({fill: "green", shape: "ring", text: "connecting"});
        }

        function nodeStatusConnected() {
            node.status({fill: "green", shape: "dot", text: "connected"});
        }

        function nodeStatusDisconnected() {
            node.status({fill: "red", shape: "dot", text: "disconnected"});
        }

        node.receiveData = function (data) {
            node.log('eiscp event data[' + data.toString('hex') + ']');
            node.send({
                topic: 'eiscp',
                payload: data
            });
        };

//		this.on("error", function(msg) {});

        /* ===== eiscpjs events ===== */
        eiscpjsController.initializeEISCPConnection(function (connection) {
            node.connection = connection;
            node.connection.removeListener('data', node.receiveData);
            node.connection.on('data', node.receiveData);

            if (node.connection.connected)
                nodeStatusConnected();
            else
                nodeStatusDisconnected();
            node.connection.removeListener('connecting', nodeStatusConnecting);
            node.connection.on('connecting', nodeStatusConnecting);
            node.connection.removeListener('connect', nodeStatusConnected);
            node.connection.on('connect', nodeStatusConnected);
            node.connection.removeListener('close', nodeStatusDisconnected);
            node.connection.on('close', nodeStatusDisconnected);
        });
    }

    RED.nodes.registerType("eiscp-in", EISCPIn);
}
