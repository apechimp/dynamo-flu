dynamo-flu
==========

[![Greenkeeper badge](https://badges.greenkeeper.io/apechimp/dynamo-flu.svg)](https://greenkeeper.io/)

[![Build Status](https://travis-ci.org/apechimp/dynamo-flu.png?branch=master)]
(https://travis-ci.org/apechimp/dynamo-flu)

A fluent wrapper around DynamoDB which allows you to write code like 

    db.from('Users').get.with('userId').equalTo(userId).
    ifEmpty(userDoesNotExist(next, userId)).
    otherwise.pick('contexts').
    defaultTo([]).
    as('json').
    then(function(contexts) {
      ...
    });

to interact with your database in an obvious way.

TODO
----

- [ ] add tests
- [x] use grunt to automatically run tests and jshint
- [ ] docs
- [ ] switch from aws-sdk to dynasty as it becomes ready
