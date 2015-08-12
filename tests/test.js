var _ = require('underscore'),
    test = require('tape'),
    through = require('through'),
    compare = require('lib/index').compare,
    xmlBuilder = require('xml-builder'),
    serializer = require('xml-builder/serializer');

function xmlBase() {
        this('root', { 'root_attr_1': 'root att 1 value' })
            ('child_1')()
            ('child_2')
                .text('child 2 text')
            ()
            ('child_3')
                (['child 3 text 1', 'child 3 text 2'])
            ()
            ('child_4')
                ('child_4_1')
                ()
            ();
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
        .on('end', t.pass.bind(t));

    streams.forEach((stream) => {
        getXmlBuilder(stream)
        (xmlBase)
        ();
        stream.end();
    });
});

test('Basic test async', (t) => {
    var streams = [through(), through()];
    t.plan(1);
    compare(...streams)
        .on('end', t.pass.bind(t));

    streams.forEach((stream) => {
        getXmlBuilder(stream)
        (xmlBase)
        (function () {
            let builder = this;
            setTimeout(() => {
                builder('x')()
                builder('y')()
                ()
                stream.end();
            });
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
        .on('differ', t.pass.bind(t));

    function xml(stream, customEventCreator) {
        getXmlBuilder(stream)
        (xmlBase)
        (customEventCreator)
        ();
    }

    _(streams).each((stream, name) => {
        getXmlBuilder(stream)
        (xmlBase)
        (function() {
            this(name)()
            ();
            stream.end();
         })
        ();
    });
});

test('Basic diff async', (t) => {
    var streams = {
        s1: through(),
        s2: through()
    };
    t.plan(1);
    compare(..._(streams).values())
        .on('differ', t.pass.bind(t));

    function xml(stream, customEventCreator) {
        getXmlBuilder(stream)
        (xmlBase)
        (customEventCreator)
        ();
    }

    _(streams).each((stream, name) => {
        getXmlBuilder(stream)
        (xmlBase)
        (function() {
            let builder = this;
            setTimeout(() => {
                this(name)()
                ();
                stream.end();
            })
         })
        ();
    });
});
