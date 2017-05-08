import { SyntaxKind, CharacterCodes, createScanner } from "./scanner"


const enum ParsingContext {
    SourceElements,            // Elements in source file
    ViewElements              // SyncView Members
}


let parsingContext: ParsingContext = ParsingContext.SourceElements;

// Share a single scanner across all calls to parse a source file.  This helps speed things
// up by avoiding the cost of creating/compiling scanners over and over again.
const scanner = createScanner();

let currentToken: SyntaxKind;

function token() {
    return currentToken;
}
function tokenValue(): string {
    return scanner.getTokenValue() || '';
}
function nextToken() {
    currentToken = scanner.scan();
    console.log('nextToken22', currentToken, tokenValue());
}

export function parse(text: string): ProgNode[] {
    scanner.setText(text);

    // Prime the scanner
    nextToken();
    let prog: ProgNode[] = [];
    while (token() !== SyntaxKind.EndOfFileToken) {
        if(token() === SyntaxKind.CodeToken) {
            prog.push({
                kind: NodeKind.Code,
                name: guidShort(),
                code: tokenValue()
            } as CodeNode);
            let code = tokenValue();
            nextToken();
        } else {
            prog.push(parseView());
        }
    }
    return prog;
}



export function parseView(): ViewNode {
    let indentation = 0;
    while(token() === SyntaxKind.IndentationToken && token() !== SyntaxKind.EndOfFileToken)  {
        nextToken();
    }
    if (token() !== SyntaxKind.Identifier) error("Expected identifier2.");
    let name = tokenValue();
    nextToken();
    if (token() !== SyntaxKind.IndentationToken && countIndentation(tokenValue())) error("Expected no indentation.");

    let dataType: string = 'SyncNode';
    let options: string = '{}';
    let classNames: string[] = [];
    let styles: MemberStyle[] = [];
    let members: MemberNode[] = [];
    let functions: MemberFunction[] = [];
    let properties: MemberProperties[] = [];
    while (!isViewTerminator(indentation)) {
        if(token() === SyntaxKind.DataType) {
            dataType = tokenValue();
            nextToken();
        } 
        if(token() == SyntaxKind.ArgumentsToken) {
            options = tokenValue();
            nextToken();
        }
        if(token() === SyntaxKind.ClassNamesToken) {
            classNames.push(tokenValue());
            nextToken();
        }
        if (token() !== SyntaxKind.IndentationToken) error('Expected Indentation');
        let memberIndentation = indentation + 1;
        while(token() === SyntaxKind.IndentationToken && !isViewTerminator(indentation)) {
            memberIndentation = countIndentation(tokenValue());
            nextToken();
        }
        if(memberIndentation <= indentation) {
            error('Error: memberIndentation is less than indentation.');
        } else if(!isViewTerminator(indentation)) {
            parseMemberDeclaration(memberIndentation, classNames, styles, members, functions, properties);
        }
    }
    console.log('end view');
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

function countIndentation(str: string): number {
    let count = 0;
    for (let i = 0; i < str.length; i++) {
        switch (str.charCodeAt(i)) {
            case CharacterCodes.space:
                count++;
                break;
            case CharacterCodes.tab:
                count += 4;
                break;
            default:
                return count;
        }
    }
    return count;
}

export function parseList() {
}

export function isViewTerminator(indentation: number): boolean {
    if (token() === SyntaxKind.EndOfFileToken) return true;
    return token() === SyntaxKind.IndentationToken && countIndentation(tokenValue()) <= indentation;
}

export function isStatementTerminator(indentation: number): boolean {
    if (token() === SyntaxKind.EndOfFileToken) return true;
    return token() === SyntaxKind.IndentationToken && countIndentation(tokenValue()) <= indentation;
}

export enum NodeKind {
    View,
    Member,
    Style,
    Function,
    Binding,
    Code,
    Properties
}

export interface ProgNode {
    kind: NodeKind
    name: string;
}

export interface CodeNode extends ProgNode {
    code: string;
}

export interface ViewNode extends ProgNode {
    dataType: string;
    options: string;
    classNames: string[];
    styles: MemberStyle[];
    members: MemberNode[];
    functions: MemberFunction[];
    properties: MemberProperties[];
}

export interface MemberNode extends ProgNode {
    tag: string;
    type: 'view' | 'tag';
    classNames: string[];
    options: string;
    innerHTML: string;
    styles: MemberStyle[];
    functions: MemberFunction[];
    bindings: MemberBinding[];
}

export interface MemberStyle extends ProgNode {
    text: string;
}

export interface MemberFunction extends ProgNode {
    args: string;
    code: string;
}

export interface MemberBinding extends ProgNode {
    prop: string;
    value: string;
}

export interface MemberProperties extends ProgNode {
    text: string;
}

export function parseMemberDeclaration(indentation: number, classNames: string[], styles: MemberStyle[], members: MemberNode[], functions: MemberFunction[], properties: MemberProperties[]): void {
    switch (token()) {
       case SyntaxKind.AtToken:
            nextToken();
            if(token() !== SyntaxKind.CodeToken) {
                error('Expected code.');
            }
            properties.push({
                name: guidShort(),
                kind: NodeKind.Properties,
                text: tokenValue()
            });
            nextToken();
            break;
        case SyntaxKind.ClassNamesToken:
            classNames.push(tokenValue());
            nextToken();
            break;
        case SyntaxKind.DotIdentifierToken:
            styles.push(parseMemberStyleDeclaration(indentation));
            break;
        case SyntaxKind.HashIdentifierToken:
            members.push(parseMemberPropertyDeclaration(indentation));
            break;
        case SyntaxKind.Identifier:
            functions.push(parseMemberFunctionDeclaration());
            nextToken();
            break;
        default:
            error("Expected identifier.");
            break;
    }
}

export function parseMemberStyleDeclaration(indentation: number): MemberStyle {
    let name = tokenValue();
    let text = '';
    if (name === undefined) name = guidShort();
    nextToken();
    switch (token()) {
        case SyntaxKind.CodeToken:
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

function isUpperCase(str: string): boolean {
    if (str.length === 0) return false;
    return str.charAt(0) === str.charAt(0).toUpperCase();
}

export function parseMemberPropertyDeclaration(indentation: number): MemberNode {
    let name = tokenValue();
    let tag = 'div';
    let options = '';
    let innerHTML = '';
    let classes: string[] = [];
    let functions: MemberFunction[] = [];
    let styles: MemberStyle[] = [];
    let bindings: MemberBinding[] = [];
    if (name === undefined) name = guidShort();
    nextToken();
    while (!isStatementTerminator(indentation)) {
        switch (token()) {
            case SyntaxKind.ClassNamesToken:
                classes.push(tokenValue());
                nextToken();
                break;
            case SyntaxKind.StringLiteral:
                innerHTML = tokenValue();
                nextToken();
                break;
            case SyntaxKind.DotIdentifierToken:
                styles.push(parseMemberStyleDeclaration(indentation));
                break;
            case SyntaxKind.ColonIdentifierToken:
                tag = tokenValue();
                nextToken();
                break;
            case SyntaxKind.ArgumentsToken:
                options = tokenValue();
                nextToken();
                break;
            case SyntaxKind.DollarToken:
                const bindingStr = tokenValue();
                let split = bindingStr.split('=');
                let binding = {
                    kind: NodeKind.Binding,
                    name: guidShort(),
                    prop: isUpperCase(tag) ? 'update' : 'innerHTML',
                    value: split[0]
                };
                console.log('binding', binding);
                if (split.length > 1) {
                    binding.prop = split[0];
                    binding.value = split[1];
                }
                bindings.push(binding);
                nextToken();
                break;
            case SyntaxKind.IndentationToken:
                nextToken();
                break;
            case SyntaxKind.Identifier:
                let f = parseMemberFunctionDeclaration();
                functions.push(f);
                nextToken();
                break;
            default:
                error('Syntax error.');
                nextToken();
                break;
        }
    }
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
        bindings: bindings
    };
}

function parseMemberFunctionDeclaration(): MemberFunction {
    const name = tokenValue();
    nextToken();
    if (token() !== SyntaxKind.ArgumentsToken) {
        error('Expected function arguments.');
    }
    const args = tokenValue();
    nextToken();
    if (token() !== SyntaxKind.CodeToken) {
        error('Expected function body.');
    }
    let code = tokenValue();
    return {
        kind: NodeKind.Function,
        name: name,
        args: args,
        code: code
    };
}

function error(msg: string) {
    msg = 'Error: ' + msg;
    throw(msg);
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