import { MessageDecoding } from './message-decoding';
import { Channel } from 'amqplib/callback_api';

export interface MessageSubscribeOptions {
    decoding?: MessageDecoding;
    listenChannel?: Channel;
    exchangeName?: string;
    exchangeType?: string;
    exchangeDurable?: boolean;
    queueName?: string;
    queueDurable?: boolean;
    routingKey?: string;

    /**
     * If <code>true</code>, the broker won’t expect an acknowledgement of messages delivered to this consumer; i.e., it
     * will de-queue messages as soon as they’ve been sent down the wire. Defaults to false (i.e., you will be expected
     * to acknowledge messages).
     */
    noAck?: boolean;

    /**
     * If <code>true</code>, then default values will be given for the following properties whether it is a
     * <code>command</code> or <code>event</code>.
     * <ul>
     *     <li>exchangeName</li>
     *     <li>exchangeType</li>
     *     <li>exchangeDurable</li>
     *     <li>queueName</li>
     *     <li>queueDurable</li>
     * </ul>
     */
    useDefaults?: boolean;
}
