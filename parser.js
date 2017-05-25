"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var scanner_1 = require("./scanner");
var parsingContext = 0 /* SourceElements */;
// Share a single scanner across all calls to parse a source file.  This helps speed things
// up by avoiding the cost of creating/compiling scanners over and over again.
var scanner = scanner_1.createScanner();
var diagnostics = [];
var currentToken;
function token() {
    return currentToken;
}
function tokenValue() {
    return scanner.getTokenValue() || '';
}
function nextToken() {
    currentToken = scanner.scan();
    //console.log('nextToken22', currentToken, tokenValue());
}
function parse(text) {
    diagnostics = [];
    scanner.setText(text);
    // Prime the scanner
    nextToken();
    var prog = [];
    while (token() !== 2 /* EndOfFileToken */) {
        if (token() === 13 /* CodeToken */) {
            prog.push({
                kind: NodeKind.Code,
                name: guidShort(),
                code: tokenValue()
            });
            var code = tokenValue();
            nextToken();
        }
        else {
            prog.push(parseView());
        }
    }
    return {
        prog: prog,
        diagnostics: diagnostics
    };
}
exports.parse = parse;
function parseView() {
    var indentation = 0;
    while (token() === 5 /* IndentationToken */ && token() !== 2 /* EndOfFileToken */) {
        nextToken();
    }
    if (token() !== 1 /* Identifier */)
        error("Expected identifier2.");
    var name = tokenValue();
    nextToken();
    if (token() !== 5 /* IndentationToken */ && countIndentation(tokenValue()))
        error("Expected no indentation.");
    var dataType = 'SyncNode';
    var options = '{}';
    var classNames = [];
    var styles = [];
    var members = [];
    var functions = [];
    var properties = [];
    while (!isViewTerminator(indentation)) {
        if (token() === 20 /* DataType */) {
            dataType = tokenValue();
            nextToken();
        }
        if (token() == 12 /* ArgumentsToken */) {
            options = tokenValue();
            nextToken();
        }
        if (token() === 19 /* ClassNamesToken */) {
            classNames.push(tokenValue());
            nextToken();
        }
        if (token() !== 5 /* IndentationToken */)
            error('Expected Indentation');
        var memberIndentation = indentation + 1;
        while (token() === 5 /* IndentationToken */ && !isViewTerminator(indentation)) {
            memberIndentation = countIndentation(tokenValue());
            nextToken();
        }
        if (memberIndentation <= indentation) {
            error('Error: memberIndentation is less than indentation.');
        }
        else if (!isViewTerminator(indentation)) {
            parseMemberDeclaration(memberIndentation, classNames, styles, members, functions, properties);
        }
    }
    //console.log('end view2');
    if (token() !== 13 /* CodeToken */)
        nextToken();
    return {
        kind: NodeKind.View,
        name: name,
        dataType: dataType,
        options: options,
        classNames: classNames,
        styles: styles,
        members: members,
        functions: functions,
        properties: properties
    };
}
exports.parseView = parseView;
function countIndentation(str) {
    var count = 0;
    for (var i = 0; i < str.length; i++) {
        switch (str.charCodeAt(i)) {
            case 32 /* space */:
                count++;
                break;
            case 9 /* tab */:
                count += 4;
                break;
            default:
                return count;
        }
    }
    return count;
}
function parseList() {
}
exports.parseList = parseList;
function isViewTerminator(indentation) {
    if (token() === 2 /* EndOfFileToken */)
        return true;
    if (token() === 13 /* CodeToken */)
        return true;
    return token() === 5 /* IndentationToken */ && countIndentation(tokenValue()) <= indentation;
}
exports.isViewTerminator = isViewTerminator;
function isStatementTerminator(indentation) {
    if (token() === 2 /* EndOfFileToken */)
        return true;
    return token() === 5 /* IndentationToken */ && countIndentation(tokenValue()) <= indentation;
}
exports.isStatementTerminator = isStatementTerminator;
var NodeKind;
(function (NodeKind) {
    NodeKind[NodeKind["View"] = 0] = "View";
    NodeKind[NodeKind["Member"] = 1] = "Member";
    NodeKind[NodeKind["Style"] = 2] = "Style";
    NodeKind[NodeKind["Function"] = 3] = "Function";
    NodeKind[NodeKind["Binding"] = 4] = "Binding";
    NodeKind[NodeKind["Code"] = 5] = "Code";
    NodeKind[NodeKind["Properties"] = 6] = "Properties";
})(NodeKind = exports.NodeKind || (exports.NodeKind = {}));
function parseMemberDeclaration(indentation, classNames, styles, members, functions, properties) {
    switch (token()) {
        case 18 /* AtToken */:
            nextToken();
            if (token() !== 13 /* CodeToken */) {
                error('Expected code.');
            }
            properties.push({
                name: guidShort(),
                kind: NodeKind.Properties,
                text: tokenValue()
            });
            nextToken();
            break;
        case 19 /* ClassNamesToken */:
            classNames.push(tokenValue());
            nextToken();
            break;
        case 11 /* DotIdentifierToken */:
            styles.push(parseMemberStyleDeclaration(indentation));
            break;
        case 9 /* ColonIdentifierToken */:
        case 3 /* HashIdentifierToken */:
            members.push(parseMemberPropertyDeclaration(indentation));
            break;
        case 1 /* Identifier */:
            functions.push(parseMemberFunctionDeclaration());
            nextToken();
            break;
        default:
            error("Expected identifier.");
            break;
    }
}
exports.parseMemberDeclaration = parseMemberDeclaration;
function parseMemberStyleDeclaration(indentation) {
    var name = tokenValue();
    var text = '';
    if (!name)
        name = guidShort();
    nextToken();
    switch (token()) {
        case 13 /* CodeToken */:
            text = tokenValue();
            nextToken();
            break;
        default:
            error('Syntax error2. ' + indentation);
            nextToken();
            break;
    }
    return {
        kind: NodeKind.Style,
        name: name,
        text: text
    };
}
exports.parseMemberStyleDeclaration = parseMemberStyleDeclaration;
function isUpperCase(str) {
    if (str.length === 0)
        return false;
    return str.charAt(0) === str.charAt(0).toUpperCase();
}
function parseMemberPropertyDeclaration(indentation) {
    var name;
    var tag;
    if (token() === 9 /* ColonIdentifierToken */) {
        // no name supplied
        name = guidShort();
        tag = tokenValue().trim() || 'div';
    }
    else {
        name = (tokenValue() || '').trim() || guidShort();
        tag = 'div';
    }
    var options = '';
    var innerHTML = '';
    var classes = [];
    var functions = [];
    var styles = [];
    var bindings = [];
    var members = [];
    nextToken();
    var lastIndentation = 0;
    while (!isStatementTerminator(indentation)) {
        switch (token()) {
            case 19 /* ClassNamesToken */:
                classes.push(tokenValue());
                nextToken();
                break;
            case 6 /* StringLiteral */:
                innerHTML = tokenValue();
                nextToken();
                break;
            case 11 /* DotIdentifierToken */:
                styles.push(parseMemberStyleDeclaration(indentation));
                break;
            case 9 /* ColonIdentifierToken */:
                tag = tokenValue().trim() || 'div';
                nextToken();
                break;
            case 12 /* ArgumentsToken */:
                options = tokenValue();
                nextToken();
                break;
            case 17 /* DollarToken */:
                var bindingStr = tokenValue();
                var split = bindingStr.split('=');
                var binding = {
                    kind: NodeKind.Binding,
                    name: guidShort(),
                    prop: isUpperCase(tag) ? 'update' : 'innerHTML',
                    value: split[0]
                };
                //console.log('binding', binding);
                if (split.length > 1) {
                    binding.prop = split[0];
                    binding.value = split[1];
                }
                bindings.push(binding);
                nextToken();
                break;
            case 3 /* HashIdentifierToken */:
                //console.log('==================parsing member2', name, indentation, lastIndentation)
                members.push(parseMemberPropertyDeclaration(lastIndentation));
                break;
            case 5 /* IndentationToken */:
                lastIndentation = countIndentation(tokenValue());
                nextToken();
                break;
            case 1 /* Identifier */:
                var f = parseMemberFunctionDeclaration();
                functions.push(f);
                nextToken();
                break;
            default:
                error('Syntax error.');
                nextToken();
                break;
        }
    }
    //if(members.length) console.log('==================members', name, members)
    return {
        kind: NodeKind.Member,
        name: name,
        type: isUpperCase(tag) ? 'view' : 'tag',
        tag: tag,
        classNames: classes,
        options: options,
        innerHTML: innerHTML,
        styles: styles,
        functions: functions,
        bindings: bindings,
        members: members,
        guid: guidShort()
    };
}
exports.parseMemberPropertyDeclaration = parseMemberPropertyDeclaration;
function parseMemberFunctionDeclaration() {
    var name = tokenValue();
    nextToken();
    if (token() !== 12 /* ArgumentsToken */) {
        error('Expected function arguments.');
    }
    var args = tokenValue();
    nextToken();
    if (token() !== 13 /* CodeToken */) {
        error('Expected function body.');
    }
    var code = tokenValue();
    return {
        kind: NodeKind.Function,
        name: name,
        args: args,
        code: code
    };
}
function error(msg) {
    var lineInfo = scanner.getLinePosInfo();
    msg = 'Error [' + lineInfo[0] + ', ' + lineInfo[1] + ']: ' + msg;
    //diagnostics.push(msg);
    throw (msg);
    //process.exit(1);
}
function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
}
function guidShort() {
    // Prepend with letter to ensure parsed as a string and preserve 
    // insertion order when calling Object.keys -JDK 12/1/2016
    // http://stackoverflow.com/questions/5525795/does-javascript-guarantee-object-property-order
    return 'a' + s4() + s4();
}
exports.guidShort = guidShort;
//# sourceMappingURL=parser.js.map