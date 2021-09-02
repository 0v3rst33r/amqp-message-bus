import * as messageBus from './index';
import { catchError, map } from 'rxjs/operators';
import { Subject, of } from 'rxjs';
import { logUtil } from './util/log-util';
import { Channel, connect, Connection } from 'amqplib/callback_api';

const logger = logUtil.getLogger('AmqpMessageBus');

type BoundedFn = any;

enum AmqpMessageBusState {
    Ready,
    ReInit
}

export class AmqpMessageBus implements messageBus.MessageBus {
    public readonly initialisedSubject: Subject<boolean> = new Subject<boolean>();
    public readonly subscriptionAddedSubject: Subject<boolean> = new Subject<boolean>();

    private host: string;
    private serviceName: string;

    private encoders: messageBus.MessageEncoders = new messageBus.MessageEncoders();

    private decoders: messageBus.MessageDecoders = new messageBus.MessageDecoders();

    private connection: Connection;
    private sendChannel: Channel;
    private listenChannel: Channel;
    private channels: Array<Channel> = [];
    private eventQueues: Map<string, messageBus.MessageQueue> = new Map<string, messageBus.MessageQueue>();
    private commandQueues: Map<string, messageBus.MessageQueue> = new Map<string, messageBus.MessageQueue>();
    private initialised: boolean = false;
    private subscribeFunctions: Map<string, BoundedFn> = new Map<string, BoundedFn>();
    private initFunction: BoundedFn = undefined;
    private stateChangeSubject: Subject<AmqpMessageBusState> = new Subject<AmqpMessageBusState>();

    constructor(serviceName?: string) {
        this.serviceName = serviceName;

        this.stateChangeSubject.subscribe((state: AmqpMessageBusState) => {
            switch (state) {
                case AmqpMessageBusState.Ready: {
                    logger.info('constructor - new AmqpMessageBusState: Ready');
                    this.eventQueues.clear();
                    this.commandQueues.clear();
                    this.subscribeFunctions.forEach((fn: BoundedFn, _key: string) => {
                        fn();
                    });
                    this.initialisedSubject.next(true);
                    break;
                }
                case AmqpMessageBusState.ReInit: {
                    logger.info('constructor - new AmqpMessageBusState: ReInit');
                    this.reInit();
                    break;
                }
            }
        });
    }

    // eslint-disable-next-line max-lines-per-function
    public init(options: messageBus.MessageBusOptions): void {
        this.host = options.host === undefined ? 'amqp://localhost' : options.host;
        const autoConnect: boolean = options.autoConnect === undefined ? true : options.autoConnect;
        const autoReconnect: boolean = options.autoReconnect === undefined ? true : options.autoReconnect;

        if (!autoConnect) {
            logger.info(`[AMQP] AutoConnect disabled`);
            return;
        }

        logger.info(`[AMQP] AutoConnect enabled`);

        // eslint-disable-next-line max-lines-per-function
        connect(
            this.host,
            function (err, conn: Connection) {
                if (err || conn === undefined) {
                    logger.warn(`[AMQP] Could not connect to host ${this.host}, do a reconnect`);
                    if (autoReconnect) {
                        this.initFunction = this.init.bind(this, options);
                        return setTimeout(this._execInit.bind(this), 5000);
                    } else {
                        logger.info(`[AMQP] AutoReconnect disabled`);
                    }
                    throw err;
                }

                this.connection = conn;

                conn.on('error', (connectionError) => {
                    this.stateChangeSubject.next(AmqpMessageBusState.ReInit);
                    logger.error('[AMQP] conn error', connectionError.message);
                });

                conn.on(
                    'close',
                    function () {
                        this.stateChangeSubject.next(AmqpMessageBusState.ReInit);
                        if (autoReconnect) {
                            logger.info('[AMQP] connection closed, do a reconnect');
                            this.initFunction = this.init.bind(this, options);
                            return setTimeout(this._execInit.bind(this), 5000);
                        } else {
                            logger.info(`[AMQP] AutoReconnect disabled`);
                        }
                    }.bind(this)
                );

                conn.createChannel((_err1, channel: Channel) => {
                    this.sendChannel = channel;
                    this.channels.push(channel);
                    this.done();
                });

                conn.createChannel((_err1, channel: Channel) => {
                    this.listenChannel = channel;
                    this.channels.push(channel);
                    this.done();
                });
            }.bind(this)
        );
    }

    public closeChannels(): void {
        const fn: (error: any) => void = (error: any) => {
            if (error !== undefined && error !== null) {
                logger.error('shutdown - channel.close error:', error.stack);
                return;
            }
            logger.info('shutdown - channel.close success');
        };

        this.sendChannel.close(fn);
        this.listenChannel.close(fn);
    }

    public closeConnection(): void {
        if (this.connection !== undefined) {
            this.connection.close();
        } else {
            logger.warn('[AMQP] close connection - connection undefined');
        }
    }

    public addDecoder<T extends messageBus.Message>(
        decoding: messageBus.MessageDecoding,
        messageType: new () => T,
        decoder: new () => messageBus.MessageDecoder
    ): void {
        this.decoders.add(decoding, messageType, decoder);
    }

    public addEncoder<T extends messageBus.Message>(
        encoding: messageBus.MessageEncoding,
        messageType: new () => T,
        encoder: new () => messageBus.MessageEncoder
    ): void {
        this.encoders.add(encoding, messageType, encoder);
    }

    /**
     * Default encoding will be <code>Protobuf</code>.
     *
     * @param {Message} message
     * @param {MessagePublishOptions} options
     */
    public publish(message: messageBus.Message, options?: messageBus.MessagePublishOptions): void {
        if (!this.initialised) {
            logger.warn('publish - Not initialised, abort');
            return;
        }

        if (isEventMessage(message)) {
            options = this.setEventMessagePublishOptions(message, options);
        } else {
            // Setting of all the default values only applicable to Command messages
            options = this.setCommandMessagePublishOptions(options);
            if (options.publishToQueue && options.queueName === undefined) {
                options.queueName = message.typeName() + 'Queue';
            }
        }

        const encoding = options.encoding;
        logger.debug(`publish [ Encoding : ${encoding} ]`);
        this.publishMessage(message, this.encoders.get(encoding, message.typeName()).encode<Buffer>(message), options);
    }

    // eslint-disable-next-line max-lines-per-function
    public subscribe<T extends messageBus.Message>(
        messageType: new () => T,
        handler: (t: T) => void,
        options?: messageBus.MessageSubscribeOptions
    ): void {
        logger.info('subscribe - init');

        options = this.setMessageSubscribeOptions<T>(options, messageType);
        const key: string = options.queueName;

        if (!this.initialised) {
            logger.warn('subscribe - Not initialised, try again shortly');
            this.subscribeFunctions.set(key, this.subscribe.bind(this, messageType, handler, options));
            return;
        }

        const queue = this.getQueue(messageType, key, options);

        queue
            .subscribe(options)
            .pipe(
                // Decode the message
                map((result: messageBus.EventQueueSubscribeResult) => {
                    const decodedMessage: T = this.decoders
                        .get(options.decoding, new messageType().typeName())
                        .decode<T>(result.message);
                    return { decodedMessage, ackFn: result.ackFn };
                }),
                // Acknowledge the message
                map((result: { decodedMessage: T; ackFn: () => void }) => {
                    if (result.ackFn !== undefined) {
                        logger.debug('subscribe - ackFn defined, execute it');
                        result.ackFn();
                    } else {
                        logger.debug('subscribe - ackFn not defined');
                    }
                    return result.decodedMessage;
                }),
                catchError(
                    function (error) {
                        logger.error('subscribe - Error occurred, try again shortly', error.message);
                        if (error.message === 'Channel closed') {
                            logger.error('subscribe - Channel closed error, need to reInit');
                            this.stateChangeSubject.next(AmqpMessageBusState.ReInit);
                        } else {
                            logger.info('subscribe - Not Channel closed error, schedule AmqpMessageBus.subscribe');
                            setTimeout(
                                function () {
                                    this.subscribe.bind(this, messageType, handler, options)();
                                }.bind(this),
                                5000
                            );
                        }
                        return of(undefined);
                    }.bind(this)
                )
            )
            .subscribe((decodedMessage: T) => {
                if (decodedMessage === undefined) {
                    logger.warn('subscribe - empty message to decode');
                    return;
                }
                handler(decodedMessage);
            });

        this.subscriptionAddedSubject.next(true);
    }

    private _execInit(): void {
        if (this.initFunction !== undefined) {
            logger.info('execInit - initFunction defined, execute it');
            this.initFunction();
            this.initFunction = undefined;
            return;
        }

        logger.info('execInit - initFunction not defined');
    }

    private getQueue<T extends messageBus.Message>(
        messageType: new () => T,
        key: string,
        options: messageBus.MessageSubscribeOptions
    ): messageBus.MessageQueue {
        let queue: messageBus.MessageQueue;

        if (isEventMessage(new messageType())) {
            if (this.eventQueues.get(key) === undefined) {
                this.eventQueues.set(key, new messageBus.MessageQueue(options));
            }
            queue = this.eventQueues.get(key);
        } else {
            if (this.commandQueues.get(key) === undefined) {
                this.commandQueues.set(key, new messageBus.MessageQueue(options));
            }
            queue = this.commandQueues.get(key);
        }

        return queue;
    }

    private setEventMessagePublishOptions(
        message: messageBus.Message,
        options?: messageBus.MessagePublishOptions
    ): messageBus.MessagePublishOptions {
        options = options || {};
        options.sendChannel = this.sendChannel;
        options.encoding = options.encoding !== undefined ? options.encoding : messageBus.MessageEncoding.Protobuf;
        options.exchangeName = 'x_' + message.typeName();
        options.exchangeType = 'fanout';

        return options;
    }

    private setCommandMessagePublishOptions(options?: messageBus.MessagePublishOptions): messageBus.MessagePublishOptions {
        options = options || {};
        options.sendChannel = this.sendChannel;
        options.encoding = options.encoding !== undefined ? options.encoding : messageBus.MessageEncoding.Protobuf;
        options.exchangeName = options.exchangeName !== undefined ? options.exchangeName : 'integration_commands_x';
        options.exchangeType = options.exchangeType !== undefined ? options.exchangeType : 'direct';
        options.exchangeDurable = options.exchangeDurable !== undefined ? options.exchangeDurable : true;
        options.publishToQueue = options.publishToQueue !== undefined ? options.publishToQueue : true;
        options.queueName = options.queueName !== undefined ? options.queueName : undefined;
        options.queueDurable = options.queueDurable !== undefined ? options.queueDurable : true;
        options.routingKey = options.routingKey !== undefined ? options.routingKey : '';

        return options;
    }

    private setMessageSubscribeOptions<T extends messageBus.Message>(
        options?: messageBus.MessageSubscribeOptions,
        messageType?: new () => T
    ): messageBus.MessageSubscribeOptions {
        options = options || {};
        options.useDefaults = options.useDefaults !== undefined ? options.useDefaults : true;
        options.listenChannel = this.listenChannel;
        options.decoding = options.decoding !== undefined ? options.decoding : messageBus.MessageDecoding.Protobuf;
        options.noAck = options.noAck !== undefined ? options.noAck : false;
        options.exchangeDurable = options.exchangeDurable !== undefined ? options.exchangeDurable : false;
        options.queueDurable = options.queueDurable !== undefined ? options.queueDurable : false;

        if (!options.useDefaults) {
            return options;
        }

        if (isEventMessage(new messageType())) {
            options.exchangeName = 'x_' + new messageType().typeName();
            options.exchangeType = 'fanout';
            options.exchangeDurable = true;
            if (this.serviceName !== undefined) {
                options.queueName = new messageType().typeName() + 'Queue-' + this.serviceName;
            }
            options.queueDurable = true;
        } else {
            options.exchangeName = 'integration_commands_x';
            options.exchangeType = 'direct';
            options.exchangeDurable = true;
            options.queueName = new messageType().typeName() + 'Queue';
            options.queueDurable = true;
        }

        return options;
    }

    private reInit(): void {
        logger.info('reInit - init');
        this.connection = undefined;
        this.channels = [];
        this.initialised = false;
        logger.info('reInit - done');
    }

    private done(): void {
        logger.info('done - init');
        if (this.channels.length === 2) {
            this.initialised = true;
            logger.info('done - connected to host', this.host);
            this.stateChangeSubject.next(AmqpMessageBusState.Ready);
        }
        logger.info(`done - done [ Initialised : ${this.initialised} ]`);
    }

    private publishMessage(message: messageBus.Message, encodedMessage: Buffer, options: messageBus.MessagePublishOptions) {
        if (isEventMessage(message)) {
            this.publishEvent(encodedMessage, options);
        } else {
            this.publishCommand(encodedMessage, options);
        }
    }

    private publishEvent(message: Buffer, options: messageBus.MessagePublishOptions): void {
        logger.debug('publishEvent: ', message);

        const key: string = options.exchangeName;

        if (this.eventQueues.get(key) === undefined) {
            this.eventQueues.set(key, new messageBus.MessageQueue(options));
        }

        this.eventQueues.get(key).publish(message, options);
    }

    private publishCommand(message: Buffer, options: messageBus.MessagePublishOptions): void {
        logger.debug('publishCommand: ', message);

        const key: string = options.exchangeName;

        if (this.commandQueues.get(key) === undefined) {
            this.commandQueues.set(key, new messageBus.MessageQueue(options));
        }

        this.commandQueues.get(key).publish(message, options);
    }
}

const isEventMessage = (message: messageBus.Message): message is messageBus.IntegrationEvent =>
    typeof (message as messageBus.IntegrationEvent).isEventMessage === 'function';
