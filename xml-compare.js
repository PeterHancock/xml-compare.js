var _ = require('underscore');
var expat = require('node-expat');
var fs = require('fs');
var assert = require('assert');
var EventEmitter2 = require('eventemitter2').EventEmitter2;
var util = require('util');
require('colors');
var jsdiff = require('diff');

var xmlCompare = {
    startElement: function (expected, actual) {
        assert.equal(expected[0], actual[0]);
        assert.deepEqual(expected[1], actual[1]);
    },
    endElement: function (expected, actual) {
        assert.equal(expected[0], actual[0]);
    },
    text: function (expected, actual) {
        assert.equal(expected[0], actual[0]);
    }
};

var handler = {
    startElement: function (name, atts) {
    },
    endElement: function (name) {
    },
    text: function (text) {
    }
};

var compare = _({ end: function () { } }).extend(xmlCompare);

var XmlComparator = function () {
    this.queues = {expected: [], actual: []};
    this.streams = [];
    EventEmitter2.call(this);
};

util.inherits(XmlComparator, EventEmitter2);

XmlComparator.prototype.compare = function (expectedInput, actualInput) {
    this.streams.push.apply(this.streams, arguments);
    _({expected: expectedInput, actual: actualInput}).each(function (input, id) {
        input.on('end', function () {
            this._register(id, { event: 'end' });
        }.bind(this)).pipe(this._createParser(id));
    }, this);
    return this;
};

XmlComparator.prototype._createParser = function (id) {
    var parser = new expat.Parser('UTF-8');
    _.chain(xmlCompare).keys()
    .each(function(event) {
        parser.on(event, function () {
            this._register(id, { event: event, args: Array.prototype.slice.call(arguments) });
        }.bind(this));
    }, this);
    return parser;
};

XmlComparator.prototype._register = function (id, event) {
    this.queues[id].push(event);
    this._drain();
};

XmlComparator.prototype._drain = function () {
    while (this.queues['actual'].length && this.queues['expected'].length) {
        var a = this.queues['expected'].shift();
        var b = this.queues['actual'].shift();
        try {
            assert.equal(a.event, b.event);
            compare[a.event](a.args, b.args);
            this.emit('same', a, b);
        } catch (e) {
            this._drain = function () {};
            _(this.streams).each(function (stream) {
                stream.close();
            })
            this.emit('differ', e, a, b);
        }

    }
};

module.exports = XmlComparator;

XmlComparator.compare = function (expectedInput, actualInput) {
    return new XmlComparator().compare(expectedInput, actualInput);
};

XmlComparator.comparePretty = function (expectedInput, actualInput) {
    var context = [{path: '', kids: {}}];
    function start(name) {
        var c = context[context.length - 1];
        var kids = c.kids;
        var path = c.path;
        var count = kids[name] || 1;
        kids[name] = count + 1;
        var p = path + '/' + name;
        if (count > 1) {
            p = p + '[' + count + ']';
        }
        context.push({path: p, kids: {}});
    }
    function sanitizeArgs(args) {
        if (args.length == 0) {
            return '';
        } else if (args.length = 1) {
            return args[0];
        }
        return args;
    }
    return new XmlComparator().on('same', function (expected, actual) {
        switch(expected.event) {
            case 'startElement':
                start(expected.args[0]);
                break;
            case 'endElement':
                context.pop();
                break;
                default:
        }
    }).on('differ', function (err, expected, actual) {

        //path.push(p);

        if (expected.event !== actual.event) {
            var path = context[context.length - 1].path;
            console.error(path + '/{<' + expected.event + '>,<' + actual.event + '>}');
        } else {
            if (expected.event === 'startElement' && expected.args[0] === actual.args[0]) {
                start(expected.args[0]);
                expected.args.shift();
                actual.args.shift();
            }
            var diff = jsdiff.diffChars(JSON.stringify(sanitizeArgs(expected.args)), JSON.stringify(sanitizeArgs(actual.args)));
            var path = context[context.length - 1].path;
            process.stderr.write(path + '/');
            diff.forEach(function(part){
                // green for additions, red for deletions
                // grey for common parts
                var color = part.added ? 'green' :
                part.removed ? 'red' : 'grey';
                process.stderr.write(part.value[color]);
            });
            console.log();
            //console.error(path + '/{' + expected.args + ',' + actual.args + '}');
        }
    })
    .compare(expectedInput, actualInput);
};
