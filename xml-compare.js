var _ = require('underscore');
var expat = require('node-expat');
var fs = require('fs');
var assert = require('assert');

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

var compare = _({ end: function () { } }).extend(xmlCompare);

var XmlComparator = function () {
    this.queues = {expected: [], actual: []};
};

XmlComparator.prototype.compare = function (expectedInput, actualInput) {
    _({expected: expectedInput, actual: actualInput}).each(function (input, id) {
        input.on('end', function () {
            this._register(id, { event: 'end' });
        }.bind(this)).pipe(this._createParser(id));
    }, this);
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
        assert.equal(a.event, b.event);
        compare[a.event](a.args, b.args);
    }
};

module.exports = function compare(expectedInput, actualInput) {
    new XmlComparator().compare(expectedInput, actualInput);
}
