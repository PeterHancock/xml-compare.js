# xml-compare.js

*Compare xml streams*

A performant XML stream comparator


## CLI Usage

```xml-compare expected.xml < actual.xml```

## API

``` javascript
var fs = require('fs'),
    XmlCompare = require('./xml-compare');

var exectedFile = ...

var actualFile = ...

var expectedStream = fs.createReadStream(expectedFile);
var actualStream = fs.createReadStream(expectedFile);

XmlCompare.compare(expectedStream, actualStream)
    .on('same', function(expected, actual) { ... })
    .on('differ', function (err, expected, actual) { ... })
    .on ('end', function () { ...})

```

### Events


`same`
 * `expected` **Event**
 * `actual` **Event**

 `differ`
 * `err` Error message
 * `expected` **Event**
 * `actual` **Event**

 `end`

 Where the **Event** object holds
  * `Event.event` Event type ∈ {'startElement', 'endElement', 'text' }
  * `Event.args` Array of event data


Either one of `end` or `differ` will be emitted indicating the termination of the process.

### XPath-like difference logging
```
XmlCompare.comparePretty(expectedStream, actualStream)
    .on(...);
```
then `differ` events will be also logged to the console as [diffed](https://github.com/kpdecker/jsdiff) XPath-like text

## Install
```npm i -g xml-compare.js```

## LICENSE

**MIT**
