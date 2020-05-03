/**
 * Created by aborovsky on 27.08.2015.
 */

var util = require('util'),
    eiscp = require('eiscp');

module.exports = function (RED) {
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
