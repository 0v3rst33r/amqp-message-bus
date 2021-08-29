import * as amqp from 'amqplib/callback_api';

import { MessagePublishOptions } from './message-publish-options';
import { MessageSubscribeOptions } from './message-subscribe-options';
import { Observable, Observer } from 'rxjs';
import * as amqpProperties from 'amqplib/properties';
import { logUtil } from './util/log-util';

const logger = logUtil.getLogger('MessageQueue');

export interface EventQueueSubscribeResult {
    message: amqpProperties.Message;
    ackFn?: () => void;
}

export class MessageQueue {
    private readonly sendChannel: amqp.Channel;
    private readonly listenChannel: amqp.Channel;

    constructor(options: MessagePublishOptions | MessageSubscribeOptions) {
        if (isMessagePublishOptions(options)) {
            logger.info('constructor - Setting up publish/send channel');

            this.sendChannel = options.sendChannel;
            const exchangeName: string = options.exchangeName;
            const exchangeType: string = options.exchangeType;
            const exchangeDurable: boolean = options.exchangeDurable;
            const queue: string = options.queueName;
            const queueDurable: boolean = options.queueDurable;
            const routingKey: string = options.routingKey;

            logger.info(
                `constructor - init [ exchangeName : ${exchangeName}, exchangeType : ${exchangeType}, exchangeDurable : ${exchangeDurable}, queue : ${queue}, queueDurable : ${queueDurable}, routingKey : ${routingKey} ]`
            );

            this.sendChannel.assertExchange(exchangeName, exchangeType, { durable: exchangeDurable });
        } else {
            logger.info('constructor - Setting up consume/listen channel');

            this.listenChannel = options.listenChannel;
        }
    }

    public publish(message: Buffer, options: MessagePublishOptions): void {
        if (message === undefined || !Buffer.isBuffer(message)) {
            logger.warn(`publish - message is not a valid buffer [ Message : ${message} ]`);
            return;
        }

        const exchangeName: string = options.exchangeName;
        const queueName: string = options.queueName;
        const queueDurable: boolean = options.queueDurable;
        const routingKey: string = options.routingKey;
        const headers: { userId: string } = options.headers;

        logger.info(
            `publish - init [ exchangeName : ${exchangeName}, queueName : ${queueName}, queueDurable : ${queueDurable}, routingKey : ${routingKey} ]`
        );

        if (queueName !== undefined) {
            logger.debug('publish - to queue');
            this.sendChannel.assertQueue(queueName, { durable: queueDurable }, (error, q) => {
                if (error !== undefined && error !== null) {
                    logger.error('publish - Error:', error.stack);
                    return;
                }
                this.sendChannel.bindQueue(q.queue, exchangeName, routingKey);
                this.sendChannel.sendToQueue(q.queue, message, { headers });
            });
        } else {
            logger.debug('publish - to exchange');
            this.sendChannel.publish(exchangeName, routingKey, message);
        }

        logger.info('publish - done');
    }

    public subscribe(options: MessageSubscribeOptions): Observable<EventQueueSubscribeResult> {
        const exchangeName: string = options.exchangeName;
        const exchangeType: string = options.exchangeType;
        const exchangeDurable: boolean = options.exchangeDurable;
        const queueName: string = options.queueName;
        const queueDurable: boolean = options.queueDurable;
        const routingKey: string = options.routingKey;
        const noAck: boolean = options.noAck;

        logger.info(
            `subscribe - init [ exchangeName : ${exchangeName}, exchangeType : ${exchangeType}, exchangeDurable : ${exchangeDurable}, queueName : ${queueName}, queueDurable : ${queueDurable}, routingKey : ${routingKey}, noAck : ${noAck} ]`
        );

        return new Observable((observer: Observer<{ message: amqpProperties.Message; ackFn?: () => void }>) => {
            this.listenChannel.assertExchange(exchangeName, exchangeType, { durable: exchangeDurable });

            this.listenChannel.assertQueue(queueName, { durable: queueDurable }, (error, q) => {
                if (error !== undefined && error !== null) {
                    logger.info('subscribe - Error:', error.stack);
                    return;
                }

                logger.info('[AMQP] Waiting for messages in %s. To exit press CTRL+C', queueName);

                this.listenChannel.bindQueue(q.queue, exchangeName, routingKey);

                this.listenChannel.consume(
                    q.queue,
                    (message: amqpProperties.Message | null) => {
                        logger.info('message received');
                        if (message !== null && message !== undefined) {
                            observer.next(noAck ? { message } : { message, ackFn: () => this.listenChannel.ack(message) });
                        }
                    },
                    { noAck }
                );
            });
        });
    }
}

const isMessagePublishOptions = (options: MessagePublishOptions | MessageSubscribeOptions): options is MessagePublishOptions =>
    (options as MessagePublishOptions).sendChannel !== undefined;
