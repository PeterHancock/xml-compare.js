var _ = require('underscore');
var sax = require('sax');
var fs = require('fs');
var assert = require('assert');
var EventEmitter2 = require('eventemitter2').EventEmitter2;
var util = require('util');

var saxEvents = ['opentag' , 'closetag', 'text'];

var xmlCompare = {
    startElement: function (expected, actual) {
        assert.equal(expected.name, actual.name, 'Element names differ');
        assert.deepEqual(expected.attributes, actual.attributes, 'Attributes differ');
    },
    endElement: function (expected, actual) {
        //TODO can this happen?
        assert.equal(expected, actual, 'Expected end element');
    },
    text: function (expected, actual) {
        assert.deepEqual(expected, actual, 'text differs');
    }
};

var mapEvents = {
    opentag: function (args) {
        return { event: 'startElement', args: args };
    },
    closetag: function (name) {
        return { event: 'endElement', args: name };
    },
    text: function (text) {
        return { event: 'text', args: text };
    }
};

var compare = _({ end: function () { } }).extend(xmlCompare);

var XmlComparator = function () {
    this._eventQueues = {expected: [], actual: []};
    this._textBuffers = {expected: null, actual: null};
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
    var parser = sax.createStream(false /*strict*/, { trim: true, normalize: true, lowercase: true });
    _(saxEvents).each(function(event) {
        parser.on(event, function (data) {
            this._register(id, mapEvents[event](data));
        }.bind(this));
    }, this);
    return parser;
};

XmlComparator.prototype._register = function (id, event) {
    if (event.event === 'text') {
        if (this._textBuffers[id] === null) {
            this._textBuffers[id] = [];
        }
        // TODO improve whitespace handling
        var txtArray = _(event.args.trim().split(/\r?\n/)).filter(function (str) { return str !== ''; });
        Array.prototype.push.apply(this._textBuffers[id], txtArray);
    } else {
        if (this._textBuffers[id] !== null) {
            if (this._textBuffers[id].length > 0) {
                this._eventQueues[id].push({ event: 'text', args: this._textBuffers[id] });
            }
            this._textBuffers[id] = null;
        }
        this._eventQueues[id].push(event);
        this._drain();
    }
};

XmlComparator.prototype._drain = function () {
    while (this._eventQueues['actual'].length && this._eventQueues['expected'].length) {
        var expected = this._eventQueues['expected'].shift();
        var actual = this._eventQueues['actual'].shift();
        try {
            assert.equal(expected.event, actual.event, 'Events types differ');
            compare[expected.event](expected.args, actual.args);
            this.emit('same', expected, actual);
        } catch (e) {
            // TODO hack
            this._drain = function () {};
            _(this.streams).each(function (stream) {
                if (_(stream.close).isFunction()) {
                    stream.close();
                }
            })
            this.emit('differ', e.message, expected, actual);
        }
    }
};

module.exports = XmlComparator;

XmlComparator.compare = function (expectedInput, actualInput) {
    return new XmlComparator().compare(expectedInput, actualInput);
};

XmlComparator.comparePretty = function (expectedInput, actualInput) {
    var xpathLogging = require('./src/xpath');
    return xpathLogging(new XmlComparator())
            .compare(expectedInput, actualInput);
};
