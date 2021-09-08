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
        mockContext = {
          log: {
            "": function(txt) {},
            "warn": function(txt) {},
            "error": function(txt) {},
            "verbose": function(txt) {},
          },
        };
        QueueClient.mockImplementation((_, __) => {
            return {
                createIfNotExists: jest.fn(),
                sendMessage: jest.fn().mockImplementation((str) => {
                    mockMessages.push(JSON.parse(Buffer.from(str, 'base64').toString()));
                    return new Promise(() => {});
                }),
            }
        });
        await csv2json(mockContext, testValue);
        expect(mockMessages.length).toBe(1);
        expect(mockMessages[0].$id).toBe('instanceId');
        expect(mockMessages[0].$metadata.$model).toBe('modelName');
    });
    it('creates one twin per row', async () => {
        testValue = '"$metadata.$model","$id"\n'
            +       '"modelName","instanceOne"\n'
            +       '"modelName","instanceTwo"';
        mockMessages = [];
        mockContext = {};
        QueueClient.mockImplementation((_, __) => {
            return {
                createIfNotExists: jest.fn(),
                sendMessage: jest.fn().mockImplementation((str) => {
                    mockMessages.push(JSON.parse(Buffer.from(str, 'base64').toString()));
                    return new Promise(() => {});
                }),
            }
        });
        await csv2json(mockContext, testValue);
        expect(mockMessages.length).toBe(2);
        expect(mockMessages[0].$id).toBe('instanceOne');
        expect(mockMessages[0].$metadata.$model).toBe('modelName');
        expect(mockMessages[1].$id).toBe('instanceTwo');
        expect(mockMessages[1].$metadata.$model).toBe('modelName');
    });

    it('handles integer properties', async () => {
        testValue = '"$metadata.$model","$id",answer\n'
            +       '"modelName","instanceId",42';
        mockMessages = [];
        mockContext = {};
        QueueClient.mockImplementation((_, __) => {
            return {
                createIfNotExists: jest.fn(),
                sendMessage: jest.fn().mockImplementation((str) => {
                    mockMessages.push(JSON.parse(Buffer.from(str, 'base64').toString()));
                    return new Promise(() => {});
                }),
            }
        });
        await csv2json(mockContext, testValue);
        expect(mockMessages.length).toBe(1);
        expect(mockMessages[0].answer).toBe(42);
    });

    it('handles double properties', async () => {
        testValue = '"$metadata.$model","$id",e\n'
            +       '"modelName","instanceId",2.71828';
        mockMessages = [];
        mockContext = {};
        QueueClient.mockImplementation((_, __) => {
            return {
                createIfNotExists: jest.fn(),
                sendMessage: jest.fn().mockImplementation((str) => {
                    mockMessages.push(JSON.parse(Buffer.from(str, 'base64').toString()));
                    return new Promise(() => {});
                }),
            }
        });
        await csv2json(mockContext, testValue);
        expect(mockMessages.length).toBe(1);
        expect(mockMessages[0].e).toBe(2.71828);
    });

    it('handles object properties', async () => {
        testValue = '"$metadata.$model","$id","eeny.meenie.miney.moe"\n'
            +       '"modelName","instanceId","catch a tiger by the toe"';
        mockMessages = [];
        mockContext = {};
        QueueClient.mockImplementation((_, __) => {
            return {
                createIfNotExists: jest.fn(),
                sendMessage: jest.fn().mockImplementation((str) => {
                    mockMessages.push(JSON.parse(Buffer.from(str, 'base64').toString()));
                    return new Promise(() => {});
                }),
            }
        });
        await csv2json(mockContext, testValue);
        expect(mockMessages.length).toBe(1);
        expect(mockMessages[0].eeny.meenie.miney.moe).toBe('catch a tiger by the toe');
    });
 
    it('handles simple relationships', async () => {
        testValue = '"$sourceId","$targetId","$relationshipId","$relationshipName"\n'
            +       '"sourceId","targetId","sourceId-relation-targetId","relationName"';
        mockMessages = [];
        mockContext = {};
        QueueClient.mockImplementation((_, __) => {
            return {
                createIfNotExists: jest.fn(),
                sendMessage: jest.fn().mockImplementation((str) => {
                    mockMessages.push(JSON.parse(Buffer.from(str, 'base64').toString()));
                    return new Promise(() => {});
                }),
            }
        });
        await csv2json(mockContext, testValue);
        expect(mockMessages.length).toBe(1);
        expect(mockMessages[0].$sourceId).toBe('sourceId');
        expect(mockMessages[0].$targetId).toBe('targetId');
        expect(mockMessages[0].$relationshipId).toBe('sourceId-relation-targetId');
        expect(mockMessages[0].$relationshipName).toBe('relationName');
    })

    it('handles relationships with properties', async () => {
        testValue = '"$sourceId","$targetId","$relationshipId","$relationshipName","property1","nested.property"\n'
            +       '"sourceId","targetId","sourceId-relation-targetId","relationName",3.14159,"value"';
        mockMessages = [];
        mockContext = {};
        QueueClient.mockImplementation((_, __) => {
            return {
                createIfNotExists: jest.fn(),
                sendMessage: jest.fn().mockImplementation((str) => {
                    mockMessages.push(JSON.parse(Buffer.from(str, 'base64').toString()));
                    return new Promise(() => {});
                }),
            }
        });
        await csv2json(mockContext, testValue);
        expect(mockMessages.length).toBe(1);
        expect(mockMessages[0].property1).toBe(3.14159);
        expect(mockMessages[0].nested.property).toBe("value");
    })

    it('creates one relationship per row', async () => {
        testValue = '"$sourceId","$targetId","$relationshipId","$relationshipName","property1","nested.property"\n'
            +       '"sourceId","targetId","sourceId-relation-targetId","relationName",3.14159,"value"\n'
            +       '"sourceId2","targetId2","sourceId-relation-targetId2","relationName2", 2.71828,"value2"';
        mockMessages = [];
        mockContext = {};
        QueueClient.mockImplementation((_, __) => {
            return {
                createIfNotExists: jest.fn(),
                sendMessage: jest.fn().mockImplementation((str) => {
                    mockMessages.push(JSON.parse(Buffer.from(str, 'base64').toString()));
                    return new Promise(() => {});
                }),
            }
        });
        await csv2json(mockContext, testValue);
        expect(mockMessages.length).toBe(2);
        expect(mockMessages[0].property1).toBe(3.14159);
        expect(mockMessages[1].property1).toBe(2.71828);
    })
});
