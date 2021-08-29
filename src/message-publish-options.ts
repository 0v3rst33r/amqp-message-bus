import { MessageEncoding } from './message-encoding';
import { Channel } from 'amqplib/callback_api';

export interface MessagePublishOptions {
    encoding?: MessageEncoding;
    sendChannel?: Channel;
    exchangeName?: string;
    exchangeType?: string;
    exchangeDurable?: boolean;
    publishToQueue?: boolean;
    queueName?: string;
    queueDurable?: boolean;
    routingKey?: string;
    headers?: { userId: string };
}
