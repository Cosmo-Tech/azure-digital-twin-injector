const {csv2json} = require('../csv2json');
const { QueueClient }= require('@azure/storage-queue');

process.env.JSON_STORAGE_CONNECTION = '';
process.env.JSON_STORAGE_QUEUE = '';

jest.mock('@azure/storage-queue', () => ({
    QueueClient: jest.fn().mockImplementation((_, __) => {})
}));

describe('csv2json', () => {
    it('works with twin without properties', async () => {
        testValue = '"$metadata.$model","$id"\n'
            +       '"modelName","instanceId"';
        mockMessages = [];
        QueueClient.mockImplementation((_, __) => {
            return {
                createIfNotExists: jest.fn(),
                sendMessage: jest.fn().mockImplementation((str) => {
                    mockMessages.push(JSON.parse(Buffer.from(str, 'base64').toString()));
                    return new Promise(() => {});
                }),
            }
        });
        await csv2json(testValue);
        expect(mockMessages.length).toBe(1);
        expect(mockMessages[0].$id).toBe('instanceId');
        expect(mockMessages[0].$content.$metadata.$model).toBe('modelName');
    });
    it('creates one twin per row', async () => {
        testValue = '"$metadata.$model","$id"\n'
            +       '"modelName","instanceOne"\n'
            +       '"modelName","instanceTwo"';
        mockMessages = [];
        QueueClient.mockImplementation((_, __) => {
            return {
                createIfNotExists: jest.fn(),
                sendMessage: jest.fn().mockImplementation((str) => {
                    mockMessages.push(JSON.parse(Buffer.from(str, 'base64').toString()));
                    return new Promise(() => {});
                }),
            }
        });
        await csv2json(testValue);
        expect(mockMessages.length).toBe(2);
        expect(mockMessages[0].$id).toBe('instanceOne');
        expect(mockMessages[0].$content.$metadata.$model).toBe('modelName');
        expect(mockMessages[1].$id).toBe('instanceTwo');
        expect(mockMessages[1].$content.$metadata.$model).toBe('modelName');
    });

    it('handles integer properties', async () => {
        testValue = '"$metadata.$model","$id",answer\n'
            +       '"modelName","instanceId",42';
        mockMessages = [];
        QueueClient.mockImplementation((_, __) => {
            return {
                createIfNotExists: jest.fn(),
                sendMessage: jest.fn().mockImplementation((str) => {
                    mockMessages.push(JSON.parse(Buffer.from(str, 'base64').toString()));
                    return new Promise(() => {});
                }),
            }
        });
        await csv2json(testValue);
        expect(mockMessages.length).toBe(1);
        expect(mockMessages[0].$content.answer).toBe(42);
    });

    it('handles double properties', async () => {
        testValue = '"$metadata.$model","$id",e\n'
            +       '"modelName","instanceId",2.71828';
        mockMessages = [];
        QueueClient.mockImplementation((_, __) => {
            return {
                createIfNotExists: jest.fn(),
                sendMessage: jest.fn().mockImplementation((str) => {
                    mockMessages.push(JSON.parse(Buffer.from(str, 'base64').toString()));
                    return new Promise(() => {});
                }),
            }
        });
        await csv2json(testValue);
        expect(mockMessages.length).toBe(1);
        expect(mockMessages[0].$content.e).toBe(2.71828);
    });

    it('handles object properties', async () => {
        testValue = '"$metadata.$model","$id",eeny.meenie.miney.moe\n'
            +       '"modelName","instanceId","catch a tiger by the toe"';
        mockMessages = [];
        QueueClient.mockImplementation((_, __) => {
            return {
                createIfNotExists: jest.fn(),
                sendMessage: jest.fn().mockImplementation((str) => {
                    mockMessages.push(JSON.parse(Buffer.from(str, 'base64').toString()));
                    return new Promise(() => {});
                }),
            }
        });
        await csv2json(testValue);
        expect(mockMessages.length).toBe(1);
        expect(mockMessages[0].$content.eeny.meenie.miney.moe).toBe('catch a tiger by the toe');
    });
});
