require('colors');
var _ = require('underscore');
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

    function diff(expected, actual) {
        var diff = jsdiff.diffChars(expected, actual);

        diff.forEach(function(part) {
            // green for additions, red for deletions
            // grey for common parts
            var color = part.added ? 'red' :
            part.removed ? 'green' : 'grey';
            process.stderr.write(part.value[color]);
        });
        console.error();
    }

    return xmlComparator.on('same', function(expected, actual) {
        switch (expected.event) {
            case 'startElement':
                start(expected.args.name);
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
            if (expected.event === 'startElement' && expected.args.name === actual.args.name) {
                start(expected.args.name);
            }
            var path = context[context.length - 1].path + '/';

            switch (expected.event) {
                case 'text':
                    diff(formatTextForDiff(path, expected.args), formatTextForDiff(path, actual.args));
                    break;
                case 'startElement':
                    if (expected.args.name !== actual.args.name) {
                        diff(path +  expected.args.name, path + actual.args.name);
                    } else {
                        path = path + expected.args.name + '/';
                        diff(
                            formatAttributesForDiff(path, expected.args.attributes),
                            formatAttributesForDiff(path, actual.args.attributes)
                        );
                    }
                    break;
                default:
                    diff(path +  expected.args, path + actual.args);
            }
        }
    });

    function formatTextForDiff(path, textArray) {
        return path + 'text(' + textArray.join('') + ')';
    }

    function formatElementForDiff(path, element) {
        return path + element;
    }

    function formatAttributesForDiff(path, atts) {
        return path + '[' + _(atts).map(function (v, k) { return '@' + k + '=' + v; }).join(', ') +  ']';
    }
};
