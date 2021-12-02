const { twinCsvObject2DTDL, relationshipCsvObject2DTDL, csv2json} = require('../csv2json');
const { QueueClient } = require('@azure/storage-queue');


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
  // console.debug(txt);
};
MockContext.prototype.bindingData = {};
const mockContext = new MockContext();


function objectHasKey(actual, expected) {
    var result = {};
    result.pass = (expected in actual);
    result.message = function() {
        if (result.pass)
            return `Expected value ${expected} is in ${JSON.stringify(actual)}`;
        return `Expected value ${expected} is NOT in ${JSON.stringify(actual)}`;
    }
    return result;
}
jasmine.addMatchers({
    toIncludeKey: function(matchersUtil) {
        return {compare: objectHasKey}
    }
});



/**
 *  Test TwinCsvObject2DTDL
 */
describe('twinCsvObject2DTDL', function() {
    beforeAll(function() {
        mockContext.bindingData.filename = 'test_filename';
        mockContext.bindingData.version = '1';
    });

    test('Transform parse twin data to match dtdl format', function() {
        twinObject = {'id': 'test_id'};

        r = twinCsvObject2DTDL(mockContext, twinObject);
        
        expect(r).toIncludeKey('$id');
        expect(r['$id']).toEqual('test_id');
        expect(r).toIncludeKey('$metadata');
        expect(r['$metadata']).toIncludeKey('$model');
        expect(r['$metadata']['$model']).toEqual('dtmi:test_filename;1');
    });
    test('Transform parse twin data at dtdl format to match dtdl format', function() {
        twinObject = {'$id': 'test_id'};

        r = twinCsvObject2DTDL(mockContext, twinObject);
        
        expect(r).toIncludeKey('$id');
        expect(r['$id']).toEqual('test_id');
        expect(r).toIncludeKey('$metadata');
        expect(r['$metadata']).toIncludeKey('$model');
        expect(r['$metadata']['$model']).toEqual('dtmi:test_filename;1');
    });
    test('Transform parse twin data format with modelId to match dtdl format', function() {
        twinObject = {'$id': 'test_id', '$metadata.$model': 'dtmi:test_dtmi;1'};

        r = twinCsvObject2DTDL(mockContext, twinObject);
        
        expect(r).toIncludeKey('$id');
        expect(r['$id']).toEqual('test_id');
        expect(r).toIncludeKey('$metadata');
        expect(r['$metadata']).toIncludeKey('$model');
        expect(r['$metadata']['$model']).toEqual('dtmi:test_dtmi;1');
    });
    test('Throw when missing id key', function() {
        twinObject = {};

        expect(() => {twinCsvObject2DTDL(mockContext, twinObject)}).toThrow();
    });
});


/**
 * Test relationshipCsvObject2DTDL
 */
describe('relationshipCsvObject2DTDL', function() {
    beforeAll(function() {
        mockContext.bindingData.filename = 'test_filename';
        mockContext.bindingData.version = '1';
    });

    test('Transform parse relationship data to match dtdl format', function() {
        relationshipObject = {'source': 'source_id', 'target': 'target_id'};

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
    test('Transform parse relationship data with $sourceId to math dtdl format', function() {
        relationshipObject = {'$sourceId': 'D_source_id', 'target': 'target_id'};

        r = relationshipCsvObject2DTDL(mockContext, relationshipObject);
        
        expect(r).toIncludeKey('$relationshipId');
        expect(r['$relationshipId']).toEqual('D_source_id-target_id');
        expect(r).toIncludeKey('$sourceId');
        expect(r['$sourceId']).toEqual('D_source_id');
        expect(r).toIncludeKey('relationship');
        expect(r['relationship']).toIncludeKey('$targetId');
        expect(r['relationship']['$targetId']).toEqual('target_id');
        expect(r['relationship']).toIncludeKey('$relationshipName');
        expect(r['relationship']['$relationshipName']).toEqual('test_filename');
        expect(r).not.toIncludeKey('source');
        expect(r).not.toIncludeKey('target');
    });
    test('Transform parse relationship data with $targetId to math dtdl format', function() {
        relationshipObject = {'source': 'source_id', '$targetId': 'D_target_id'};

        r = relationshipCsvObject2DTDL(mockContext, relationshipObject);
        
        expect(r).toIncludeKey('$relationshipId');
        expect(r['$relationshipId']).toEqual('source_id-D_target_id');
        expect(r).toIncludeKey('$sourceId');
        expect(r['$sourceId']).toEqual('source_id');
        expect(r).toIncludeKey('relationship');
        expect(r['relationship']).toIncludeKey('$targetId');
        expect(r['relationship']['$targetId']).toEqual('D_target_id');
        expect(r['relationship']).toIncludeKey('$relationshipName');
        expect(r['relationship']['$relationshipName']).toEqual('test_filename');
        expect(r).not.toIncludeKey('source');
        expect(r).not.toIncludeKey('target');
    });
    test('Transform parse relationship data with $sourceId and $targetId to math dtdl format', function() {
        relationshipObject = {'$sourceId': 'D_source_id', '$targetId': 'D_target_id'};

        r = relationshipCsvObject2DTDL(mockContext, relationshipObject);
        
        expect(r).toIncludeKey('$relationshipId');
        expect(r['$relationshipId']).toEqual('D_source_id-D_target_id');
        expect(r).toIncludeKey('$sourceId');
        expect(r['$sourceId']).toEqual('D_source_id');
        expect(r).toIncludeKey('relationship');
        expect(r['relationship']).toIncludeKey('$targetId');
        expect(r['relationship']['$targetId']).toEqual('D_target_id');
        expect(r['relationship']).toIncludeKey('$relationshipName');
        expect(r['relationship']['$relationshipName']).toEqual('test_filename');
        expect(r).not.toIncludeKey('source');
        expect(r).not.toIncludeKey('target');
    });
    test('Transform parse relationship data with $relationshipId to math dtdl format', function() {
        relationshipObject = {'source': 'source_id', 'target': 'target_id', '$relationshipId': 'D_relationship_id'};

        r = relationshipCsvObject2DTDL(mockContext, relationshipObject);
        
        expect(r).toIncludeKey('$relationshipId');
        expect(r['$relationshipId']).toEqual('D_relationship_id');
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
    test('Transform parse relationship data with $relationshipName to math dtdl format', function() {
        relationshipObject = {'source': 'source_id', 'target': 'target_id', '$relationshipName': 'D_relationship_name'};

        r = relationshipCsvObject2DTDL(mockContext, relationshipObject);
        
        expect(r).toIncludeKey('$relationshipId');
        expect(r['$relationshipId']).toEqual('source_id-target_id');
        expect(r).toIncludeKey('$sourceId');
        expect(r['$sourceId']).toEqual('source_id');
        expect(r).toIncludeKey('relationship');
        expect(r['relationship']).toIncludeKey('$targetId');
        expect(r['relationship']['$targetId']).toEqual('target_id');
        expect(r['relationship']).toIncludeKey('$relationshipName');
        expect(r['relationship']['$relationshipName']).toEqual('D_relationship_name');
        expect(r).not.toIncludeKey('source');
        expect(r).not.toIncludeKey('target');
    });
    test('Throw when missing source key', function() {
        relationshipObject = {};

        expect(() => relationshipCsvObject2DTDL(mockContext, relationshipObject)).toThrow();
    });
    test('Throw when missing target key', function() {
        relationshipObject = {'source': 'source_id'};

        expect(() => relationshipCsvObject2DTDL(mockContext, relationshipObject)).toThrow();
    });
    test('Add extra parsed attributes to new relationship attribute', function() {
        relationshipObject = {'source': 'source_id', 
            'target': 'target_id',
            'new_attribute1': 'value1',
            'new_attribute2': 'value2'};

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

/**
 * Test csv2json
 */
describe('csv2json', () => {
    beforeEach(function() {
        mockMessages = [];
        mockContext.bindingData.filename = 'test_filename';
        mockContext.bindingData.version = '1';
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
    test('Use version from file name', function() {
        mockContext.bindingData.version = '2';
        csv = 'id\n'
        +     'test_id';

        csv2json(mockContext, csv)
        
        expect(mockMessages.length).toBe(1);
        mockMessage = mockMessages[0];
        expect(mockMessage).toIncludeKey('$id');
        expect(mockMessage['$id']).toEqual('test_id');
        expect(mockMessage).toIncludeKey('$metadata');
        expect(mockMessage['$metadata']).toIncludeKey('$model');
        expect(mockMessage['$metadata']['$model']).toEqual('dtmi:test_filename;2');
    });
    test('Remove null attributes', function() {
        csv = 'id, test_attribute\n'
        +     'test_id,';
       
        csv2json(mockContext, csv)

        expect(mockMessages.length).toBe(1);
        mockMessage = mockMessages[0];
        expect(mockMessage).not.toIncludeKey('test_attribute');
    });
});
