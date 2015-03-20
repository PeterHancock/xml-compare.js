var _ = require('underscore');
var expat = require('node-expat');
var fs = require('fs');
var assert = require('assert');
var EventEmitter2 = require('eventemitter2').EventEmitter2;
var util = require('util');

var XML_EVENTS = ['startElement', 'endElement', 'text'];

var xmlCompare = {
    startElement: function (expected, actual) {
        assert.equal(expected[0], actual[0], 'Element names differ');
        assert.deepEqual(expected[1], actual[1], 'Attributes differ');
    },
    endElement: function (expected, actual) {
        //TODO can this happen?
        assert.equal(expected[0], actual[0], 'Expected end element');
    },
    text: function (expected, actual) {
        assert.deepEqual(expected, actual, 'text differs');
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
    var parser = new expat.Parser('UTF-8');
    _(XML_EVENTS).each(function(event) {
        parser.on(event, function () {
            this._register(id, { event: event, args: Array.prototype.slice.call(arguments) });
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
        var txtArray = _(event.args[0].trim().split(/\r?\n/)).filter(function (str) { return str !== ''; });
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
        var a = this._eventQueues['expected'].shift();
        var b = this._eventQueues['actual'].shift();
        try {
            assert.equal(a.event, b.event, 'Events types differ');
            compare[a.event](a.args, b.args);
            this.emit('same', a, b);
        } catch (e) {
            // TODO hack
            this._drain = function () {};
            _(this.streams).each(function (stream) {
                if (_(stream.close).isFunction()) {
                    stream.close();
                }
            })
            this.emit('differ', e.message, a, b);
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
