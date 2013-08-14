var aws = require('aws-sdk'),
    _str = require('underscore.string'),
    _ = require('underscore'),
    createPromise = require('./promiseCreator');

function logItemResult(logStream, verb, input) {
  var startTime = process.hrtime();
  return function(result) {
    var timeDiff = process.hrtime(startTime),
        msTimeDiff = (1e9 * timeDiff[0] + timeDiff[1]) / 1e6;

    logStream.write(_str.sprintf(
      'AWS took %d ms to %s %s and yielded %s\n', msTimeDiff, verb, 
      JSON.stringify(input, null, 2), result));
  };
}

function deleteItem(db, logStream, tableName, keyName, keyValue) {
  var itemDeleter,
      key,
      params;

  key = {};
  key[keyName] = { S: keyValue };

  params = {
    TableName: tableName,
    Key: key
  };

  itemDeleter = db.deleteItem.bind(db, params);

  return createPromise('aws', itemDeleter, 
      logItemResult(logStream, 'delete', params));
}

function putItem(db, logStream, tableName, attributes, collectionBased) {
  var itemPutter,
      item,
      put;

  if(collectionBased) {

    put = { RequestItems: {} };
    var requestItems = attributes.reduce(function(acc, attribute) {
      return _.map(attribute.value, function(value, index) {
        var item = acc[index] || {},
            typedValue = {};

        typedValue[attribute.type] = value;
        item[attribute.name] = typedValue;
        return item;
      });
    }, []);

    put.RequestItems[tableName] = requestItems.map(function(item) {
      return { PutRequest: { Item: item } };
    });

    itemPutter = db.batchWriteItem.bind(db, put);
  }
  else {
    item = attributes.reduce(function(acc, attribute) {
      var typedValue = {};
      typedValue[attribute.type] = attribute.value;
      acc[attribute.name] = typedValue;
      return acc;
    }, {});

    put = {
      TableName: tableName,
      Item: item
    };

    itemPutter = db.putItem.bind(db, put);
  }

  return createPromise('aws', itemPutter, 
      logItemResult(logStream, 'put', put));
}

function getItem(db, logStream, tableName, keyName, keyValue) {
  var itemGetter, 
      getPromise,
      params,
      resolver,
      getKey = function(keyValueItem) {
        var key = {};
        key[keyName] = {S: keyValueItem };
        return key;
      };

  if(_.isArray(keyValue)) {
    params = {
      RequestItems: { }
    };
    params.RequestItems[tableName] = {
      Keys: _.map(keyValue, getKey)
    };
    itemGetter = db.batchGetItem.bind(db, params);
    resolver = function(data) { 
      return data.Responses[tableName];
    };
    //OMFG need to handle UnprocessedKeys
  }
  else {
    params = {
      TableName: tableName,
      Key: getKey(keyValue)
    };
    itemGetter = db.getItem.bind(db, params);
    resolver = function(data) { return data.Item; };
  }

  getPromise = createPromise('aws', itemGetter, 
      logItemResult(logStream, 'get', params), resolver);

  return getPromise;
}

function putMethod(db, logStream, tableName, collectionBased, keyName,
    keyValue) {

  function getReturnObject(attributes) {
    return {
      withAttribute: withAttribute.bind(null, attributes),
      as: as.bind(null, attributes),
      send: putItem.bind(null, db, logStream, tableName, attributes,
          collectionBased)
    };
  }

  function asJson(attributes) {
    var lastAttribute = _.last(attributes);
    if(collectionBased) {
      lastAttribute.value = lastAttribute.value.map(function(value) {
        return JSON.stringify(value);
      });
    }
    else {
      lastAttribute.value = JSON.stringify(lastAttribute.value);
    }

    return getReturnObject(attributes);
  }

  function asString(attribures) {
    var lastAttribute = _.last(attribures);
    lastAttribute.type = 'S';

    return getReturnObject(attribures);
  }

  function as(attributes, type) {
    switch(type) {

    case 'json':
    case 'JSON':
    case 'Json':
      return asJson(attributes).
        as('string');

    case 'S':
    case 'string':
    case 'String':
    case 's':
      return asString(attributes);
    }
  }

  function withAttribute(attributes, name, value){
    var updatedAttributes = attributes.concat({
      name: name,
      value: value
    });

    return getReturnObject(updatedAttributes);
  }

  return getReturnObject([{
    name: keyName,
    value: keyValue
  }]);
}


function chooseToTable(db, logStream, tableName) {
  return {
    put: putMethod.bind(null, db, logStream, tableName, false),
    putAll: putMethod.bind(null, db, logStream, tableName, true),
  };
}

function chooseFromTable(db, logStream, tableName) {
  return {
    get: {
      with: function(keyName) {
        return {
          equalTo: getItem.bind(null, db, logStream, tableName, keyName)
        };
      }
    },
    delete: function(keyName, keyValue) {
      return deleteItem(db, logStream, tableName, keyName, keyValue, 'S');
    }
  };
}

module.exports = function(config, logStream) {
  var db;

  logStream = logStream || process.stdout;

  aws.config.update(config);

  db = new aws.DynamoDB();

  return {
    from: chooseFromTable.bind(null, db, logStream),
    to: chooseToTable.bind(null, db, logStream)
  };

};
