"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function createScanner(text, start, length) {
    if (text === void 0) { text = ''; }
    if (start === void 0) { start = 0; }
    // Current position (end position of text of current token)
    var pos;
    // end of text
    var end;
    // Start position of whitespace before current token
    var startPos;
    // Start position of text of current token
    var tokenPos;
    var token;
    var tokenValue;
    var tokenIsUnterminated = false;
    var precedingLineBreak = false;
    setText(text, start, length || text.length);
    return {
        getStartPos: function () { return startPos; },
        getTextPos: function () { return pos; },
        getToken: function () { return token; },
        getTokenPos: function () { return tokenPos; },
        getTokenText: function () { return text.substring(tokenPos, pos); },
        getTokenValue: function () { return tokenValue; },
        isIdentifier: function () { return token === 1 /* Identifier */; },
        scan: scan,
        getText: function () { return text; },
        setText: setText
    };
    function scan() {
        startPos = pos;
        while (true) {
            tokenPos = pos;
            if (pos >= end) {
                return token = 2 /* EndOfFileToken */;
            }
            var ch = text.charCodeAt(pos);
            switch (ch) {
                case 10 /* lineFeed */:
                case 13 /* carriageReturn */:
                    precedingLineBreak = true;
                    if (ch === 13 /* carriageReturn */ && pos + 1 < end && text.charCodeAt(pos + 1) === 10 /* lineFeed */) {
                        // consume both CR and LF
                        pos += 2;
                    }
                    else {
                        pos++;
                    }
                    continue;
                case 9 /* tab */:
                    if (precedingLineBreak) {
                        tokenValue = scanIndentation();
                        if (isLineBreak(text.charCodeAt(pos))) {
                            continue;
                        }
                        else {
                            precedingLineBreak = false;
                            return 5 /* IndentationToken */;
                        }
                    }
                    else {
                        pos++;
                        continue;
                    }
                case 11 /* verticalTab */:
                case 12 /* formFeed */:
                case 32 /* space */:
                    if (precedingLineBreak) {
                        tokenValue = scanIndentation();
                        precedingLineBreak = false;
                        return 5 /* IndentationToken */;
                    }
                    else {
                        pos++;
                        continue;
                    }
                case 34 /* doubleQuote */:
                case 39 /* singleQuote */:
                    tokenValue = scanString();
                    return token = 6 /* StringLiteral */;
                case 35 /* hash */:
                    pos++;
                    tokenValue = scanIdentifierParts();
                    return token = 3 /* HashIdentifierToken */;
                case 46 /* dot */:
                    pos++;
                    tokenValue = scanIdentifierParts();
                    return token = 11 /* DotIdentifierToken */;
                case 58 /* colon */:
                    pos++;
                    tokenValue = scanIdentifierParts();
                    return token = 9 /* ColonIdentifierToken */;
                case 64 /* at */:
                    pos++;
                    return token = 18 /* AtToken */;
                case 36 /* $ */:
                    pos++;
                    tokenValue = scanIdentifierParts('.=');
                    return token = 17 /* DollarToken */;
                /*
            case CharacterCodes.backtick:
                return token = scanTemplateAndSetTokenValue();
                */
                case 40 /* openParen */:
                    tokenValue = scanBetween(40 /* openParen */, 41 /* closeParen */);
                    return token = 12 /* ArgumentsToken */;
                case 91 /* openBracket */:
                    tokenValue = scanBetween(91 /* openBracket */, 93 /* closeBracket */);
                    return token = 19 /* ClassNamesToken */;
                case 60 /* lessThan */:
                    tokenValue = scanBetween(60 /* lessThan */, 62 /* greaterThan */);
                    return token = 20 /* DataType */;
                case 44 /* comma */:
                    pos++;
                    return token = 8 /* CommaToken */;
                /*
            case CharacterCodes.dot:
                if (isDigit(text.charCodeAt(pos + 1))) {
                    tokenValue = scanNumber();
                    return token = SyntaxKind.NumericLiteral;
                }
                if (text.charCodeAt(pos + 1) === CharacterCodes.dot && text.charCodeAt(pos + 2) === CharacterCodes.dot) {
                    return pos += 3, token = SyntaxKind.DotDotDotToken;
                }
                pos++;
                return token = SyntaxKind.DotToken;
                */
                case 47 /* slash */:
                    // Single-line comment
                    if (text.charCodeAt(pos + 1) === 47 /* slash */) {
                        pos += 2;
                        while (pos < end) {
                            if (isLineBreak(text.charCodeAt(pos))) {
                                break;
                            }
                            pos++;
                        }
                        continue;
                    }
                    // Multi-line comment
                    if (text.charCodeAt(pos + 1) === 42 /* asterisk */) {
                        pos += 2;
                        var commentClosed = false;
                        while (pos < end) {
                            var ch_1 = text.charCodeAt(pos);
                            if (ch_1 === 42 /* asterisk */ && text.charCodeAt(pos + 1) === 47 /* slash */) {
                                pos += 2;
                                commentClosed = true;
                                break;
                            }
                            if (isLineBreak(ch_1)) {
                                precedingLineBreak = true;
                            }
                            pos++;
                        }
                        if (!commentClosed) {
                            error('Unterminated multi-line comment');
                        }
                        continue;
                    }
                    pos++;
                    return token = 14 /* SlashToken */;
                case 48 /* _0 */:
                case 49 /* _1 */:
                case 50 /* _2 */:
                case 51 /* _3 */:
                case 52 /* _4 */:
                case 53 /* _5 */:
                case 54 /* _6 */:
                case 55 /* _7 */:
                case 56 /* _8 */:
                case 57 /* _9 */:
                    tokenValue = scanNumber();
                    return token = 7 /* NumericLiteral */;
                case 59 /* semicolon */:
                    pos++;
                    return token = 10 /* SemicolonToken */;
                case 123 /* openBrace */:
                    tokenValue = scanCode();
                    return token = 13 /* CodeToken */;
                default:
                    if (precedingLineBreak) {
                        precedingLineBreak = false;
                        tokenValue = '';
                        return 5 /* IndentationToken */;
                    }
                    if (isIdentifierStart(ch)) {
                        pos++;
                        while (pos < end && isIdentifierPart(ch = text.charCodeAt(pos)))
                            pos++;
                        tokenValue = text.substring(tokenPos, pos);
                        if (ch === 92 /* backslash */) {
                            tokenValue += scanIdentifierParts();
                        }
                        return token = getIdentifierToken();
                    }
                    else if (isWhiteSpaceSingleLine(ch)) {
                        pos++;
                        continue;
                    }
                    else if (isLineBreak(ch)) {
                        precedingLineBreak = true;
                        pos++;
                        continue;
                    }
                    error('Invalid character');
                    pos++;
                    return token = 0 /* Unknown */;
            }
        }
    }
    function setText(newText, start, length) {
        if (start === void 0) { start = 0; }
        text = newText || "";
        end = length === undefined ? text.length : start + length;
        setTextPos(start);
    }
    function setTextPos(textPos) {
        pos = textPos;
        startPos = textPos;
        tokenPos = textPos;
        token = 0 /* Unknown */;
        precedingLineBreak = false;
        tokenValue = undefined;
        tokenIsUnterminated = false;
    }
    function scanNumber() {
        var start = pos;
        while (isDigit(text.charCodeAt(pos)))
            pos++;
        if (text.charCodeAt(pos) === 46 /* dot */) {
            pos++;
            while (isDigit(text.charCodeAt(pos)))
                pos++;
        }
        var end = pos;
        if (text.charCodeAt(pos) === 69 /* E */ || text.charCodeAt(pos) === 101 /* e */) {
            pos++;
            if (text.charCodeAt(pos) === 43 /* plus */ || text.charCodeAt(pos) === 45 /* minus */)
                pos++;
            if (isDigit(text.charCodeAt(pos))) {
                pos++;
                while (isDigit(text.charCodeAt(pos)))
                    pos++;
                end = pos;
            }
            else {
                error('Digit expected');
            }
        }
        return "" + +(text.substring(start, end));
    }
    function scanIndentation() {
        var result = '';
        var start = pos;
        while (pos < end) {
            var ch = text.charCodeAt(pos);
            if (isIndentation(ch)) {
                pos++;
            }
            else {
                break;
            }
        }
        result += text.substring(start, pos);
        return result;
    }
    function scanBetween(open, close) {
        var ch = text.charCodeAt(pos);
        if (ch !== open)
            error('Expected Opening');
        pos++;
        var result = "";
        var start = pos;
        while (true) {
            if (pos >= end) {
                result = text.substring(start, pos);
                tokenIsUnterminated = true;
                error('Token is unterminated');
                break;
            }
            ch = text.charCodeAt(pos);
            if (ch === close) {
                result = text.substring(start, pos);
                pos++;
                break;
            }
            pos++;
        }
        return result;
    }
    /*
        function scanArguments(): string {
            let ch = text.charCodeAt(pos);
            if(ch !== CharacterCodes.openParen) error('Expected Open Parenthesis');
            pos++;
            let result = "";
            let start = pos;
            while (true) {
                if (pos >= end) {
                    result = text.substring(start, pos);
                    tokenIsUnterminated = true;
                    error('Arguments are unterminated');
                    break;
                }
                ch = text.charCodeAt(pos);
                if (ch === CharacterCodes.closeParen) {
                    result = text.substring(start, pos);
                    pos++;
                    break
                }
                pos++;
            }
            return result;
        }
    */
    function scanCode() {
        var ch = text.charCodeAt(pos);
        if (ch !== 123 /* openBrace */)
            error('Expected Open Brace');
        var numBrackets = 1;
        pos++;
        var result = "";
        var start = pos;
        while (true) {
            if (pos >= end) {
                result = text.substring(start, pos);
                tokenIsUnterminated = true;
                error('Code is unterminated');
                break;
            }
            ch = text.charCodeAt(pos);
            if (ch === 123 /* openBrace */) {
                numBrackets++;
            }
            else if (ch === 125 /* closeBrace */) {
                numBrackets--;
                if (numBrackets <= 0) {
                    result = text.substring(start, pos);
                    pos++;
                    break;
                }
            }
            pos++;
        }
        return result;
    }
    function scanString(allowEscapes) {
        if (allowEscapes === void 0) { allowEscapes = true; }
        var quote = text.charCodeAt(pos);
        pos++;
        var result = "";
        var start = pos;
        while (true) {
            if (pos >= end) {
                result += text.substring(start, pos);
                tokenIsUnterminated = true;
                error('String is unterminated');
                break;
            }
            var ch = text.charCodeAt(pos);
            if (ch === quote) {
                result += text.substring(start, pos);
                pos++;
                break;
            }
            if (ch === 92 /* backslash */ && allowEscapes) {
                result += text.substring(start, pos);
                result += scanEscapeSequence();
                start = pos;
                continue;
            }
            if (isLineBreak(ch)) {
                result += text.substring(start, pos);
                tokenIsUnterminated = true;
                error('String is unterminated');
                break;
            }
            pos++;
        }
        return result;
    }
    function scanEscapeSequence() {
        pos++;
        if (pos >= end) {
            error('Unexpected end of text');
            return "";
        }
        var ch = text.charCodeAt(pos);
        pos++;
        switch (ch) {
            case 48 /* _0 */:
                return "\0";
            case 98 /* b */:
                return "\b";
            case 116 /* t */:
                return "\t";
            case 110 /* n */:
                return "\n";
            case 118 /* v */:
                return "\v";
            case 102 /* f */:
                return "\f";
            case 114 /* r */:
                return "\r";
            case 39 /* singleQuote */:
                return "\'";
            case 34 /* doubleQuote */:
                return "\"";
            // when encountering a LineContinuation (i.e. a backslash and a line terminator sequence),
            // the line terminator is interpreted to be "the empty code unit sequence".
            case 13 /* carriageReturn */:
                if (pos < end && text.charCodeAt(pos) === 10 /* lineFeed */) {
                    pos++;
                }
            // fall through
            case 10 /* lineFeed */:
            case 8232 /* lineSeparator */:
            case 8233 /* paragraphSeparator */:
                return "";
            default:
                return String.fromCharCode(ch);
        }
    }
    function scanIdentifierParts(includeChars) {
        if (includeChars === void 0) { includeChars = ''; }
        var result = "";
        var start = pos;
        while (pos < end) {
            var ch = text.charCodeAt(pos);
            var chStr = text.charAt(pos);
            if (isIdentifierPart(ch) || includeChars.indexOf(chStr) !== -1) {
                pos++;
            }
            else {
                break;
            }
        }
        result += text.substring(start, pos);
        return result;
    }
    function getIdentifierToken() {
        /*
        // Reserved words are between 2 and 11 characters long and start with a lowercase letter
        const len = tokenValue.length;
        if (len >= 2 && len <= 11) {
            const ch = tokenValue.charCodeAt(0);
            if (ch >= CharacterCodes.a && ch <= CharacterCodes.z) {
                token = textToToken.get(tokenValue);
                if (token !== undefined) {
                    return token;
                }
            }
        }
        */
        return token = 1 /* Identifier */;
    }
    function error(message, length) {
        /*
        if (onError) {
            onError(message, length || 0);
        }
        */
        console.log('Error: ' + message);
    }
}
exports.createScanner = createScanner;
function isWhiteSpace(ch) {
    return isWhiteSpaceSingleLine(ch) || isLineBreak(ch);
}
exports.isWhiteSpace = isWhiteSpace;
/** Does not include line breaks. For that, see isWhiteSpaceLike. */
function isWhiteSpaceSingleLine(ch) {
    // Note: nextLine is in the Zs space, and should be considered to be a whitespace.
    // It is explicitly not a line-break as it isn't in the exact set specified by EcmaScript.
    return ch === 32 /* space */ ||
        ch === 9 /* tab */ ||
        ch === 11 /* verticalTab */ ||
        ch === 12 /* formFeed */ ||
        ch === 160 /* nonBreakingSpace */ ||
        ch === 133 /* nextLine */ ||
        ch === 5760 /* ogham */ ||
        ch >= 8192 /* enQuad */ && ch <= 8203 /* zeroWidthSpace */ ||
        ch === 8239 /* narrowNoBreakSpace */ ||
        ch === 8287 /* mathematicalSpace */ ||
        ch === 12288 /* ideographicSpace */ ||
        ch === 65279 /* byteOrderMark */;
}
exports.isWhiteSpaceSingleLine = isWhiteSpaceSingleLine;
function isLineBreak(ch) {
    // ES5 7.3:
    // The ECMAScript line terminator characters are listed in Table 3.
    //     Table 3: Line Terminator Characters
    //     Code Unit Value     Name                    Formal Name
    //     \u000A              Line Feed               <LF>
    //     \u000D              Carriage Return         <CR>
    //     \u2028              Line separator          <LS>
    //     \u2029              Paragraph separator     <PS>
    // Only the characters in Table 3 are treated as line terminators. Other new line or line
    // breaking characters are treated as white space but not as line terminators.
    return ch === 10 /* lineFeed */ ||
        ch === 13 /* carriageReturn */ ||
        ch === 8232 /* lineSeparator */ ||
        ch === 8233 /* paragraphSeparator */;
}
exports.isLineBreak = isLineBreak;
function isDigit(ch) {
    return ch >= 48 /* _0 */ && ch <= 57 /* _9 */;
}
exports.isDigit = isDigit;
function isIdentifierStart(ch) {
    return ch >= 65 /* A */ && ch <= 90 /* Z */ || ch >= 97 /* a */ && ch <= 122 /* z */ ||
        ch === 36 /* $ */ || ch === 95 /* _ */;
}
exports.isIdentifierStart = isIdentifierStart;
function isIdentifierPart(ch) {
    return ch >= 65 /* A */ && ch <= 90 /* Z */ || ch >= 97 /* a */ && ch <= 122 /* z */ ||
        ch >= 48 /* _0 */ && ch <= 57 /* _9 */ || ch === 36 /* $ */ || ch === 95 /* _ */;
}
exports.isIdentifierPart = isIdentifierPart;
function isIndentation(ch) {
    return ch === 32 /* space */ || ch === 9 /* tab */;
}
exports.isIndentation = isIndentation;
//# sourceMappingURL=scanner.js.map