const { twinCsvObject2DTDL, relationshipCsvObject2DTDL, csv2json} = require('../csv2json');
const { QueueClient } = require('@azure/storage-queue');

//process.env.JSON_STORAGE_CONNECTION = '';
//process.env.JSON_STORAGE_QUEUE = '';
//jest.mock('@azure/storage-queue', () => ({
//    QueueClient.mockImplementation((_, __) => {
//        return {
//            createIfNotExists: jest.fn(),
//            sendMessage: jest.fn().mockImplementation((str) => {
//                mockMessages.push(JSON.parse(Buffer.from(str, 'base64').toString()));
//                return new Promise(() => {});
//            }),
//        }
//    })
//}));


//jest.mock('../csv2json');
//
//const queueClient = new QueueClient(
//    process.env.JSON_STORAGE_CONNECTION,
//    process.env.JSON_STORAGE_QUEUE,
//    {
//        keepAliveOptions: {enable: false},
//    },
//);

function MockContext() {};
MockContext.prototype.log = function(txt) {
  console.info(txt);
};
MockContext.prototype.log.warn = function(txt) {
  console.warn(txt);
};
MockContext.prototype.log.error = function(txt) {
  console.error(txt);
};
MockContext.prototype.log.verbose = function(txt) {
  console.debug(txt);
};
MockContext.prototype.bindingData = {};
const mockContext = new MockContext();


function objectHasKey(actual, expected) {
    var result = {};
    result.pass = (expected in actual);
    result.message = function() {
        if (result.pass)
            return `Expected ${expected} is in ${JSON.stringify(actual)}`;
        return `Expected ${expected} is NOT in ${JSON.stringify(actual)}`;
    }
    return result;
}
jasmine.addMatchers({
    toIncludeKey: function(matchersUtil) {
        return {compare: objectHasKey}
    }
});




describe('twinCsvObject2DTDL', function() {
    beforeEach(function() {
        // init data
        twinObject = {'id': 'test_id'};
        mockContext.bindingData.filename = 'test_filename';
    });

    test('Transform parse twin data to match dtdl format', function() {
        r = twinCsvObject2DTDL(mockContext, twinObject);
        
        expect(r).toIncludeKey('$id');
        expect(r['$id']).toEqual('test_id');
        expect(r).toIncludeKey('$metadata');
        expect(r['$metadata']).toIncludeKey('$model');
        expect(r['$metadata']['$model']).toEqual('dtmi:test_filename;1');
    });
    test('throw error when missing id key', function() {
        twinObject = {};

        expect(() => {twinCsvObject2DTDL(mockContext, twinObject)}).toThrow();
    });
    test('throw error when id key is null', function() {
        twinObject = {'id': null};
        
        expect(() => {twinCsvObject2DTDL(mockContext, twinObject)}).toThrow();
    });
    test('remove null attributes', function() {
        twinObject['test_attribute'] = null;
        
        r = twinCsvObject2DTDL(mockContext, twinObject);

        expect(r).not.toContain('test_attribute');
    });
});


describe('relationshipCsvObject2DTDL', function() {
    beforeEach(function() {
        // init data
        relationshipObject = {'source': 'source_id', 'target': 'target_id'};
        mockContext.bindingData.filename = 'test_filename';
    });

    test('Transform parse relationship data to math dtdl format', function() {
        r = relationshipCsvObject2DTDL(mockContext, relationshipObject);
        
        expect(r).toIncludeKey('$relationshipId');
        expect(r['$relationshipId']).toEqual('source_id-target_id');
        expect(r).toIncludeKey('$sourceId');
        expect(r['$sourceId']).toEqual('source_id');
        expect(r).toIncludeKey('relationship');
        expect(r['relationship']).toIncludeKey('$targetId');
        expect(r['relationship']['$targetId']).toEqual('target_id');
        expect(r['relationship']).toIncludeKey('$relationshipName');
        expect(r['relationship']['$relationshipName']).toEqual('test_filename');
        expect(r).not.toIncludeKey('source');
        expect(r).not.toIncludeKey('target');
    });
    test('Throw error when missing source key', function() {
        delete relationshipObject['source']

        expect(() => relationshipCsvObject2DTDL(mockContext, relationshipObject)).toThrow();
    });
    test('Throw error when missing target key', function() {
        delete relationshipObject['target']

        expect(() => relationshipCsvObject2DTDL(mockContext, relationshipObject)).toThrow();
    });
    test('Add extra parsed attributes to new relationship attribute', function() {
        relationshipObject['new_attribute1'] = 'value1';
        relationshipObject['new_attribute2'] = 'value2';

        r = relationshipCsvObject2DTDL(mockContext, relationshipObject);

        expect(r['relationship']).toIncludeKey('new_attribute1');
        expect(r['relationship']['new_attribute1']).toEqual('value1');
        expect(r['relationship']).toIncludeKey('new_attribute2');
        expect(r['relationship']['new_attribute2']).toEqual('value2');
        expect(r).not.toIncludeKey('new_attribute1');
        expect(r).not.toIncludeKey('new_attribute2');
    });
});


jest.mock('@azure/storage-queue', () => ({
    QueueClient: jest.fn().mockImplementation(() => {
        return {
            createIfNotExists: jest.fn(),
            sendMessage: jest.fn().mockImplementation((str) => {
                mockMessages.push(JSON.parse(Buffer.from(str, 'base64').toString()));
                return new Promise(() => {});
            }),
        }
    })
}));


describe('csv2json', () => {
    beforeEach(function() {
        mockMessages = [];
        mockContext.bindingData.filename = 'test_filename';
    });

    test('Load a "relationship csv" type file', function() {
        csv = 'source,target\n'
        +     '"source_id","target_id"';

        csv2json(mockContext, csv)
        
        expect(mockMessages.length).toBe(1);
        mockMessage = mockMessages[0];
        expect(mockMessage).toIncludeKey('$relationshipId')
        expect(mockMessage).toIncludeKey('$relationshipId');
        expect(mockMessage['$relationshipId']).toEqual('source_id-target_id');
        expect(mockMessage).toIncludeKey('$sourceId');
        expect(mockMessage['$sourceId']).toEqual('source_id');
        expect(mockMessage).toIncludeKey('relationship');
        expect(mockMessage['relationship']).toIncludeKey('$targetId');
        expect(mockMessage['relationship']['$targetId']).toEqual('target_id');
        expect(mockMessage['relationship']).toIncludeKey('$relationshipName');
        expect(mockMessage['relationship']['$relationshipName']).toEqual('test_filename');
    });
    test('Load a "twin csv" type file', function() {
        csv = 'id\n'
        +     'test_id';

        csv2json(mockContext, csv)
        
        expect(mockMessages.length).toBe(1);
        mockMessage = mockMessages[0];
        expect(mockMessage).toIncludeKey('$id');
        expect(mockMessage['$id']).toEqual('test_id');
        expect(mockMessage).toIncludeKey('$metadata');
        expect(mockMessage['$metadata']).toIncludeKey('$model');
        expect(mockMessage['$metadata']['$model']).toEqual('dtmi:test_filename;1');
    });
});
