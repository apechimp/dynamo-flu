var _ = require('lodash'),
    Q = require('q');

function unType(object) {
  var awsTypes = { S: true },
      pairs = _.pairs(object);

  if(pairs.length === 1 && awsTypes[pairs[0][0]]) {
    return pairs[0][1];
  }
  else {
    return object;
  }
}

module.exports = {
  defaultTo: {
    resolver: function(defaultItem, item) {
      if(!item) {
        return defaultItem;
      }
      else {
        return item;
      }
    },
    next: ['pick', 'where', 'as', 'with']
  },

  where: {
    resolver: function(whereFunc, collection) {
      return collection.filter(whereFunc);
    },
    next: ['pick', 'where', 'with']
  },

  as: {
    resolver: function() {
      var formats = _.initial(arguments),
          value = _.last(arguments),
          translator = function(item, format) {
            if(_.isString(item) && format === 'json') {
              return JSON.parse(item);
            }
            else {
              return item;
            }
          },
          parseObject = function(obj) {
            if(formats.length === 1) {
              return translator(obj, formats[0]);
            }
            else {
              var newObj = {};
              _.each(obj, function(item, key) {
                newObj[key] = translator(item, formats[obj['__' + key]]);
              });
              return newObj;
            }
          };

      if(_.isArray(value)) {
        return value.map(parseObject);
      }
      else {
        return parseObject(value);
      }
    },
    next: ['pick', 'where', 'with']
  },

  pick: {
    resolver: function() {
      var propertyNames = _.initial(arguments),
          value = _.last(arguments),
          pickFromObject = function(obj) {
            var values = propertyNames.map(function(propertyName) {
              if(_.isObject(obj)) {
                return unType(obj[propertyName]);
              }
              else {
                return obj;
              }
            });

            if(propertyNames.length === 1) {
              return values[0];
            }
            else {
              return propertyNames.reduce(function(acc, propertyName, index) {
                acc[propertyName] = values[index];
                Object.defineProperty(acc, '__' + propertyName, {
                  value: index,
                  enumerable: false,
                  writeable: false
                });
                return acc;
              }, {});
            }
          };

      if(_.isArray(value)) {
        return value.map(pickFromObject);
      }
      else {
        return pickFromObject(value);
      }
    },
    next: ['as', 'where', 'defaultTo', 'with']
  },

  aws: {
    resolver: function(awsFunction, logResult, selector) {
      var deferred = Q.defer();
      awsFunction(function(err, data) {
        if(err) {
          logResult('error: ' + err);
          deferred.reject(err);
        }
        else {
          logResult('data:\n' + JSON.stringify(data, null, 2));
          deferred.resolve(selector ? selector(data) : data);
        }
      });
      return deferred.promise;
    },
    next: ['pick', 'defaultTo', 'ifExists']
  },

  ifExists: {
    resolver: function(onEmpty, item) {
      if(item === null || typeof item === 'undefined') { 
        onEmpty(); 
      }
      else {
        return item;
      }
    },
    up: 'otherwise',
    upResolver: function(item) {
      var deferred = Q.defer();
      if(item) {
        deferred.resolve(item);
      }
      //else never resolve.
      return deferred.promise;
    }
  },

  with: {
    resolver: function(key, value) {
      return { 
        key: key,
        value: value
      };
    },
    next: ['notEqualTo', 'equalTo']
  },

  notEqualTo: {
    resolver: function(comparee, value) {
      return value.value.filter(function(item) { 
        return comparee !== item[value.key]; 
      });
    },
    next: ['pick', 'where', 'with']
  },
  
  equalTo: {
    resolver: function(comparee, value) {
      return value.value.filter(function(item) { 
        return comparee === item[value.key]; 
      });
    },
    next: ['pick', 'where', 'with']
  }
};
