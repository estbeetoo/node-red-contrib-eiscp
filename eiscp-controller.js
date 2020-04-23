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
}
