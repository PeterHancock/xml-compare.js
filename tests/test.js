var _ = require('underscore'),
    test = require('tape'),
    through = require('through'),
    compare = require('lib/index').compare,
    XmlWriter = require('xml-writer'),
    serializer = require('xml-builder/serializer');

function xmlBase(xw) {
    xw.startElement('root').writeAttribute('root_attr_1', 'root att 1 value')
        .writeElement('child_1', '')
        .writeElement('child_2', 'child 2 text')
        .writeElement('child_3', 'child 3 text 1\nchild 3 text 2')
        .startElement('child_4')
            .writeElement('child_4_1', '')
        .endElement()

}

function xmlWriter(stream) {
    return Object.create(Object.assign(
        new XmlWriter(true, (string, encoding) => stream.write(string, encoding)),
        {
            accept: function (builder) {
                        builder.call(this, this);
                        return this;
                    }
        }
    ));
}

function writerFor(stream) {
    return (data) => {
        stream.write(data);
    };
}

function getXmlBuilder(stream) {
    return xmlBuilder(serializer( { writer: writerFor(stream) } ));
}
test('Basic test', function (t) {
    var streams = [through(), through()];
    t.plan(1);
    compare(...streams)
        .on('end', () => t.pass('Streams equals'));
    streams.forEach((stream) => {
        xmlWriter(stream).startDocument().accept(xmlBase).endElement().endDocument();
        stream.end()
    });
});

test('Basic test async', (t) => {
    var streams = [through(), through()];
    t.plan(1);
    compare(...streams)
        .on('end', () => t.pass('Streams equals'));
    streams.forEach((stream) => {
        xmlWriter(stream).startDocument()
            .accept(xmlBase)
            .accept((xw) => {
                xw.writeElement('x', '')
                    .writeElement('y', '')
                    .endElement()
                    .endDocument();
                stream.end();
            });
    });

});

test('Basic diff', (t) => {
    var streams = {
        s1: through(),
        s2: through()
    };
    t.plan(1);
    compare(..._(streams).values())
        .on('differ', () => t.pass('Streams differ') );

    _(streams).each((stream, name) => {
        xmlWriter(stream).startDocument()
            .accept(xmlBase)
            .writeElement(name, '')
        stream.end();
    });
});

test('Basic diff async', (t) => {
    var streams = {
        s1: through(),
        s2: through()
    };
    t.plan(1);
    compare(..._(streams).values())
    .on('differ', () => t.pass('Streams differ') );

    _(streams).each((stream, name) => {
        xmlWriter(stream).startDocument()
            .accept(xmlBase)
            .accept((xw) => {
                xw.writeElement(name, '')
                stream.end();
            })
            .writeElement(name, '')
    });
});
