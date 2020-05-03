/**
 * Created by aborovsky on 27.08.2015.
 */

var util = require('util'),
    eiscp = require('eiscp');

module.exports = function (RED) {
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

}
