var promises = require('./promises'),
    _ = require('underscore'),
    Q = require('q');

function addNextPromises(nextPromiseNames, promise, promiseName) {
  function addToPromise(nextPromiseName) {
    promise[nextPromiseName] = 
      createPromise.bind({
        promise: promise,
        name: promiseName
      }, nextPromiseName);
  }

  if(_.isArray(nextPromiseNames)) {
    _.each(nextPromiseNames, addToPromise);
  }
  if(_.isString(nextPromiseNames)) {
    addToPromise(nextPromiseNames);
  }
  return promise;
}

function createPromise() {
  var thisPromiseName = _.first(arguments),
      priorPromise = this.promise,
      priorPromiseName = this.name,
      priorPromiseSpec = promises[priorPromiseName],
      args = _.rest(arguments),
      thisPromiseSpec = promises[thisPromiseName],
      thisPromise = 
        priorPromise.then(promiseResolver.bind(null, 
              thisPromiseSpec.resolver));

  function promiseResolver(resolver, value) {
    return resolver.apply(null, args.concat([value]));
  }

  addNextPromises(thisPromiseSpec.next, thisPromise, thisPromiseName);

  if(thisPromiseSpec.up) {
    thisPromise[thisPromiseSpec.up] = 
      addNextPromises(priorPromiseSpec.next, 
          priorPromise.then(thisPromiseSpec.upResolver), priorPromiseName);
  }

  return thisPromise;
}


module.exports = createPromise.bind({ 
  promise: Q.fcall(function() { return null; })
});
