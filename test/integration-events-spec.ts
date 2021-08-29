import 'reflect-metadata';
import 'mocha';
import { expect } from 'chai';
import {
    AbstractIntegrationEvent,
    AmqpMessageBus,
    Message,
    MessageBus,
    MessageDecoder,
    MessageDecoding,
    MessageEncoder,
    MessageEncoding
} from '../src';
import { Observable, zip } from 'rxjs';

describe('IntegrationEvents', function () {
    describe('2 queues with different names against the same exchange', function () {
        const messageBus: MessageBus = new AmqpMessageBus('be-service-test-name');
        const messageBus2: MessageBus = new AmqpMessageBus('be-service-test-name-1');

        beforeEach(function () {
            messageBus.init({
                host: 'amqp://localhost',
                autoReconnect: false
            });
            messageBus.addEncoder(MessageEncoding.Json, TestIntegrationEvent, TestIntegrationEventJsonEncoder);
            messageBus.addDecoder(MessageDecoding.Json, TestIntegrationEvent, TestIntegrationEventJsonDecoder);

            messageBus2.init({
                host: 'amqp://localhost',
                autoReconnect: false
            });
            messageBus2.addEncoder(MessageEncoding.Json, TestIntegrationEvent, TestIntegrationEventJsonEncoder);
            messageBus2.addDecoder(MessageDecoding.Json, TestIntegrationEvent, TestIntegrationEventJsonDecoder);
        });

        afterEach(function () {
            messageBus.closeConnection();
            messageBus2.closeConnection();
        });

        context('when subscribing and publishing', function () {
            it('then the message is consumed twice by both queues', function (done) {
                this.timeout(5000);

                let count: number = 0;

                messageBus.subscribe<TestIntegrationEvent>(
                    TestIntegrationEvent,
                    (command: TestIntegrationEvent) => {
                        expect(command).to.exist;
                        expect(1).to.equals(1);
                        count++;
                        if (count === 2) {
                            done();
                        }
                    },
                    {
                        decoding: MessageDecoding.Json
                    }
                );

                messageBus2.subscribe<TestIntegrationEvent>(
                    TestIntegrationEvent,
                    (command: TestIntegrationEvent) => {
                        expect(command).to.exist;
                        expect(1).to.equals(1);
                        count++;
                        if (count === 2) {
                            done();
                        }
                    },
                    {
                        decoding: MessageDecoding.Json
                    }
                );

                const messageBusses: Observable<[boolean, boolean]> = zip(
                    messageBus.subscriptionAddedSubject,
                    messageBus2.subscriptionAddedSubject
                );
                messageBusses.subscribe((value: [boolean, boolean]) => {
                    if (value[0] && value[1]) {
                        setTimeout(() => {
                            const integrationEvent = new TestIntegrationEvent();
                            messageBus.publish(integrationEvent, {
                                encoding: MessageEncoding.Json
                            });
                        }, 2000);
                    }
                });
            });
        });
    });

    describe('2 queues with identical names against the same exchange', function () {
        const messageBus: MessageBus = new AmqpMessageBus('be-service-test-name');
        const messageBus2: MessageBus = new AmqpMessageBus('be-service-test-name');

        beforeEach(function () {
            messageBus.init({
                host: 'amqp://localhost',
                autoReconnect: false
            });
            messageBus.addEncoder(MessageEncoding.Json, TestIntegrationEvent, TestIntegrationEventJsonEncoder);
            messageBus.addDecoder(MessageDecoding.Json, TestIntegrationEvent, TestIntegrationEventJsonDecoder);

            messageBus2.init({
                host: 'amqp://localhost',
                autoReconnect: false
            });
            messageBus2.addEncoder(MessageEncoding.Json, TestIntegrationEvent, TestIntegrationEventJsonEncoder);
            messageBus2.addDecoder(MessageDecoding.Json, TestIntegrationEvent, TestIntegrationEventJsonDecoder);
        });

        afterEach(function () {
            messageBus.closeConnection();
            messageBus2.closeConnection();
        });

        context('when subscribing and publishing', function () {
            it('then the message is consumed only once by one of the queues', function (done) {
                this.timeout(5000);

                messageBus.subscribe<TestIntegrationEvent>(
                    TestIntegrationEvent,
                    (command: TestIntegrationEvent) => {
                        expect(command).to.exist;
                        expect(1).to.equals(1);
                        done();
                    },
                    {
                        decoding: MessageDecoding.Json
                    }
                );

                messageBus2.subscribe<TestIntegrationEvent>(
                    TestIntegrationEvent,
                    (command: TestIntegrationEvent) => {
                        expect(command).to.exist;
                        expect(1).to.equals(1);
                        done();
                    },
                    {
                        decoding: MessageDecoding.Json
                    }
                );

                const messageBusses: Observable<[boolean, boolean]> = zip(
                    messageBus.subscriptionAddedSubject,
                    messageBus2.subscriptionAddedSubject
                );
                messageBusses.subscribe((value: [boolean, boolean]) => {
                    if (value[0] && value[1]) {
                        setTimeout(() => {
                            const integrationEvent = new TestIntegrationEvent();
                            messageBus.publish(integrationEvent, {
                                encoding: MessageEncoding.Json
                            });
                        }, 2000);
                    }
                });
            });
        });
    });
});

class TestIntegrationEvent extends AbstractIntegrationEvent {
    constructor(private readonly rawData?: any) {
        super();
    }

    public getRawData(): any {
        return this.rawData;
    }

    public typeName(): string {
        return 'TestIntegrationEvent';
    }
}

class TestIntegrationEventJsonEncoder implements MessageEncoder {
    public encode<T>(_message: Message): T {
        return Buffer.from(JSON.stringify({ key: 'value' })) as any;
    }
}

class TestIntegrationEventJsonDecoder implements MessageDecoder {
    public decode<T>(message: any): T {
        return message;
    }
}
