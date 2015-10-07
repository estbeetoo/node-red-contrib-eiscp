node-red-contrib-eiscp
==========================
# Description

Control your Integra/Onkyo devices (AVR, BD player, etc.) over IP, with help of eISCP protocol right from Node-RED.

eISCP protocol documentation (PDF0: http://goo.gl/Aa1W8F

# What's inside?

It will include three nodes:

'eiscp-controller' : a unique CONFIG node that holds connection configuration for eiscp and will acts as the encapsulator for eiscp access. As a node-red 'config' node, it cannot be added to a graph, but it acts as a singleton object that gets created in the the background when you add an 'eiscp' or 'eiscp-device' node and configure it accordingly.

-- 'eiscp-out' : eiscp output node that can send eiscp, so it can be used with function blocks.

-- 'eiscp-in': eiscp listener node, who emits flow messages based on activity on the eiscp device.

-- payload contains:

--- string data - REQUIRED

# Usage

According to official documentation: http://nodered.org/docs/getting-started/adding-nodes.html
 
# License

![Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)](https://licensebuttons.net/l/by-nc-sa/4.0/88x31.png "CC BY-NC-SA 4.0")

#TODO

Implement autodiscovery of Integra/Onkyo devices.