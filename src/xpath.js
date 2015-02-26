require('colors');
var jsdiff = require('diff');

module.exports = function(xmlComparator) {
    var context = [{
        path: '',
        kids: {}
    }];

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
        context.push({
            path: p,
            kids: {}
        });
    }

    function sanitizeArgs(args) {
        if (args.length === 0) {
            return '';
        } else if (args.length === 1) {
            return args[0];
        }
        return args;
    }


    function diff(expected, actual) {
        var diff = jsdiff.diffChars(JSON.stringify(expected), JSON.stringify(actual));

        diff.forEach(function(part) {
            // green for additions, red for deletions
            // grey for common parts
            var color = part.added ? 'green' :
            part.removed ? 'red' : 'grey';
            process.stderr.write(part.value[color]);
        });
        console.error();
    }

    return xmlComparator.on('same', function(expected, actual) {
        switch (expected.event) {
            case 'startElement':
                start(expected.args[0]);
                break;
            case 'endElement':
                context.pop();
                break;
            default:
        }
    }).on('differ', function(reason, expected, actual) {

        if (expected.event !== actual.event) {
            var path = context[context.length - 1].path;
            console.error(path + '/{<' + expected.event + '>,<' + actual.event + '>}');
        } else {
            if (expected.event === 'startElement' && expected.args[0] === actual.args[0]) {
                start(expected.args[0]);
                expected.args.shift();
                actual.args.shift();
            }
            var path = context[context.length - 1].path;
            console.error("Xpath: " + path.green);
            if (expected.event !== 'text') {
                diff(JSON.stringify(expected.args), JSON.stringify(actual.args));
            } else {
                diff(expected.args.join(''), actual.args.join(''));
            }

        }
    });
};
