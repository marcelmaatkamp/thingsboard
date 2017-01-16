/**
 * Copyright © 2016-2017 The Thingsboard Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.thingsboard.server.transport.mqtt;

import io.netty.bootstrap.Bootstrap;
import io.netty.bootstrap.ServerBootstrap;
import io.netty.channel.Channel;
import io.netty.channel.ChannelOption;
import io.netty.channel.EventLoopGroup;
import io.netty.channel.nio.NioEventLoopGroup;
import io.netty.channel.socket.nio.NioServerSocketChannel;
import io.netty.channel.socket.nio.NioSocketChannel;
import io.netty.handler.logging.LogLevel;
import io.netty.handler.logging.LoggingHandler;
import io.netty.util.ResourceLeakDetector;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationContext;
import org.springframework.stereotype.Service;
import org.thingsboard.server.common.transport.SessionMsgProcessor;
import org.thingsboard.server.common.transport.auth.DeviceAuthService;
import org.thingsboard.server.transport.mqtt.adaptors.MqttTransportAdaptor;

import javax.annotation.PostConstruct;
import javax.annotation.PreDestroy;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * @author Andrew Shvayka
 */
@Service("MqttTransportService")
@Slf4j
public class MqttTransportService {

    private static final String V1 = "v1";
    private static final String DEVICE = "device";

    @Autowired(required = false)
    private ApplicationContext appContext;

    @Autowired(required = false)
    private SessionMsgProcessor processor;

    @Autowired(required = false)
    private DeviceAuthService authService;

    @Autowired(required = false)
    private MqttSslHandlerProvider sslHandlerProvider;

    @Value("${mqtt.bind_address}")
    private String host;
    @Value("${mqtt.bind_port}")
    private Integer port;
    @Value("${mqtt.adaptor}")
    private String adaptorName;

    private MqttTransportAdaptor adaptor;

    private Channel serverChannel;
    private EventLoopGroup bossGroup;
    private EventLoopGroup workerGroup;

    @Value("${mqtt.startLocalServer}")
    private boolean startMQTTServer;

    @PostConstruct
    public void init() throws Exception {
        ResourceLeakDetector.setLevel(ResourceLeakDetector.Level.ADVANCED);
        log.info("Starting MQTT transport...");
        log.info("Lookup MQTT transport adaptor {}", adaptorName);
        this.adaptor = (MqttTransportAdaptor) appContext.getBean(adaptorName);
        workerGroup = new NioEventLoopGroup();

        if(startMQTTServer) {
            setupServer(host,port);
        } else {
            setupClient(host, port);
        }
    }

    private void setupServer(String host, int port) throws InterruptedException {
        log.info("Starting MQTT transport server on "+host+":"+port+"");
        bossGroup = new NioEventLoopGroup(1);
        ServerBootstrap b = new ServerBootstrap();
        b.group(bossGroup, workerGroup)
                .channel(NioServerSocketChannel.class)
                .handler(new LoggingHandler(LogLevel.TRACE))
                .childHandler(new MqttTransportServerInitializer(processor, authService, adaptor, sslHandlerProvider));

        serverChannel = b.bind(host, port).sync().channel();
        log.info("Mqtt server transport started!");
    }

    // Borrowed from https://github.com/maydemirx/moquette-mqtt/blob/master/broker/src/test/java/org/dna/mqtt/moquette/testclient/Client.java
    private Channel m_channel;
    public void setupClient(String host, int port) {
        log.info("Starting MQTT transport, connecting to server("+host+":"+port+")");
        try {
            Bootstrap b = new Bootstrap();
            b.group(workerGroup)
                    .channel(NioSocketChannel.class)
                    .option(ChannelOption.SO_KEEPALIVE, true)
                    .handler(new MqttTransportServerInitializer(processor, authService, adaptor, sslHandlerProvider));

            m_channel = b.connect(host, port).sync().channel();
        } catch (Exception ex) {    
            log.error("Error received in client setup", ex);
            workerGroup.shutdownGracefully();
        }
        log.info("Mqtt client transport started!");

    }

    @PreDestroy
    public void shutdown() throws InterruptedException {
        log.info("Stopping MQTT transport!");
        try {
            serverChannel.close().sync();
        } finally {
            bossGroup.shutdownGracefully();
            workerGroup.shutdownGracefully();
        }
        log.info("MQTT transport stopped!");
    }
}
